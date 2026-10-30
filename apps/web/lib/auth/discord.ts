import {
  DISCORD_OAUTH_SCOPES,
  discordGuildIconUrl,
  type AdminGuild,
} from "@rallied/shared";
import {
  getRuntimeEnv,
  getServiceRoleKey,
  getSupabaseUrl,
} from "../runtime-env";
import { isUsableServerName } from "../server-display-name";
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
    client_id: getDiscordClientId(),
    client_secret: getRuntimeEnv("DISCORD_CLIENT_SECRET") || "",
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

  const adminGuilds = manageable.map((g) => ({
    id: g.id,
    name: g.name,
    icon: g.icon,
    bot_present: botGuildIds === null ? true : botGuildIds.has(g.id),
    plan: plans.get(g.id),
  }));

  // Best-effort: persist Discord guild name + icon on existing servers rows.
  void syncServerMetadataFromOAuth(adminGuilds);

  return adminGuilds;
}

/**
 * Fetch a guild's real name via the bot token (GET /guilds/{id}).
 * Used when OAuth/session name is missing and `servers.name` is a placeholder.
 */
export async function fetchGuildNameFromDiscord(
  guildId: string,
): Promise<string | null> {
  const id = guildId.trim();
  if (!id || looksLikeNonGuildId(id)) return null;
  const token = getRuntimeEnv("DISCORD_BOT_TOKEN");
  if (!token) return null;
  try {
    const res = await fetch(`${API}/guilds/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { name?: string };
    const name = (data.name ?? "").trim();
    return isUsableServerName(name, id) ? name : null;
  } catch {
    return null;
  }
}

function looksLikeNonGuildId(id: string): boolean {
  return id.startsWith("demo-guild") || !/^\d{17,20}$/.test(id);
}

/**
 * Patch `name` / `icon_url` on existing `servers` rows from OAuth / Discord.
 * Overwrites empty, snowflake, and "Discord server" placeholders.
 * Does not insert new servers — bot slash commands own that path.
 */
export async function syncServerMetadataFromOAuth(
  guilds: Pick<AdminGuild, "id" | "name" | "icon">[],
): Promise<void> {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();
  if (!url || !key) return;

  await Promise.all(
    guilds.map(async (g) => {
      const patch: { name?: string; icon_url?: string } = {};
      let name = (g.name ?? "").trim();
      if (!isUsableServerName(name, g.id)) {
        const fromApi = await fetchGuildNameFromDiscord(g.id);
        if (fromApi) name = fromApi;
      }
      if (isUsableServerName(name, g.id)) patch.name = name;
      const icon = discordGuildIconUrl(g.id, g.icon);
      if (icon) patch.icon_url = icon;
      if (Object.keys(patch).length === 0) return;

      try {
        await fetch(
          `${url}/rest/v1/servers?discord_guild_id=eq.${encodeURIComponent(g.id)}`,
          {
            method: "PATCH",
            headers: {
              apikey: key,
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify(patch),
          },
        );
      } catch {
        /* non-fatal */
      }
    }),
  );
}

/**
 * Ensure session guild entries carry real Discord names (not placeholders).
 * Mutates + returns the list; best-effort Discord API fill when needed.
 */
export async function ensureGuildDisplayNames(
  guilds: AdminGuild[],
): Promise<AdminGuild[]> {
  const out = await Promise.all(
    guilds.map(async (g) => {
      if (isUsableServerName(g.name, g.id)) return g;
      const fromApi = await fetchGuildNameFromDiscord(g.id);
      if (!fromApi) return g;
      return { ...g, name: fromApi };
    }),
  );
  return out;
}

/** @deprecated Prefer syncServerMetadataFromOAuth (also syncs name). */
export async function syncServerIconUrls(
  guilds: Pick<AdminGuild, "id" | "name" | "icon">[],
): Promise<void> {
  return syncServerMetadataFromOAuth(guilds);
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
