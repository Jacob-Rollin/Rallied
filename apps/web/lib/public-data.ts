/**
 * Mock-backed public page data.
 * When Supabase is wired later, swap resolvers — keep strikes off public surfaces.
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

export function resolvePublicServer(
  slugOrGuildId: string,
): PublicServerBundle | null {
  // Scaffold: mock data. Later: query servers + server_settings by slug/guild_id.
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

  // Founding demo has no parties/members yet — fall back to demo lounge content for spotlight UX
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

  // public_member_list false → Ghostless-only spotlight (top few reliable)
  // true → longer list still Ghostless-only (never strikes)
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

export function resolvePublicPlayer(
  slugOrGuildId: string,
  discordUserId: string,
): {
  bundle: PublicServerBundle;
  member: Member;
  ghostless: GhostlessStats | null;
  inGoodStanding: boolean;
} | null {
  const bundle = resolvePublicServer(slugOrGuildId);
  if (!bundle) return null;

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
  // Soft standing only — never expose strike counts publicly
  const inGoodStanding = !lockout;

  return { bundle, member, ghostless, inGoodStanding };
}

export function discordPartyDeepLink(
  guildId: string,
  channelId?: string | null,
): string {
  if (channelId && channelId !== "lfg-channel-mock") {
    return `https://discord.com/channels/${guildId}/${channelId}`;
  }
  // Mock / missing channel → Discord app home for the guild
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
