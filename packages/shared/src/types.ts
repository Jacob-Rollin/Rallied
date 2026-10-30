import type { DISPUTE_STATUSES, LFG_PARTY_STATUSES } from "./constants";

export type PlanId =
  | "trial"
  | "free"
  | "community"
  | "pro"
  | "founding_pro"
  | "lapsed"
  | "demo";

export type LfgPartyStatus = (typeof LFG_PARTY_STATUSES)[number];

export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export interface Server {
  id: string;
  discord_guild_id: string;
  name: string;
  plan: PlanId;
  /** Effective monthly price lock in cents (499 / 899 / 999 …) */
  price_lock_cents: number | null;
  trial_ends_at: string | null;
  priority_support: boolean;
  stripe_customer_id: string | null;
  /** Discord guild icon CDN URL (Pro public page vanity) */
  icon_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServerSettings {
  server_id: string;
  grace_minutes: number;
  ghostless_role_id: string | null;
  ghostless_role_threshold_pct: number;
  ghostless_role_min_sessions: number;
  digest_channel_id: string | null;
  strike_threshold: number;
  lockout_days: number;
  /** Vanity path for /s/[slug]; null → use discord_guild_id */
  slug: string | null;
  /** Public /s/[…] page on/off (default true) */
  public_page_enabled: boolean;
  /**
   * When true, show broader Ghostless spotlight/list on public page.
   * Default false = Ghostless-only top reliable (still no strike data).
   */
  public_member_list: boolean;
  /**
   * Opt into the public /servers directory (default false).
   * Still requires public_page_enabled + Community+/trial to appear.
   */
  list_in_directory: boolean;
  /** Discord invite URL for Join on /servers (admin-set). */
  discord_invite_url: string | null;
  /** Pro vanity: hide “Powered by Rallied” on public page */
  hide_powered_by: boolean;
  /** Pro vanity: optional accent hex for public page chrome */
  public_accent: string | null;
  /**
   * Opaque token for Pro iCal subscribe URL (`/api/ical/<guild>?token=…`).
   * Null = feed not enabled / rotated off. Never expose on public pages.
   */
  ical_token?: string | null;
  /**
   * Optional Join gate: min Ghostless show-rate % (this server) to join.
   * Null = off. Community+. Bot enforcement may land separately.
   */
  join_min_ghostless_pct?: number | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardUser {
  discord_user_id: string;
  username: string;
  global_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  server_id: string;
  discord_user_id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LfgParty {
  id: string;
  server_id: string;
  host_member_id: string;
  game: string;
  rank_text: string;
  /** Mic preference: Required | Optional | Any | empty (008). */
  mic?: string;
  /** Free-text region filter (008). */
  region?: string;
  slots: number;
  status: LfgPartyStatus;
  expires_at: string | null;
  discord_message_id?: string | null;
  discord_channel_id?: string | null;
  /** Squad discussion thread under the party card (005). */
  discord_thread_id?: string | null;
  /** Temp voice channel for this party (008). */
  discord_voice_channel_id?: string | null;
  /** Optional one-shot start; Worker reminds ~T-10m (008). */
  scheduled_start_at?: string | null;
  schedule_reminder_sent_at?: string | null;
  /** Ready check + grace (006). */
  ready_check_started_at?: string | null;
  ready_check_message_id?: string | null;
  ready_check_channel_id?: string | null;
  grace_ends_at?: string | null;
  ready_check_resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LfgPartyMember {
  id: string;
  party_id: string;
  member_id: string;
  role: "host" | "member" | "waitlist";
  joined_at: string;
  /** Set when the member taps Ready during a ready check (006). */
  ready_at?: string | null;
}

export interface VibeCheck {
  id: string;
  party_id: string;
  rater_id: string;
  ratee_id: string;
  showed_up: boolean;
  vibe_score: number | null;
  ghosted: boolean;
  note: string | null;
  created_at: string;
}

export interface Strike {
  id: string;
  server_id: string;
  member_id: string;
  reason: string;
  created_by: string | null;
  active: boolean;
  created_at: string;
}

export interface Lockout {
  id: string;
  server_id: string;
  member_id: string;
  until: string;
  reason: string;
  created_at: string;
}

export interface Dispute {
  id: string;
  server_id: string;
  strike_id: string | null;
  vibe_check_id: string | null;
  opener_member_id: string;
  status: DisputeStatus;
  resolver_member_id: string | null;
  notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

/** Per-server aggregates only — never treat as a global grade. */
export interface GhostlessStats {
  server_id: string;
  member_id: string;
  shows: number;
  ghosts: number;
  vibe_sum: number;
  vibe_count: number;
  vibe_avg: number | null;
  show_rate_pct: number | null;
  updated_at: string;
}

export interface PlayerCardData {
  member: Member;
  ghostless: GhostlessStats | null;
  activeStrikes: Strike[];
  activeLockout: Lockout | null;
}

/** Guild the signed-in admin can manage in the dashboard. */
export interface AdminGuild {
  id: string;
  name: string;
  icon: string | null;
  bot_present: boolean;
  plan?: PlanId;
}
