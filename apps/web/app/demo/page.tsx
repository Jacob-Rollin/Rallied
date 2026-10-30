import Link from "next/link";
import { DemoDataBanner } from "@/components/DemoDataBanner";
import { MonthlyLeaderboard } from "@/components/MonthlyLeaderboard";
import { ReliabilityHealth } from "@/components/ReliabilityHealth";
import { StandbyPromotions } from "@/components/StandbyPromotions";
import { UpcomingScheduled } from "@/components/UpcomingScheduled";
import { DEMO_GUILD_ID, demoHref } from "@/lib/demo";
import { loadDashboard } from "@/lib/dashboard-data";

export default async function DemoOverviewPage() {
  const data = await loadDashboard(DEMO_GUILD_ID, true);
  const plan = data.server?.plan;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Overview</h1>
        <p className="mt-1 text-sm text-muted">
          {data.server?.name ?? "Demo server"} · what server owners see after
          adding Rallied
        </p>
      </div>

      <DemoDataBanner />

      <section className="space-y-3">
        <h2 className="font-display text-xl tracking-wide">At a glance</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "Open parties",
              value: data.openPartyCount,
              href: demoHref("/lfg"),
            },
            {
              label: "Members",
              value: data.memberCount,
              href: demoHref("/people"),
            },
            {
              label: "Active strikes",
              value: data.activeStrikeCount,
              href: demoHref("/people"),
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
        />
      ) : null}

      {data.reliabilityHealth ? (
        <ReliabilityHealth
          health={data.reliabilityHealth}
          plan={plan}
          disputesHref={demoHref("/disputes")}
          billingHref={demoHref("/billing")}
        />
      ) : null}

      <UpcomingScheduled
        parties={data.upcomingScheduled}
        plan={plan}
        settingsHref={demoHref("/settings")}
        source={data.source}
      />

      <StandbyPromotions health={data.reliabilityHealth} />
    </div>
  );
}
