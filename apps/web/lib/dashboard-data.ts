/**
 * Admin dashboard data: live Supabase by discord_guild_id, or mock for demo guilds.
 * Service role is required for live reads (RLS has no anon policies).
 */
import type {
  Dispute,
  GhostlessStats,
  Lockout,
  Member,
  PlanId,
  ResolvedDashboardRange,
  Server,
  ServerSettings,
  Strike,
} from "@rallied/shared";
import {
  DEFAULT_DASHBOARD_RANGE,
  monthStartUtc,
  resolveDashboardRange,
  utcDayKey,
  utcDayOfMonthLabel,
  utcMonthDayLabel,
  utcMonthLabel,
  utcWeekdayLabel,
  weekStartUtc,
  type DashboardRangeKey,
} from "@rallied/shared";
import {
  MOCK_ANALYTICS_EXTRAS,
  MOCK_ANALYTICS_TREND,
  MOCK_ANALYTICS_TREND_PRIOR,
  MOCK_DISPUTES,
  MOCK_FOUNDING_SETTINGS,
  MOCK_GHOSTLESS,
  MOCK_LOCKOUTS,
  MOCK_MEMBERS,
  MOCK_PARTIES,
  MOCK_SERVERS,
  MOCK_SETTINGS,
  MOCK_STRIKES,
  getMember,
  lockoutFor,
  strikesFor,
} from "./mock-data";
import {
  buildMonthlyLeaderboard,
  type MonthlyLeaderboard,
} from "./leaderboard";
import {
  buildReliabilityHealth,
  MOCK_RELIABILITY_HEALTH,
  type ReliabilityHealth,
} from "./reliability-health";
import { fetchGuildMetaFromDiscord } from "./auth/discord";
import { isUsableServerName } from "./server-display-name";
import { getServiceSupabase, hasServiceRole } from "./supabase";
import { isDemoGuildId } from "./guild-params";

export type DashboardParty = {
  id: string;
  server_id: string;
  host_member_id: string;
  host_name: string;
  game: string;
  rank_text: string;
  slots: number;
  filled: number;
  status: "open" | "filled" | "closed";
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  discord_channel_id?: string | null;
  scheduled_start_at?: string | null;
};

export type UpcomingScheduledParty = {
  id: string;
  game: string;
  host_name: string;
  scheduled_start_at: string;
  status: "open" | "filled" | "closed";
  slots: number;
  filled: number;
};

export type DashboardDispute = Dispute & {
  opener_name: string;
  subject: string;
};

export type DashboardPerson = {
  member: Member;
  ghostless: GhostlessStats | null;
  strikes: Strike[];
  lockout: Lockout | null;
};

export type AnalyticsTrendPoint = {
  day: string;
  parties: number;
  vibes: number;
  ghosts: number;
};

export type AnalyticsExtras = {
  showRatePct: number | null;
  avgVibe: number | null;
  readyCheckCompletionPct: number | null;
  /** Prior 7d for WoW on soft metrics (mock / when available). */
  priorShowRatePct?: number | null;
  priorAvgVibe?: number | null;
  priorReadyCheckCompletionPct?: number | null;
};

export type AnalyticsTopPlayer = {
  name: string;
  showRatePct: number | null;
  vibeAvg: number | null;
};

export type DashboardSource = "live" | "mock" | "empty";

export type DashboardBundle = {
  source: DashboardSource;
  guildId: string;
  /** False when live path wanted but SUPABASE_SERVICE_ROLE_KEY missing */
  liveAvailable: boolean;
  /** Active dashboard time range (UI filter only). */
  range: ResolvedDashboardRange;
  server: Server | null;
  settings: ServerSettings | null;
  parties: DashboardParty[];
  openPartyCount: number;
  members: DashboardPerson[];
  memberCount: number;
  activeStrikeCount: number;
  disputes: DashboardDispute[];
  analyticsTrend: AnalyticsTrendPoint[];
  /** Prior window when available (mock / live WoW). */
  analyticsTrendPrior: AnalyticsTrendPoint[];
  analyticsExtras: AnalyticsExtras | null;
  /** Top members by Ghostless show rate (lifetime board stats). */
  analyticsTopPlayers: AnalyticsTopPlayer[];
  /** Per-server Most reliable (lifetime) + Top hosts (range-scoped). */
  monthlyLeaderboard: MonthlyLeaderboard | null;
  /** Overview reliability health (Community lite / Pro trends). */
  reliabilityHealth: ReliabilityHealth | null;
  /** Next open/filled parties with scheduled_start_at. */
  upcomingScheduled: UpcomingScheduledParty[];
  notice: string | null;
};

function normalizePlan(plan: string | null | undefined): PlanId {
  const p = (plan || "trial") as PlanId;
  const allowed: PlanId[] = [
    "trial",
    "free",
    "community",
    "pro",
    "founding_pro",
    "lapsed",
    "demo",
  ];
  if (allowed.includes(p)) return p;
  return "trial";
}

function mapServerRow(row: Record<string, unknown>): Server {
  const intervalRaw = row.billing_interval;
  const billing_interval =
    intervalRaw === "year" || intervalRaw === "month"
      ? intervalRaw
      : null;
  return {
    id: String(row.id),
    discord_guild_id: String(row.discord_guild_id),
    name: String(row.name ?? ""),
    plan: normalizePlan(row.plan as string | undefined),
    price_lock_cents:
      row.price_lock_cents == null ? null : Number(row.price_lock_cents),
    trial_ends_at: (row.trial_ends_at as string | null) ?? null,
    trial_consumed_at: (row.trial_consumed_at as string | null) ?? null,
    priority_support: Boolean(row.priority_support),
    stripe_customer_id: (row.stripe_customer_id as string | null) ?? null,
    stripe_subscription_id:
      (row.stripe_subscription_id as string | null) ?? null,
    stripe_price_id: (row.stripe_price_id as string | null) ?? null,
    billing_interval,
    forever_pro: Boolean(row.forever_pro),
    icon_url: (row.icon_url as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapSettingsRow(row: Record<string, unknown>): ServerSettings {
  const rawMod = row.mod_role_ids;
  const mod_role_ids = Array.isArray(rawMod)
    ? rawMod.map((id) => String(id)).filter(Boolean)
    : [];
  return {
    server_id: String(row.server_id),
    grace_minutes: Number(row.grace_minutes ?? 5),
    ghostless_role_id: (row.ghostless_role_id as string | null) ?? null,
    ghostless_role_threshold_pct: Number(
      row.ghostless_role_threshold_pct ?? 90,
    ),
    ghostless_role_min_sessions: Number(row.ghostless_role_min_sessions ?? 10),
    digest_channel_id: (row.digest_channel_id as string | null) ?? null,
    mod_role_ids,
    strike_threshold: Number(row.strike_threshold ?? 3),
    lockout_days: Number(row.lockout_days ?? 7),
    join_min_ghostless_pct:
      row.join_min_ghostless_pct == null
        ? null
        : Number(row.join_min_ghostless_pct),
    join_lockout_enforced: row.join_lockout_enforced !== false,
    slug: (row.slug as string | null) ?? null,
    public_page_enabled: row.public_page_enabled !== false,
    public_member_list: Boolean(row.public_member_list),
    list_in_directory: Boolean(row.list_in_directory),
    discord_invite_url: (row.discord_invite_url as string | null) ?? null,
    hide_powered_by: Boolean(row.hide_powered_by),
    public_accent: (row.public_accent as string | null) ?? null,
    ical_token: (row.ical_token as string | null | undefined) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mockServerForGuild(guildId: string): Server {
  return (
    MOCK_SERVERS.find((s) => s.discord_guild_id === guildId) ?? MOCK_SERVERS[0]
  );
}

function mockSettingsForServer(server: Server): ServerSettings {
  if (server.id === MOCK_SERVERS[2].id) return MOCK_FOUNDING_SETTINGS;
  if (server.id === MOCK_SERVERS[0].id) return MOCK_SETTINGS;
  return { ...MOCK_SETTINGS, server_id: server.id, slug: null };
}

function topPlayersFromMembers(
  people: DashboardPerson[],
  limit = 3,
): AnalyticsTopPlayer[] {
  return [...people]
    .filter((p) => p.ghostless != null)
    .sort((a, b) => {
      const rate =
        (b.ghostless?.show_rate_pct ?? 0) - (a.ghostless?.show_rate_pct ?? 0);
      if (rate !== 0) return rate;
      return (b.ghostless?.vibe_avg ?? 0) - (a.ghostless?.vibe_avg ?? 0);
    })
    .slice(0, limit)
    .map((p) => ({
      name: p.member.display_name,
      showRatePct: p.ghostless?.show_rate_pct ?? null,
      vibeAvg: p.ghostless?.vibe_avg ?? null,
    }));
}

function upcomingFromParties(
  parties: DashboardParty[],
): UpcomingScheduledParty[] {
  const now = Date.now();
  return parties
    .filter(
      (p) =>
        p.scheduled_start_at &&
        new Date(p.scheduled_start_at).getTime() >= now &&
        (p.status === "open" || p.status === "filled"),
    )
    .sort(
      (a, b) =>
        new Date(a.scheduled_start_at!).getTime() -
        new Date(b.scheduled_start_at!).getTime(),
    )
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      game: p.game,
      host_name: p.host_name,
      scheduled_start_at: p.scheduled_start_at!,
      status: p.status,
      slots: p.slots,
      filled: p.filled,
    }));
}

function mockTrendForRange(
  range: ResolvedDashboardRange,
): { trend: AnalyticsTrendPoint[]; prior: AnalyticsTrendPoint[] } {
  if (range.key === "week") {
    return {
      trend: MOCK_ANALYTICS_TREND,
      prior: MOCK_ANALYTICS_TREND_PRIOR,
    };
  }
  // Stretch the weekly mock across longer windows for demo.
  const base = MOCK_ANALYTICS_TREND;
  const priorBase = MOCK_ANALYTICS_TREND_PRIOR;
  if (range.chartMode === "month") {
    const trend: AnalyticsTrendPoint[] = [];
    const prior: AnalyticsTrendPoint[] = [];
    const thisMonth = monthStartUtc(range.end);
    for (let m = 11; m >= 0; m--) {
      const d = new Date(thisMonth);
      d.setUTCMonth(d.getUTCMonth() - m);
      const b = base[m % base.length]!;
      trend.push({
        day: utcMonthLabel(d),
        parties: b.parties * 3 + (m % 4),
        vibes: b.vibes * 2 + (m % 5),
        ghosts: b.ghosts,
      });
      if (m >= 6) {
        const pb = priorBase[m % priorBase.length]!;
        prior.push({
          day: utcMonthLabel(d),
          parties: pb.parties * 2,
          vibes: pb.vibes,
          ghosts: pb.ghosts,
        });
      }
    }
    return { trend, prior };
  }
  if (range.chartMode === "week") {
    const trend: AnalyticsTrendPoint[] = [];
    const prior: AnalyticsTrendPoint[] = [];
    for (let w = 11; w >= 0; w--) {
      const d = weekStartUtc(range.end);
      d.setUTCDate(d.getUTCDate() - 7 * w);
      const b = base[w % base.length]!;
      trend.push({
        day: utcMonthDayLabel(d),
        parties: b.parties + (w % 3),
        vibes: b.vibes + (w % 5),
        ghosts: b.ghosts,
      });
      if (w >= 6) {
        const pb = priorBase[w % priorBase.length]!;
        prior.push({
          day: utcMonthDayLabel(d),
          parties: pb.parties,
          vibes: pb.vibes,
          ghosts: pb.ghosts,
        });
      }
    }
    return { trend, prior };
  }
  // Daily: calendar month or rolling 30d — always fill every UTC day in range.
  const start =
    range.start ??
    (() => {
      const d = new Date(range.end);
      d.setUTCDate(d.getUTCDate() - 29);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    })();
  const endDay = new Date(range.end);
  endDay.setUTCHours(0, 0, 0, 0);
  const dayLabel =
    range.key === "month" ? utcDayOfMonthLabel : utcMonthDayLabel;
  const trend: AnalyticsTrendPoint[] = [];
  const prior: AnalyticsTrendPoint[] = [];
  const cursor = new Date(start);
  cursor.setUTCHours(0, 0, 0, 0);
  let i = 0;
  while (cursor.getTime() <= endDay.getTime()) {
    const b = base[i % base.length]!;
    const label = dayLabel(cursor);
    trend.push({
      day: label,
      parties: b.parties,
      vibes: b.vibes,
      ghosts: b.ghosts,
    });
    const pb = priorBase[i % priorBase.length]!;
    prior.push({
      day: label,
      parties: pb.parties,
      vibes: pb.vibes,
      ghosts: pb.ghosts,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    i += 1;
  }
  return { trend, prior };
}

function buildMockBundle(
  guildId: string,
  rangeKey: DashboardRangeKey = DEFAULT_DASHBOARD_RANGE,
): DashboardBundle {
  const range = resolveDashboardRange(rangeKey);
  const server = mockServerForGuild(guildId);
  const contentId =
    server.id === MOCK_SERVERS[2].id ? MOCK_SERVERS[0].id : server.id;
  const parties: DashboardParty[] = MOCK_PARTIES.filter(
    (p) => p.server_id === contentId,
  ).map((p) => ({
    id: p.id,
    server_id: p.server_id,
    host_member_id: p.host_member_id,
    host_name: p.host_name,
    game: p.game,
    rank_text: p.rank_text,
    slots: p.slots,
    filled: p.filled,
    status: p.status,
    expires_at: p.expires_at,
    created_at: p.created_at,
    updated_at: p.updated_at,
    scheduled_start_at: p.scheduled_start_at ?? null,
  }));
  const members = MOCK_MEMBERS.filter((m) => m.server_id === contentId).map(
    (m) => ({
      member: m,
      ghostless: MOCK_GHOSTLESS[m.id] ?? null,
      strikes: strikesFor(m.id),
      lockout: lockoutFor(m.id),
    }),
  );
  const disputes = MOCK_DISPUTES.filter((d) => d.server_id === contentId);
  const activeStrikeCount = MOCK_STRIKES.filter(
    (s) => s.server_id === contentId && s.active,
  ).length;
  const { trend, prior } = mockTrendForRange(range);
  const reliabilityScale =
    range.key === "week" ? 1 : range.key === "month" ? 1.4 : range.key === "30d" ? 1.6 : 2.2;

  return {
    source: "mock",
    guildId,
    liveAvailable: hasServiceRole(),
    range,
    server,
    settings: mockSettingsForServer(server),
    parties,
    openPartyCount: parties.filter((p) => p.status === "open").length,
    members,
    memberCount: members.length,
    activeStrikeCount,
    disputes,
    analyticsTrend: trend,
    analyticsTrendPrior: prior,
    analyticsExtras: MOCK_ANALYTICS_EXTRAS,
    analyticsTopPlayers: topPlayersFromMembers(members),
    monthlyLeaderboard: buildMonthlyLeaderboard({
      members: members.map((m) => m.member),
      ghostless: members
        .filter((m) => m.ghostless)
        .map((m) => ({
          member_id: m.member.id,
          shows: m.ghostless!.shows,
          ghosts: m.ghostless!.ghosts,
          show_rate_pct: m.ghostless!.show_rate_pct,
        })),
      parties: parties.map((p) => ({
        host_member_id: p.host_member_id,
        created_at: p.created_at,
      })),
      since: range.start,
      periodLabel: range.heading,
    }),
    reliabilityHealth: {
      ...MOCK_RELIABILITY_HEALTH,
      openDisputes: disputes.filter((d) => d.status === "open").length,
      standbyPromotionsThisWeek: Math.round(
        (MOCK_RELIABILITY_HEALTH.standbyPromotionsThisWeek ?? 0) *
          reliabilityScale,
      ),
    },
    upcomingScheduled: upcomingFromParties(parties),
    notice: "Demo / mock data — not a live guild.",
  };
}

function emptyBundle(
  guildId: string,
  notice: string,
  server: Server | null = null,
  rangeKey: DashboardRangeKey = DEFAULT_DASHBOARD_RANGE,
): DashboardBundle {
  return {
    source: "empty",
    guildId,
    liveAvailable: hasServiceRole(),
    range: resolveDashboardRange(rangeKey),
    server,
    settings: null,
    parties: [],
    openPartyCount: 0,
    members: [],
    memberCount: 0,
    activeStrikeCount: 0,
    disputes: [],
    analyticsTrend: [],
    analyticsTrendPrior: [],
    analyticsExtras: null,
    analyticsTopPlayers: [],
    monthlyLeaderboard: null,
    reliabilityHealth: null,
    upcomingScheduled: [],
    notice,
  };
}

/** Daily buckets from `start` (inclusive UTC day) through `end` (inclusive UTC day). */
function dayBucketsBetween(
  start: Date,
  end: Date,
  opts?: { weekdays?: boolean; dayOfMonth?: boolean },
) {
  const dayBuckets = new Map<string, AnalyticsTrendPoint>();
  const cursor = new Date(start);
  cursor.setUTCHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setUTCHours(0, 0, 0, 0);
  const spanDays =
    Math.round((endDay.getTime() - cursor.getTime()) / 86400_000) + 1;
  const useWeekday = opts?.weekdays ?? spanDays <= 7;
  const useDayOfMonth = opts?.dayOfMonth === true;
  while (cursor.getTime() <= endDay.getTime()) {
    const key = utcDayKey(cursor);
    dayBuckets.set(key, {
      day: useWeekday
        ? utcWeekdayLabel(cursor)
        : useDayOfMonth
          ? utcDayOfMonthLabel(cursor)
          : utcMonthDayLabel(cursor),
      parties: 0,
      vibes: 0,
      ghosts: 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dayBuckets;
}

/**
 * Always Mon–Sun (7 bars) for "This week" charts — future days stay at 0
 * so mobile always shows a full week, not Mon–today only.
 */
function weekDayBuckets(now: Date) {
  const start = weekStartUtc(now);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return dayBucketsBetween(start, end, { weekdays: true });
}

/** Weekly buckets for the last `weeks` UTC weeks ending at the week of `end`. */
function weekBucketsEndingAt(end: Date, weeks: number) {
  const buckets = new Map<string, AnalyticsTrendPoint>();
  const thisWeek = weekStartUtc(end);
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeek);
    start.setUTCDate(start.getUTCDate() - 7 * i);
    const key = utcDayKey(start);
    buckets.set(key, {
      day: utcMonthDayLabel(start),
      parties: 0,
      vibes: 0,
      ghosts: 0,
    });
  }
  return buckets;
}

/** Monthly buckets for the last `months` UTC calendar months ending at `end`'s month. */
function monthBucketsEndingAt(end: Date, months: number) {
  const buckets = new Map<string, AnalyticsTrendPoint>();
  const thisMonth = monthStartUtc(end);
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(thisMonth);
    start.setUTCMonth(start.getUTCMonth() - i);
    const key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, {
      day: utcMonthLabel(start),
      parties: 0,
      vibes: 0,
      ghosts: 0,
    });
  }
  return buckets;
}

function weekBucketKey(iso: string): string {
  return utcDayKey(weekStartUtc(new Date(iso)));
}

function monthBucketKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function parseEventMeta(raw: unknown): { noShows?: number; rosterSize?: number } {
  if (!raw || typeof raw !== "object") return {};
  const m = raw as Record<string, unknown>;
  return {
    noShows: m.noShows == null ? undefined : Number(m.noShows),
    rosterSize: m.rosterSize == null ? undefined : Number(m.rosterSize),
  };
}

async function loadLiveBundle(
  guildId: string,
  rangeKey: DashboardRangeKey = DEFAULT_DASHBOARD_RANGE,
): Promise<DashboardBundle> {
  const range = resolveDashboardRange(rangeKey);
  const sb = getServiceSupabase();
  if (!sb) {
    return emptyBundle(
      guildId,
      "Add SUPABASE_SERVICE_ROLE_KEY as a Runtime Secret on the web Worker (not Build-only, not the bot). Name it exactly SUPABASE_SERVICE_ROLE_KEY, then redeploy once — later deploys keep it.",
      null,
      rangeKey,
    );
  }

  const { data: serverRow, error: serverErr } = await sb
    .from("servers")
    .select("*")
    .eq("discord_guild_id", guildId)
    .maybeSingle();

  if (serverErr) {
    console.warn("dashboard server lookup", serverErr.message);
    return emptyBundle(
      guildId,
      `Could not load server: ${serverErr.message}`,
      null,
      rangeKey,
    );
  }

  if (!serverRow) {
    return emptyBundle(
      guildId,
      "No Rallied server row for this guild yet. Invite the bot and run a slash command (e.g. /lfg create) so it upserts into Supabase.",
      null,
      rangeKey,
    );
  }

  let server = mapServerRow(serverRow as Record<string, unknown>);
  // Repair placeholder / snowflake DB names (+ missing icon) from Discord.
  if (
    !isUsableServerName(server.name, server.discord_guild_id) ||
    !server.icon_url
  ) {
    const fromDiscord = await fetchGuildMetaFromDiscord(
      server.discord_guild_id,
    );
    if (fromDiscord) {
      const patch: { name?: string; icon_url?: string; updated_at: string } = {
        updated_at: new Date().toISOString(),
      };
      if (!isUsableServerName(server.name, server.discord_guild_id)) {
        patch.name = fromDiscord.name;
        server = { ...server, name: fromDiscord.name };
      }
      if (!server.icon_url && fromDiscord.iconUrl) {
        patch.icon_url = fromDiscord.iconUrl;
        server = { ...server, icon_url: fromDiscord.iconUrl };
      }
      if (patch.name || patch.icon_url) {
        void sb
          .from("servers")
          .update(patch)
          .eq("id", server.id)
          .then(({ error }) => {
            if (error) console.warn("server name repair failed", error.message);
          });
      }
    }
  }
  const serverId = server.id;

  const now = range.end;
  const nowIso = now.toISOString();
  const rangeStartIso = range.start?.toISOString() ?? null;
  const priorStartIso = range.priorStart?.toISOString() ?? null;
  const priorEndIso = range.priorEnd?.toISOString() ?? null;
  // Chart / analytics fetch lower bound: range start, or 12-month chart window for all-time.
  const chartFetchStart =
    range.start ??
    (() => {
      const d = monthStartUtc(now);
      d.setUTCMonth(d.getUTCMonth() - 11);
      return d;
    })();
  const chartFetchStartIso = chartFetchStart.toISOString();
  const eventsFetchStartIso = priorStartIso ?? chartFetchStartIso;

  let hostPartiesQuery = sb
    .from("lfg_parties")
    .select("host_member_id, created_at")
    .eq("server_id", serverId);
  if (rangeStartIso) {
    hostPartiesQuery = hostPartiesQuery.gte("created_at", rangeStartIso);
  } else {
    hostPartiesQuery = hostPartiesQuery.limit(2000);
  }

  let rangePartiesQuery = sb
    .from("lfg_parties")
    .select("id, created_at")
    .eq("server_id", serverId)
    .gte("created_at", chartFetchStartIso);
  let priorPartiesQuery =
    priorStartIso && priorEndIso
      ? sb
          .from("lfg_parties")
          .select("id, created_at")
          .eq("server_id", serverId)
          .gte("created_at", priorStartIso)
          .lt("created_at", priorEndIso)
      : Promise.resolve({ data: [] as { id: string; created_at: string }[] });

  let readyResolvedQuery = sb
    .from("lfg_parties")
    .select("id, ready_check_resolved_at")
    .eq("server_id", serverId)
    .gte("ready_check_resolved_at", rangeStartIso ?? chartFetchStartIso)
    .not("ready_check_resolved_at", "is", null);
  let priorReadyQuery =
    priorStartIso && priorEndIso
      ? sb
          .from("lfg_parties")
          .select("id, ready_check_resolved_at")
          .eq("server_id", serverId)
          .gte("ready_check_resolved_at", priorStartIso)
          .lt("ready_check_resolved_at", priorEndIso)
          .not("ready_check_resolved_at", "is", null)
      : Promise.resolve({ data: [] as { id: string }[] });

  let noShowStrikesQuery = sb
    .from("strikes")
    .select("id, reason, created_at")
    .eq("server_id", serverId)
    .ilike("reason", "Ready-check no-show%");
  if (rangeStartIso) {
    noShowStrikesQuery = noShowStrikesQuery.gte("created_at", rangeStartIso);
  }

  const [
    settingsRes,
    partiesRes,
    monthHostPartiesRes,
    membersRes,
    ghostlessRes,
    strikesRes,
    lockoutsRes,
    disputesRes,
    weekPartiesRes,
    priorWeekPartiesRes,
    upcomingRes,
    readyResolvedRes,
    priorReadyResolvedRes,
    eventsRes,
    noShowStrikesRes,
  ] = await Promise.all([
    sb.from("server_settings").select("*").eq("server_id", serverId).maybeSingle(),
    sb
      .from("lfg_parties")
      .select("*")
      .eq("server_id", serverId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100),
    // Top hosts: include soft-closed parties (deleted_at set on Close/expire).
    hostPartiesQuery,
    sb
      .from("members")
      .select("*")
      .eq("server_id", serverId)
      .order("display_name", { ascending: true })
      .limit(500),
    sb.from("ghostless_stats_view").select("*").eq("server_id", serverId),
    sb.from("strikes").select("*").eq("server_id", serverId).eq("active", true),
    sb
      .from("lockouts")
      .select("*")
      .eq("server_id", serverId)
      .gt("until", nowIso),
    sb
      .from("disputes")
      .select("*")
      .eq("server_id", serverId)
      .order("created_at", { ascending: false })
      .limit(100),
    rangePartiesQuery,
    priorPartiesQuery,
    sb
      .from("lfg_parties")
      .select(
        "id, game, host_member_id, scheduled_start_at, status, slots",
      )
      .eq("server_id", serverId)
      .is("deleted_at", null)
      .not("scheduled_start_at", "is", null)
      .gte("scheduled_start_at", nowIso)
      .in("status", ["open", "filled"])
      .order("scheduled_start_at", { ascending: true })
      .limit(5),
    readyResolvedQuery,
    priorReadyQuery,
    sb
      .from("server_events")
      .select("event_type, party_id, member_id, meta, created_at")
      .eq("server_id", serverId)
      .gte("created_at", eventsFetchStartIso)
      .order("created_at", { ascending: false })
      .limit(1000),
    noShowStrikesQuery,
  ]);

  // Soft-fail if server_events migration not applied yet
  const eventsAvailable = !eventsRes.error;
  if (eventsRes.error) {
    console.warn("server_events query soft-fail", eventsRes.error.message);
  }

  const partyIdList = ((partiesRes.data ?? []) as { id: string }[]).map(
    (p) => p.id,
  );
  const weekPartyIdList = ((weekPartiesRes.data ?? []) as { id: string }[]).map(
    (p) => p.id,
  );
  const priorWeekPartyIdList = (
    (priorWeekPartiesRes.data ?? []) as { id: string }[]
  ).map((p) => p.id);
  const readyPartyIds = (
    (readyResolvedRes.data ?? []) as { id: string }[]
  ).map((p) => p.id);
  const priorReadyPartyIds = (
    (priorReadyResolvedRes.data ?? []) as { id: string }[]
  ).map((p) => p.id);
  const vibePartyIds = [
    ...new Set([
      ...partyIdList,
      ...weekPartyIdList,
      ...priorWeekPartyIdList,
      ...readyPartyIds,
      ...priorReadyPartyIds,
    ]),
  ];

  const vibeCurrentStart = rangeStartIso ?? chartFetchStartIso;
  const [partyMembersRes, weekVibesRes, priorVibesRes, readyPartyMembersRes] =
    await Promise.all([
      partyIdList.length > 0
        ? sb
            .from("lfg_party_members")
            .select("party_id, member_id")
            .in("party_id", partyIdList)
        : Promise.resolve({
            data: [] as { party_id: string; member_id: string }[],
          }),
      vibePartyIds.length > 0
        ? sb
            .from("vibe_checks")
            .select(
              "id, created_at, ghosted, party_id, rater_id, vibe_score, showed_up",
            )
            .in("party_id", vibePartyIds)
            .gte("created_at", vibeCurrentStart)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      vibePartyIds.length > 0 && priorStartIso && priorEndIso
        ? sb
            .from("vibe_checks")
            .select(
              "id, created_at, ghosted, party_id, rater_id, vibe_score, showed_up",
            )
            .in("party_id", vibePartyIds)
            .gte("created_at", priorStartIso)
            .lt("created_at", priorEndIso)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      readyPartyIds.length > 0 || priorReadyPartyIds.length > 0
        ? sb
            .from("lfg_party_members")
            .select("party_id, member_id, role")
            .in("party_id", [...readyPartyIds, ...priorReadyPartyIds])
            .in("role", ["host", "member"])
        : Promise.resolve({
            data: [] as {
              party_id: string;
              member_id: string;
              role: string;
            }[],
          }),
    ]);

  const settings = settingsRes.data
    ? mapSettingsRow(settingsRes.data as Record<string, unknown>)
    : null;

  const memberRows = (membersRes.data ?? []) as Record<string, unknown>[];
  const membersById = new Map(
    memberRows.map((m) => [String(m.id), m as unknown as Member]),
  );

  const ghostlessByMember = new Map<string, GhostlessStats>();
  for (const g of ghostlessRes.data ?? []) {
    const row = g as Record<string, unknown>;
    const memberId = String(row.member_id);
    ghostlessByMember.set(memberId, {
      server_id: String(row.server_id),
      member_id: memberId,
      shows: Number(row.shows ?? 0),
      ghosts: Number(row.ghosts ?? 0),
      vibe_sum: 0,
      vibe_count: Number(row.vibe_count ?? 0),
      vibe_avg: row.vibe_avg == null ? null : Number(row.vibe_avg),
      show_rate_pct:
        row.show_rate_pct == null ? null : Number(row.show_rate_pct),
      updated_at: String(row.updated_at ?? new Date().toISOString()),
    });
  }

  const strikesByMember = new Map<string, Strike[]>();
  for (const s of strikesRes.data ?? []) {
    const row = s as Record<string, unknown>;
    const strike: Strike = {
      id: String(row.id),
      server_id: String(row.server_id),
      member_id: String(row.member_id),
      reason: String(row.reason ?? ""),
      created_by: (row.created_by as string | null) ?? null,
      active: Boolean(row.active),
      created_at: String(row.created_at),
    };
    const list = strikesByMember.get(strike.member_id) ?? [];
    list.push(strike);
    strikesByMember.set(strike.member_id, list);
  }

  const lockoutByMember = new Map<string, Lockout>();
  for (const l of lockoutsRes.data ?? []) {
    const row = l as Record<string, unknown>;
    lockoutByMember.set(String(row.member_id), {
      id: String(row.id),
      server_id: String(row.server_id),
      member_id: String(row.member_id),
      until: String(row.until),
      reason: String(row.reason ?? ""),
      created_at: String(row.created_at),
    });
  }

  const members: DashboardPerson[] = memberRows.map((m) => {
    const member = m as unknown as Member;
    return {
      member,
      ghostless: ghostlessByMember.get(member.id) ?? null,
      strikes: strikesByMember.get(member.id) ?? [],
      lockout: lockoutByMember.get(member.id) ?? null,
    };
  });

  const fillCounts = new Map<string, number>();
  for (const pm of partyMembersRes.data ?? []) {
    const partyId = String((pm as { party_id: string }).party_id);
    fillCounts.set(partyId, (fillCounts.get(partyId) ?? 0) + 1);
  }

  const parties: DashboardParty[] = ((partiesRes.data ?? []) as Record<
    string,
    unknown
  >[]).map((p) => {
    const hostId = String(p.host_member_id);
    const host = membersById.get(hostId);
    return {
      id: String(p.id),
      server_id: String(p.server_id),
      host_member_id: hostId,
      host_name: host?.display_name || "Unknown",
      game: String(p.game),
      rank_text: String(p.rank_text ?? ""),
      slots: Number(p.slots ?? 5),
      filled: fillCounts.get(String(p.id)) ?? 1,
      status: p.status as DashboardParty["status"],
      expires_at: (p.expires_at as string | null) ?? null,
      created_at: String(p.created_at),
      updated_at: String(p.updated_at),
      discord_channel_id: (p.discord_channel_id as string | null) ?? null,
      scheduled_start_at: (p.scheduled_start_at as string | null) ?? null,
    };
  });

  const strikeReasonById = new Map(
    [...strikesByMember.values()].flat().map((s) => [s.id, s.reason]),
  );
  // Also load inactive strikes referenced by disputes
  const disputeStrikeIds = (disputesRes.data ?? [])
    .map((d) => (d as { strike_id?: string | null }).strike_id)
    .filter(Boolean) as string[];
  if (disputeStrikeIds.length > 0) {
    const { data: moreStrikes } = await sb
      .from("strikes")
      .select("id, reason")
      .in("id", disputeStrikeIds);
    for (const s of moreStrikes ?? []) {
      strikeReasonById.set(String((s as { id: string }).id), String((s as { reason: string }).reason ?? ""));
    }
  }

  const disputes: DashboardDispute[] = ((disputesRes.data ?? []) as Record<
    string,
    unknown
  >[]).map((d) => {
    const openerId = String(d.opener_member_id);
    const opener = membersById.get(openerId);
    const strikeId = (d.strike_id as string | null) ?? null;
    const subject = strikeId
      ? `Strike: ${strikeReasonById.get(strikeId) || "appeal"}`
      : "Ghosted flag appeal";
    return {
      id: String(d.id),
      server_id: String(d.server_id),
      strike_id: strikeId,
      vibe_check_id: (d.vibe_check_id as string | null) ?? null,
      opener_member_id: openerId,
      opener_name: opener?.display_name || "Unknown",
      subject,
      status: d.status as Dispute["status"],
      resolver_member_id: (d.resolver_member_id as string | null) ?? null,
      notes: (d.notes as string | null) ?? null,
      created_at: String(d.created_at),
      resolved_at: (d.resolved_at as string | null) ?? null,
    };
  });

  // Analytics: bucket by selected range (UTC day or week)
  const weekPartyRows = (weekPartiesRes.data ?? []) as {
    id: string;
    created_at: string;
  }[];
  const priorWeekPartyRows = (priorWeekPartiesRes.data ?? []) as {
    id: string;
    created_at: string;
  }[];

  const dayBuckets =
    range.key === "week"
      ? weekDayBuckets(now)
      : range.chartMode === "month"
        ? monthBucketsEndingAt(now, 12)
        : range.chartMode === "week"
          ? weekBucketsEndingAt(now, 12)
          : dayBucketsBetween(range.start ?? chartFetchStart, now, {
              dayOfMonth: range.key === "month",
            });
  const priorDayBuckets =
    range.key === "week" && range.priorStart
      ? (() => {
          const priorEnd = new Date(range.priorStart);
          priorEnd.setUTCDate(priorEnd.getUTCDate() + 6);
          return dayBucketsBetween(range.priorStart, priorEnd, {
            weekdays: true,
          });
        })()
      : range.priorStart && range.priorEnd
        ? dayBucketsBetween(
            range.priorStart,
            new Date(range.priorEnd.getTime() - 1),
            { dayOfMonth: range.key === "month" },
          )
        : new Map<string, AnalyticsTrendPoint>();

  function chartBucketKey(createdAt: string): string {
    if (range.chartMode === "month") return monthBucketKey(createdAt);
    if (range.chartMode === "week") return weekBucketKey(createdAt);
    return createdAt.slice(0, 10);
  }

  function bumpParty(
    buckets: Map<string, AnalyticsTrendPoint>,
    createdAt: string,
  ) {
    const key = chartBucketKey(createdAt);
    const b = buckets.get(key);
    if (b) b.parties += 1;
  }
  function bumpVibe(
    buckets: Map<string, AnalyticsTrendPoint>,
    createdAt: string,
    ghosted?: boolean,
  ) {
    const key = chartBucketKey(createdAt);
    const b = buckets.get(key);
    if (!b) return;
    b.vibes += 1;
    if (ghosted) b.ghosts += 1;
  }

  for (const p of weekPartyRows) bumpParty(dayBuckets, p.created_at);
  for (const p of priorWeekPartyRows) bumpParty(priorDayBuckets, p.created_at);

  const weekVibeRows = (weekVibesRes.data ?? []) as {
    created_at: string;
    ghosted?: boolean;
    vibe_score?: number | null;
    showed_up?: boolean;
    party_id?: string;
    rater_id?: string;
  }[];
  const priorVibeRows = (priorVibesRes.data ?? []) as {
    created_at: string;
    ghosted?: boolean;
    vibe_score?: number | null;
    showed_up?: boolean;
    party_id?: string;
    rater_id?: string;
  }[];

  for (const v of weekVibeRows) bumpVibe(dayBuckets, String(v.created_at), v.ghosted);
  for (const v of priorVibeRows)
    bumpVibe(priorDayBuckets, String(v.created_at), v.ghosted);

  const activeStrikeCount = [...strikesByMember.values()].reduce(
    (n, list) => n + list.length,
    0,
  );

  // Soft analytics extras from vibe checks + ready events
  function softExtras(
    vibes: typeof weekVibeRows,
    readyEvents: { meta: { noShows?: number; rosterSize?: number } }[],
  ): AnalyticsExtras {
    let showOk = 0;
    let showTotal = 0;
    let vibeSum = 0;
    let vibeN = 0;
    for (const v of vibes) {
      showTotal += 1;
      if (v.showed_up !== false && !v.ghosted) showOk += 1;
      if (v.vibe_score != null && Number.isFinite(Number(v.vibe_score))) {
        vibeSum += Number(v.vibe_score);
        vibeN += 1;
      }
    }
    let completed = 0;
    let readyN = 0;
    for (const e of readyEvents) {
      const roster = Number(e.meta.rosterSize ?? 0);
      const noShows = Number(e.meta.noShows ?? 0);
      if (roster <= 0) continue;
      readyN += 1;
      if (noShows === 0) completed += 1;
    }
    return {
      showRatePct:
        showTotal > 0
          ? Math.round((showOk / showTotal) * 1000) / 10
          : null,
      avgVibe: vibeN > 0 ? Math.round((vibeSum / vibeN) * 10) / 10 : null,
      readyCheckCompletionPct:
        readyN > 0 ? Math.round((completed / readyN) * 1000) / 10 : null,
    };
  }

  const eventRows = eventsAvailable
    ? ((eventsRes.data ?? []) as {
        event_type: string;
        party_id: string | null;
        member_id: string | null;
        meta: unknown;
        created_at: string;
      }[])
    : [];

  const rangeStartCmp = rangeStartIso ?? chartFetchStartIso;
  const readyEvents7d = eventRows
    .filter(
      (e) =>
        e.event_type === "ready_check_resolved" &&
        e.created_at >= rangeStartCmp,
    )
    .map((e) => ({ meta: parseEventMeta(e.meta), created_at: e.created_at }));
  const readyEventsPrior = eventRows
    .filter(
      (e) =>
        e.event_type === "ready_check_resolved" &&
        priorStartIso != null &&
        priorEndIso != null &&
        e.created_at >= priorStartIso &&
        e.created_at < priorEndIso,
    )
    .map((e) => ({ meta: parseEventMeta(e.meta), created_at: e.created_at }));

  const extrasCurrent = softExtras(weekVibeRows, readyEvents7d);
  const extrasPrior = softExtras(priorVibeRows, readyEventsPrior);
  const analyticsExtras: AnalyticsExtras | null =
    extrasCurrent.showRatePct != null ||
    extrasCurrent.avgVibe != null ||
    extrasCurrent.readyCheckCompletionPct != null
      ? {
          ...extrasCurrent,
          priorShowRatePct: extrasPrior.showRatePct,
          priorAvgVibe: extrasPrior.avgVibe,
          priorReadyCheckCompletionPct: extrasPrior.readyCheckCompletionPct,
        }
      : null;

  // Vibe response: distinct raters / seated on ready-checked parties
  const seatedByParty = new Map<string, Set<string>>();
  for (const row of readyPartyMembersRes.data ?? []) {
    const r = row as { party_id: string; member_id: string };
    const set = seatedByParty.get(r.party_id) ?? new Set();
    set.add(r.member_id);
    seatedByParty.set(r.party_id, set);
  }
  function vibeResponseFor(
    partyIds: string[],
    vibes: typeof weekVibeRows,
  ): { raters: number; seated: number } | null {
    if (partyIds.length === 0) return null;
    let seated = 0;
    for (const id of partyIds) {
      seated += seatedByParty.get(id)?.size ?? 0;
    }
    if (seated <= 0) return null;
    const raters = new Set(
      vibes
        .filter((v) => v.party_id && partyIds.includes(String(v.party_id)))
        .map((v) => String(v.rater_id)),
    );
    return { raters: raters.size, seated };
  }

  const standbyPromotionsThisWeek = eventsAvailable
    ? eventRows.filter(
        (e) =>
          e.event_type === "waitlist_promote" &&
          e.created_at >= rangeStartCmp,
      ).length
    : null;

  const reliabilityHealth = buildReliabilityHealth({
    openDisputes: disputes.filter((d) => d.status === "open").length,
    readyEvents: readyEvents7d,
    priorReadyEvents: readyEventsPrior,
    standbyPromotionsThisWeek,
    vibeResponse: vibeResponseFor(readyPartyIds, weekVibeRows),
    priorVibeResponse: vibeResponseFor(priorReadyPartyIds, priorVibeRows),
    noShowStrikeCount7d: (noShowStrikesRes.data ?? []).length,
    readyChecksResolved7d: readyPartyIds.length,
  });
  // Soften empty hints that still say "7 days" when range differs.
  if (range.key !== "week") {
    const win = range.label.toLowerCase();
    if (reliabilityHealth.emptyHints.noShow?.includes("last 7 days")) {
      reliabilityHealth.emptyHints.noShow =
        reliabilityHealth.emptyHints.noShow.replace("last 7 days", win);
    }
    if (reliabilityHealth.emptyHints.vibe?.includes("last 7 days")) {
      reliabilityHealth.emptyHints.vibe =
        reliabilityHealth.emptyHints.vibe.replace("last 7 days", win);
    }
    if (reliabilityHealth.emptyHints.standby?.includes("this week")) {
      reliabilityHealth.emptyHints.standby =
        reliabilityHealth.emptyHints.standby.replace(/this week/g, win);
    }
  }

  const upcomingFill = new Map<string, number>();
  const upcomingIds = ((upcomingRes.data ?? []) as { id: string }[]).map(
    (p) => p.id,
  );
  if (upcomingIds.length > 0) {
    for (const id of upcomingIds) {
      upcomingFill.set(id, fillCounts.get(id) ?? 0);
    }
    // Fill counts may miss upcoming parties not in the latest-100 list
    const missing = upcomingIds.filter((id) => !fillCounts.has(id));
    if (missing.length > 0) {
      const { data: extraPm } = await sb
        .from("lfg_party_members")
        .select("party_id")
        .in("party_id", missing);
      for (const row of extraPm ?? []) {
        const pid = String((row as { party_id: string }).party_id);
        upcomingFill.set(pid, (upcomingFill.get(pid) ?? 0) + 1);
      }
    }
  }

  const upcomingScheduled: UpcomingScheduledParty[] = (
    (upcomingRes.data ?? []) as Record<string, unknown>[]
  ).map((p) => {
    const hostId = String(p.host_member_id);
    const host = membersById.get(hostId);
    return {
      id: String(p.id),
      game: String(p.game),
      host_name: host?.display_name || "Unknown",
      scheduled_start_at: String(p.scheduled_start_at),
      status: p.status as UpcomingScheduledParty["status"],
      slots: Number(p.slots ?? 5),
      filled: upcomingFill.get(String(p.id)) ?? 1,
    };
  });

  return {
    source: "live",
    guildId,
    liveAvailable: true,
    range,
    server,
    settings,
    parties,
    openPartyCount: parties.filter((p) => p.status === "open").length,
    members,
    memberCount: members.length,
    activeStrikeCount,
    disputes,
    analyticsTrend: [...dayBuckets.values()],
    analyticsTrendPrior: [...priorDayBuckets.values()],
    analyticsExtras,
    analyticsTopPlayers: topPlayersFromMembers(members),
    monthlyLeaderboard: buildMonthlyLeaderboard({
      members: members.map((m) => m.member),
      ghostless: members
        .filter((m) => m.ghostless)
        .map((m) => ({
          member_id: m.member.id,
          shows: m.ghostless!.shows,
          ghosts: m.ghostless!.ghosts,
          show_rate_pct: m.ghostless!.show_rate_pct,
        })),
      parties: ((monthHostPartiesRes.data ?? []) as {
        host_member_id: string;
        created_at: string;
      }[]).map((p) => ({
        host_member_id: String(p.host_member_id),
        created_at: String(p.created_at),
      })),
      now,
      since: range.start,
      periodLabel: range.heading,
    }),
    reliabilityHealth,
    upcomingScheduled,
    notice: null,
  };
}

/**
 * Load dashboard bundle for a Discord guild id.
 * @param useMock — mock session / ?mock=1 / explicit demo only.
 * Stale demo-guild-* under a live OAuth session must NOT load MOCK_SERVERS.
 * @param rangeKey — `?range=` UI filter (default this week). Does not purge data.
 */
export async function loadDashboard(
  guildId: string,
  useMock: boolean,
  rangeKey: DashboardRangeKey = DEFAULT_DASHBOARD_RANGE,
): Promise<DashboardBundle> {
  if (useMock) {
    return buildMockBundle(guildId || "demo-guild-1", rangeKey);
  }
  if (!guildId.trim() || isDemoGuildId(guildId)) {
    return emptyBundle(
      guildId,
      !guildId.trim()
        ? "Select a server from the switcher. If none appear, Add to Discord then Log in again."
        : "Stale demo guild selection ignored — pick a live server from the switcher (or open /demo for the sandbox).",
      null,
      rangeKey,
    );
  }
  try {
    return await loadLiveBundle(guildId, rangeKey);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("loadDashboard live failed", msg, err);
    return emptyBundle(
      guildId,
      `Dashboard error: ${msg}. Check SUPABASE_SERVICE_ROLE_KEY / SESSION_SECRET on the web Worker (not silent mock).`,
      null,
      rangeKey,
    );
  }
}

export async function loadPerson(
  guildId: string,
  memberId: string,
  useMock: boolean,
): Promise<DashboardPerson | null> {
  if (useMock) {
    const member = getMember(memberId);
    if (!member) return null;
    return {
      member,
      ghostless: MOCK_GHOSTLESS[member.id] ?? null,
      strikes: strikesFor(member.id),
      lockout: lockoutFor(member.id),
    };
  }
  if (!guildId.trim() || isDemoGuildId(guildId)) return null;

  const bundle = await loadLiveBundle(guildId);
  return bundle.members.find((m) => m.member.id === memberId) ?? null;
}

/** Plans keyed by discord_guild_id from servers (for session guild enrichment). */
export async function fetchServerPlansByGuildIds(
  guildIds: string[],
): Promise<Map<string, PlanId>> {
  const map = new Map<string, PlanId>();
  if (guildIds.length === 0) return map;
  const sb = getServiceSupabase();
  if (!sb) return map;
  const { data, error } = await sb
    .from("servers")
    .select("discord_guild_id, plan")
    .in("discord_guild_id", guildIds);
  if (error) {
    console.warn("plan enrichment failed", error.message);
    return map;
  }
  for (const row of data ?? []) {
    map.set(
      String((row as { discord_guild_id: string }).discord_guild_id),
      normalizePlan((row as { plan: string }).plan),
    );
  }
  return map;
}

export { MOCK_LOCKOUTS, getMember };
