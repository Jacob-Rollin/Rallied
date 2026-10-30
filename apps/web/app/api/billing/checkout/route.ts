import { NextRequest, NextResponse } from "next/server";
import {
  TRIAL_DAYS,
  isCommunityTrialEligible,
  type BillingInterval,
  type PaidCheckoutPlan,
  PLANS,
} from "@rallied/shared";
import { requireOwnerGuild } from "@/lib/auth/guild-access";
import { getSession } from "@/lib/auth/session";
import {
  countFoundingSeats,
  loadUserTrialConsumedAt,
  stripeCustomerHadTrial,
} from "@/lib/billing-sync";
import {
  appBaseUrl,
  getStripe,
  getStripePriceId,
  stripeConfigured,
} from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase";

type Body = {
  discordGuildId?: string;
  plan?: string;
  interval?: string;
};

function parsePlan(raw: string | undefined): PaidCheckoutPlan | null {
  if (raw === "community" || raw === "pro" || raw === "founding_pro") return raw;
  return null;
}

function parseInterval(raw: string | undefined): BillingInterval {
  return raw === "year" ? "year" : "month";
}

/**
 * Session-gated Stripe Checkout Session (subscription).
 * Community: card always required; trial_period_days only if guild
 * trial_consumed_at is null AND the Checkout Discord user never consumed.
 * Secrets stay on the Worker — client only receives the hosted Checkout URL.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user || session.isMock) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!stripeConfigured()) {
    return NextResponse.json(
      {
        error: "stripe_not_configured",
        hint: "Set STRIPE_SECRET_KEY + price IDs on the web Worker (test mode OK).",
      },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const discordGuildId = String(body.discordGuildId ?? "").trim();
  const plan = parsePlan(String(body.plan ?? "").trim());
  const interval = parseInterval(String(body.interval ?? "month").trim());
  const discordUserId = String(session.user.id ?? "").trim();

  if (!discordGuildId || !plan) {
    return NextResponse.json(
      {
        error: "missing_fields",
        hint: "discordGuildId and plan (community|pro|founding_pro) required",
      },
      { status: 400 },
    );
  }

  if (!discordUserId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!requireOwnerGuild(session, discordGuildId)) {
    return NextResponse.json(
      {
        error: "owner_required",
        hint: "Only server owners can open Checkout. Rallied Mods cannot bill.",
      },
      { status: 403 },
    );
  }

  const priceId = getStripePriceId(plan, interval);
  if (!priceId) {
    return NextResponse.json(
      {
        error: "price_not_configured",
        hint: `Set STRIPE_PRICE_${plan.toUpperCase()}_${interval === "year" ? "YEARLY" : "MONTHLY"} (or legacy STRIPE_PRICE_* for monthly).`,
        plan,
        interval,
      },
      { status: 503 },
    );
  }

  const sb = getServiceSupabase();
  if (!sb) {
    return NextResponse.json(
      {
        error: "supabase_unavailable",
        hint: "Set SUPABASE_SERVICE_ROLE_KEY on the web Worker.",
      },
      { status: 503 },
    );
  }

  const { data: server, error: sErr } = await sb
    .from("servers")
    .select(
      "id, discord_guild_id, plan, stripe_customer_id, forever_pro, name, trial_consumed_at",
    )
    .eq("discord_guild_id", discordGuildId)
    .maybeSingle();

  if (sErr || !server) {
    return NextResponse.json(
      {
        error: "server_not_found",
        hint: "Run /setup in Discord so the bot upserts this guild first.",
        detail: sErr?.message,
      },
      { status: 404 },
    );
  }

  if (plan === "founding_pro") {
    const already = server.plan === "founding_pro";
    if (!already) {
      const seats = await countFoundingSeats(sb);
      if (seats >= PLANS.founding_pro.seatCap) {
        return NextResponse.json(
          {
            error: "founding_sold_out",
            hint: `Founding Pro is capped at ${PLANS.founding_pro.seatCap} seats. Use Pro at list price, or ask Jacob for a Stripe coupon / manual SQL seat.`,
            seatCap: PLANS.founding_pro.seatCap,
            seats,
          },
          { status: 409 },
        );
      }
    }
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const userTrialConsumedAt = await loadUserTrialConsumedAt(sb, discordUserId);

  // Guild + user locks are source of truth; Stripe customer history is secondary.
  let grantTrial =
    plan === "community" &&
    isCommunityTrialEligible({
      trial_consumed_at: (server.trial_consumed_at as string | null) ?? null,
      user_trial_consumed_at: userTrialConsumedAt,
    });

  const existingCustomerId =
    typeof server.stripe_customer_id === "string" &&
    server.stripe_customer_id.startsWith("cus_")
      ? server.stripe_customer_id
      : null;

  if (grantTrial && existingCustomerId) {
    const hadStripeTrial = await stripeCustomerHadTrial(
      stripe,
      existingCustomerId,
    );
    if (hadStripeTrial) {
      grantTrial = false;
      // Persist guild lock so reinstall / later Checkout stays paid day-one.
      if (!server.trial_consumed_at) {
        await sb
          .from("servers")
          .update({
            trial_consumed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", server.id)
          .is("trial_consumed_at", null);
      }
    }
  }

  const base = appBaseUrl();
  const successUrl = `${base}/app/billing?guild=${encodeURIComponent(discordGuildId)}&checkout=success`;
  const cancelUrl = `${base}/app/billing?guild=${encodeURIComponent(discordGuildId)}&checkout=cancel`;

  const metadata: Record<string, string> = {
    discord_guild_id: discordGuildId,
    discord_user_id: discordUserId,
    server_id: String(server.id),
    rallied_plan: plan,
    billing_interval: interval,
    stripe_price_id: priceId,
    rallied_trial: grantTrial ? "1" : "0",
  };

  const subscriptionData: {
    metadata: Record<string, string>;
    trial_period_days?: number;
  } = {
    metadata,
  };
  if (grantTrial) {
    subscriptionData.trial_period_days = TRIAL_DAYS;
  }

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: discordGuildId,
      customer: existingCustomerId ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      // Card required even when trial_period_days is set (no charge until trial ends).
      payment_method_collection: "always",
      metadata,
      subscription_data: subscriptionData,
    });

    if (!checkout.url) {
      return NextResponse.json(
        { error: "checkout_url_missing" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      url: checkout.url,
      sessionId: checkout.id,
      trialGranted: grantTrial,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("checkout.session.create", message);
    return NextResponse.json(
      { error: "stripe_error", detail: message },
      { status: 502 },
    );
  }
}
