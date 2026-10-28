import { DemoAnalyticsClient } from "@/components/DemoAnalyticsClient";
import { DemoDataBanner } from "@/components/DemoDataBanner";
import { DEMO_GUILD_ID } from "@/lib/demo";
import { loadDashboard } from "@/lib/dashboard-data";

export default async function DemoAnalyticsPage() {
  const data = await loadDashboard(DEMO_GUILD_ID, true);
  const name = data.server?.name ?? "Demo server";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Analytics</h1>
        <p className="mt-1 text-sm text-muted">
          Pro: trends + CSV export. Community: this-week teaser → upgrade
          preview.
        </p>
      </div>

      <DemoDataBanner />

      <DemoAnalyticsClient
        serverName={name}
        trend={data.analyticsTrend}
        priorTrend={data.analyticsTrendPrior}
        extras={data.analyticsExtras}
        topPlayers={data.analyticsTopPlayers}
        sourceLabel={data.source}
      />
    </div>
  );
}
