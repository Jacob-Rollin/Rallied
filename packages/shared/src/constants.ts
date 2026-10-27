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
} as const;

/**
 * List + Founding prices (cents helpers for Stripe later).
 * Founding = Pro features at $8.99 locked (≤50), NOT Community $3.99.
 */
export const PLANS = {
  trial: {
    id: "trial" as const,
    label: "Trial",
    priceMonthly: 0,
    priceCents: 0,
    annualCents: 0,
  },
  community: {
    id: "community" as const,
    label: "Community",
    priceMonthly: 5.99,
    priceCents: 599,
    annualCents: 5900,
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

export function isProPlan(
  plan: string | null | undefined,
): plan is "pro" | "founding_pro" {
  return plan === "pro" || plan === "founding_pro";
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
 * Send Messages (2048) + Embed Links (16384) + Use Slash Commands (2147483648) + Manage Roles (268435456)
 */
export const BOT_INVITE_PERMISSIONS_VALUE = String(
  2048 + 16384 + 2147483648 + 268435456,
);

export const SLASH_COMMANDS = {
  lfg: "lfg",
  vibe: "vibe",
  strikes: "strikes",
  ghostless: "ghostless",
  dispute: "dispute",
} as const;

/** Custom_id prefixes for message component interactions. */
export const BUTTON_IDS = {
  vibeShowed: "vibe:showed",
  vibeGood: "vibe:good",
  vibeGhosted: "vibe:ghosted",
  disputeOpen: "dispute:open",
} as const;

export function buildBotInviteUrl(clientId: string, permissions = BOT_INVITE_PERMISSIONS_VALUE) {
  const params = new URLSearchParams({
    client_id: clientId,
    permissions,
    scope: "bot applications.commands",
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}
