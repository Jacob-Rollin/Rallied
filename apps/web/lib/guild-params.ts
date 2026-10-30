/** Client-safe guild cookie / query helpers (no next/headers). */

import {
  DASHBOARD_RANGE_QUERY,
  DEFAULT_DASHBOARD_RANGE,
  parseDashboardRange,
  type DashboardRangeKey,
} from "@rallied/shared";

/** Cookie + query key for the selected Discord guild in /app. */
export const GUILD_COOKIE = "rallied_guild";
export const GUILD_QUERY = "guild";
export { DASHBOARD_RANGE_QUERY };

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
 * - `?mock=1` / `/demo` (preview mock UI against a real login)
 *
 * Stale `demo-guild-*` cookies under real OAuth must NOT force fixtures.
 */
export function shouldUseMockDashboard(
  _guildId: string,
  opts: { isMockSession?: boolean; forceMock?: boolean },
): boolean {
  if (opts.forceMock) return true;
  if (opts.isMockSession) return true;
  return false;
}

export function rangeFromSearchParams(
  sp: Record<string, string | string[] | undefined> | undefined,
): DashboardRangeKey {
  const raw = sp?.[DASHBOARD_RANGE_QUERY];
  const v = Array.isArray(raw) ? raw[0] : raw;
  return parseDashboardRange(typeof v === "string" ? v : undefined);
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

/** Preserve guild + dashboard `?range=` on Overview/Analytics links. */
export function withDashboardQuery(
  href: string,
  opts: {
    guildId?: string;
    range?: DashboardRangeKey;
    extra?: Record<string, string>;
  },
): string {
  const extra: Record<string, string> = { ...(opts.extra ?? {}) };
  if (opts.range && opts.range !== DEFAULT_DASHBOARD_RANGE) {
    extra[DASHBOARD_RANGE_QUERY] = opts.range;
  } else if (opts.range === DEFAULT_DASHBOARD_RANGE) {
    // Keep default in the URL so shared links stay explicit when chosen.
    extra[DASHBOARD_RANGE_QUERY] = opts.range;
  }
  return withGuildQuery(href, opts.guildId ?? "", extra);
}
