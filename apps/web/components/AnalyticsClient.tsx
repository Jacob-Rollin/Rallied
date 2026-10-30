"use client";

import Link from "next/link";
import { useMemo } from "react";
import { isProPlan, PRO_PRICE_USD, type PlanId } from "@rallied/shared";
import type {
  AnalyticsExtras,
  AnalyticsTopPlayer,
  AnalyticsTrendPoint,
} from "@/lib/dashboard-data";
import { AnalyticsProView } from "@/components/AnalyticsProView";
import { sumTrend } from "@/lib/analytics-stats";

type Props = {
  serverName: string;
  plan: PlanId;
  trend: AnalyticsTrendPoint[];
  priorTrend?: AnalyticsTrendPoint[];
  extras?: AnalyticsExtras | null;
  topPlayers?: AnalyticsTopPlayer[];
  billingHref: string;
  overviewHref: string;
  sourceLabel: string;
};

export function AnalyticsClient({
  serverName,
  plan,
  trend,
  priorTrend = [],
  extras = null,
  topPlayers = [],
  billingHref,
  overviewHref,
  sourceLabel,
}: Props) {
  const pro = isProPlan(plan);
  const maxParties = useMemo(
    () => Math.max(...trend.map((d) => d.parties), 1),
    [trend],
  );
  const weekParties = sumTrend(trend, "parties");
  const weekVibes = sumTrend(trend, "vibes");

  function exportCsv() {
    if (!pro) return;
    const header = "day,parties,vibes,ghosts\n";
    const rows = trend
      .map((d) => `${d.day},${d.parties},${d.vibes},${d.ghosts}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rallied-analytics.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!pro) {
    return (
      <div className="space-y-8">
        <section className="space-y-2">
          <h2 className="font-display text-xl tracking-wide">This week</h2>
          <p className="text-sm text-muted">
            Community gets a simple summary. Full trends + CSV are Pro.
          </p>
          <div className="flex flex-wrap gap-8 border-y border-white/10 py-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">
                Parties
              </p>
              <p className="mt-1 font-display text-3xl">{weekParties}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">
                Vibes
              </p>
              <p className="mt-1 font-display text-3xl">{weekVibes}</p>
            </div>
          </div>
          <p className="text-sm text-muted">
            Reliability health (no-show / vibe / disputes) lives on{" "}
            <Link href={overviewHref} className="text-coral hover:underline">
              Overview
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3 border border-coral/35 bg-coral/5 p-5">
          <h2 className="font-display text-xl tracking-wide">Pro analytics</h2>
          <p className="max-w-md text-sm text-muted">
            Day charts, week-over-week deltas, soft metrics, top players, and CSV
            export unlock on Pro (${PRO_PRICE_USD}/mo) or Founding Pro.
          </p>
          <Link
            href={billingHref}
            className="inline-block rounded-brand bg-coral px-4 py-2 text-sm font-semibold text-slate"
          >
            Upgrade to Pro
          </Link>
          {trend.length > 0 ? (
            <div className="mt-2 grid grid-cols-7 gap-1 opacity-25" aria-hidden>
              {trend.map((d, i) => (
                <div
                  key={`${d.day}-${i}`}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full rounded-sm bg-muted"
                    style={{ height: 8 + (d.parties / maxParties) * 48 }}
                  />
                  <span className="text-[10px] text-muted">{d.day}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <AnalyticsProView
      serverName={serverName}
      sourceLabel={sourceLabel}
      trend={trend}
      priorTrend={priorTrend}
      extras={extras}
      topPlayers={topPlayers}
      onExport={exportCsv}
    />
  );
}
