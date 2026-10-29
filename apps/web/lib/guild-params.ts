/** Client-safe guild cookie / query helpers (no next/headers). */

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
