import { DISCORD_OAUTH_SCOPES, type AdminGuild } from "@rallied/shared";
import {
  getRuntimeEnv,
  getServiceRoleKey,
  getSupabaseUrl,
} from "../runtime-env";
import { getDiscordClientId, getRedirectUri } from "./config";

const API = "https://discord.com/api/v10";

/** Permission bits */
const ADMINISTRATOR = 1n << 3n;
const MANAGE_GUILD = 1n << 5n;

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getDiscordClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: DISCORD_OAUTH_SCOPES.join(" "),
    state,
    prompt: "none",
  });
  // prompt=none can fail first visit; prefer consent when needed
  params.set("prompt", "consent");
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<{
  access_token: string;
  token_type: string;
  scope: string;
}> {
  const body = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    client_secret: process.env.DISCORD_CLIENT_SECRET!,
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(),
  });

  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export interface DiscordOAuthUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
}

export async function fetchOAuthUser(accessToken: string): Promise<DiscordOAuthUser> {
  const res = await fetch(`${API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`users/@me failed: ${res.status}`);
  return res.json();
}

export interface DiscordOAuthGuild {
  id: string;
  name: string;
  icon: string | null;
  owner?: boolean;
  permissions: string;
}

export async function fetchOAuthGuilds(accessToken: string): Promise<DiscordOAuthGuild[]> {
  const res = await fetch(`${API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`users/@me/guilds failed: ${res.status}`);
  return res.json();
}

export function canManageGuild(guild: DiscordOAuthGuild): boolean {
  if (guild.owner) return true;
  const perms = BigInt(guild.permissions || "0");
  return (perms & (ADMINISTRATOR | MANAGE_GUILD)) !== 0n;
}

/**
 * Filter to guilds the user can manage; mark bot_present + plan.
 * Bot presence (in order):
 * 1. DISCORD_BOT_TOKEN → GET /users/@me/guilds as the bot
 * 2. Else Supabase `servers.discord_guild_id` (bot upserts on first slash command)
 * 3. Else null → treat all manageable as present (local stub without env)
 */
export async function filterAdminGuilds(
  guilds: DiscordOAuthGuild[],
): Promise<AdminGuild[]> {
  const manageable = guilds.filter(canManageGuild);
  const botGuildIds = await getBotGuildIds();
  const plans = await fetchPlansForGuilds(manageable.map((g) => g.id));

  return manageable.map((g) => ({
    id: g.id,
    name: g.name,
    icon: g.icon,
    bot_present: botGuildIds === null ? true : botGuildIds.has(g.id),
    plan: plans.get(g.id),
  }));
}

async function fetchPlansForGuilds(
  guildIds: string[],
): Promise<Map<string, AdminGuild["plan"]>> {
  const map = new Map<string, AdminGuild["plan"]>();
  if (guildIds.length === 0) return map;
  const url = getSupabaseUrl();
  const key =
    getServiceRoleKey() || getRuntimeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !key) return map;
  try {
    const q = encodeURIComponent(`in.(${guildIds.join(",")})`);
    const res = await fetch(
      `${url}/rest/v1/servers?select=discord_guild_id,plan&discord_guild_id=${q}`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      },
    );
    if (!res.ok) return map;
    const rows = (await res.json()) as {
      discord_guild_id: string;
      plan: AdminGuild["plan"];
    }[];
    for (const r of rows) map.set(r.discord_guild_id, r.plan);
  } catch {
    /* ignore */
  }
  return map;
}

/** Refresh helpers for /api/auth/me — bot_present set + plan map. */
export async function getBotPresenceAndPlans(guildIds: string[]): Promise<{
  botGuildIds: Set<string> | null;
  plans: Map<string, AdminGuild["plan"]>;
}> {
  const [botGuildIds, plans] = await Promise.all([
    getBotGuildIds(),
    fetchPlansForGuilds(guildIds),
  ]);
  return { botGuildIds, plans };
}

/** Returns null if detection unavailable (stub: treat manageable as present). */
async function getBotGuildIds(): Promise<Set<string> | null> {
  const token = getRuntimeEnv("DISCORD_BOT_TOKEN");
  if (!token) {
    // Prefer Supabase servers table if available
    const fromDb = await getInstalledGuildIdsFromSupabase();
    return fromDb;
  }

  try {
    const res = await fetch(`${API}/users/@me/guilds`, {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!res.ok) {
      console.warn("bot guilds fetch failed", res.status);
      return getInstalledGuildIdsFromSupabase();
    }
    const data = (await res.json()) as { id: string }[];
    return new Set(data.map((g) => g.id));
  } catch (err) {
    console.warn("bot guilds error", err);
    return getInstalledGuildIdsFromSupabase();
  }
}

/**
 * Guilds where the bot has upserted a `servers` row.
 * Prefer SUPABASE_SERVICE_ROLE_KEY (RLS denies anon). Returns empty Set when
 * query succeeds with zero rows; null only when env/query unavailable.
 */
async function getInstalledGuildIdsFromSupabase(): Promise<Set<string> | null> {
  const url = getSupabaseUrl();
  const key =
    getServiceRoleKey() || getRuntimeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !key) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/servers?select=discord_guild_id`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      },
    );
    if (!res.ok) {
      console.warn("servers guild list failed", res.status);
      return null;
    }
    const rows = (await res.json()) as { discord_guild_id: string }[];
    return new Set(rows.map((r) => r.discord_guild_id));
  } catch (err) {
    console.warn("servers guild list error", err);
    return null;
  }
}

export function avatarUrl(user: DiscordOAuthUser): string | null {
  if (!user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
}
