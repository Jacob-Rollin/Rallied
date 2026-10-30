import { COMMUNITY_PRICE_USD, TRIAL_DAYS } from "./constants";
import type { PlanId } from "./types";

/** Starter (free / lapsed) concurrent open parties. */
export const STARTER_MAX_OPEN_PARTIES = 2;
/** Starter creates in a rolling 24h window. */
export const STARTER_MAX_CREATES_PER_24H = 5;

export type EffectivePlan = PlanId | "free";

export type CapBlockReason = "open_parties" | "creates_24h" | "feature";

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

/** True when this guild may still receive Stripe Community trial_period_days. */
export function isCommunityTrialEligible(server: {
  trial_consumed_at?: string | null;
}): boolean {
  return !server.trial_consumed_at;
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

export function canCreateParty(opts: {
  plan: string | null | undefined;
  openPartyCount: number;
  createsLast24h: number;
}): { ok: true } | { ok: false; reason: CapBlockReason; limit: number } {
  const openCap = maxOpenParties(opts.plan);
  if (openCap != null && opts.openPartyCount >= openCap) {
    return { ok: false, reason: "open_parties", limit: openCap };
  }
  const createCap = maxCreatesPer24h(opts.plan);
  if (createCap != null && opts.createsLast24h >= createCap) {
    return { ok: false, reason: "creates_24h", limit: createCap };
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
        body: `Starter allows **${STARTER_MAX_OPEN_PARTIES} open parties for this server** (not per user). Busy communities hit this fast — Community **$${price}/mo** = unlimited LFG + Ghostless.`,
      };
    case "creates_24h":
      return {
        title: "Daily create limit on Starter",
        body: `Starter allows **${STARTER_MAX_CREATES_PER_24H} party creates / 24h for this server**. Busy communities hit this fast — Community **$${price}/mo** = unlimited + Ghostless.`,
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
