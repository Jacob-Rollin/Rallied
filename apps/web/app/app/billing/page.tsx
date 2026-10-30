import {
  isForeverProProtected,
  type PlanId,
} from "@rallied/shared";
import { BillingClient } from "@/components/BillingClient";
import { DataSourceBanner } from "@/components/DataSourceBanner";
import { getSession } from "@/lib/auth/session";
import { loadUserTrialConsumedAt } from "@/lib/billing-sync";
import { loadDashboard } from "@/lib/dashboard-data";
import {
  displayNameForGuild,
  resolveSelectedGuild,
} from "@/lib/guild-context";
import { isUsableServerName } from "@/lib/server-display-name";
import { stripeConfigured } from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function one(
  v: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function BillingPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { guildId, useMock, oauthGuildName } = await resolveSelectedGuild({
    searchParams: sp,
  });
  const data = await loadDashboard(guildId, useMock);
  const current = data.server;
  const plan = (current?.plan ?? "free") as PlanId;
  const checkoutRaw = one(sp.checkout);
  const checkoutFlash =
    checkoutRaw === "success" || checkoutRaw === "cancel"
      ? checkoutRaw
      : null;

  const foreverPro = current
    ? isForeverProProtected({
        discord_guild_id: current.discord_guild_id,
        plan: current.plan,
        forever_pro: current.forever_pro,
      })
    : false;

  const serverName = current
    ? displayNameForGuild({
        guildId,
        dbName: current.name,
        oauthName: oauthGuildName,
      })
    : isUsableServerName(oauthGuildName, guildId)
      ? String(oauthGuildName).trim()
      : null;

  let userTrialConsumedAt: string | null = null;
  if (!useMock) {
    const session = await getSession();
    const userId = session.user?.id;
    const sb = userId ? getServiceSupabase() : null;
    if (userId && sb) {
      userTrialConsumedAt = await loadUserTrialConsumedAt(sb, userId);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Billing</h1>
        <p className="mt-1 text-sm text-muted">
          Per Discord server · Path B prices · Stripe Checkout + Customer
          Portal.
        </p>
      </div>

      <DataSourceBanner source={data.source} notice={data.notice} />

      <BillingClient
        guildId={guildId}
        serverName={serverName}
        plan={plan}
        priceLockCents={current?.price_lock_cents ?? null}
        trialEndsAt={current?.trial_ends_at ?? null}
        trialConsumedAt={current?.trial_consumed_at ?? null}
        userTrialConsumedAt={userTrialConsumedAt}
        stripeCustomerId={current?.stripe_customer_id ?? null}
        stripeSubscriptionId={current?.stripe_subscription_id ?? null}
        billingInterval={current?.billing_interval ?? null}
        foreverPro={foreverPro}
        stripeReady={stripeConfigured() && data.source === "live"}
        checkoutFlash={checkoutFlash}
      />
    </div>
  );
}
