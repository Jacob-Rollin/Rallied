import { DataSourceBanner } from "@/components/DataSourceBanner";
import { SettingsClient } from "@/components/SettingsClient";
import { loadDashboard } from "@/lib/dashboard-data";
import { resolveSelectedGuild, withGuildQuery } from "@/lib/guild-context";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SettingsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { guildId, useMock } = await resolveSelectedGuild({ searchParams: sp });
  const data = await loadDashboard(guildId, useMock);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Grace, public page, Pro vanity. Loaded from{" "}
          {data.source === "live" ? "Supabase" : "demo / mock"}.
        </p>
      </div>

      <DataSourceBanner source={data.source} notice={data.notice} />

      <SettingsClient
        serverName={data.server?.name ?? "Server"}
        discordGuildId={data.server?.discord_guild_id ?? guildId}
        plan={data.server?.plan ?? "trial"}
        priceLockCents={data.server?.price_lock_cents ?? null}
        settings={data.settings}
        billingHref={withGuildQuery("/app/billing", guildId)}
        source={data.source}
      />
    </div>
  );
}
