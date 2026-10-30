import {
  monthLabelUtc,
  monthStartUtc,
  rankMostReliable,
  rankTopHosts,
  type LeaderboardHostEntry,
  type LeaderboardReliableEntry,
} from "@rallied/shared";

export type MonthlyLeaderboard = {
  monthLabel: string;
  mostReliable: LeaderboardReliableEntry[];
  topHosts: LeaderboardHostEntry[];
};

export function buildMonthlyLeaderboard(opts: {
  members: {
    id: string;
    display_name: string;
    discord_user_id?: string;
  }[];
  ghostless: {
    member_id: string;
    shows: number;
    ghosts: number;
    show_rate_pct: number | null;
  }[];
  parties: { host_member_id: string; created_at: string }[];
  now?: Date;
  limit?: number;
}): MonthlyLeaderboard {
  const now = opts.now ?? new Date();
  const limit = opts.limit ?? 5;
  const since = monthStartUtc(now).getTime();
  const byId = new Map(opts.members.map((m) => [m.id, m]));

  const mostReliable = rankMostReliable(
    opts.ghostless.map((g) => {
      const m = byId.get(g.member_id);
      return {
        memberId: g.member_id,
        displayName: m?.display_name ?? g.member_id.slice(0, 8),
        discordUserId: m?.discord_user_id,
        shows: g.shows,
        ghosts: g.ghosts,
        showRatePct: g.show_rate_pct,
      };
    }),
    { minSessions: 3, limit },
  );

  const counts = new Map<string, number>();
  for (const p of opts.parties) {
    if (new Date(p.created_at).getTime() < since) continue;
    counts.set(
      p.host_member_id,
      (counts.get(p.host_member_id) ?? 0) + 1,
    );
  }

  const topHosts = rankTopHosts(
    [...counts.entries()].map(([memberId, partiesHosted]) => {
      const m = byId.get(memberId);
      return {
        memberId,
        displayName: m?.display_name ?? memberId.slice(0, 8),
        discordUserId: m?.discord_user_id,
        partiesHosted,
      };
    }),
    { limit },
  );

  return {
    monthLabel: monthLabelUtc(now),
    mostReliable,
    topHosts,
  };
}
