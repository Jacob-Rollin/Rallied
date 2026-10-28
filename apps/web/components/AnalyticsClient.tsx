"use client";

import Link from "next/link";
import { useMemo } from "react";
import { isProPlan, PRO_PRICE_USD, type PlanId } from "@rallied/shared";
import type {
  AnalyticsExtras,
  AnalyticsTrendPoint,
} from "@/lib/dashboard-data";
import { AnalyticsProView } from "@/components/AnalyticsProView";

type Props = {
  serverName: string;
  plan: PlanId;
  trend: AnalyticsTrendPoint[];
  priorTrend?: AnalyticsTrendPoint[];
  extras?: AnalyticsExtras | null;
  billingHref: string;
  sourceLabel: string;
};

export function AnalyticsClient({
  serverName,
  plan,
  trend,
  priorTrend = [],
  extras = null,
  billingHref,
  sourceLabel,
}: Props) {
  const pro = isProPlan(plan);
  const maxParties = useMemo(
    () => Math.max(...trend.map((d) => d.parties), 1),
    [trend],
  );

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
      <section className="rounded-brand border border-coral/40 bg-coral/5 p-6">
        <h2 className="font-display text-xl tracking-wide">Pro analytics</h2>
        <p className="mt-2 max-w-md text-sm text-muted">
          Trends and CSV export unlock on Pro (${PRO_PRICE_USD}/mo) or Founding
          Pro. Community still gets a simple this-week summary on Overview.
        </p>
        <Link
          href={billingHref}
          className="mt-4 inline-block rounded-brand bg-coral px-4 py-2 text-sm font-semibold text-slate"
        >
          Upgrade to Pro
        </Link>
        {trend.length > 0 ? (
          <div className="mt-6 grid grid-cols-7 gap-1 opacity-30">
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
    );
  }

  return (
    <AnalyticsProView
      serverName={serverName}
      sourceLabel={sourceLabel}
      trend={trend}
      priorTrend={priorTrend}
      extras={extras}
      onExport={exportCsv}
    />
  );
}
