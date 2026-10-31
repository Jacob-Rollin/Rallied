import { COMMUNITY_PRICE_USD, TRIAL_DAYS } from "./constants";
import type { PlanId } from "./types";

/** Starter (free / lapsed) concurrent open parties. */
export const STARTER_MAX_OPEN_PARTIES = 2;
/** Starter creates in a rolling 24h window. */
export const STARTER_MAX_CREATES_PER_24H = 5;

/** Default open parties one host may hold at once (Community+ hygiene). */
export const DEFAULT_MAX_OPEN_PARTIES_PER_HOST = 3;
export const MIN_OPEN_PARTIES_PER_HOST = 1;
export const MAX_OPEN_PARTIES_PER_HOST = 10;

export type EffectivePlan = PlanId | "free";

export type CapBlockReason =
  | "open_parties"
  | "creates_24h"
  | "per_host_open"
  | "feature";

export interface ServerEntitlementInput {
  plan: string | null | undefined;
  trial_ends_at?: string | null;
  discord_guild_id?: string | null;
}

export function parseDogfoodGuildIds(
  raw: string | null | undefined,
): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(/[\s,]+/)
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export function isDogfoodGuild(
  guildId: string | null | undefined,
  allowlist: Set<string> | string[] | string | null | undefined,
): boolean {
  if (!guildId) return false;
  const set =
    typeof allowlist === "string"
      ? parseDogfoodGuildIds(allowlist)
      : allowlist instanceof Set
        ? allowlist
        : new Set(allowlist ?? []);
  return set.has(guildId);
}

/** Plans that run under Starter caps (matching OK, reliability off). */
export function isStarterPlan(
  plan: string | null | undefined,
): plan is "free" | "lapsed" {
  return plan === "free" || plan === "lapsed";
}

/** Full LFG + reliability (Community features). Pro extras gated elsewhere. */
export function hasCommunityAccess(plan: string | null | undefined): boolean {
  return (
    plan === "trial" ||
    plan === "community" ||
    plan === "pro" ||
    plan === "founding_pro" ||
    plan === "demo"
  );
}

/**
 * Rallied Mod dashboard roles (Settings → mod_role_ids) — Community+ only.
 * Starter / free / lapsed: no mod login even if roles were previously saved.
 */
export function modDashboardEnabled(plan: string | null | undefined): boolean {
  return hasCommunityAccess(plan);
}

/**
 * Resolve effective plan for gates.
 * Dogfood allowlist → founding_pro (skip caps).
 * Expired trial → free (caller should persist via lapseExpiredTrial).
 */
export function effectivePlan(
  server: ServerEntitlementInput,
  opts?: {
    dogfoodGuildIds?: Set<string> | string[] | string | null;
    now?: Date;
  },
): EffectivePlan {
  const guildId = server.discord_guild_id ?? null;
  if (isDogfoodGuild(guildId, opts?.dogfoodGuildIds)) {
    return "founding_pro";
  }

  const plan = (server.plan ?? "free") as string;
  const now = opts?.now ?? new Date();

  if (plan === "trial") {
    const ends = server.trial_ends_at
      ? new Date(server.trial_ends_at).getTime()
      : NaN;
    if (Number.isFinite(ends) && ends <= now.getTime()) {
      return "free";
    }
    return "trial";
  }

  if (plan === "lapsed") return "lapsed";
  if (plan === "free") return "free";
  if (
    plan === "community" ||
    plan === "pro" ||
    plan === "founding_pro" ||
    plan === "demo"
  ) {
    return plan;
  }
  return "free";
}

export function trialEndsAtFromNow(now = new Date(), days = TRIAL_DAYS): string {
  return new Date(now.getTime() + days * 86400_000).toISOString();
}

/**
 * True when Community Checkout may set trial_period_days: 14.
 * Requires BOTH guild and Checkout Discord user never consumed a trial.
 */
export function isCommunityTrialEligible(opts: {
  trial_consumed_at?: string | null;
  user_trial_consumed_at?: string | null;
}): boolean {
  return !opts.trial_consumed_at && !opts.user_trial_consumed_at;
}

export function reliabilityEnabled(plan: string | null | undefined): boolean {
  return hasCommunityAccess(plan);
}

export function publicPagesEnabled(plan: string | null | undefined): boolean {
  return hasCommunityAccess(plan);
}

/** Opt-in /servers directory listing (Community+/trial — not Starter). */
export function directoryListingEnabled(
  plan: string | null | undefined,
): boolean {
  return hasCommunityAccess(plan);
}

export function digestEnabled(plan: string | null | undefined): boolean {
  return hasCommunityAccess(plan);
}

/** null = unlimited */
export function maxOpenParties(plan: string | null | undefined): number | null {
  return isStarterPlan(plan) ? STARTER_MAX_OPEN_PARTIES : null;
}

/** null = unlimited */
export function maxCreatesPer24h(
  plan: string | null | undefined,
): number | null {
  return isStarterPlan(plan) ? STARTER_MAX_CREATES_PER_24H : null;
}

/** Clamp admin-configured per-host open cap into the sane 1–10 range. */
export function clampOpenPartiesPerHost(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return DEFAULT_MAX_OPEN_PARTIES_PER_HOST;
  return Math.min(
    MAX_OPEN_PARTIES_PER_HOST,
    Math.max(MIN_OPEN_PARTIES_PER_HOST, Math.floor(v)),
  );
}

/**
 * Effective per-host open-party cap in this guild.
 * Community+ / trial / forever_pro: configured value (default 3, range 1–10).
 * Starter: never above the guild open cap (effectively ≤2) — not a harsher story.
 */
export function maxOpenPartiesPerHost(
  plan: string | null | undefined,
  configured: number | null | undefined = DEFAULT_MAX_OPEN_PARTIES_PER_HOST,
): number {
  const capped = clampOpenPartiesPerHost(
    configured ?? DEFAULT_MAX_OPEN_PARTIES_PER_HOST,
  );
  if (isStarterPlan(plan)) {
    return Math.min(STARTER_MAX_OPEN_PARTIES, capped);
  }
  return capped;
}

export function canCreateParty(opts: {
  plan: string | null | undefined;
  openPartyCount: number;
  createsLast24h: number;
  /** Open/filled parties this Discord user currently hosts in the guild. */
  hostedOpenCount: number;
  /** server_settings.max_open_parties_per_host (default 3). */
  maxOpenPartiesPerHost?: number | null;
}): { ok: true } | { ok: false; reason: CapBlockReason; limit: number } {
  const openCap = maxOpenParties(opts.plan);
  if (openCap != null && opts.openPartyCount >= openCap) {
    return { ok: false, reason: "open_parties", limit: openCap };
  }
  const createCap = maxCreatesPer24h(opts.plan);
  if (createCap != null && opts.createsLast24h >= createCap) {
    return { ok: false, reason: "creates_24h", limit: createCap };
  }
  const perHost = maxOpenPartiesPerHost(
    opts.plan,
    opts.maxOpenPartiesPerHost,
  );
  if (opts.hostedOpenCount >= perHost) {
    return { ok: false, reason: "per_host_open", limit: perHost };
  }
  return { ok: true };
}

export function pricingPageUrl(baseUrl: string | null | undefined): string {
  const base = (baseUrl ?? "https://rallied.gg").replace(/\/$/, "");
  return `${base}/pricing`;
}

/** Admin billing (Checkout / Portal). Discord upgrade buttons use this. */
export function billingPageUrl(
  baseUrl: string | null | undefined,
  guildId?: string | null,
): string {
  const base = (baseUrl ?? "https://rallied.gg").replace(/\/$/, "");
  if (guildId) {
    return `${base}/app/billing?guild=${encodeURIComponent(guildId)}`;
  }
  return `${base}/app/billing`;
}

export function upgradeCopy(reason: CapBlockReason | "reliability" | "public"): {
  title: string;
  body: string;
} {
  const price = COMMUNITY_PRICE_USD;
  switch (reason) {
    case "open_parties":
      return {
        title: "Party limit on Starter",
        body: `Starter allows **${STARTER_MAX_OPEN_PARTIES} open parties for this server** (not per user). Busy communities hit this fast — Community **$${price}/mo** = unlimited LFG + Ghostless (per-host open cap is lobby hygiene, not a plan downgrade).`,
      };
    case "creates_24h":
      return {
        title: "Daily create limit on Starter",
        body: `Starter allows **${STARTER_MAX_CREATES_PER_24H} party creates / 24h for this server**. Busy communities hit this fast — Community **$${price}/mo** = unlimited + Ghostless.`,
      };
    case "per_host_open":
      return {
        title: "Too many open parties",
        body: `Close or fill one of your open parties first. This per-host cap stops lobby spam — it is **not** a plan limit.`,
      };
    case "reliability":
      return {
        title: "Included in Community",
        body: `Ghostless, strikes, and lockouts need Community (**$${price}/mo**). Starter keeps LFG under caps **per Discord server**.`,
      };
    case "public":
      return {
        title: "Public page needs Community",
        body: `Publish your server page with Community (**$${price}/mo**).`,
      };
    default:
      return {
        title: "Upgrade to Community",
        body: `Unlock unlimited LFG + Ghostless for **$${price}/mo** (this server).`,
      };
  }
}
