"use client";

import { useMemo, useState } from "react";
import { PRO_PRICE_USD, buildBotInviteUrl } from "@rallied/shared";
import type { AnalyticsTrendPoint } from "@/lib/dashboard-data";

type Props = {
  serverName: string;
  trend: AnalyticsTrendPoint[];
  sourceLabel: string;
};

export function DemoAnalyticsClient({
  serverName,
  trend,
  sourceLabel,
}: Props) {
  const [proPreview, setProPreview] = useState(false);
  const maxParties = useMemo(
    () => Math.max(...trend.map((d) => d.parties), 1),
    [trend],
  );
  const maxVibes = useMemo(
    () => Math.max(...trend.map((d) => d.vibes), 1),
    [trend],
  );

  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "";
  const inviteHref = clientId
    ? buildBotInviteUrl(clientId)
    : "https://discord.com/developers/applications";

  const totals = useMemo(
    () => ({
      parties: trend.reduce((a, d) => a + d.parties, 0),
      vibes: trend.reduce((a, d) => a + d.vibes, 0),
      ghosts: trend.reduce((a, d) => a + d.ghosts, 0),
    }),
    [trend],
  );

  function exportCsv() {
    const header = "day,parties,vibes,ghosts\n";
    const rows = trend
      .map((d) => `${d.day},${d.parties},${d.vibes},${d.ghosts}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rallied-demo-analytics.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!proPreview) {
    return (
      <section className="rounded-brand border border-coral/40 bg-coral/5 p-6">
        <h2 className="font-display text-xl tracking-wide">Pro analytics</h2>
        <p className="mt-2 max-w-md text-sm text-muted">
          Trends and CSV export unlock on Pro (${PRO_PRICE_USD}/mo) or Founding
          Pro. Community still gets a simple this-week summary on Overview.
        </p>
        <button
          type="button"
          onClick={() => setProPreview(true)}
          className="mt-4 inline-block rounded-brand bg-coral px-4 py-2 text-sm font-semibold text-slate transition hover:brightness-110"
        >
          Upgrade to Pro
        </button>
        <p className="mt-2 text-xs text-muted">
          Demo only — unlocks a mock Pro preview (not a purchase).
        </p>
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
    <div className="space-y-6">
      <p
        className="rounded-brand border border-lime/40 bg-lime/10 px-3 py-2 text-xs text-lime"
        role="status"
      >
        <span className="font-semibold uppercase tracking-wider">
          Demo · Pro preview
        </span>
        {" — "}
        Mock trends and CSV export. Not a real purchase — your Discord is
        unchanged.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setProPreview(false)}
          className="rounded-brand border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:border-coral/50"
        >
          Back to locked view
        </button>
        <a
          href={inviteHref}
          className="rounded-brand bg-coral px-3 py-1.5 text-xs font-semibold text-slate transition hover:brightness-110"
        >
          Add to Discord
        </a>
      </div>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-lime">
          {serverName} · Pro trends ({sourceLabel} preview)
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
          {trend.map((d, i) => (
            <div
              key={`parties-${d.day}-${i}`}
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

      <section className="rounded-brand border border-white/10 bg-slate-elevated/40 p-5">
        <h2 className="font-display text-lg tracking-wide">Vibes this week</h2>
        <div className="mt-6 flex items-end gap-2">
          {trend.map((d, i) => (
            <div
              key={`vibes-${d.day}-${i}`}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <span className="text-xs tabular-nums text-muted">{d.vibes}</span>
              <div
                className="w-full max-w-[40px] rounded-sm bg-lime/70"
                style={{
                  height: `${16 + (d.vibes / maxVibes) * 100}px`,
                }}
              />
              <span className="text-[11px] text-muted">{d.day}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Vibes (7d)", value: totals.vibes },
          { label: "Ghost flags (7d)", value: totals.ghosts },
          { label: "Parties (7d)", value: totals.parties },
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

      <p className="text-xs text-muted">
        Pro also adds vanity branding and priority support on live servers —
        preview here is analytics-only.
      </p>
    </div>
  );
}
