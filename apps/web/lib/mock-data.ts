import type {
  Dispute,
  GhostlessStats,
  LfgParty,
  Lockout,
  Member,
  Server,
  ServerSettings,
  Strike,
} from "@rallied/shared";
import { PLANS } from "@rallied/shared";

/** Placeholder guild mark for demo Pro vanity (not the Rallied square). */
export const DEMO_GUILD_ICON_URL = "/brand/demo-guild-icon.svg";

export const MOCK_SERVERS: Server[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    discord_guild_id: "demo-guild-1",
    name: "Demo Esports Lounge",
    plan: "community",
    price_lock_cents: PLANS.community.priceCents,
    trial_ends_at: null,
    trial_consumed_at: "2026-10-01T00:00:00Z",
    priority_support: false,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    billing_interval: null,
    forever_pro: false,
    icon_url: DEMO_GUILD_ICON_URL,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  },
  {
    id: "11111111-1111-1111-1111-111111111112",
    discord_guild_id: "demo-guild-2",
    name: "Night Queue HQ",
    plan: "trial",
    price_lock_cents: null,
    trial_ends_at: new Date(Date.now() + 10 * 86400_000).toISOString(),
    trial_consumed_at: "2026-10-10T00:00:00Z",
    priority_support: false,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    billing_interval: null,
    forever_pro: false,
    icon_url: DEMO_GUILD_ICON_URL,
    created_at: "2026-10-10T00:00:00Z",
    updated_at: "2026-10-10T00:00:00Z",
  },
  {
    id: "11111111-1111-1111-1111-111111111113",
    discord_guild_id: "demo-guild-founding",
    name: "Founding Beta Squad",
    plan: "founding_pro",
    price_lock_cents: PLANS.founding_pro.priceCents,
    trial_ends_at: null,
    trial_consumed_at: null,
    priority_support: true,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    billing_interval: null,
    forever_pro: true,
    icon_url: DEMO_GUILD_ICON_URL,
    created_at: "2026-10-05T00:00:00Z",
    updated_at: "2026-10-05T00:00:00Z",
  },
  {
    id: "11111111-1111-1111-1111-111111111114",
    discord_guild_id: "demo-guild-mod",
    name: "Mod Preview Lounge",
    plan: "community",
    price_lock_cents: PLANS.community.priceCents,
    trial_ends_at: null,
    trial_consumed_at: "2026-10-01T00:00:00Z",
    priority_support: false,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    billing_interval: null,
    forever_pro: false,
    icon_url: DEMO_GUILD_ICON_URL,
    created_at: "2026-10-12T00:00:00Z",
    updated_at: "2026-10-12T00:00:00Z",
  },
];

export const MOCK_MEMBERS: Member[] = [
  {
    id: "22222222-2222-2222-2222-222222222201",
    server_id: MOCK_SERVERS[0].id,
    discord_user_id: "user-aria",
    display_name: "Aria",
    avatar_url: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  },
  {
    id: "22222222-2222-2222-2222-222222222202",
    server_id: MOCK_SERVERS[0].id,
    discord_user_id: "user-ben",
    display_name: "Ben",
    avatar_url: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  },
  {
    id: "22222222-2222-2222-2222-222222222203",
    server_id: MOCK_SERVERS[0].id,
    discord_user_id: "user-casey",
    display_name: "Casey",
    avatar_url: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  },
  {
    id: "22222222-2222-2222-2222-222222222204",
    server_id: MOCK_SERVERS[0].id,
    discord_user_id: "user-dev",
    display_name: "Dev",
    avatar_url: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  },
];

export const MOCK_PARTIES: (LfgParty & { host_name: string; filled: number })[] = [
  {
    id: "33333333-3333-3333-3333-333333333301",
    server_id: MOCK_SERVERS[0].id,
    host_member_id: MOCK_MEMBERS[0].id,
    host_name: "Aria",
    game: "Valorant",
    rank_text: "Diamond+",
    slots: 5,
    filled: 2,
    status: "open",
    expires_at: new Date(Date.now() + 2 * 3600_000).toISOString(),
    scheduled_start_at: new Date(Date.now() + 3 * 3600_000).toISOString(),
    created_at: new Date(Date.now() - 20 * 60_000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "33333333-3333-3333-3333-333333333302",
    server_id: MOCK_SERVERS[0].id,
    host_member_id: MOCK_MEMBERS[2].id,
    host_name: "Casey",
    game: "League of Legends",
    rank_text: "Gold–Plat",
    slots: 5,
    filled: 5,
    status: "filled",
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
    scheduled_start_at: new Date(Date.now() + 26 * 3600_000).toISOString(),
    created_at: new Date(Date.now() - 45 * 60_000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "33333333-3333-3333-3333-333333333303",
    server_id: MOCK_SERVERS[0].id,
    host_member_id: MOCK_MEMBERS[1].id,
    host_name: "Ben",
    game: "Overwatch 2",
    rank_text: "Any",
    slots: 5,
    filled: 3,
    status: "closed",
    expires_at: null,
    created_at: new Date(Date.now() - 5 * 3600_000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "33333333-3333-3333-3333-333333333304",
    server_id: MOCK_SERVERS[0].id,
    host_member_id: MOCK_MEMBERS[3].id,
    host_name: "Dev",
    game: "Marvel Rivals",
    rank_text: "Plat+",
    slots: 6,
    filled: 4,
    status: "open",
    expires_at: new Date(Date.now() + 90 * 60_000).toISOString(),
    scheduled_start_at: new Date(Date.now() + 72 * 3600_000).toISOString(),
    created_at: new Date(Date.now() - 8 * 60_000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const MOCK_GHOSTLESS: Record<string, GhostlessStats> = {
  [MOCK_MEMBERS[0].id]: {
    server_id: MOCK_SERVERS[0].id,
    member_id: MOCK_MEMBERS[0].id,
    shows: 18,
    ghosts: 1,
    vibe_sum: 72,
    vibe_count: 16,
    vibe_avg: 4.5,
    show_rate_pct: 94.7,
    updated_at: "2026-10-20T00:00:00Z",
  },
  [MOCK_MEMBERS[1].id]: {
    server_id: MOCK_SERVERS[0].id,
    member_id: MOCK_MEMBERS[1].id,
    shows: 9,
    ghosts: 3,
    vibe_sum: 28,
    vibe_count: 8,
    vibe_avg: 3.5,
    show_rate_pct: 75,
    updated_at: "2026-10-20T00:00:00Z",
  },
  [MOCK_MEMBERS[2].id]: {
    server_id: MOCK_SERVERS[0].id,
    member_id: MOCK_MEMBERS[2].id,
    shows: 22,
    ghosts: 0,
    vibe_sum: 95,
    vibe_count: 20,
    vibe_avg: 4.75,
    show_rate_pct: 100,
    updated_at: "2026-10-20T00:00:00Z",
  },
  [MOCK_MEMBERS[3].id]: {
    server_id: MOCK_SERVERS[0].id,
    member_id: MOCK_MEMBERS[3].id,
    shows: 4,
    ghosts: 2,
    vibe_sum: 12,
    vibe_count: 4,
    vibe_avg: 3,
    show_rate_pct: 66.7,
    updated_at: "2026-10-20T00:00:00Z",
  },
};

export const MOCK_STRIKES: Strike[] = [
  {
    id: "s1",
    server_id: MOCK_SERVERS[0].id,
    member_id: MOCK_MEMBERS[1].id,
    reason: "No-show after ready check",
    created_by: MOCK_MEMBERS[0].id,
    active: true,
    created_at: "2026-10-18T00:00:00Z",
  },
  {
    id: "s2",
    server_id: MOCK_SERVERS[0].id,
    member_id: MOCK_MEMBERS[3].id,
    reason: "Left mid-queue after ready",
    created_by: MOCK_MEMBERS[0].id,
    active: true,
    created_at: "2026-10-21T00:00:00Z",
  },
];

export const MOCK_LOCKOUTS: Lockout[] = [
  {
    id: "l1",
    server_id: MOCK_SERVERS[0].id,
    member_id: MOCK_MEMBERS[3].id,
    until: new Date(Date.now() + 3 * 86400_000).toISOString(),
    reason: "Repeated ghosts this server",
    created_at: "2026-10-22T00:00:00Z",
  },
];

export function getMember(id: string) {
  return MOCK_MEMBERS.find((m) => m.id === id);
}

export function strikesFor(memberId: string) {
  return MOCK_STRIKES.filter((s) => s.member_id === memberId && s.active);
}

export function lockoutFor(memberId: string) {
  const now = Date.now();
  return (
    MOCK_LOCKOUTS.find(
      (l) => l.member_id === memberId && new Date(l.until).getTime() > now,
    ) ?? null
  );
}

export const MOCK_SETTINGS: ServerSettings = {
  server_id: MOCK_SERVERS[0].id,
  grace_minutes: 5,
  ghostless_role_id: null,
  ghostless_role_threshold_pct: 90,
  ghostless_role_min_sessions: 10,
  digest_channel_id: null,
  mod_role_ids: ["demo-role-mod"],
  strike_threshold: 3,
  lockout_days: 7,
  join_min_ghostless_pct: null,
  join_lockout_enforced: true,
  slug: "demo-esports",
  public_page_enabled: true,
  public_member_list: false,
  list_in_directory: true,
  discord_invite_url: "https://discord.gg/rallied-demo",
  hide_powered_by: false,
  public_accent: null,
  ical_token: null,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
};

/** Founding Pro demo — vanity on */
export const MOCK_FOUNDING_SETTINGS: ServerSettings = {
  ...MOCK_SETTINGS,
  server_id: MOCK_SERVERS[2].id,
  slug: "founding-beta",
  public_page_enabled: true,
  public_member_list: true,
  list_in_directory: true,
  discord_invite_url: "https://discord.gg/rallied-founding",
  hide_powered_by: true,
  public_accent: "#B8F000",
  ical_token: "demo-ical-token-founding",
};

export const MOCK_DISPUTES: (Dispute & {
  opener_name: string;
  subject: string;
})[] = [
  {
    id: "d1",
    server_id: MOCK_SERVERS[0].id,
    strike_id: "s1",
    vibe_check_id: null,
    opener_member_id: MOCK_MEMBERS[1].id,
    opener_name: "Ben",
    subject: "Strike: No-show after ready check",
    status: "open",
    resolver_member_id: null,
    notes: "I was in VC — lag kicked me",
    created_at: "2026-10-19T00:00:00Z",
    resolved_at: null,
  },
  {
    id: "d2",
    server_id: MOCK_SERVERS[0].id,
    strike_id: null,
    vibe_check_id: "v-mock",
    opener_member_id: MOCK_MEMBERS[3].id,
    opener_name: "Dev",
    subject: "Ghosted flag on Valorant party",
    status: "upheld",
    resolver_member_id: MOCK_MEMBERS[0].id,
    notes: "Confirmed AFK > grace window",
    created_at: "2026-10-15T00:00:00Z",
    resolved_at: "2026-10-16T00:00:00Z",
  },
];

/** Soft weekly analytics series for Pro trends chart (mock). */
export const MOCK_ANALYTICS_TREND = [
  { day: "Mon", parties: 4, vibes: 12, ghosts: 1 },
  { day: "Tue", parties: 6, vibes: 18, ghosts: 2 },
  { day: "Wed", parties: 3, vibes: 9, ghosts: 0 },
  { day: "Thu", parties: 8, vibes: 22, ghosts: 3 },
  { day: "Fri", parties: 11, vibes: 30, ghosts: 2 },
  { day: "Sat", parties: 14, vibes: 40, ghosts: 4 },
  { day: "Sun", parties: 9, vibes: 25, ghosts: 1 },
];

/** Prior 7 days — for week-over-week deltas in Pro analytics. */
export const MOCK_ANALYTICS_TREND_PRIOR = [
  { day: "Mon", parties: 3, vibes: 10, ghosts: 2 },
  { day: "Tue", parties: 5, vibes: 14, ghosts: 1 },
  { day: "Wed", parties: 4, vibes: 11, ghosts: 1 },
  { day: "Thu", parties: 6, vibes: 16, ghosts: 2 },
  { day: "Fri", parties: 9, vibes: 24, ghosts: 3 },
  { day: "Sat", parties: 11, vibes: 32, ghosts: 5 },
  { day: "Sun", parties: 7, vibes: 20, ghosts: 2 },
];

/** Soft Pro extras (demo / mock only). */
export const MOCK_ANALYTICS_EXTRAS = {
  showRatePct: 91.2,
  avgVibe: 4.3,
  readyCheckCompletionPct: 86,
  /** Prior 7d baselines for WoW on soft metrics. */
  priorShowRatePct: 88.5,
  priorAvgVibe: 4.1,
  priorReadyCheckCompletionPct: 81,
};
