"use client";

import type {
  AnalyticsExtras,
  AnalyticsTrendPoint,
} from "@/lib/dashboard-data";
import {
  buildWeekInsight,
  sumTrend,
} from "@/lib/analytics-stats";
import {
  AnalyticsKpiCard,
  AnalyticsSoftMetric,
  AnalyticsWeekBarChart,
} from "@/components/AnalyticsCharts";

type Props = {
  serverName: string;
  sourceLabel: string;
  trend: AnalyticsTrendPoint[];
  priorTrend?: AnalyticsTrendPoint[];
  extras?: AnalyticsExtras | null;
  onExport: () => void;
  exportDisabled?: boolean;
};

export function AnalyticsProView({
  serverName,
  sourceLabel,
  trend,
  priorTrend = [],
  extras = null,
  onExport,
  exportDisabled = false,
}: Props) {
  const empty = trend.every((d) => d.parties === 0 && d.vibes === 0);
  const hasPrior = priorTrend.length > 0;
  const parties = sumTrend(trend, "parties");
  const vibes = sumTrend(trend, "vibes");
  const ghosts = sumTrend(trend, "ghosts");
  const priorParties = hasPrior ? sumTrend(priorTrend, "parties") : null;
  const priorVibes = hasPrior ? sumTrend(priorTrend, "vibes") : null;
  const priorGhosts = hasPrior ? sumTrend(priorTrend, "ghosts") : null;
  const insight = buildWeekInsight(trend, priorTrend);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-lime">
          {serverName} · Pro trends ({sourceLabel})
        </p>
        <button
          type="button"
          onClick={onExport}
          disabled={exportDisabled || empty}
          className="rounded-brand border border-lime/50 px-3 py-1.5 text-sm font-semibold text-lime hover:bg-lime/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Export CSV
        </button>
      </section>

      {empty ? (
        <p className="text-sm text-muted">
          No party or vibe activity in the last 7 days.
        </p>
      ) : (
        <>
          <AnalyticsWeekBarChart
            title="Parties this week"
            trend={trend}
            metric="parties"
            barClassName="bg-lime"
          />
          <AnalyticsWeekBarChart
            title="Vibes this week"
            trend={trend}
            metric="vibes"
            barClassName="bg-lime"
          />

          {insight ? (
            <p className="text-sm text-muted">{insight}</p>
          ) : null}

          <section className="grid gap-3 sm:grid-cols-3">
            <AnalyticsKpiCard
              label="Vibes (7d)"
              value={vibes}
              prior={priorVibes}
            />
            <AnalyticsKpiCard
              label="Ghost flags (7d)"
              value={ghosts}
              prior={priorGhosts}
              valueClassName="text-coral"
            />
            <AnalyticsKpiCard
              label="Parties (7d)"
              value={parties}
              prior={priorParties}
            />
          </section>

          {extras &&
          (extras.showRatePct != null ||
            extras.avgVibe != null ||
            extras.readyCheckCompletionPct != null) ? (
            <section className="grid gap-3 sm:grid-cols-3">
              {extras.showRatePct != null ? (
                <AnalyticsSoftMetric
                  label="Show rate (7d)"
                  value={`${extras.showRatePct}%`}
                  hint="Ghostless reliability"
                />
              ) : null}
              {extras.avgVibe != null ? (
                <AnalyticsSoftMetric
                  label="Avg vibe (7d)"
                  value={String(extras.avgVibe)}
                  hint="Out of 5"
                />
              ) : null}
              {extras.readyCheckCompletionPct != null ? (
                <AnalyticsSoftMetric
                  label="Ready-check done"
                  value={`${extras.readyCheckCompletionPct}%`}
                  hint="Completed within grace"
                />
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
