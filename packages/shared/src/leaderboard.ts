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

export type LeaderboardGameEntry = {
  /** Display label (most common casing among grouped titles). */
  game: string;
  parties: number;
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

/**
 * Rank games by LFG party create count for a guild window.
 * Blank / null / whitespace-only titles are excluded (not "Unspecified").
 * Groups case-insensitively after trim + whitespace collapse; display label
 * prefers the most common casing (ties → localeCompare).
 * Optional per-server `aliases` (alias_normalized → canonical_display) are
 * applied at read time — does not rewrite `lfg_parties.game`.
 * Count every party create — including soft-closed (`deleted_at` set), same
 * rule as Top hosts.
 */
export function rankTopGames(
  games: (string | null | undefined)[],
  opts?: {
    limit?: number;
    /** Per-guild alias map from server_settings.game_aliases */
    aliases?: Record<string, string> | null;
  },
): LeaderboardGameEntry[] {
  const limit = opts?.limit ?? 5;
  const aliases = opts?.aliases ?? null;
  type Acc = { count: number; labels: Map<string, number> };
  const byKey = new Map<string, Acc>();

  for (const raw of games) {
    if (raw == null) continue;
    let trimmed = String(raw).trim().replace(/\s+/g, " ");
    if (!trimmed) continue;
    if (aliases) {
      const mapped = aliases[trimmed.toLowerCase()];
      if (mapped) {
        const canon = String(mapped).trim().replace(/\s+/g, " ");
        if (canon) trimmed = canon;
      }
    }
    const key = trimmed.toLowerCase();
    let acc = byKey.get(key);
    if (!acc) {
      acc = { count: 0, labels: new Map() };
      byKey.set(key, acc);
    }
    acc.count += 1;
    acc.labels.set(trimmed, (acc.labels.get(trimmed) ?? 0) + 1);
  }

  return [...byKey.values()]
    .map((acc) => {
      const rankedLabels = [...acc.labels.entries()].sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        // Prefer title-ish (leading capital) over all-lower / ALL-CAPS ties.
        const aTitle = /^[A-Z]/.test(a[0]) && /[a-z]/.test(a[0]) ? 2
          : /^[A-Z]/.test(a[0]) ? 1
          : 0;
        const bTitle = /^[A-Z]/.test(b[0]) && /[a-z]/.test(b[0]) ? 2
          : /^[A-Z]/.test(b[0]) ? 1
          : 0;
        if (bTitle !== aTitle) return bTitle - aTitle;
        return a[0].localeCompare(b[0]);
      });
      return { game: rankedLabels[0]![0], parties: acc.count };
    })
    .sort((a, b) => {
      if (b.parties !== a.parties) return b.parties - a.parties;
      return a.game.localeCompare(b.game);
    })
    .slice(0, limit);
}
