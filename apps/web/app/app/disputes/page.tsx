import { DataSourceBanner } from "@/components/DataSourceBanner";
import { DisputesClient } from "@/components/DisputesClient";
import { loadDashboard } from "@/lib/dashboard-data";
import { resolveSelectedGuild } from "@/lib/guild-context";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DisputesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { guildId, useMock } = await resolveSelectedGuild({ searchParams: sp });
  const data = await loadDashboard(guildId, useMock);
  const open = data.disputes.filter((d) => d.status === "open");
  const closed = data.disputes.filter((d) => d.status !== "open");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Disputes</h1>
        <p className="mt-1 text-sm text-muted">
          Appeals for strikes / ghost flags in this server. The flagged player
          opens via <code className="text-coral">/dispute open</code> or the
          ratee Dispute button in Discord. Admins Overturn / Uphold here or with{" "}
          <code className="text-coral">/dispute resolve</code>.
        </p>
      </div>

      <DataSourceBanner source={data.source} notice={data.notice} />

      <DisputesClient
        discordGuildId={data.server?.discord_guild_id ?? guildId}
        plan={data.server?.plan ?? "free"}
        source={data.source}
        open={open}
        closed={closed}
      />
    </div>
  );
}
