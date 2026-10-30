/**
 * Ops Usage free-tier reference labels (editable constants).
 * Not live quota remaining — CF/Supabase do not always expose that.
 * Verify in each dashboard; limits change.
 */

/** Cloudflare Workers Free plan reference (as of 2026 docs). */
export const CF_FREE_TIER_REF = {
  /** Account-wide inbound Worker requests / day (resets midnight UTC). */
  requestsPerDay: 100_000,
  /** CPU time per invocation on Free. */
  cpuMsPerInvocation: 10,
  /** Max Workers on Free account. */
  maxWorkers: 100,
  note: "Verify in CF dashboard — limits change. Free plan is account-wide (not per Worker).",
  docsUrl: "https://developers.cloudflare.com/workers/platform/limits/",
  dashboardUrl: "https://dash.cloudflare.com",
} as const;

/** Supabase Free plan database size reference (as of 2026 docs). */
export const SUPABASE_FREE_TIER_REF = {
  /** Database size quota per Free project (billing quota). */
  databaseMb: 500,
  /** Fixed disk on Free (read-only near full) — different from DB size quota. */
  diskGb: 2,
  note: "Verify in Supabase dashboard — Free DB size quota is ~500MB/project; limits change.",
  docsUrl: "https://supabase.com/pricing",
  dashboardUrl: "https://supabase.com/dashboard",
} as const;

/** Default Worker script names for CF analytics (override via CF_WORKER_NAMES). */
export const DEFAULT_CF_WORKER_NAMES = ["rallied-web", "rallied-bot"] as const;

/** Big tables we size for dogfood free-tier watch. */
export const OPS_SIZE_TABLES = [
  "lfg_parties",
  "members",
  "server_events",
  "feedback_reports",
] as const;

export type OpsSizeTable = (typeof OPS_SIZE_TABLES)[number];
