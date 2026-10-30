import { DashboardRangeControl } from "@/components/DashboardRangeControl";
import { DemoAnalyticsClient } from "@/components/DemoAnalyticsClient";
import { DemoDataBanner } from "@/components/DemoDataBanner";
import { DEMO_GUILD_ID } from "@/lib/demo";
import { loadDashboard } from "@/lib/dashboard-data";
import { rangeFromSearchParams } from "@/lib/guild-params";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DemoAnalyticsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const rangeKey = rangeFromSearchParams(sp);
  const data = await loadDashboard(DEMO_GUILD_ID, true, rangeKey);
  const name = data.server?.name ?? "Demo server";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-wide">Analytics</h1>
          <p className="mt-1 text-sm text-muted">
            One job per section — volume, totals, soft reliability, top players.
            Demo Community teaser; Upgrade unlocks Pro preview.
          </p>
        </div>
        <DashboardRangeControl pathname="/demo/analytics" current={rangeKey} />
      </div>

      <DemoDataBanner />

      <DemoAnalyticsClient
        serverName={name}
        trend={data.analyticsTrend}
        priorTrend={data.analyticsTrendPrior}
        extras={data.analyticsExtras}
        topPlayers={data.analyticsTopPlayers}
        sourceLabel={data.source}
        rangeLabel={data.range.heading}
      />
    </div>
  );
}