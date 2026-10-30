"use client";

import { useMemo, useState } from "react";
import { PRO_PRICE_USD, buildBotInviteUrl } from "@rallied/shared";
import type {
  AnalyticsExtras,
  AnalyticsTopPlayer,
  AnalyticsTrendPoint,
} from "@/lib/dashboard-data";
import { AnalyticsProView } from "@/components/AnalyticsProView";
import { sumTrend } from "@/lib/analytics-stats";

type Props = {
  serverName: string;
  trend: AnalyticsTrendPoint[];
  priorTrend?: AnalyticsTrendPoint[];
  extras?: AnalyticsExtras | null;
  topPlayers?: AnalyticsTopPlayer[];
  sourceLabel: string;
};

export function DemoAnalyticsClient({
  serverName,
  trend,
  priorTrend = [],
  extras = null,
  topPlayers = [],
  sourceLabel,
}: Props) {
  const [proPreview, setProPreview] = useState(false);
  const maxParties = useMemo(
    () => Math.max(...trend.map((d) => d.parties), 1),
    [trend],
  );
  const weekParties = sumTrend(trend, "parties");
  const weekVibes = sumTrend(trend, "vibes");

  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "";
  const inviteHref = clientId
    ? buildBotInviteUrl(clientId)
    : "https://discord.com/developers/applications";

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
            Reliability health lives on{" "}
            <a href="/demo" className="text-coral hover:underline">
              Overview
            </a>
            .
          </p>
        </section>

        <section className="space-y-3 border border-coral/35 bg-coral/5 p-5">
          <h2 className="font-display text-xl tracking-wide">Pro analytics</h2>
          <p className="max-w-md text-sm text-muted">
            Day charts, week-over-week deltas, soft metrics, top players, and CSV
            export unlock on Pro (${PRO_PRICE_USD}/mo) or Founding Pro.
          </p>
          <button
            type="button"
            onClick={() => setProPreview(true)}
            className="inline-block rounded-brand bg-coral px-4 py-2 text-sm font-semibold text-slate transition hover:brightness-110"
          >
            Upgrade to Pro
          </button>
          <p className="text-xs text-muted">
            Demo only — unlocks a mock Pro preview (not a purchase).
          </p>
          {trend.length > 0 ? (
            <div className="grid grid-cols-7 gap-1 opacity-25" aria-hidden>
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

      <AnalyticsProView
        serverName={serverName}
        sourceLabel={`${sourceLabel} preview`}
        trend={trend}
        priorTrend={priorTrend}
        extras={extras}
        topPlayers={topPlayers}
        onExport={exportCsv}
      />

      <p className="text-xs text-muted">
        Pro also adds vanity branding on live servers — preview vanity under{" "}
        <a href="/demo/settings" className="text-coral hover:underline">
          Demo → Settings
        </a>{" "}
        or unlock on{" "}
        <a href="/s/demo-esports" className="text-coral hover:underline">
          /s/demo-esports
        </a>
        .
      </p>
    </div>
  );
}
