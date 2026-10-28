"use client";

import Link from "next/link";
import { useMemo } from "react";
import { isProPlan, PRO_PRICE_USD, type PlanId } from "@rallied/shared";
import type { AnalyticsTrendPoint } from "@/lib/dashboard-data";

type Props = {
  serverName: string;
  plan: PlanId;
  trend: AnalyticsTrendPoint[];
  billingHref: string;
  sourceLabel: string;
};

export function AnalyticsClient({
  serverName,
  plan,
  trend,
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
              <div key={`${d.day}-${i}`} className="flex flex-col items-center gap-1">
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

  const empty = trend.every((d) => d.parties === 0 && d.vibes === 0);

  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-lime">
          {serverName} · Pro trends ({sourceLabel})
        </p>
        <button
          type="button"
          onClick={exportCsv}
          disabled={empty}
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
          <section className="rounded-brand border border-white/10 bg-slate-elevated/40 p-5">
            <h2 className="font-display text-lg tracking-wide">
              Parties this week
            </h2>
            <div className="mt-6 flex items-end gap-2">
              {trend.map((d, i) => (
                <div
                  key={`${d.day}-${i}`}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <span className="text-xs tabular-nums text-muted">
                    {d.parties}
                  </span>
                  <div
                    className="w-full max-w-[40px] rounded-sm bg-coral/80"
                    style={{
                      height: `${16 + (d.parties / maxParties) * 100}px`,
                    }}
                  />
                  <span className="text-[11px] text-muted">{d.day}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "Vibes (7d)",
                value: trend.reduce((a, d) => a + d.vibes, 0),
              },
              {
                label: "Ghost flags (7d)",
                value: trend.reduce((a, d) => a + d.ghosts, 0),
              },
              {
                label: "Parties (7d)",
                value: trend.reduce((a, d) => a + d.parties, 0),
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-brand border border-white/10 bg-slate-elevated/50 p-4"
              >
                <p className="text-xs uppercase tracking-wider text-muted">
                  {kpi.label}
                </p>
                <p className="mt-2 font-display text-3xl">{kpi.value}</p>
              </div>
            ))}
          </section>
        </>
      )}
    </>
  );
}
