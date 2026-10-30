/**
 * Apply Stripe subscription state onto servers rows.
 * Forever-Pro / Official Rallied / founding_pro are never downgraded.
 * Cancel while active/trialing (cancel_at_period_end) keeps paid plan until
 * customer.subscription.deleted (period / trial end).
 * trial_consumed_at is never cleared (anti-farming).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
  isForeverProProtected,
  priceLockCentsForPlan,
  type BillingInterval,
  type PaidCheckoutPlan,
  type PlanId,
} from "@rallied/shared";
import { resolvePlanFromPriceId } from "./stripe";

export type ServerBillingRow = {
  id: string;
  discord_guild_id: string;
  plan: string;
  forever_pro: boolean | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  price_lock_cents: number | null;
  trial_consumed_at: string | null;
  trial_ends_at: string | null;
};

function subscriptionPrice(
  sub: Stripe.Subscription,
): { priceId: string | null; interval: BillingInterval | null } {
  const item = sub.items?.data?.[0];
  const price = item?.price;
  const priceId = typeof price?.id === "string" ? price.id : null;
  const interval =
    price?.recurring?.interval === "year"
      ? "year"
      : price?.recurring?.interval === "month"
        ? "month"
        : null;
  return { priceId, interval };
}

function planFromSub(
  sub: Stripe.Subscription,
  fallback?: PaidCheckoutPlan | null,
): { plan: PaidCheckoutPlan; interval: BillingInterval; priceId: string | null } {
  const { priceId, interval } = subscriptionPrice(sub);
  const resolved = resolvePlanFromPriceId(priceId);
  const metaPlan = String(sub.metadata?.rallied_plan ?? "").trim();
  const fromMeta =
    metaPlan === "community" ||
    metaPlan === "pro" ||
    metaPlan === "founding_pro"
      ? (metaPlan as PaidCheckoutPlan)
      : null;

  const plan = resolved?.plan ?? fromMeta ?? fallback ?? "community";
  const billingInterval =
    resolved?.interval ?? interval ?? ("month" as BillingInterval);

  return { plan, interval: billingInterval, priceId };
}

/** Access continues while Stripe still treats the sub as in-period. */
function activeLike(status: Stripe.Subscription.Status): boolean {
  return (
    status === "active" ||
    status === "trialing" ||
    status === "past_due"
  );
}

function trialEndIso(sub: Stripe.Subscription): string | null {
  if (sub.status !== "trialing") return null;
  if (typeof sub.trial_end === "number" && sub.trial_end > 0) {
    return new Date(sub.trial_end * 1000).toISOString();
  }
  return null;
}

function stripeUnixIso(seconds: number | null | undefined): string | null {
  if (typeof seconds !== "number" || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

async function findServer(
  sb: SupabaseClient,
  opts: {
    serverId?: string | null;
    guildId?: string | null;
    customerId?: string | null;
    subscriptionId?: string | null;
  },
): Promise<ServerBillingRow | null> {
  const select =
    "id, discord_guild_id, plan, forever_pro, stripe_customer_id, stripe_subscription_id, price_lock_cents, trial_consumed_at, trial_ends_at";

  if (opts.serverId) {
    const { data } = await sb
      .from("servers")
      .select(select)
      .eq("id", opts.serverId)
      .maybeSingle();
    if (data) return data as ServerBillingRow;
  }
  if (opts.guildId) {
    const { data } = await sb
      .from("servers")
      .select(select)
      .eq("discord_guild_id", opts.guildId)
      .maybeSingle();
    if (data) return data as ServerBillingRow;
  }
  if (opts.subscriptionId) {
    const { data } = await sb
      .from("servers")
      .select(select)
      .eq("stripe_subscription_id", opts.subscriptionId)
      .maybeSingle();
    if (data) return data as ServerBillingRow;
  }
  if (opts.customerId) {
    const { data } = await sb
      .from("servers")
      .select(select)
      .eq("stripe_customer_id", opts.customerId)
      .maybeSingle();
    if (data) return data as ServerBillingRow;
  }
  return null;
}

/** Set trial_consumed_at once; never clear. */
function withTrialConsumed(
  patch: Record<string, unknown>,
  server: ServerBillingRow,
  whenIso: string,
  force = false,
): void {
  if (force || !server.trial_consumed_at) {
    if (!server.trial_consumed_at) {
      patch.trial_consumed_at = whenIso;
    }
  }
}

/**
 * Insert Stripe event id for idempotency. Returns false if already processed.
 */
export async function claimWebhookEvent(
  sb: SupabaseClient,
  eventId: string,
  type: string,
): Promise<boolean> {
  const { error } = await sb.from("stripe_webhook_events").insert({
    id: eventId,
    type,
  });
  if (!error) return true;
  // Unique violation → already handled
  if (
    error.code === "23505" ||
    /duplicate|unique/i.test(error.message ?? "")
  ) {
    return false;
  }
  console.error("claimWebhookEvent", error.message);
  // Fail closed: don't apply if we can't record idempotency
  throw new Error(`webhook_claim_failed:${error.message}`);
}

export async function applyCheckoutCompleted(
  sb: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<{ ok: boolean; detail: string }> {
  if (session.mode !== "subscription") {
    return { ok: true, detail: "ignored_non_subscription" };
  }

  const guildId =
    session.metadata?.discord_guild_id ||
    session.client_reference_id ||
    null;
  const serverId = session.metadata?.server_id || null;
  const metaPlan = String(session.metadata?.rallied_plan ?? "").trim();
  const fallbackPlan =
    metaPlan === "community" ||
    metaPlan === "pro" ||
    metaPlan === "founding_pro"
      ? (metaPlan as PaidCheckoutPlan)
      : null;

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  const server = await findServer(sb, {
    serverId,
    guildId,
    customerId,
    subscriptionId,
  });
  if (!server) {
    console.error("checkout.session.completed: server not found", {
      guildId,
      serverId,
      customerId,
    });
    return { ok: false, detail: "server_not_found" };
  }

  let plan: PaidCheckoutPlan = fallbackPlan ?? "community";
  let interval: BillingInterval =
    session.metadata?.billing_interval === "year" ? "year" : "month";
  let priceId: string | null = null;

  // Prefer price from metadata when subscription object isn't expanded
  if (session.metadata?.stripe_price_id) {
    priceId = session.metadata.stripe_price_id;
    const resolved = resolvePlanFromPriceId(priceId);
    if (resolved) {
      plan = resolved.plan;
      interval = resolved.interval;
    }
  }

  const protectedForever = isForeverProProtected(server);
  // Official / forever: keep founding_pro even if they checked out Community for testing
  const nextPlan: PlanId =
    protectedForever && server.plan === "founding_pro"
      ? "founding_pro"
      : plan;

  const nowIso = new Date().toISOString();

  const patch: Record<string, unknown> = {
    plan: nextPlan,
    stripe_customer_id: customerId ?? server.stripe_customer_id,
    stripe_subscription_id: subscriptionId ?? server.stripe_subscription_id,
    stripe_price_id: priceId,
    billing_interval: interval,
    price_lock_cents: priceLockCentsForPlan(
      nextPlan === "founding_pro" ? "founding_pro" : plan,
    ),
    priority_support: nextPlan === "pro" || nextPlan === "founding_pro",
    updated_at: nowIso,
  };
  if (protectedForever) {
    patch.forever_pro = true;
  }
  // Mark consumed when Checkout granted a trial — subscription.updated sets trial_ends_at.
  if (session.metadata?.rallied_trial === "1") {
    withTrialConsumed(patch, server, nowIso);
  }

  const { error } = await sb.from("servers").update(patch).eq("id", server.id);
  if (error) {
    console.error("applyCheckoutCompleted update", error.message);
    return { ok: false, detail: error.message };
  }
  return { ok: true, detail: `plan=${nextPlan}` };
}

export async function applySubscriptionUpdated(
  sb: SupabaseClient,
  sub: Stripe.Subscription,
): Promise<{ ok: boolean; detail: string }> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
  const guildId = sub.metadata?.discord_guild_id || null;
  const serverId = sub.metadata?.server_id || null;

  const server = await findServer(sb, {
    serverId,
    guildId,
    customerId,
    subscriptionId: sub.id,
  });
  if (!server) {
    return { ok: false, detail: "server_not_found" };
  }

  const { plan, interval, priceId } = planFromSub(sub);
  const protectedForever = isForeverProProtected(server);
  const nowIso = new Date().toISOString();

  // cancel_at_period_end keeps status active/trialing until period/trial end.
  // Only non-active-like statuses mean access should drop (or wait for deleted).
  if (!activeLike(sub.status)) {
    if (protectedForever) {
      const { error } = await sb
        .from("servers")
        .update({
          stripe_customer_id: customerId ?? server.stripe_customer_id,
          stripe_subscription_id: sub.id,
          stripe_price_id: priceId,
          billing_interval: interval,
          forever_pro: true,
          // keep plan / price_lock / priority / trial_consumed_at
          updated_at: nowIso,
        })
        .eq("id", server.id);
      if (error) return { ok: false, detail: error.message };
      return { ok: true, detail: "protected_no_downgrade" };
    }

    // Prefer deleted handler for clean lapse; still safe to mark lapsed here.
    const patch: Record<string, unknown> = {
      plan: "lapsed",
      stripe_customer_id: customerId ?? server.stripe_customer_id,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      billing_interval: interval,
      priority_support: false,
      trial_ends_at: null,
      updated_at: nowIso,
    };
    withTrialConsumed(patch, server, nowIso);
    const { error } = await sb.from("servers").update(patch).eq("id", server.id);
    if (error) return { ok: false, detail: error.message };
    return { ok: true, detail: "lapsed" };
  }

  const nextPlan: PlanId =
    protectedForever && server.plan === "founding_pro"
      ? "founding_pro"
      : plan;

  const stripeTrialEnd = trialEndIso(sub);
  const patch: Record<string, unknown> = {
    plan: nextPlan,
    stripe_customer_id: customerId ?? server.stripe_customer_id,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    billing_interval: interval,
    price_lock_cents: priceLockCentsForPlan(
      nextPlan === "founding_pro" ? "founding_pro" : plan,
    ),
    priority_support: nextPlan === "pro" || nextPlan === "founding_pro",
    // Keep Community/Pro access while cancel_at_period_end; Stripe status stays active/trialing.
    trial_ends_at: stripeTrialEnd,
    updated_at: nowIso,
  };
  if (protectedForever) patch.forever_pro = true;

  // Stripe trial started (or metadata said Checkout trial) → lock guild forever.
  if (
    sub.status === "trialing" ||
    sub.trial_start != null ||
    sub.metadata?.rallied_trial === "1"
  ) {
    withTrialConsumed(
      patch,
      server,
      stripeUnixIso(sub.trial_start) ?? nowIso,
    );
  }

  const { error } = await sb.from("servers").update(patch).eq("id", server.id);
  if (error) return { ok: false, detail: error.message };
  const cancelNote = sub.cancel_at_period_end ? "+cancel_at_period_end" : "";
  return {
    ok: true,
    detail: `plan=${nextPlan};status=${sub.status}${cancelNote}`,
  };
}

export async function applySubscriptionDeleted(
  sb: SupabaseClient,
  sub: Stripe.Subscription,
): Promise<{ ok: boolean; detail: string }> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
  const guildId = sub.metadata?.discord_guild_id || null;
  const serverId = sub.metadata?.server_id || null;

  const server = await findServer(sb, {
    serverId,
    guildId,
    customerId,
    subscriptionId: sub.id,
  });
  if (!server) {
    return { ok: false, detail: "server_not_found" };
  }

  const nowIso = new Date().toISOString();

  if (isForeverProProtected(server)) {
    const { error } = await sb
      .from("servers")
      .update({
        stripe_subscription_id: null,
        stripe_price_id: null,
        billing_interval: null,
        stripe_customer_id: customerId ?? server.stripe_customer_id,
        forever_pro: true,
        trial_ends_at: null,
        // keep founding_pro / trial_consumed_at
        updated_at: nowIso,
      })
      .eq("id", server.id);
    if (error) return { ok: false, detail: error.message };
    return { ok: true, detail: "protected_no_downgrade" };
  }

  // Period / trial ended (Portal cancel_at_period_end) → Starter. Never clear trial_consumed_at.
  const patch: Record<string, unknown> = {
    plan: "lapsed",
    stripe_subscription_id: null,
    stripe_price_id: null,
    billing_interval: null,
    stripe_customer_id: customerId ?? server.stripe_customer_id,
    priority_support: false,
    trial_ends_at: null,
    updated_at: nowIso,
  };
  withTrialConsumed(patch, server, nowIso);

  const { error } = await sb.from("servers").update(patch).eq("id", server.id);
  if (error) return { ok: false, detail: error.message };
  return { ok: true, detail: "lapsed" };
}

/**
 * True if this Stripe customer already used a subscription trial
 * (secondary check — guild trial_consumed_at is source of truth).
 */
export async function stripeCustomerHadTrial(
  stripe: Stripe,
  customerId: string,
): Promise<boolean> {
  try {
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 30,
    });
    return subs.data.some(
      (s) =>
        s.trial_start != null ||
        s.metadata?.rallied_trial === "1" ||
        s.status === "trialing",
    );
  } catch (err) {
    console.error("stripeCustomerHadTrial", err);
    return false;
  }
}

/** Count Founding Pro seats (for ≤10 program). */
export async function countFoundingSeats(
  sb: SupabaseClient,
): Promise<number> {
  const { count, error } = await sb
    .from("servers")
    .select("*", { count: "exact", head: true })
    .eq("plan", "founding_pro");
  if (error) {
    console.error("countFoundingSeats", error.message);
    return 0;
  }
  return count ?? 0;
}
