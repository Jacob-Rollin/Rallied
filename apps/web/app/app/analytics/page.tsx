import { AnalyticsClient } from "@/components/AnalyticsClient";
import { DashboardRangeControl } from "@/components/DashboardRangeControl";
import { DataSourceBanner } from "@/components/DataSourceBanner";
import { loadDashboard } from "@/lib/dashboard-data";
import {
  displayNameForGuild,
  rangeFromSearchParams,
  resolveSelectedGuild,
  withDashboardQuery,
} from "@/lib/guild-context";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AnalyticsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { guildId, useMock, oauthGuildName } = await resolveSelectedGuild({
    searchParams: sp,
  });
  const rangeKey = rangeFromSearchParams(sp);
  const data = await loadDashboard(guildId, useMock, rangeKey);
  const plan = data.server?.plan ?? "community";
  const name = displayNameForGuild({
    guildId,
    dbName: data.server?.name,
    oauthName: oauthGuildName,
  });
  const q = { guildId, range: rangeKey };
  const rangeExtra = useMock ? { mock: "1" } : undefined;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-wide">Analytics</h1>
          <p className="mt-1 text-sm text-muted">
            {name} · volume, totals, soft reliability, top players. Pro unlocks
            charts + CSV; Community sees period counts.
          </p>
        </div>
        <DashboardRangeControl
          pathname="/app/analytics"
          current={rangeKey}
          guildId={guildId}
          extra={rangeExtra}
        />
      </div>

      <DataSourceBanner source={data.source} notice={data.notice} />

      <AnalyticsClient
        serverName={name}
        plan={plan}
        trend={data.analyticsTrend}
        priorTrend={data.analyticsTrendPrior}
        extras={data.analyticsExtras}
        topPlayers={data.analyticsTopPlayers}
        billingHref={withDashboardQuery("/app/billing", q)}
        overviewHref={withDashboardQuery("/app", q)}
        sourceLabel={data.source}
        rangeLabel={data.range.heading}
      />
    </div>
  );
}
