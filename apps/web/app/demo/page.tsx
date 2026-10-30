import Link from "next/link";
import { DashboardRangeControl } from "@/components/DashboardRangeControl";
import { DemoDataBanner } from "@/components/DemoDataBanner";
import { MonthlyLeaderboard } from "@/components/MonthlyLeaderboard";
import { ReliabilityHealth } from "@/components/ReliabilityHealth";
import { StandbyPromotions } from "@/components/StandbyPromotions";
import { UpcomingScheduled } from "@/components/UpcomingScheduled";
import { DEMO_GUILD_ID, demoHref } from "@/lib/demo";
import { loadDashboard } from "@/lib/dashboard-data";
import { rangeFromSearchParams } from "@/lib/guild-params";
import { withDashboardQuery } from "@/lib/guild-params";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DemoOverviewPage({ searchParams }: Props) {
  const sp = await searchParams;
  const rangeKey = rangeFromSearchParams(sp);
  const data = await loadDashboard(DEMO_GUILD_ID, true, rangeKey);
  const plan = data.server?.plan;
  const rangeLabel = data.range.heading;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-wide">Overview</h1>
          <p className="mt-1 text-sm text-muted">
            {data.server?.name ?? "Demo server"} · what server owners see after
            adding Rallied
          </p>
        </div>
        <DashboardRangeControl pathname="/demo" current={rangeKey} />
      </div>

      <DemoDataBanner />

      <section className="space-y-3">
        <h2 className="font-display text-xl tracking-wide">At a glance</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "Open parties",
              value: data.openPartyCount,
              href: withDashboardQuery(demoHref("/lfg"), { range: rangeKey }),
            },
            {
              label: "Members",
              value: data.memberCount,
              href: withDashboardQuery(demoHref("/people"), {
                range: rangeKey,
              }),
            },
            {
              label: "Active strikes",
              value: data.activeStrikeCount,
              href: withDashboardQuery(demoHref("/people"), {
                range: rangeKey,
              }),
            },
          ].map((kpi) => (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="animate-rise border-b border-white/10 pb-3 transition hover:border-coral/50"
            >
              <p className="text-xs uppercase tracking-wider text-muted">
                {kpi.label}
              </p>
              <p className="mt-1 font-display text-3xl text-white">{kpi.value}</p>
            </Link>
          ))}
        </div>
      </section>

      {data.monthlyLeaderboard ? (
        <MonthlyLeaderboard
          monthLabel={data.monthlyLeaderboard.monthLabel}
          mostReliable={data.monthlyLeaderboard.mostReliable}
          topHosts={data.monthlyLeaderboard.topHosts}
          mostReliableIsLifetime={
            data.monthlyLeaderboard.mostReliableIsLifetime
          }
        />
      ) : null}

      {data.reliabilityHealth ? (
        <ReliabilityHealth
          health={data.reliabilityHealth}
          plan={plan}
          disputesHref={withDashboardQuery(demoHref("/disputes"), {
            range: rangeKey,
          })}
          billingHref={withDashboardQuery(demoHref("/billing"), {
            range: rangeKey,
          })}
          rangeLabel={rangeLabel}
        />
      ) : null}

      <UpcomingScheduled
        parties={data.upcomingScheduled}
        plan={plan}
        settingsHref={withDashboardQuery(demoHref("/settings"), {
          range: rangeKey,
        })}
        source={data.source}
      />

      <StandbyPromotions
        health={data.reliabilityHealth}
        rangeLabel={rangeLabel}
      />
    </div>
  );
}
