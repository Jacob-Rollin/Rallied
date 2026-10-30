/** Per-server monthly leaderboard helpers (no cross-server network). */

export type LeaderboardReliableEntry = {
  memberId: string;
  displayName: string;
  discordUserId?: string;
  showRatePct: number;
  shows: number;
  ghosts: number;
};

export type LeaderboardHostEntry = {
  memberId: string;
  displayName: string;
  discordUserId?: string;
  partiesHosted: number;
};

/** UTC start of the calendar month containing `now`. */
export function monthStartUtc(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  );
}

export function monthLabelUtc(now = new Date()): string {
  return now.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Rank by Ghostless % (show rate), then sessions, then shows.
 * Skips members below minSessions (default 3).
 */
export function rankMostReliable(
  rows: {
    memberId: string;
    displayName: string;
    discordUserId?: string;
    shows: number;
    ghosts: number;
    showRatePct: number | null;
  }[],
  opts?: { minSessions?: number; limit?: number },
): LeaderboardReliableEntry[] {
  const minSessions = opts?.minSessions ?? 3;
  const limit = opts?.limit ?? 5;
  return rows
    .map((r) => {
      const total = r.shows + r.ghosts;
      const rate =
        r.showRatePct != null
          ? r.showRatePct
          : total > 0
            ? Math.round((r.shows / total) * 1000) / 10
            : null;
      return { ...r, total, rate };
    })
    .filter(
      (r): r is typeof r & { rate: number } =>
        r.rate != null && r.total >= minSessions,
    )
    .sort((a, b) => {
      if (b.rate !== a.rate) return b.rate - a.rate;
      if (b.total !== a.total) return b.total - a.total;
      return b.shows - a.shows;
    })
    .slice(0, limit)
    .map((r) => ({
      memberId: r.memberId,
      displayName: r.displayName,
      discordUserId: r.discordUserId,
      showRatePct: r.rate,
      shows: r.shows,
      ghosts: r.ghosts,
    }));
}

/**
 * Rank hosts by parties hosted count descending.
 * Count every party created this month — including soft-closed (`deleted_at`
 * set). Soft-close is for Find/open UI only; host credit must survive Close
 * and `/setup`.
 */
export function rankTopHosts(
  rows: {
    memberId: string;
    displayName: string;
    discordUserId?: string;
    partiesHosted: number;
  }[],
  opts?: { limit?: number },
): LeaderboardHostEntry[] {
  const limit = opts?.limit ?? 5;
  return [...rows]
    .filter((r) => r.partiesHosted > 0)
    .sort((a, b) => {
      if (b.partiesHosted !== a.partiesHosted) {
        return b.partiesHosted - a.partiesHosted;
      }
      return a.displayName.localeCompare(b.displayName);
    })
    .slice(0, limit);
}
