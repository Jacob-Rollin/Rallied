import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";

/** Cookie + query key for the selected Discord guild in /app. */
export const GUILD_COOKIE = "rallied_guild";
export const GUILD_QUERY = "guild";

/** Known mock/demo guild ids from mockSessionPayload / MOCK_SERVERS. */
const DEMO_GUILD_IDS = new Set([
  "demo-guild-1",
  "demo-guild-2",
  "demo-guild-founding",
]);

export function isDemoGuildId(guildId: string): boolean {
  return DEMO_GUILD_IDS.has(guildId) || guildId.startsWith("demo-guild-");
}

/**
 * Use mock dashboard rows when:
 * - session is mock auth
 * - selected guild is an explicit demo id
 * - `?mock=1` (preview mock UI against a real login)
 */
export function shouldUseMockDashboard(
  guildId: string,
  opts: { isMockSession?: boolean; forceMock?: boolean },
): boolean {
  if (opts.forceMock) return true;
  if (opts.isMockSession) return true;
  if (isDemoGuildId(guildId)) return true;
  return false;
}

export type GuildResolveResult = {
  guildId: string;
  forceMock: boolean;
  isMockSession: boolean;
  useMock: boolean;
};

/**
 * Resolve selected guild for server components.
 * Priority: `?guild=` → cookie → first bot_present session guild → first guild → demo-guild-1.
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

  const fromCookie = jar.get(GUILD_COOKIE)?.value;
  const guilds = session.guilds ?? [];
  const preferred =
    guilds.find((g) => g.bot_present)?.id || guilds[0]?.id || "demo-guild-1";

  const guildId = (fromQuery || fromCookie || preferred).trim();
  const isMockSession = Boolean(session.isMock);
  const useMock = shouldUseMockDashboard(guildId, {
    isMockSession,
    forceMock,
  });

  return { guildId, forceMock, isMockSession, useMock };
}

export function withGuildQuery(
  href: string,
  guildId: string,
  extra?: Record<string, string>,
): string {
  const url = new URL(href, "http://local.invalid");
  if (guildId) url.searchParams.set(GUILD_QUERY, guildId);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      url.searchParams.set(k, v);
    }
  }
  return `${url.pathname}${url.search}`;
}
