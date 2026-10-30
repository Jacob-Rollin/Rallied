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
  const hasSoft =
    extras &&
    (extras.showRatePct != null ||
      extras.avgVibe != null ||
      extras.readyCheckCompletionPct != null);

  return (
    <div className="space-y-10">
      <section className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
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
          No party or vibe activity in the last 7 days. Live servers without a
          service role key also show empty — check Runtime Secrets.
        </p>
      ) : (
        <>
          <section className="space-y-3">
            <div>
              <h2 className="font-display text-xl tracking-wide">
                Volume this week
              </h2>
              <p className="mt-1 text-sm text-muted">
                Parties and vibe checks by day (UTC).
              </p>
            </div>
            <AnalyticsWeekBarChart
              title="Parties"
              trend={trend}
              metric="parties"
              barClassName="bg-lime"
            />
            <AnalyticsWeekBarChart
              title="Vibes"
              trend={trend}
              metric="vibes"
              barClassName="bg-coral"
            />
            {peakNote ? (
              <p className="text-xs text-muted">{peakNote}</p>
            ) : null}
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="font-display text-xl tracking-wide">
                Week totals
              </h2>
              <p className="mt-1 text-sm text-muted">
                Compared to the prior 7 days when data exists.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
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
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="font-display text-xl tracking-wide">
                Reliability soft metrics
              </h2>
              <p className="mt-1 text-sm text-muted">
                From vibe checks and ready-check event log — empty until activity.
              </p>
            </div>
            {hasSoft ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {extras!.showRatePct != null ? (
                  <AnalyticsSoftMetric
                    label="Show rate (7d)"
                    value={`${extras!.showRatePct}%`}
                    numericValue={extras!.showRatePct}
                    prior={extras!.priorShowRatePct ?? null}
                  />
                ) : null}
                {extras!.avgVibe != null ? (
                  <AnalyticsSoftMetric
                    label="Avg vibe (7d)"
                    value={String(extras!.avgVibe)}
                    numericValue={extras!.avgVibe}
                    prior={extras!.priorAvgVibe ?? null}
                    hint="Out of 5"
                  />
                ) : null}
                {extras!.readyCheckCompletionPct != null ? (
                  <AnalyticsSoftMetric
                    label="Ready completion (7d)"
                    value={`${extras!.readyCheckCompletionPct}%`}
                    numericValue={extras!.readyCheckCompletionPct}
                    prior={extras!.priorReadyCheckCompletionPct ?? null}
                    hint="All-ready ready checks"
                  />
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted">
                No soft metrics yet — need vibe checks or ready-check events
                (migration 011).
              </p>
            )}
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="font-display text-xl tracking-wide">
                Top this week
              </h2>
              <p className="mt-1 text-sm text-muted">
                By Ghostless show rate, then avg vibe (lifetime board stats).
              </p>
            </div>
            {topPlayers.length > 0 ? (
              <ol className="divide-y divide-white/10 border-y border-white/10">
                {topPlayers.map((p, i) => (
                  <li
                    key={`${p.name}-${i}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2.5 text-sm"
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
            ) : (
              <p className="text-sm text-muted">No ranked players yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
