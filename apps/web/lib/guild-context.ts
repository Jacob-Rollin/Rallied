import { cookies } from "next/headers";
import { fetchGuildNameFromDiscord } from "@/lib/auth/discord";
import { getSession } from "@/lib/auth/session";
import {
  GUILD_COOKIE,
  GUILD_QUERY,
  isDemoGuildId,
  shouldUseMockDashboard,
} from "@/lib/guild-params";
import {
  isUsableServerName,
  resolveServerDisplayName,
} from "@/lib/server-display-name";

export {
  GUILD_COOKIE,
  GUILD_QUERY,
  isDemoGuildId,
  shouldUseMockDashboard,
  withGuildQuery,
} from "@/lib/guild-params";

export type GuildResolveResult = {
  guildId: string;
  forceMock: boolean;
  isMockSession: boolean;
  useMock: boolean;
  /** OAuth guild name from session when available. */
  oauthGuildName: string | null;
};

/**
 * Prefer OAuth session guild name, then a real Supabase `servers.name`.
 * Never treat snowflake / empty / "Discord server" as the primary label.
 */
export function displayNameForGuild(opts: {
  guildId: string;
  dbName?: string | null;
  oauthName?: string | null;
  fallback?: string;
}): string {
  return resolveServerDisplayName(opts);
}

/**
 * Resolve selected guild for server components.
 * Priority: `?guild=` → cookie → first bot_present session guild → first guild.
 * Ignores stale demo-guild-* cookies unless mock session / `?mock=1`.
 */
export async function resolveSelectedGuild(opts?: {
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<GuildResolveResult> {
  const session = await getSession();
  const jar = await cookies();
  const sp = opts?.searchParams ?? {};

  const rawGuild = sp[GUILD_QUERY];
  const fromQuery = Array.isArray(rawGuild) ? rawGuild[0] : rawGuild;
  const rawMock = sp.mock;
  const forceMock =
    (Array.isArray(rawMock) ? rawMock[0] : rawMock) === "1" ||
    jar.get("rallied_mock")?.value === "1";

  const isMockSession = Boolean(session.isMock);
  const allowDemo = forceMock || isMockSession;

  let fromCookie = jar.get(GUILD_COOKIE)?.value;
  if (fromCookie && isDemoGuildId(fromCookie) && !allowDemo) {
    fromCookie = undefined;
  }

  let queryGuild = typeof fromQuery === "string" ? fromQuery.trim() : "";
  if (queryGuild && isDemoGuildId(queryGuild) && !allowDemo) {
    queryGuild = "";
  }

  const guilds = session.guilds ?? [];
  const preferred =
    guilds.find((g) => g.bot_present)?.id || guilds[0]?.id || "";

  const guildId = (queryGuild || fromCookie || preferred).trim();
  const useMock = shouldUseMockDashboard(guildId, {
    isMockSession,
    forceMock,
  });
  let oauthGuildName =
    guilds.find((g) => g.id === guildId)?.name?.trim() || null;

  // SSR: if session name is missing/placeholder, pull real name from Discord.
  if (
    guildId &&
    !useMock &&
    !isMockSession &&
    !isUsableServerName(oauthGuildName, guildId)
  ) {
    const fromApi = await fetchGuildNameFromDiscord(guildId);
    if (fromApi) oauthGuildName = fromApi;
  }

  return { guildId, forceMock, isMockSession, useMock, oauthGuildName };
}
