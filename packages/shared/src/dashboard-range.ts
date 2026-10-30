/**
 * Admin dashboard time-range filters (UI only — not retention).
 *
 * **This week** = UTC week Monday 00:00 → Sunday (ISO-8601 weekday numbering;
 * same as “UTC Mon–Sun”). While the week is in progress, `end` is `now`.
 *
 * Retention purge / inactive soft-archive is unrelated; ranges never delete data.
 */

export const DASHBOARD_RANGE_QUERY = "range";

export type DashboardRangeKey = "week" | "month" | "30d" | "all";

export const DASHBOARD_RANGE_KEYS: readonly DashboardRangeKey[] = [
  "week",
  "month",
  "30d",
  "all",
] as const;

/** Default matches prior “this month” dashboard behavior. */
export const DEFAULT_DASHBOARD_RANGE: DashboardRangeKey = "month";

export type DashboardRangeOption = {
  key: DashboardRangeKey;
  /** Compact control label */
  label: string;
  /** Longer heading fragment */
  heading: string;
};

export const DASHBOARD_RANGE_OPTIONS: readonly DashboardRangeOption[] = [
  { key: "week", label: "This week", heading: "This week" },
  { key: "month", label: "This month", heading: "This month" },
  { key: "30d", label: "Last 30 days", heading: "Last 30 days" },
  { key: "all", label: "All time", heading: "All time" },
] as const;

export type ResolvedDashboardRange = {
  key: DashboardRangeKey;
  label: string;
  heading: string;
  /** Inclusive lower bound; `null` means all-time (no lower bound). */
  start: Date | null;
  /** Exclusive-ish upper bound — typically `now`. */
  end: Date;
  /**
   * Prior window of equal length for WoW / MoM deltas.
   * Null when `key === "all"` (no meaningful prior).
   */
  priorStart: Date | null;
  priorEnd: Date | null;
  /**
   * Chart bucketing: daily for week/month/30d; monthly for all-time
   * (last 12 UTC calendar months ending this month).
   */
  chartMode: "day" | "week" | "month";
  /** One-line definition for docs / UI hints. */
  definition: string;
};

/** UTC Monday 00:00:00.000 of the week containing `now`. */
export function weekStartUtc(now = new Date()): Date {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

export function parseDashboardRange(
  raw: string | null | undefined,
): DashboardRangeKey {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "week" || v === "month" || v === "30d" || v === "all") return v;
  // Aliases
  if (v === "lifetime" || v === "alltime" || v === "all-time") return "all";
  if (v === "30" || v === "30days") return "30d";
  return DEFAULT_DASHBOARD_RANGE;
}

function optionFor(key: DashboardRangeKey): DashboardRangeOption {
  return (
    DASHBOARD_RANGE_OPTIONS.find((o) => o.key === key) ??
    DASHBOARD_RANGE_OPTIONS[1]!
  );
}

/**
 * Resolve `?range=` into concrete UTC bounds.
 * @param now — inject for tests / demos
 */
export function resolveDashboardRange(
  key: DashboardRangeKey,
  now = new Date(),
): ResolvedDashboardRange {
  const opt = optionFor(key);
  const end = new Date(now);

  if (key === "week") {
    const start = weekStartUtc(now);
    const priorEnd = new Date(start);
    const priorStart = new Date(start);
    priorStart.setUTCDate(priorStart.getUTCDate() - 7);
    return {
      key,
      label: opt.label,
      heading: opt.heading,
      start,
      end,
      priorStart,
      priorEnd,
      chartMode: "day",
      definition:
        "UTC week Monday 00:00 → Sunday (ISO weekday; Mon–Sun in UTC).",
    };
  }

  if (key === "month") {
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
    );
    const priorEnd = new Date(start);
    const priorStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0),
    );
    return {
      key,
      label: opt.label,
      heading: opt.heading,
      start,
      end,
      priorStart,
      priorEnd,
      chartMode: "day",
      definition: "UTC calendar month from the 1st 00:00 through now.",
    };
  }

  if (key === "30d") {
    const start = new Date(now.getTime() - 30 * 86400_000);
    start.setUTCHours(0, 0, 0, 0);
    const priorEnd = new Date(start);
    const priorStart = new Date(start.getTime() - 30 * 86400_000);
    return {
      key,
      label: opt.label,
      heading: opt.heading,
      start,
      end,
      priorStart,
      priorEnd,
      chartMode: "day",
      definition: "Rolling last 30 UTC days through now.",
    };
  }

  // all — charts use last 12 calendar months so labels stay readable as history grows
  return {
    key,
    label: opt.label,
    heading: opt.heading,
    start: null,
    end,
    priorStart: null,
    priorEnd: null,
    chartMode: "month",
    definition:
      "All retained history while the bot is installed. Charts show the last 12 UTC calendar months.",
  };
}

/** ISO date key YYYY-MM-DD (UTC). */
export function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Short weekday label for charts (UTC). */
export function utcWeekdayLabel(d: Date): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()]!;
}

/** Compact month/day for longer charts (UTC). */
export function utcMonthDayLabel(d: Date): string {
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/** Day-of-month only — cleaner x-axis inside a single calendar month. */
export function utcDayOfMonthLabel(d: Date): string {
  return String(d.getUTCDate());
}

/** Short month name for all-time charts (UTC), e.g. "Oct". */
export function utcMonthLabel(d: Date): string {
  return [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][d.getUTCMonth()]!;
}

/**
 * Which x-axis ticks to show so mobile charts stay readable.
 * Always includes first + last; spreads ~`maxTicks` labels across the series.
 */
export function chartTickIndexes(
  length: number,
  maxTicks = 7,
): ReadonlySet<number> {
  if (length <= 0) return new Set();
  if (length <= maxTicks) {
    return new Set(Array.from({ length }, (_, i) => i));
  }
  const out = new Set<number>([0, length - 1]);
  const inner = maxTicks - 2;
  for (let t = 1; t <= inner; t++) {
    const i = Math.round((t * (length - 1)) / (maxTicks - 1));
    out.add(i);
  }
  return out;
}
