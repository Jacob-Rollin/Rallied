import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import {
  GUILD_COOKIE,
  GUILD_QUERY,
  isDemoGuildId,
  shouldUseMockDashboard,
} from "@/lib/guild-params";

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
};

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

  return { guildId, forceMock, isMockSession, useMock };
}
