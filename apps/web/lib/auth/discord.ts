import {
  DISCORD_OAUTH_SCOPES,
  discordGuildIconUrl,
  hasCommunityAccess,
  modDashboardEnabled,
  type AdminGuild,
  type DashboardAccess,
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
 * Filter to guilds the user can open in /app:
 * - Owner: Manage Guild / Administrator (bot optional — invite CTA when missing)
 * - Mod: bot present + Community+ plan + member holds a role in server_settings.mod_role_ids
 *
 * Bot presence (in order):
 * 1. DISCORD_BOT_TOKEN → GET /users/@me/guilds as the bot
 * 2. Else Supabase `servers.discord_guild_id` (bot upserts on first slash command)
 * 3. Else null → treat all manageable as present (local stub without env)
 */
export async function filterAccessibleGuilds(
  guilds: DiscordOAuthGuild[],
  userId: string,
): Promise<AdminGuild[]> {
  const botGuildIds = await getBotGuildIds();
  const ownerGuilds = guilds.filter(canManageGuild);
  const ownerIds = new Set(ownerGuilds.map((g) => g.id));

  const candidateIds = [
    ...new Set([
      ...ownerGuilds.map((g) => g.id),
      ...guilds
        .filter((g) => !ownerIds.has(g.id))
        .filter((g) => (botGuildIds === null ? false : botGuildIds.has(g.id)))
        .map((g) => g.id),
    ]),
  ];

  const meta = await fetchGuildAccessMeta(candidateIds);
  const out: AdminGuild[] = [];

  for (const g of ownerGuilds) {
    out.push({
      id: g.id,
      name: g.name,
      icon: g.icon,
      bot_present: botGuildIds === null ? true : botGuildIds.has(g.id),
      plan: meta.get(g.id)?.plan,
      access: "owner",
    });
  }

  // Non-owner: Rallied Mod when Community+ + configured roles intersect member roles.
  const modCandidates = guilds.filter(
    (g) =>
      !ownerIds.has(g.id) &&
      botGuildIds !== null &&
      botGuildIds.has(g.id),
  );

  await Promise.all(
    modCandidates.map(async (g) => {
      const row = meta.get(g.id);
      const plan = row?.plan;
      const modRoleIds = row?.mod_role_ids ?? [];
      if (!modDashboardEnabled(plan) || modRoleIds.length === 0) return;

      const memberRoles = await fetchMemberRoleIds(g.id, userId);
      if (!memberRoles) return;
      const hit = modRoleIds.some((id) => memberRoles.has(id));
      if (!hit) return;

      out.push({
        id: g.id,
        name: g.name,
        icon: g.icon,
        bot_present: true,
        plan,
        access: "mod",
      });
    }),
  );

  // Best-effort: persist Discord guild name + icon on existing servers rows.
  void syncServerMetadataFromOAuth(out);

  return out;
}

/** @deprecated Prefer filterAccessibleGuilds (includes Rallied Mod). */
export async function filterAdminGuilds(
  guilds: DiscordOAuthGuild[],
  userId?: string,
): Promise<AdminGuild[]> {
  if (userId) return filterAccessibleGuilds(guilds, userId);
  const botGuildIds = await getBotGuildIds();
  const manageable = guilds.filter(canManageGuild);
  const plans = await fetchPlansForGuilds(manageable.map((g) => g.id));
  const adminGuilds = manageable.map((g) => ({
    id: g.id,
    name: g.name,
    icon: g.icon,
    bot_present: botGuildIds === null ? true : botGuildIds.has(g.id),
    plan: plans.get(g.id),
    access: "owner" as DashboardAccess,
  }));
  void syncServerMetadataFromOAuth(adminGuilds);
  return adminGuilds;
}

export type DiscordGuildRole = {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
};

/** Guild roles via bot token (for Settings multi-select). Excludes @everyone. */
export async function fetchGuildRoles(
  guildId: string,
): Promise<DiscordGuildRole[] | null> {
  const id = guildId.trim();
  if (!id || looksLikeNonGuildId(id)) return null;
  const token = getRuntimeEnv("DISCORD_BOT_TOKEN");
  if (!token) return null;
  try {
    const res = await fetch(`${API}/guilds/${encodeURIComponent(id)}/roles`, {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!res.ok) {
      console.warn("guild roles fetch failed", res.status);
      return null;
    }
    const data = (await res.json()) as {
      id: string;
      name: string;
      color?: number;
      position?: number;
      managed?: boolean;
    }[];
    return data
      .filter((r) => r.id !== id) // @everyone id === guild id
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color ?? 0,
        position: r.position ?? 0,
        managed: Boolean(r.managed),
      }))
      .sort((a, b) => b.position - a.position);
  } catch (err) {
    console.warn("guild roles error", err);
    return null;
  }
}

/** Member role ids via bot token. Null when unavailable / not in guild. */
export async function fetchMemberRoleIds(
  guildId: string,
  userId: string,
): Promise<Set<string> | null> {
  const gid = guildId.trim();
  const uid = userId.trim();
  if (!gid || !uid || looksLikeNonGuildId(gid)) return null;
  const token = getRuntimeEnv("DISCORD_BOT_TOKEN");
  if (!token) return null;
  try {
    const res = await fetch(
      `${API}/guilds/${encodeURIComponent(gid)}/members/${encodeURIComponent(uid)}`,
      { headers: { Authorization: `Bot ${token}` } },
    );
    if (res.status === 404) return new Set();
    if (!res.ok) {
      console.warn("guild member fetch failed", res.status);
      return null;
    }
    const data = (await res.json()) as { roles?: string[] };
    return new Set(data.roles ?? []);
  } catch (err) {
    console.warn("guild member error", err);
    return null;
  }
}

/**
 * Re-verify mod access for session guilds (roles / plan may change).
 * Owners stay owners. Mods who lost the role or Community+ are dropped.
 */
export async function refreshSessionGuildAccess(
  guilds: AdminGuild[],
  userId: string,
): Promise<AdminGuild[]> {
  if (guilds.length === 0) return guilds;
  const meta = await fetchGuildAccessMeta(guilds.map((g) => g.id));
  const out: AdminGuild[] = [];

  for (const g of guilds) {
    const row = meta.get(g.id);
    const plan = row?.plan ?? g.plan;
    if (g.access !== "mod") {
      out.push({ ...g, plan, access: "owner" });
      continue;
    }
    const modRoleIds = row?.mod_role_ids ?? [];
    if (!modDashboardEnabled(plan) || modRoleIds.length === 0) continue;
    if (!g.bot_present) continue;
    const memberRoles = await fetchMemberRoleIds(g.id, userId);
    if (!memberRoles) {
      // Keep briefly if Discord unavailable — avoid kicking mid-session.
      out.push({ ...g, plan, access: "mod" });
      continue;
    }
    if (!modRoleIds.some((id) => memberRoles.has(id))) continue;
    out.push({ ...g, plan, access: "mod" });
  }

  return out;
}

type GuildAccessMeta = {
  plan: AdminGuild["plan"];
  mod_role_ids: string[];
};

async function fetchGuildAccessMeta(
  guildIds: string[],
): Promise<Map<string, GuildAccessMeta>> {
  const map = new Map<string, GuildAccessMeta>();
  if (guildIds.length === 0) return map;
  const url = getSupabaseUrl();
  const key =
    getServiceRoleKey() || getRuntimeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !key) return map;
  try {
    const q = encodeURIComponent(`in.(${guildIds.join(",")})`);
    const res = await fetch(
      `${url}/rest/v1/servers?select=discord_guild_id,plan,server_settings(mod_role_ids)&discord_guild_id=${q}`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      },
    );
    if (!res.ok) {
      // Fallback without embed if PostgREST relationship missing.
      const plans = await fetchPlansForGuilds(guildIds);
      for (const [id, plan] of plans) {
        map.set(id, { plan, mod_role_ids: [] });
      }
      const roles = await fetchModRoleIdsForGuilds(guildIds);
      for (const [id, mod_role_ids] of roles) {
        const prev = map.get(id) ?? { plan: undefined, mod_role_ids: [] };
        map.set(id, { ...prev, mod_role_ids });
      }
      return map;
    }
    const rows = (await res.json()) as {
      discord_guild_id: string;
      plan: AdminGuild["plan"];
      server_settings?:
        | { mod_role_ids?: string[] | null }
        | { mod_role_ids?: string[] | null }[]
        | null;
    }[];
    for (const r of rows) {
      const settings = Array.isArray(r.server_settings)
        ? r.server_settings[0]
        : r.server_settings;
      map.set(r.discord_guild_id, {
        plan: r.plan,
        mod_role_ids: normalizeRoleIdList(settings?.mod_role_ids),
      });
    }
  } catch {
    /* ignore */
  }
  return map;
}

async function fetchModRoleIdsForGuilds(
  guildIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (guildIds.length === 0) return map;
  const url = getSupabaseUrl();
  const key =
    getServiceRoleKey() || getRuntimeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !key) return map;
  try {
    const q = encodeURIComponent(`in.(${guildIds.join(",")})`);
    // Join via servers → server_settings using discord_guild_id filter on servers first.
    const serversRes = await fetch(
      `${url}/rest/v1/servers?select=id,discord_guild_id&discord_guild_id=${q}`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      },
    );
    if (!serversRes.ok) return map;
    const servers = (await serversRes.json()) as {
      id: string;
      discord_guild_id: string;
    }[];
    if (servers.length === 0) return map;
    const idByServer = new Map(servers.map((s) => [s.id, s.discord_guild_id]));
    const serverIds = servers.map((s) => s.id);
    const sq = encodeURIComponent(`in.(${serverIds.join(",")})`);
    const settingsRes = await fetch(
      `${url}/rest/v1/server_settings?select=server_id,mod_role_ids&server_id=${sq}`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      },
    );
    if (!settingsRes.ok) return map;
    const rows = (await settingsRes.json()) as {
      server_id: string;
      mod_role_ids?: string[] | null;
    }[];
    for (const r of rows) {
      const guildId = idByServer.get(r.server_id);
      if (!guildId) continue;
      map.set(guildId, normalizeRoleIdList(r.mod_role_ids));
    }
  } catch {
    /* ignore */
  }
  return map;
}

export function normalizeRoleIdList(
  raw: string[] | null | undefined,
): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const id = String(item ?? "").trim();
    if (!id || !/^\d{17,20}$/.test(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** True when Community+ (or demo) — used by Settings UI / copy. */
export function guildSupportsModRoles(
  plan: string | null | undefined,
): boolean {
  return hasCommunityAccess(plan);
}

export type DiscordGuildMeta = {
  name: string;
  iconUrl: string | null;
};

function looksLikeNonGuildId(id: string): boolean {
  return id.startsWith("demo-guild") || !/^\d{17,20}$/.test(id);
}

/**
 * Fetch a guild's real name + icon via the bot token (GET /guilds/{id}).
 * Used when OAuth/session/`servers.name` is a placeholder.
 */
export async function fetchGuildMetaFromDiscord(
  guildId: string,
): Promise<DiscordGuildMeta | null> {
  const id = guildId.trim();
  if (!id || looksLikeNonGuildId(id)) return null;
  const token = getRuntimeEnv("DISCORD_BOT_TOKEN");
  if (!token) return null;
  try {
    const res = await fetch(`${API}/guilds/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { name?: string; icon?: string | null };
    const name = (data.name ?? "").trim();
    if (!isUsableServerName(name, id)) return null;
    return {
      name,
      iconUrl: discordGuildIconUrl(id, data.icon),
    };
  } catch {
    return null;
  }
}

/** @deprecated Prefer fetchGuildMetaFromDiscord when icon may be needed. */
export async function fetchGuildNameFromDiscord(
  guildId: string,
): Promise<string | null> {
  const meta = await fetchGuildMetaFromDiscord(guildId);
  return meta?.name ?? null;
}

/**
 * Patch `name` / `icon_url` on existing `servers` rows from OAuth / Discord.
 * Overwrites empty, snowflake, and placeholder names ("Discord server",
 * "Selected server", etc). Does not insert new servers — bot owns that path.
 */
export async function syncServerMetadataFromOAuth(
  guilds: Pick<AdminGuild, "id" | "name" | "icon">[],
): Promise<void> {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();
  if (!url || !key) return;

  await Promise.all(
    guilds.map(async (g) => {
      const patch: { name?: string; icon_url?: string; updated_at?: string } =
        {};
      let name = (g.name ?? "").trim();
      let icon = discordGuildIconUrl(g.id, g.icon);
      if (!isUsableServerName(name, g.id) || !icon) {
        const fromApi = await fetchGuildMetaFromDiscord(g.id);
        if (fromApi) {
          if (!isUsableServerName(name, g.id)) name = fromApi.name;
          if (!icon && fromApi.iconUrl) icon = fromApi.iconUrl;
        }
      }
      if (isUsableServerName(name, g.id)) patch.name = name;
      if (icon) patch.icon_url = icon;
      if (Object.keys(patch).length === 0) return;
      patch.updated_at = new Date().toISOString();

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
 * Persist a usable Discord guild name/icon onto an existing `servers` row
 * when the current DB name is invalid. Used by public /servers + /s pages
 * (no OAuth session) so directory cards show the real guild title.
 */
export async function repairServerNameInDb(opts: {
  serverId: string;
  guildId: string;
  currentName?: string | null;
  currentIconUrl?: string | null;
}): Promise<DiscordGuildMeta | null> {
  const guildId = opts.guildId.trim();
  const nameOk = isUsableServerName(opts.currentName, guildId);
  const iconOk = Boolean(opts.currentIconUrl);
  if (nameOk && iconOk) {
    return {
      name: String(opts.currentName).trim(),
      iconUrl: opts.currentIconUrl ?? null,
    };
  }

  const meta = await fetchGuildMetaFromDiscord(guildId);
  if (!meta) {
    return nameOk
      ? {
          name: String(opts.currentName).trim(),
          iconUrl: opts.currentIconUrl ?? null,
        }
      : null;
  }

  const url = getSupabaseUrl();
  const key = getServiceRoleKey();
  if (!url || !key) return meta;

  const patch: { name?: string; icon_url?: string; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (!nameOk) patch.name = meta.name;
  if (!iconOk && meta.iconUrl) patch.icon_url = meta.iconUrl;

  try {
    await fetch(
      `${url}/rest/v1/servers?id=eq.${encodeURIComponent(opts.serverId)}`,
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
    /* non-fatal — still return resolved meta for this response */
  }

  return {
    name: nameOk ? String(opts.currentName).trim() : meta.name,
    iconUrl: iconOk ? (opts.currentIconUrl ?? null) : meta.iconUrl,
  };
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
      const fromApi = await fetchGuildMetaFromDiscord(g.id);
      if (!fromApi) return g;
      return { ...g, name: fromApi.name };
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
