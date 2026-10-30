/**
 * Public page data: demo slugs stay on mock; real guild/slug → live Supabase (server).
 * Strikes never appear on public surfaces.
 */
import type {
  GhostlessStats,
  LfgParty,
  Member,
  Server,
  ServerSettings,
} from "@rallied/shared";
import {
  directoryListingEnabled,
  isProPlan,
  publicPagesEnabled,
} from "@rallied/shared";
import {
  MOCK_FOUNDING_SETTINGS,
  MOCK_GHOSTLESS,
  MOCK_LOCKOUTS,
  MOCK_MEMBERS,
  MOCK_PARTIES,
  MOCK_SERVERS,
  MOCK_SETTINGS,
  getMember,
  lockoutFor,
} from "./mock-data";
import { isDemoGuildId } from "./guild-params";
import { buildMonthlyLeaderboard } from "./leaderboard";
import { resolveServerDisplayName } from "./server-display-name";
import { getServiceSupabase } from "./supabase";

export type PublicParty = LfgParty & {
  host_name: string;
  filled: number;
  discord_channel_id?: string | null;
};

export type PublicServerBundle = {
  server: Server;
  settings: ServerSettings;
  /** Path segment used in URLs */
  pathKey: string;
  /** Effective Pro vanity (only when plan is pro|founding_pro) */
  showPoweredBy: boolean;
  accent: string | null;
  openParties: PublicParty[];
  weekly: {
    parties: number;
    ghostlessPct: number | null;
    vibeCount: number;
  };
  spotlight: {
    member: Member;
    ghostless: GhostlessStats;
  }[];
  monthlyLeaderboard: {
    monthLabel: string;
    mostReliable: { displayName: string; showRatePct: number }[];
    topHosts: { displayName: string; partiesHosted: number }[];
  } | null;
};

const MOCK_SETTINGS_BY_SERVER: Record<string, ServerSettings> = {
  [MOCK_SERVERS[0].id]: {
    ...MOCK_SETTINGS,
    slug: "demo-esports",
    public_page_enabled: true,
    public_member_list: false,
    list_in_directory: true,
    discord_invite_url: "https://discord.gg/rallied-demo",
    hide_powered_by: false,
    public_accent: null,
  },
  [MOCK_SERVERS[1].id]: {
    ...MOCK_SETTINGS,
    server_id: MOCK_SERVERS[1].id,
    slug: "night-queue",
    public_page_enabled: true,
    public_member_list: true,
    list_in_directory: true,
    discord_invite_url: "https://discord.gg/rallied-night",
    hide_powered_by: false,
    public_accent: null,
  },
  [MOCK_SERVERS[2].id]: MOCK_FOUNDING_SETTINGS,
};

const DEMO_SLUGS = new Set(["demo-esports", "night-queue", "founding-beta"]);

function isDemoPublicKey(slugOrGuildId: string): boolean {
  const key = slugOrGuildId.toLowerCase();
  return DEMO_SLUGS.has(key) || isDemoGuildId(key);
}

function defaultPublicSettings(server: Server): ServerSettings {
  return {
    server_id: server.id,
    grace_minutes: 5,
    ghostless_role_id: null,
    ghostless_role_threshold_pct: 90,
    ghostless_role_min_sessions: 10,
    digest_channel_id: null,
    strike_threshold: 3,
    lockout_days: 7,
    join_min_ghostless_pct: null,
    join_lockout_enforced: true,
    slug: null,
    public_page_enabled: true,
    public_member_list: false,
    list_in_directory: false,
    discord_invite_url: null,
    hide_powered_by: false,
    public_accent: null,
    ical_token: null,
    created_at: server.created_at,
    updated_at: server.updated_at,
  };
}

function mapPublicSettings(row: Record<string, unknown>): ServerSettings {
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
    // Admin-only gates — never expose real values on public pages
    join_min_ghostless_pct: null,
    join_lockout_enforced: true,
    slug: (row.slug as string | null) ?? null,
    public_page_enabled: row.public_page_enabled !== false,
    public_member_list: Boolean(row.public_member_list),
    list_in_directory: Boolean(row.list_in_directory),
    discord_invite_url: (row.discord_invite_url as string | null) ?? null,
    hide_powered_by: Boolean(row.hide_powered_by),
    public_accent: (row.public_accent as string | null) ?? null,
    ical_token: null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export type DirectoryServerCard = {
  name: string;
  pathKey: string;
  iconUrl: string | null;
  inviteUrl: string | null;
  /** This server publishes a public Ghostless spotlight (not a passport %). */
  hasPublicGhostless: boolean;
};

function humanServerName(
  server: Pick<Server, "name" | "discord_guild_id">,
): string {
  return resolveServerDisplayName({
    dbName: server.name,
    guildId: server.discord_guild_id,
    fallback: "Selected server",
  });
}

function toDirectoryCard(
  server: Server,
  settings: ServerSettings,
): DirectoryServerCard | null {
  if (!settings.public_page_enabled || !settings.list_in_directory) {
    return null;
  }
  if (!directoryListingEnabled(server.plan)) return null;
  return {
    name: humanServerName(server),
    pathKey: settings.slug || server.discord_guild_id,
    iconUrl: server.icon_url,
    inviteUrl: settings.discord_invite_url,
    hasPublicGhostless: Boolean(settings.public_member_list),
  };
}

export async function resolvePublicServer(
  slugOrGuildId: string,
): Promise<PublicServerBundle | null> {
  if (isDemoPublicKey(slugOrGuildId)) {
    return resolveMockPublicServer(slugOrGuildId);
  }
  const live = await resolveLivePublicServer(slugOrGuildId);
  if (live) return live;
  // Fall back to mock only for known demo keys (already handled); otherwise null
  return resolveMockPublicServer(slugOrGuildId);
}

function resolveMockPublicServer(
  slugOrGuildId: string,
): PublicServerBundle | null {
  const key = slugOrGuildId.toLowerCase();
  const server =
    MOCK_SERVERS.find((s) => s.discord_guild_id.toLowerCase() === key) ||
    MOCK_SERVERS.find((s) => {
      const settings = MOCK_SETTINGS_BY_SERVER[s.id];
      return settings?.slug?.toLowerCase() === key;
    });

  if (!server) return null;

  const settings =
    MOCK_SETTINGS_BY_SERVER[server.id] ?? defaultPublicSettings(server);

  if (!settings.public_page_enabled) return null;

  const pathKey = settings.slug || server.discord_guild_id;
  const pro = isProPlan(server.plan);
  const showPoweredBy = !(pro && settings.hide_powered_by);
  const accent = pro ? settings.public_accent : null;

  const contentServerId =
    server.id === MOCK_SERVERS[2].id ? MOCK_SERVERS[0].id : server.id;

  const openParties = MOCK_PARTIES.filter(
    (p) => p.server_id === contentServerId && p.status === "open",
  ).map((p) => ({
    ...p,
    discord_channel_id: "lfg-channel-mock",
  }));

  const members = MOCK_MEMBERS.filter((m) => m.server_id === contentServerId);
  let shows = 0;
  let ghosts = 0;
  let vibeCount = 0;
  for (const m of members) {
    const g = MOCK_GHOSTLESS[m.id];
    if (!g) continue;
    shows += g.shows;
    ghosts += g.ghosts;
    vibeCount += g.vibe_count;
  }
  const total = shows + ghosts;
  const ghostlessPct =
    total === 0 ? null : Math.round((shows / total) * 1000) / 10;

  const weekParties = MOCK_PARTIES.filter(
    (p) => p.server_id === contentServerId,
  ).length;

  const ranked = members
    .map((m) => ({ member: m, ghostless: MOCK_GHOSTLESS[m.id] }))
    .filter(
      (row): row is { member: Member; ghostless: GhostlessStats } =>
        Boolean(row.ghostless) &&
        (row.ghostless!.show_rate_pct ?? 0) >= 90 &&
        row.ghostless!.shows + row.ghostless!.ghosts >= 5,
    )
    .sort(
      (a, b) =>
        (b.ghostless.show_rate_pct ?? 0) - (a.ghostless.show_rate_pct ?? 0),
    );

  const limit = settings.public_member_list ? 12 : 3;
  const spotlight = ranked.slice(0, limit);

  const monthlyLeaderboard = buildMonthlyLeaderboard({
    members,
    ghostless: members
      .map((m) => MOCK_GHOSTLESS[m.id])
      .filter(Boolean)
      .map((g) => ({
        member_id: g!.member_id,
        shows: g!.shows,
        ghosts: g!.ghosts,
        show_rate_pct: g!.show_rate_pct,
      })),
    parties: MOCK_PARTIES.filter((p) => p.server_id === contentServerId).map(
      (p) => ({
        host_member_id: p.host_member_id,
        created_at: p.created_at,
      }),
    ),
  });

  return {
    server,
    settings,
    pathKey,
    showPoweredBy,
    accent,
    openParties,
    weekly: {
      parties: weekParties,
      ghostlessPct,
      vibeCount,
    },
    spotlight,
    monthlyLeaderboard,
  };
}

async function resolveLivePublicServer(
  slugOrGuildId: string,
): Promise<PublicServerBundle | null> {
  const sb = getServiceSupabase();
  if (!sb) return null;

  const key = slugOrGuildId.trim();

  // Prefer slug match on settings, then discord_guild_id
  let serverRow: Record<string, unknown> | null = null;
  let settingsRow: Record<string, unknown> | null = null;

  const { data: bySlug } = await sb
    .from("server_settings")
    .select("*, servers(*)")
    .eq("slug", key)
    .maybeSingle();

  if (bySlug && (bySlug as { servers?: unknown }).servers) {
    settingsRow = bySlug as Record<string, unknown>;
    serverRow = (bySlug as { servers: Record<string, unknown> }).servers;
  } else {
    const { data: byGuild } = await sb
      .from("servers")
      .select("*")
      .eq("discord_guild_id", key)
      .maybeSingle();
    if (!byGuild) return null;
    serverRow = byGuild as Record<string, unknown>;
    const { data: settings } = await sb
      .from("server_settings")
      .select("*")
      .eq("server_id", String(serverRow.id))
      .maybeSingle();
    settingsRow = (settings as Record<string, unknown> | null) ?? null;
  }

  if (!serverRow) return null;

  const server: Server = {
    id: String(serverRow.id),
    discord_guild_id: String(serverRow.discord_guild_id),
    name: String(serverRow.name ?? ""),
    plan: (serverRow.plan as Server["plan"]) || "trial",
    price_lock_cents:
      serverRow.price_lock_cents == null
        ? null
        : Number(serverRow.price_lock_cents),
    trial_ends_at: (serverRow.trial_ends_at as string | null) ?? null,
    priority_support: Boolean(serverRow.priority_support),
    stripe_customer_id:
      (serverRow.stripe_customer_id as string | null) ?? null,
    stripe_subscription_id:
      (serverRow.stripe_subscription_id as string | null) ?? null,
    stripe_price_id: (serverRow.stripe_price_id as string | null) ?? null,
    billing_interval:
      serverRow.billing_interval === "year" ||
      serverRow.billing_interval === "month"
        ? serverRow.billing_interval
        : null,
    forever_pro: Boolean(serverRow.forever_pro),
    icon_url: (serverRow.icon_url as string | null) ?? null,
    created_at: String(serverRow.created_at),
    updated_at: String(serverRow.updated_at),
  };

  const settings: ServerSettings = settingsRow
    ? mapPublicSettings(settingsRow)
    : defaultPublicSettings(server);

  if (!settings.public_page_enabled) return null;
  // Path B: Starter / lapsed cannot publish public pages.
  if (!publicPagesEnabled(server.plan)) return null;

  const pathKey = settings.slug || server.discord_guild_id;
  const pro = isProPlan(server.plan);
  const showPoweredBy = !(pro && settings.hide_powered_by);
  const accent = pro ? settings.public_accent : null;

  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

  const monthAgo = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
  ).toISOString();

  const [partiesRes, membersRes, ghostlessRes, weekPartiesRes, monthPartiesRes] =
    await Promise.all([
      sb
        .from("lfg_parties")
        .select("*")
        .eq("server_id", server.id)
        .eq("status", "open")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50),
      sb.from("members").select("*").eq("server_id", server.id).limit(500),
      sb.from("ghostless_stats_view").select("*").eq("server_id", server.id),
      sb
        .from("lfg_parties")
        .select("id")
        .eq("server_id", server.id)
        .gte("created_at", weekAgo),
      sb
        .from("lfg_parties")
        .select("host_member_id, created_at")
        .eq("server_id", server.id)
        .gte("created_at", monthAgo)
        .is("deleted_at", null),
    ]);

  const partyIds = ((partiesRes.data ?? []) as { id: string }[]).map(
    (p) => p.id,
  );
  const fillCounts = new Map<string, number>();
  if (partyIds.length > 0) {
    const { data: pms } = await sb
      .from("lfg_party_members")
      .select("party_id")
      .in("party_id", partyIds);
    for (const pm of pms ?? []) {
      const id = String((pm as { party_id: string }).party_id);
      fillCounts.set(id, (fillCounts.get(id) ?? 0) + 1);
    }
  }

  const membersById = new Map(
    ((membersRes.data ?? []) as Member[]).map((m) => [m.id, m]),
  );

  const openParties: PublicParty[] = ((partiesRes.data ?? []) as Record<
    string,
    unknown
  >[]).map((p) => {
    const host = membersById.get(String(p.host_member_id));
    return {
      id: String(p.id),
      server_id: String(p.server_id),
      host_member_id: String(p.host_member_id),
      host_name: host?.display_name || "Host",
      game: String(p.game),
      rank_text: String(p.rank_text ?? ""),
      slots: Number(p.slots ?? 5),
      filled: fillCounts.get(String(p.id)) ?? 1,
      status: "open",
      expires_at: (p.expires_at as string | null) ?? null,
      created_at: String(p.created_at),
      updated_at: String(p.updated_at),
      discord_channel_id: (p.discord_channel_id as string | null) ?? null,
    };
  });

  let shows = 0;
  let ghosts = 0;
  let vibeCount = 0;
  const ghostlessByMember = new Map<string, GhostlessStats>();
  for (const g of ghostlessRes.data ?? []) {
    const row = g as Record<string, unknown>;
    const stats: GhostlessStats = {
      server_id: String(row.server_id),
      member_id: String(row.member_id),
      shows: Number(row.shows ?? 0),
      ghosts: Number(row.ghosts ?? 0),
      vibe_sum: 0,
      vibe_count: Number(row.vibe_count ?? 0),
      vibe_avg: row.vibe_avg == null ? null : Number(row.vibe_avg),
      show_rate_pct:
        row.show_rate_pct == null ? null : Number(row.show_rate_pct),
      updated_at: String(row.updated_at ?? new Date().toISOString()),
    };
    ghostlessByMember.set(stats.member_id, stats);
    shows += stats.shows;
    ghosts += stats.ghosts;
    vibeCount += stats.vibe_count;
  }
  const total = shows + ghosts;
  const ghostlessPct =
    total === 0 ? null : Math.round((shows / total) * 1000) / 10;

  const ranked = [...membersById.values()]
    .map((m) => ({ member: m, ghostless: ghostlessByMember.get(m.id) }))
    .filter(
      (row): row is { member: Member; ghostless: GhostlessStats } =>
        Boolean(row.ghostless) &&
        (row.ghostless!.show_rate_pct ?? 0) >= 90 &&
        row.ghostless!.shows + row.ghostless!.ghosts >= 5,
    )
    .sort(
      (a, b) =>
        (b.ghostless.show_rate_pct ?? 0) - (a.ghostless.show_rate_pct ?? 0),
    );

  const limit = settings.public_member_list ? 12 : 3;

  const monthlyLeaderboard = buildMonthlyLeaderboard({
    members: [...membersById.values()],
    ghostless: [...ghostlessByMember.values()].map((g) => ({
      member_id: g.member_id,
      shows: g.shows,
      ghosts: g.ghosts,
      show_rate_pct: g.show_rate_pct,
    })),
    parties: ((monthPartiesRes.data ?? []) as {
      host_member_id: string;
      created_at: string;
    }[]).map((p) => ({
      host_member_id: String(p.host_member_id),
      created_at: String(p.created_at),
    })),
  });

  return {
    server,
    settings,
    pathKey,
    showPoweredBy,
    accent,
    openParties,
    weekly: {
      parties: (weekPartiesRes.data ?? []).length,
      ghostlessPct,
      vibeCount,
    },
    spotlight: ranked.slice(0, limit),
    monthlyLeaderboard,
  };
}

export async function resolvePublicPlayer(
  slugOrGuildId: string,
  discordUserId: string,
): Promise<{
  bundle: PublicServerBundle;
  member: Member;
  ghostless: GhostlessStats | null;
  inGoodStanding: boolean;
} | null> {
  const bundle = await resolvePublicServer(slugOrGuildId);
  if (!bundle) return null;

  if (isDemoPublicKey(slugOrGuildId) || isDemoGuildId(bundle.server.discord_guild_id)) {
    const contentServerId =
      bundle.server.id === MOCK_SERVERS[2].id
        ? MOCK_SERVERS[0].id
        : bundle.server.id;
    const member = MOCK_MEMBERS.find(
      (m) =>
        m.server_id === contentServerId &&
        m.discord_user_id === discordUserId,
    );
    if (!member) return null;
    const ghostless = MOCK_GHOSTLESS[member.id] ?? null;
    const lockout = lockoutFor(member.id);
    return { bundle, member, ghostless, inGoodStanding: !lockout };
  }

  const sb = getServiceSupabase();
  if (!sb) return null;

  const { data: memberRow } = await sb
    .from("members")
    .select("*")
    .eq("server_id", bundle.server.id)
    .eq("discord_user_id", discordUserId)
    .maybeSingle();

  if (!memberRow) return null;
  const member = memberRow as Member;

  const { data: gRow } = await sb
    .from("ghostless_stats_view")
    .select("*")
    .eq("server_id", bundle.server.id)
    .eq("member_id", member.id)
    .maybeSingle();

  const ghostless: GhostlessStats | null = gRow
    ? {
        server_id: String((gRow as { server_id: string }).server_id),
        member_id: String((gRow as { member_id: string }).member_id),
        shows: Number((gRow as { shows: number }).shows ?? 0),
        ghosts: Number((gRow as { ghosts: number }).ghosts ?? 0),
        vibe_sum: 0,
        vibe_count: Number((gRow as { vibe_count: number }).vibe_count ?? 0),
        vibe_avg:
          (gRow as { vibe_avg: number | null }).vibe_avg == null
            ? null
            : Number((gRow as { vibe_avg: number }).vibe_avg),
        show_rate_pct:
          (gRow as { show_rate_pct: number | null }).show_rate_pct == null
            ? null
            : Number((gRow as { show_rate_pct: number }).show_rate_pct),
        updated_at: String(
          (gRow as { updated_at: string }).updated_at ??
            new Date().toISOString(),
        ),
      }
    : null;

  const { data: lockout } = await sb
    .from("lockouts")
    .select("id")
    .eq("server_id", bundle.server.id)
    .eq("member_id", member.id)
    .gt("until", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  return {
    bundle,
    member,
    ghostless,
    inGoodStanding: !lockout,
  };
}

export function discordPartyDeepLink(
  guildId: string,
  channelId?: string | null,
): string {
  if (channelId && channelId !== "lfg-channel-mock") {
    return `https://discord.com/channels/${guildId}/${channelId}`;
  }
  return `https://discord.com/channels/${guildId}`;
}

export function listMockPublicServers(): {
  name: string;
  pathKey: string;
}[] {
  return MOCK_SERVERS.map((s) => {
    const settings = MOCK_SETTINGS_BY_SERVER[s.id];
    if (!settings?.public_page_enabled) return null;
    return {
      name: s.name,
      pathKey: settings.slug || s.discord_guild_id,
    };
  }).filter(Boolean) as { name: string; pathKey: string }[];
}

/** Opt-in /servers directory — no cross-server Ghostless % / passport scores. */
export async function listDirectoryServers(): Promise<DirectoryServerCard[]> {
  const live = await listLiveDirectoryServers();
  if (live.length > 0) return live;
  return listMockDirectoryServers();
}

export function listMockDirectoryServers(): DirectoryServerCard[] {
  return MOCK_SERVERS.map((s) => {
    const settings = MOCK_SETTINGS_BY_SERVER[s.id];
    if (!settings) return null;
    return toDirectoryCard(s, settings);
  }).filter(Boolean) as DirectoryServerCard[];
}

async function listLiveDirectoryServers(): Promise<DirectoryServerCard[]> {
  const sb = getServiceSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("server_settings")
    .select(
      "slug, public_page_enabled, public_member_list, list_in_directory, discord_invite_url, servers!inner(id, name, plan, discord_guild_id, icon_url)",
    )
    .eq("public_page_enabled", true)
    .eq("list_in_directory", true)
    .limit(100);

  if (error || !data) return [];

  const cards: DirectoryServerCard[] = [];
  for (const row of data as Record<string, unknown>[]) {
    const serverRaw = row.servers as Record<string, unknown> | null;
    if (!serverRaw) continue;
    const server: Server = {
      id: String(serverRaw.id),
      discord_guild_id: String(serverRaw.discord_guild_id),
      name: String(serverRaw.name ?? ""),
      plan: (serverRaw.plan as Server["plan"]) || "trial",
      price_lock_cents: null,
      trial_ends_at: null,
      priority_support: false,
      stripe_customer_id: null,
      icon_url: (serverRaw.icon_url as string | null) ?? null,
      created_at: "",
      updated_at: "",
    };
    const settings = mapPublicSettings({
      ...row,
      server_id: server.id,
      created_at: "",
      updated_at: "",
    });
    const card = toDirectoryCard(server, settings);
    if (card) cards.push(card);
  }

  cards.sort((a, b) => a.name.localeCompare(b.name));
  return cards;
}

export function publicCardPath(pathKey: string, discordUserId: string) {
  return `/s/${pathKey}/u/${discordUserId}`;
}

export { getMember, MOCK_LOCKOUTS };
