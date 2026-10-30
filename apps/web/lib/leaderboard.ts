import {
  monthLabelUtc,
  monthStartUtc,
  rankMostReliable,
  rankTopHosts,
  type LeaderboardHostEntry,
  type LeaderboardReliableEntry,
} from "@rallied/shared";

export type MonthlyLeaderboard = {
  /** Display label for the host period (e.g. "October 2026", "This week"). */
  monthLabel: string;
  mostReliable: LeaderboardReliableEntry[];
  topHosts: LeaderboardHostEntry[];
  /**
   * Most reliable uses lifetime Ghostless % (not period-sliced).
   * Always true today — kept explicit for UI labeling.
   */
  mostReliableIsLifetime: boolean;
};

/**
 * Build Most reliable + Top hosts for a server.
 * `parties` should include soft-closed rows (`deleted_at` set) so host credit
 * survives Close / expire / `/setup` (Find UI filters those separately).
 *
 * Top hosts are filtered by `since` (null = all retained history).
 * Most reliable stays lifetime Ghostless % — do not rewrite badge formulas.
 */
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
  /** Inclusive lower bound for Top hosts; null = all time. Default: UTC month start. */
  since?: Date | null;
  /** Override period label (dashboard range heading / month name). */
  periodLabel?: string;
}): MonthlyLeaderboard {
  const now = opts.now ?? new Date();
  const limit = opts.limit ?? 5;
  const sinceMs =
    opts.since === undefined
      ? monthStartUtc(now).getTime()
      : opts.since == null
        ? null
        : opts.since.getTime();
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
    if (sinceMs != null && new Date(p.created_at).getTime() < sinceMs) continue;
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
    monthLabel: opts.periodLabel ?? monthLabelUtc(now),
    mostReliable,
    topHosts,
    mostReliableIsLifetime: true,
  };
}
