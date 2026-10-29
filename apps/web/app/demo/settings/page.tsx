import { DemoDataBanner } from "@/components/DemoDataBanner";
import { SettingsClient } from "@/components/SettingsClient";
import { DEMO_GUILD_ID, demoHref } from "@/lib/demo";
import { loadDashboard } from "@/lib/dashboard-data";

export default async function DemoSettingsPage() {
  const data = await loadDashboard(DEMO_GUILD_ID, true);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Grace, public page, Pro vanity — demo preview. Use{" "}
          <span className="text-coral">Upgrade to Pro</span> to unlock vanity
          controls locally (not a purchase).
        </p>
      </div>

      <DemoDataBanner />

      <SettingsClient
        serverName={data.server?.name ?? "Demo server"}
        discordGuildId={data.server?.discord_guild_id ?? DEMO_GUILD_ID}
        plan={data.server?.plan ?? "community"}
        priceLockCents={data.server?.price_lock_cents ?? null}
        settings={data.settings}
        billingHref={demoHref("/billing")}
        source={data.source}
        demoProUnlock
      />
    </div>
  );
}
