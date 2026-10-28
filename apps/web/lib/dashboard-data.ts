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
  Server,
  ServerSettings,
  Strike,
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
  server: Server | null;
  settings: ServerSettings | null;
  parties: DashboardParty[];
  openPartyCount: number;
  members: DashboardPerson[];
  memberCount: number;
  activeStrikeCount: number;
  disputes: DashboardDispute[];
  analyticsTrend: AnalyticsTrendPoint[];
  /** Prior 7 days when available (mock / later live). */
  analyticsTrendPrior: AnalyticsTrendPoint[];
  analyticsExtras: AnalyticsExtras | null;
  /** Top members for Pro “Top this week” (by show rate, then vibe). */
  analyticsTopPlayers: AnalyticsTopPlayer[];
  notice: string | null;
};

function normalizePlan(plan: string | null | undefined): PlanId {
  const p = (plan || "trial") as PlanId;
  const allowed: PlanId[] = [
    "trial",
    "community",
    "pro",
    "founding_pro",
    "lapsed",
    "demo",
  ];
  if (allowed.includes(p)) return p;
  if (plan === "free") return "community";
  return "trial";
}

function mapServerRow(row: Record<string, unknown>): Server {
  return {
    id: String(row.id),
    discord_guild_id: String(row.discord_guild_id),
    name: String(row.name ?? ""),
    plan: normalizePlan(row.plan as string | undefined),
    price_lock_cents:
      row.price_lock_cents == null ? null : Number(row.price_lock_cents),
    trial_ends_at: (row.trial_ends_at as string | null) ?? null,
    priority_support: Boolean(row.priority_support),
    stripe_customer_id: (row.stripe_customer_id as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapSettingsRow(row: Record<string, unknown>): ServerSettings {
  return {
    server_id: String(row.server_id),
    grace_minutes: Number(row.grace_minutes ?? 5),
    ghostless_role_id: (row.ghostless_role_id as string | null) ?? null,
    ghostless_role_threshold_pct: Number(
      row.ghostless_role_threshold_pct ?? 90,
    ),
    ghostless_role_min_sessions: Number(row.ghostless_role_min_sessions ?? 10),
    digest_channel_id: (row.digest_channel_id as string | null) ?? null,
    strike_threshold: Number(row.strike_threshold ?? 3),
    lockout_days: Number(row.lockout_days ?? 7),
    slug: (row.slug as string | null) ?? null,
    public_page_enabled: row.public_page_enabled !== false,
    public_member_list: Boolean(row.public_member_list),
    hide_powered_by: Boolean(row.hide_powered_by),
    public_accent: (row.public_accent as string | null) ?? null,
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

function buildMockBundle(guildId: string): DashboardBundle {
  const server = mockServerForGuild(guildId);
  const contentId =
    server.id === MOCK_SERVERS[2].id ? MOCK_SERVERS[0].id : server.id;
  const parties = MOCK_PARTIES.filter((p) => p.server_id === contentId);
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

  return {
    source: "mock",
    guildId,
    liveAvailable: hasServiceRole(),
    server,
    settings: mockSettingsForServer(server),
    parties,
    openPartyCount: parties.filter((p) => p.status === "open").length,
    members,
    memberCount: members.length,
    activeStrikeCount,
    disputes,
    analyticsTrend: MOCK_ANALYTICS_TREND,
    analyticsTrendPrior: MOCK_ANALYTICS_TREND_PRIOR,
    analyticsExtras: MOCK_ANALYTICS_EXTRAS,
    analyticsTopPlayers: topPlayersFromMembers(members),
    notice: "Demo / mock data — not a live guild.",
  };
}

function emptyBundle(
  guildId: string,
  notice: string,
  server: Server | null = null,
): DashboardBundle {
  return {
    source: "empty",
    guildId,
    liveAvailable: hasServiceRole(),
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
    notice,
  };
}

function weekdayLabel(d: Date): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()]!;
}

async function loadLiveBundle(guildId: string): Promise<DashboardBundle> {
  const sb = getServiceSupabase();
  if (!sb) {
    return emptyBundle(
      guildId,
      "Add SUPABASE_SERVICE_ROLE_KEY as a Runtime Secret on the web Worker (not Build-only, not the bot). Name it exactly SUPABASE_SERVICE_ROLE_KEY, then redeploy once — later deploys keep it.",
    );
  }

  const { data: serverRow, error: serverErr } = await sb
    .from("servers")
    .select("*")
    .eq("discord_guild_id", guildId)
    .maybeSingle();

  if (serverErr) {
    console.warn("dashboard server lookup", serverErr.message);
    return emptyBundle(guildId, `Could not load server: ${serverErr.message}`);
  }

  if (!serverRow) {
    return emptyBundle(
      guildId,
      "No Rallied server row for this guild yet. Invite the bot and run a slash command (e.g. /lfg create) so it upserts into Supabase.",
    );
  }

  const server = mapServerRow(serverRow as Record<string, unknown>);
  const serverId = server.id;

  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

  const [
    settingsRes,
    partiesRes,
    membersRes,
    ghostlessRes,
    strikesRes,
    lockoutsRes,
    disputesRes,
    weekPartiesRes,
  ] = await Promise.all([
    sb.from("server_settings").select("*").eq("server_id", serverId).maybeSingle(),
    sb
      .from("lfg_parties")
      .select("*")
      .eq("server_id", serverId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100),
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
      .gt("until", new Date().toISOString()),
    sb
      .from("disputes")
      .select("*")
      .eq("server_id", serverId)
      .order("created_at", { ascending: false })
      .limit(100),
    sb
      .from("lfg_parties")
      .select("id, created_at")
      .eq("server_id", serverId)
      .gte("created_at", weekAgo),
  ]);

  const partyIdList = ((partiesRes.data ?? []) as { id: string }[]).map(
    (p) => p.id,
  );
  const weekPartyIdList = ((weekPartiesRes.data ?? []) as { id: string }[]).map(
    (p) => p.id,
  );
  const vibePartyIds = [...new Set([...partyIdList, ...weekPartyIdList])];

  const [partyMembersRes, weekVibesRes] = await Promise.all([
    partyIdList.length > 0
      ? sb
          .from("lfg_party_members")
          .select("party_id, member_id")
          .in("party_id", partyIdList)
      : Promise.resolve({ data: [] as { party_id: string; member_id: string }[] }),
    vibePartyIds.length > 0
      ? sb
          .from("vibe_checks")
          .select("id, created_at, ghosted, party_id")
          .in("party_id", vibePartyIds)
          .gte("created_at", weekAgo)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
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

  // Analytics: bucket last 7 days (UTC)
  const weekPartyRows = (weekPartiesRes.data ?? []) as {
    id: string;
    created_at: string;
  }[];

  const dayBuckets = new Map<string, AnalyticsTrendPoint>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayBuckets.set(key, {
      day: weekdayLabel(d),
      parties: 0,
      vibes: 0,
      ghosts: 0,
    });
  }
  for (const p of weekPartyRows) {
    const key = p.created_at.slice(0, 10);
    const b = dayBuckets.get(key);
    if (b) b.parties += 1;
  }
  for (const v of (weekVibesRes.data ?? []) as {
    created_at: string;
    ghosted?: boolean;
  }[]) {
    const key = String(v.created_at).slice(0, 10);
    const b = dayBuckets.get(key);
    if (!b) continue;
    b.vibes += 1;
    if (v.ghosted) b.ghosts += 1;
  }

  const activeStrikeCount = [...strikesByMember.values()].reduce(
    (n, list) => n + list.length,
    0,
  );

  return {
    source: "live",
    guildId,
    liveAvailable: true,
    server,
    settings,
    parties,
    openPartyCount: parties.filter((p) => p.status === "open").length,
    members,
    memberCount: members.length,
    activeStrikeCount,
    disputes,
    analyticsTrend: [...dayBuckets.values()],
    analyticsTrendPrior: [],
    analyticsExtras: null,
    analyticsTopPlayers: topPlayersFromMembers(members),
    notice: null,
  };
}

/**
 * Load dashboard bundle for a Discord guild id.
 * @param useMock — demo guild / mock session / ?mock=1
 */
export async function loadDashboard(
  guildId: string,
  useMock: boolean,
): Promise<DashboardBundle> {
  if (useMock || isDemoGuildId(guildId)) {
    return buildMockBundle(guildId);
  }
  try {
    return await loadLiveBundle(guildId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("loadDashboard live failed", msg, err);
    return emptyBundle(
      guildId,
      `Dashboard error: ${msg}. Try ?mock=1 or check SUPABASE_SERVICE_ROLE_KEY / SESSION_SECRET on the web Worker.`,
    );
  }
}

export async function loadPerson(
  guildId: string,
  memberId: string,
  useMock: boolean,
): Promise<DashboardPerson | null> {
  if (useMock || isDemoGuildId(guildId)) {
    const member = getMember(memberId);
    if (!member) return null;
    return {
      member,
      ghostless: MOCK_GHOSTLESS[member.id] ?? null,
      strikes: strikesFor(member.id),
      lockout: lockoutFor(member.id),
    };
  }

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
