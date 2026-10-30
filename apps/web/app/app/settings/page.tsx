import { DataSourceBanner } from "@/components/DataSourceBanner";
import { SettingsClient } from "@/components/SettingsClient";
import { loadDashboard } from "@/lib/dashboard-data";
import {
  displayNameForGuild,
  resolveSelectedGuild,
  withGuildQuery,
} from "@/lib/guild-context";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SettingsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { guildId, useMock, oauthGuildName } = await resolveSelectedGuild({
    searchParams: sp,
  });
  const data = await loadDashboard(guildId, useMock);
  const serverName = displayNameForGuild({
    guildId,
    dbName: data.server?.name,
    oauthName: oauthGuildName,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Public page on/off, vanity slug →{" "}
          <code className="text-coral">/s/your-slug</code>, grace rules.{" "}
          {data.source === "live"
            ? "Save writes live to Supabase."
            : data.source === "empty"
              ? "Needs a live guild + SUPABASE_SERVICE_ROLE_KEY — not silent mock."
              : "Demo / mock preview (not your live guild)."}
        </p>
      </div>

      <DataSourceBanner source={data.source} notice={data.notice} />

      <SettingsClient
        serverName={serverName}
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
