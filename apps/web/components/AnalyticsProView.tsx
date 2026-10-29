"use client";

import type {
  AnalyticsExtras,
  AnalyticsTopPlayer,
  AnalyticsTrendPoint,
} from "@/lib/dashboard-data";
import { buildWeekInsight, sumTrend } from "@/lib/analytics-stats";
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
  topPlayers?: AnalyticsTopPlayer[];
  onExport: () => void;
  exportDisabled?: boolean;
};

export function AnalyticsProView({
  serverName,
  sourceLabel,
  trend,
  priorTrend = [],
  extras = null,
  topPlayers = [],
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
  const peakNote = buildWeekInsight(trend, priorTrend);

  return (
    <div className="space-y-5">
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

          {peakNote ? (
            <p className="text-xs text-muted">{peakNote}</p>
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
              lowerIsBetter
            />
            <AnalyticsKpiCard
              label="Parties (7d)"
              value={parties}
              prior={priorParties}
            />
          </section>

          {extras &&
          (extras.showRatePct != null || extras.avgVibe != null) ? (
            <section className="grid gap-3 sm:grid-cols-2">
              {extras.showRatePct != null ? (
                <AnalyticsSoftMetric
                  label="Ghostless / show rate (7d)"
                  value={`${extras.showRatePct}%`}
                  numericValue={extras.showRatePct}
                  prior={extras.priorShowRatePct ?? null}
                />
              ) : null}
              {extras.avgVibe != null ? (
                <AnalyticsSoftMetric
                  label="Avg vibe (7d)"
                  value={String(extras.avgVibe)}
                  numericValue={extras.avgVibe}
                  prior={extras.priorAvgVibe ?? null}
                  hint="Out of 5"
                />
              ) : null}
            </section>
          ) : null}

          {topPlayers.length > 0 ? (
            <section className="rounded-brand border border-white/10 bg-slate-elevated/40 px-4 py-3">
              <h2 className="font-display text-lg tracking-wide">
                Top this week
              </h2>
              <ol className="mt-2 space-y-1.5">
                {topPlayers.map((p, i) => (
                  <li
                    key={`${p.name}-${i}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm"
                  >
                    <span className="text-white/90">
                      <span className="tabular-nums text-muted">{i + 1}. </span>
                      {p.name}
                    </span>
                    <span className="tabular-nums text-xs text-muted">
                      {p.showRatePct != null ? (
                        <span className="text-lime">{p.showRatePct}% show</span>
                      ) : (
                        "—"
                      )}
                      {p.vibeAvg != null ? (
                        <span className="text-white/45">
                          {" · vibe "}
                          {p.vibeAvg}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
