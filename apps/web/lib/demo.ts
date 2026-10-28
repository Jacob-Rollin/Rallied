/** Explicit demo admin board — mock fixtures only, no OAuth / session poison. */

import { MOCK_SERVERS } from "./mock-data";

export const DEMO_BASE = "/demo";
export const DEMO_PUBLIC_PATH = "/s/demo-esports";
export const DEMO_GUILD_ID = MOCK_SERVERS[0].discord_guild_id;
export const DEMO_SERVER_NAME = MOCK_SERVERS[0].name;

export const DEMO_NAV = [
  { href: DEMO_BASE, label: "Overview" },
  { href: `${DEMO_BASE}/lfg`, label: "LFG" },
  { href: `${DEMO_BASE}/people`, label: "People" },
  { href: `${DEMO_BASE}/disputes`, label: "Disputes" },
  { href: `${DEMO_BASE}/analytics`, label: "Analytics" },
  { href: `${DEMO_BASE}/billing`, label: "Billing" },
  { href: `${DEMO_BASE}/settings`, label: "Settings" },
] as const;

export function demoHref(path: string): string {
  if (!path || path === "/") return DEMO_BASE;
  if (path.startsWith(DEMO_BASE)) return path;
  const cleaned = path.startsWith("/app") ? path.slice("/app".length) : path;
  const suffix = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  if (suffix === "/") return DEMO_BASE;
  return `${DEMO_BASE}${suffix}`;
}
