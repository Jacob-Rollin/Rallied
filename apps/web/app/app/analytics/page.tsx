import { AnalyticsClient } from "@/components/AnalyticsClient";
import { DataSourceBanner } from "@/components/DataSourceBanner";
import { loadDashboard } from "@/lib/dashboard-data";
import { resolveSelectedGuild, withGuildQuery } from "@/lib/guild-context";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AnalyticsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { guildId, useMock } = await resolveSelectedGuild({ searchParams: sp });
  const data = await loadDashboard(guildId, useMock);
  const plan = data.server?.plan ?? "community";
  const name = data.server?.name ?? "Server";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Analytics</h1>
        <p className="mt-1 text-sm text-muted">
          One job per section — volume, totals, soft reliability, top players.
          Pro unlocks charts + CSV; Community sees this-week counts.
        </p>
      </div>

      <DataSourceBanner source={data.source} notice={data.notice} />

      <AnalyticsClient
        serverName={name}
        plan={plan}
        trend={data.analyticsTrend}
        priorTrend={data.analyticsTrendPrior}
        extras={data.analyticsExtras}
        topPlayers={data.analyticsTopPlayers}
        billingHref={withGuildQuery("/app/billing", guildId)}
        overviewHref={withGuildQuery("/app", guildId)}
        sourceLabel={data.source}
      />
    </div>
  );
}
