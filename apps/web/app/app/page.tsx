import Link from "next/link";
import { reliabilityEnabled } from "@rallied/shared";
import { DataSourceBanner } from "@/components/DataSourceBanner";
import { MonthlyLeaderboard } from "@/components/MonthlyLeaderboard";
import { PlanBanner } from "@/components/PlanBanner";
import { loadDashboard } from "@/lib/dashboard-data";
import { resolveSelectedGuild, withGuildQuery } from "@/lib/guild-context";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OverviewPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { guildId, useMock } = await resolveSelectedGuild({ searchParams: sp });
  const data = await loadDashboard(guildId, useMock);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Overview</h1>
        <p className="mt-1 text-sm text-muted">
          {data.server?.name ?? "Selected server"} · Discord guild{" "}
          <code className="text-coral/80">{guildId}</code>
        </p>
      </div>

      <DataSourceBanner source={data.source} notice={data.notice} />

      <PlanBanner
        plan={data.server?.plan}
        trialEndsAt={data.server?.trial_ends_at}
        billingHref={withGuildQuery("/app/billing", guildId)}
      />

      <div className="grid gap-4 sm:grid-cols-3">
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
            className="animate-rise rounded-brand border border-white/10 bg-slate-elevated/60 p-4 transition hover:border-coral/40"
          >
            <p className="text-xs uppercase tracking-wider text-muted">
              {kpi.label}
            </p>
            <p className="mt-2 font-display text-4xl text-white">{kpi.value}</p>
          </Link>
        ))}
      </div>

      {data.source === "live" && data.openPartyCount === 0 ? (
        <p className="text-sm text-muted">
          No open parties yet — create one with{" "}
          <code className="text-coral">/lfg create</code> in Discord.
        </p>
      ) : null}

      {reliabilityEnabled(data.server?.plan) && data.monthlyLeaderboard ? (
        <MonthlyLeaderboard
          monthLabel={data.monthlyLeaderboard.monthLabel}
          mostReliable={data.monthlyLeaderboard.mostReliable}
          topHosts={data.monthlyLeaderboard.topHosts}
        />
      ) : null}
    </div>
  );
}
