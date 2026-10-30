import Link from "next/link";
import { reliabilityEnabled } from "@rallied/shared";
import { DataSourceBanner } from "@/components/DataSourceBanner";
import { MonthlyLeaderboard } from "@/components/MonthlyLeaderboard";
import { PlanBanner } from "@/components/PlanBanner";
import { ReliabilityHealth } from "@/components/ReliabilityHealth";
import { StandbyPromotions } from "@/components/StandbyPromotions";
import { UpcomingScheduled } from "@/components/UpcomingScheduled";
import { loadDashboard } from "@/lib/dashboard-data";
import {
  displayNameForGuild,
  resolveSelectedGuild,
  withGuildQuery,
} from "@/lib/guild-context";
import { isUsableServerName } from "@/lib/server-display-name";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OverviewPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { guildId, useMock, oauthGuildName } = await resolveSelectedGuild({
    searchParams: sp,
  });
  const data = await loadDashboard(guildId, useMock);
  const plan = data.server?.plan;
  const reliabilityOn = reliabilityEnabled(plan);
  const serverLabel = displayNameForGuild({
    guildId,
    dbName: data.server?.name,
    oauthName: oauthGuildName,
  });
  const hasRealName = isUsableServerName(serverLabel, guildId);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Overview</h1>
        <p className="mt-1 text-sm text-muted">
          {serverLabel}
          {!hasRealName && guildId ? (
            <span className="ml-2 font-mono text-xs text-white/35">
              {guildId}
            </span>
          ) : null}
        </p>
      </div>

      <DataSourceBanner source={data.source} notice={data.notice} />

      <PlanBanner
        plan={data.server?.plan}
        trialEndsAt={data.server?.trial_ends_at}
        billingHref={withGuildQuery("/app/billing", guildId)}
      />

      <section className="space-y-3">
        <h2 className="font-display text-xl tracking-wide">At a glance</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "Open parties",
              value: data.openPartyCount,
              href: withGuildQuery("/app/lfg", guildId),
            },
            {
              label: "Members",
              value: data.memberCount,
              href: withGuildQuery("/app/people", guildId),
            },
            {
              label: "Active strikes",
              value: data.activeStrikeCount,
              href: withGuildQuery("/app/people", guildId),
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
        {data.source === "live" && data.openPartyCount === 0 ? (
          <p className="text-sm text-muted">
            No open parties yet — create one with{" "}
            <code className="text-coral">/lfg create</code> in Discord.
          </p>
        ) : null}
      </section>

      {reliabilityOn && data.monthlyLeaderboard ? (
        <MonthlyLeaderboard
          monthLabel={data.monthlyLeaderboard.monthLabel}
          mostReliable={data.monthlyLeaderboard.mostReliable}
          topHosts={data.monthlyLeaderboard.topHosts}
        />
      ) : null}

      {reliabilityOn && data.reliabilityHealth ? (
        <ReliabilityHealth
          health={data.reliabilityHealth}
          plan={plan}
          disputesHref={withGuildQuery("/app/disputes", guildId)}
          billingHref={withGuildQuery("/app/billing", guildId)}
        />
      ) : null}

      <UpcomingScheduled
        parties={data.upcomingScheduled}
        plan={plan}
        settingsHref={withGuildQuery("/app/settings", guildId)}
        source={data.source}
      />

      {reliabilityOn ? (
        <StandbyPromotions health={data.reliabilityHealth} />
      ) : null}
    </div>
  );
}
