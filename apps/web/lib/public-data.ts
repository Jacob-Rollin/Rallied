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
import { isProPlan } from "@rallied/shared";
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
};

const MOCK_SETTINGS_BY_SERVER: Record<string, ServerSettings> = {
  [MOCK_SERVERS[0].id]: {
    ...MOCK_SETTINGS,
    slug: "demo-esports",
    public_page_enabled: true,
    public_member_list: false,
    hide_powered_by: false,
    public_accent: null,
  },
  [MOCK_SERVERS[1].id]: {
    ...MOCK_SETTINGS,
    server_id: MOCK_SERVERS[1].id,
    slug: "night-queue",
    public_page_enabled: true,
    public_member_list: true,
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

  const settings = MOCK_SETTINGS_BY_SERVER[server.id] ?? {
    ...MOCK_SETTINGS,
    server_id: server.id,
    slug: null,
    public_page_enabled: true,
    public_member_list: false,
    hide_powered_by: false,
    public_accent: null,
  };

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
    icon_url: (serverRow.icon_url as string | null) ?? null,
    created_at: String(serverRow.created_at),
    updated_at: String(serverRow.updated_at),
  };

  const settings: ServerSettings = settingsRow
    ? {
        server_id: String(settingsRow.server_id),
        grace_minutes: Number(settingsRow.grace_minutes ?? 5),
        ghostless_role_id:
          (settingsRow.ghostless_role_id as string | null) ?? null,
        ghostless_role_threshold_pct: Number(
          settingsRow.ghostless_role_threshold_pct ?? 90,
        ),
        ghostless_role_min_sessions: Number(
          settingsRow.ghostless_role_min_sessions ?? 10,
        ),
        digest_channel_id:
          (settingsRow.digest_channel_id as string | null) ?? null,
        strike_threshold: Number(settingsRow.strike_threshold ?? 3),
        lockout_days: Number(settingsRow.lockout_days ?? 7),
        slug: (settingsRow.slug as string | null) ?? null,
        public_page_enabled: settingsRow.public_page_enabled !== false,
        public_member_list: Boolean(settingsRow.public_member_list),
        hide_powered_by: Boolean(settingsRow.hide_powered_by),
        public_accent: (settingsRow.public_accent as string | null) ?? null,
        created_at: String(settingsRow.created_at),
        updated_at: String(settingsRow.updated_at),
      }
    : {
        server_id: server.id,
        grace_minutes: 5,
        ghostless_role_id: null,
        ghostless_role_threshold_pct: 90,
        ghostless_role_min_sessions: 10,
        digest_channel_id: null,
        strike_threshold: 3,
        lockout_days: 7,
        slug: null,
        public_page_enabled: true,
        public_member_list: false,
        hide_powered_by: false,
        public_accent: null,
        created_at: server.created_at,
        updated_at: server.updated_at,
      };

  if (!settings.public_page_enabled) return null;

  const pathKey = settings.slug || server.discord_guild_id;
  const pro = isProPlan(server.plan);
  const showPoweredBy = !(pro && settings.hide_powered_by);
  const accent = pro ? settings.public_accent : null;

  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

  const [partiesRes, membersRes, ghostlessRes, weekPartiesRes] =
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

export function publicCardPath(pathKey: string, discordUserId: string) {
  return `/s/${pathKey}/u/${discordUserId}`;
}

export { getMember, MOCK_LOCKOUTS };
