"use client";

import { useMemo, useState } from "react";
import { PRO_PRICE_USD, buildBotInviteUrl } from "@rallied/shared";
import type {
  AnalyticsExtras,
  AnalyticsTopPlayer,
  AnalyticsTrendPoint,
} from "@/lib/dashboard-data";
import { AnalyticsProView } from "@/components/AnalyticsProView";

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
        Pro also adds vanity branding and priority support on live servers —
        preview here is analytics-only.
      </p>
    </div>
  );
}
