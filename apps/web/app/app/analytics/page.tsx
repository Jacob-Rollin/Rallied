"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { isProPlan, PRO_PRICE_USD } from "@rallied/shared";
import { MOCK_ANALYTICS_TREND, MOCK_SERVERS } from "@/lib/mock-data";

export default function AnalyticsPage() {
  // Toggle mock plan to preview Community teaser vs Pro
  const [viewAs, setViewAs] = useState<"community" | "founding_pro">(
    "founding_pro",
  );
  const server =
    viewAs === "founding_pro" ? MOCK_SERVERS[2] : MOCK_SERVERS[0];
  const pro = isProPlan(server.plan) || viewAs === "founding_pro";

  const maxParties = useMemo(
    () => Math.max(...MOCK_ANALYTICS_TREND.map((d) => d.parties), 1),
    [],
  );

  function exportCsv() {
    if (!pro) return;
    const header = "day,parties,vibes,ghosts\n";
    const rows = MOCK_ANALYTICS_TREND.map(
      (d) => `${d.day},${d.parties},${d.vibes},${d.ghosts}`,
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rallied-analytics-mock.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-wide">Analytics</h1>
          <p className="mt-1 text-sm text-muted">
            Pro: trends + CSV export. Community: this-week teaser → upgrade.
          </p>
        </div>
        <label className="text-xs text-muted">
          Preview as{" "}
          <select
            className="ml-1 rounded-brand border border-white/15 bg-slate-elevated px-2 py-1 text-white"
            value={viewAs}
            onChange={(e) =>
              setViewAs(e.target.value as "community" | "founding_pro")
            }
          >
            <option value="founding_pro">Founding Pro</option>
            <option value="community">Community</option>
          </select>
        </label>
      </div>

      {!pro ? (
        <section className="rounded-brand border border-coral/40 bg-coral/5 p-6">
          <h2 className="font-display text-xl tracking-wide">Pro analytics</h2>
          <p className="mt-2 max-w-md text-sm text-muted">
            Trends and CSV export unlock on Pro (${PRO_PRICE_USD}/mo) or Founding
            Pro. Community still gets a simple this-week summary on Overview.
          </p>
          <Link
            href="/app/billing"
            className="mt-4 inline-block rounded-brand bg-coral px-4 py-2 text-sm font-semibold text-slate"
          >
            Upgrade to Pro
          </Link>
          <div className="mt-6 grid grid-cols-7 gap-1 opacity-30">
            {MOCK_ANALYTICS_TREND.map((d) => (
              <div key={d.day} className="flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm bg-muted"
                  style={{ height: 8 + (d.parties / maxParties) * 48 }}
                />
                <span className="text-[10px] text-muted">{d.day}</span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <>
          <section className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-lime">
              {server.name} · Pro trends (mock)
            </p>
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-brand border border-lime/50 px-3 py-1.5 text-sm font-semibold text-lime hover:bg-lime/10"
            >
              Export CSV
            </button>
          </section>

          <section className="rounded-brand border border-white/10 bg-slate-elevated/40 p-5">
            <h2 className="font-display text-lg tracking-wide">
              Parties this week
            </h2>
            <div className="mt-6 flex items-end gap-2">
              {MOCK_ANALYTICS_TREND.map((d) => (
                <div
                  key={d.day}
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
                value: MOCK_ANALYTICS_TREND.reduce((a, d) => a + d.vibes, 0),
              },
              {
                label: "Ghost flags (7d)",
                value: MOCK_ANALYTICS_TREND.reduce((a, d) => a + d.ghosts, 0),
              },
              {
                label: "Parties (7d)",
                value: MOCK_ANALYTICS_TREND.reduce((a, d) => a + d.parties, 0),
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
    </div>
  );
}
