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
 * Community $4.99 · Pro $9.99 · Founding = Pro at $8.99 locked (≤50).
 * Starter (free/lapsed) is $0 with caps — see entitlements.ts.
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
    seatCap: 50,
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

/** Monthly cents to persist on servers.price_lock_cents after Checkout. */
export function priceLockCentsForPlan(
  plan: PaidCheckoutPlan,
): number {
  return PLANS[plan].priceCents;
}

export const LFG_PARTY_STATUSES = ["open", "filled", "closed"] as const;

export const DISPUTE_STATUSES = ["open", "upheld", "overturned"] as const;

export const PARTY_PURGE_DAYS = 14;

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
