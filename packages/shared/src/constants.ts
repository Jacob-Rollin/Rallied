/** Brand tokens — coral + Ghostless lime on dark slate (not purple). */
export const BRAND = {
  name: "Rallied",
  domain: "rallied.gg",
  tagline: "LFG for people who actually show up.",
  colors: {
    slate: "#0F1419",
    slateElevated: "#1A222C",
    coral: "#FF5A3D",
    ghostlessLime: "#B8F000",
    muted: "#A8B0B8",
    danger: "#FF5A3D",
  },
} as const;

/** Ghostless = reliability badge feature, not the product umbrella. */
export const GHOSTLESS = {
  name: "Ghostless",
  description: "Per-server show-up reliability",
  defaultRoleThresholdPct: 90,
  defaultMinSessions: 10,
  /**
   * Badge mark: check *inside* the box (U+2611), matching the landing SVG cue.
   * Do not use square-beside-check (▢✓) — that reads as two glyphs.
   */
  mark: "☑",
  /** Empty ballot box when not eligible (optional UI). */
  markEmpty: "☐",
} as const;

/**
 * Path B list + Founding prices (cents helpers for Stripe later).
 * Community $4.99 · Pro $9.99 · Founding = Pro at $8.99 locked (≤10).
 * Starter (free/lapsed) is $0 with caps — see entitlements.ts.
 * Community trial = 14 days via Stripe Checkout (card required, charge after trial).
 * One trial per discord_guild_id (servers.trial_consumed_at) AND per Discord
 * user (trial_consumers.discord_user_id) — not Pro. Both must be eligible.
 */
export const PLANS = {
  trial: {
    id: "trial" as const,
    label: "Trial",
    priceMonthly: 0,
    priceCents: 0,
    annualCents: 0,
  },
  free: {
    id: "free" as const,
    label: "Starter",
    priceMonthly: 0,
    priceCents: 0,
    annualCents: 0,
  },
  community: {
    id: "community" as const,
    label: "Community",
    priceMonthly: 4.99,
    priceCents: 499,
    annualCents: 4900,
  },
  pro: {
    id: "pro" as const,
    label: "Pro",
    priceMonthly: 9.99,
    priceCents: 999,
    annualCents: 9900,
  },
  founding_pro: {
    id: "founding_pro" as const,
    label: "Founding Pro",
    priceMonthly: 8.99,
    priceCents: 899,
    annualCents: 8900,
    seatCap: 10,
  },
} as const;

export const COMMUNITY_PRICE_USD = PLANS.community.priceMonthly;
export const PRO_PRICE_USD = PLANS.pro.priceMonthly;
export const FOUNDING_PRO_PRICE_USD = PLANS.founding_pro.priceMonthly;

export const PAID_PLAN_IDS = ["community", "pro", "founding_pro"] as const;
export const PRO_PLAN_IDS = ["pro", "founding_pro"] as const;

/** Official Rallied Discord — forever Founding Pro (never webhook-downgrade). */
export const OFFICIAL_RALLIED_GUILD_ID = "1564716956198899824";

export type PaidCheckoutPlan = (typeof PAID_PLAN_IDS)[number];
export type BillingInterval = "month" | "year";

export function isProPlan(
  plan: string | null | undefined,
): plan is "pro" | "founding_pro" {
  return plan === "pro" || plan === "founding_pro";
}

export function isPaidPlan(
  plan: string | null | undefined,
): plan is PaidCheckoutPlan {
  return (
    plan === "community" || plan === "pro" || plan === "founding_pro"
  );
}

/**
 * Servers Stripe must never downgrade on cancel/update → free/lapsed.
 * Official guild id, forever_pro flag, or plan already founding_pro.
 */
export function isForeverProProtected(server: {
  discord_guild_id?: string | null;
  plan?: string | null;
  forever_pro?: boolean | null;
}): boolean {
  if (server.forever_pro) return true;
  if (server.discord_guild_id === OFFICIAL_RALLIED_GUILD_ID) return true;
  if (server.plan === "founding_pro") return true;
  return false;
}

/** Title Case plan name for admin UI — never raw snake_case slugs. */
export function planDisplayName(plan: string | null | undefined): string {
  if (!plan) return "Unknown";
  switch (plan) {
    case "founding_pro":
      return PLANS.founding_pro.label;
    case "pro":
      return PLANS.pro.label;
    case "community":
      return PLANS.community.label;
    case "free":
    case "lapsed":
      return "Starter";
    case "trial":
      return PLANS.trial.label;
    case "demo":
      return "Demo";
    default:
      return plan
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
  }
}

/**
 * Admin plan line like "Founding Pro - $8.99/mo".
 * Uses priceLockCents when set; otherwise list price for paid plans.
 * No "lock" / "locked" wording.
 */
export function formatAdminPlanLine(
  plan: string | null | undefined,
  opts?: { priceLockCents?: number | null },
): string {
  const name = planDisplayName(plan);
  const lockCents = opts?.priceLockCents;
  let monthly: number | null = null;
  if (lockCents != null && Number.isFinite(Number(lockCents))) {
    monthly = Number(lockCents) / 100;
  } else if (plan === "founding_pro") {
    monthly = PLANS.founding_pro.priceMonthly;
  } else if (plan === "pro") {
    monthly = PLANS.pro.priceMonthly;
  } else if (plan === "community" || plan === "trial") {
    monthly = PLANS.community.priceMonthly;
  }
  if (monthly == null) return name;
  const price = Number.isInteger(monthly)
    ? String(monthly)
    : monthly.toFixed(2);
  return `${name} - $${price}/mo`;
}

/** Monthly cents to persist on servers.price_lock_cents after Checkout. */
export function priceLockCentsForPlan(
  plan: PaidCheckoutPlan,
): number {
  return PLANS[plan].priceCents;
}

export const LFG_PARTY_STATUSES = ["open", "filled", "closed"] as const;

export const DISPUTE_STATUSES = ["open", "upheld", "overturned"] as const;

/** Feedback / bug inbox (015) — kinds reporters pick. */
export const FEEDBACK_KINDS = ["bug", "suggestion"] as const;

/** Where the report was filed. */
export const FEEDBACK_SURFACES = ["bot", "web", "discord"] as const;

/** Ops status workflow: new → triaging → done | wontfix */
export const FEEDBACK_STATUSES = [
  "new",
  "triaging",
  "done",
  "wontfix",
] as const;

/**
 * Soft-closed LFG parties (`deleted_at` set) stay in DB for host credit /
 * monthly Top hosts. Do **not** hard-delete closed parties on a short timer.
 * @deprecated Use SERVER_INACTIVE_PURGE_DAYS — 14-day party hard-purge is retired.
 */
export const PARTY_PURGE_DAYS = 14;

/**
 * Default inactivity window before optional soft-archive of a guild’s history.
 * Survive `/setup`, bot leave, and reinstall. Only purge (or soft-archive) when
 * there is no bot activity and no new parties for this many days.
 * Easy to change — single product constant.
 */
export const SERVER_INACTIVE_PURGE_DAYS = 90;

export const DEFAULT_GRACE_MINUTES = 5;
export const DEFAULT_STRIKE_THRESHOLD = 3;
export const DEFAULT_LOCKOUT_DAYS = 7;
export const TRIAL_DAYS = 14;

/** Discord OAuth scopes for admin dashboard (no email/password). */
export const DISCORD_OAUTH_SCOPES = ["identify", "guilds"] as const;

/**
 * Bot invite permission integer (decimal string for URL).
 * Manage Channels (16) + View Channel (1024) + Send Messages (2048)
 * + Embed Links (16384) + Connect (1048576) + Move Members (16777216)
 * + Manage Roles (268435456) + Use Application Commands (2147483648)
 * + Create Public Threads (34359738368)
 * + Send Messages in Threads (274877906944)
 */
export const BOT_INVITE_PERMISSIONS_VALUE = "311671409680";

export const SLASH_COMMANDS = {
  lfg: "lfg",
  setup: "setup",
  vibe: "vibe",
  strikes: "strikes",
  ghostless: "ghostless",
  dispute: "dispute",
  leaderboard: "leaderboard",
  feedback: "feedback",
} as const;

/** Custom_id prefixes for message component interactions. */
export const BUTTON_IDS = {
  vibeShowed: "vibe:showed",
  vibeGood: "vibe:good",
  vibeGhosted: "vibe:ghosted",
  vibeScore: "vibe:score",
  vibePick: "vibe:pick",
  disputeOpen: "dispute:open",
  lfgJoin: "lfg:join",
  lfgLeave: "lfg:leave",
  lfgClose: "lfg:close",
  lfgJoinSelect: "lfg:joinselect",
  lfgVibe: "lfg:vibe",
  lfgReady: "lfg:ready",
  lfgReadyUp: "lfg:readyup",
  lfgDeskCreate: "lfg:desk:create",
  lfgDeskFind: "lfg:desk:find",
  lfgDeskMine: "lfg:desk:mine",
  lfgDeskHelp: "lfg:desk:help",
  lfgDeskLeaderboard: "lfg:desk:leaderboard",
  lfgCreateGame: "lfg:creategame",
  lfgFindGame: "lfg:findgame",
  lfgCreateSubmit: "lfg:createsubmit",
} as const;

export function buildBotInviteUrl(clientId: string, permissions = BOT_INVITE_PERMISSIONS_VALUE) {
  const params = new URLSearchParams({
    client_id: clientId,
    permissions,
    scope: "bot applications.commands",
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

/** Discord CDN guild icon from OAuth/bot icon hash. */
export function discordGuildIconUrl(
  guildId: string,
  iconHash: string | null | undefined,
  size = 128,
): string | null {
  if (!guildId || !iconHash) return null;
  const ext = iconHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${ext}?size=${size}`;
}
