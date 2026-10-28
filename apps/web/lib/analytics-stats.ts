import type { AnalyticsTrendPoint } from "./dashboard-data";

export function sumTrend(
  trend: AnalyticsTrendPoint[],
  key: "parties" | "vibes" | "ghosts",
): number {
  return trend.reduce((a, d) => a + d[key], 0);
}

/** Percent change vs prior period. Null when prior is 0 and current > 0 (no base). */
export function pctChange(current: number, prior: number): number | null {
  if (prior === 0) return current === 0 ? 0 : null;
  return Math.round(((current - prior) / prior) * 100);
}

export function formatPctDelta(pct: number | null): string {
  if (pct == null) return "n/a";
  if (pct === 0) return "0%";
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

export function peakDay(
  trend: AnalyticsTrendPoint[],
  key: "parties" | "vibes" | "ghosts",
): AnalyticsTrendPoint | null {
  if (trend.length === 0) return null;
  return trend.reduce((best, d) => (d[key] > best[key] ? d : best), trend[0]);
}

export function buildWeekInsight(
  trend: AnalyticsTrendPoint[],
  prior: AnalyticsTrendPoint[],
): string | null {
  if (trend.length === 0) return null;
  const peak = peakDay(trend, "parties");
  const partiesDelta = pctChange(
    sumTrend(trend, "parties"),
    sumTrend(prior, "parties"),
  );
  if (!peak) return null;
  const deltaPart =
    partiesDelta == null
      ? "vs last week"
      : `${formatPctDelta(partiesDelta)} parties vs last week`;
  return `${peak.day} peak · ${deltaPart}`;
}
