/**
 * Apply Stripe subscription state onto servers rows.
 * Forever-Pro / Official Rallied / founding_pro are never downgraded.
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

function activeLike(status: Stripe.Subscription.Status): boolean {
  return (
    status === "active" ||
    status === "trialing" ||
    status === "past_due"
  );
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
    "id, discord_guild_id, plan, forever_pro, stripe_customer_id, stripe_subscription_id, price_lock_cents";

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
    trial_ends_at: null,
    updated_at: new Date().toISOString(),
  };
  if (protectedForever) {
    patch.forever_pro = true;
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

  if (!activeLike(sub.status)) {
    // Cancel / incomplete → lapse unless forever protected
    if (protectedForever) {
      const { error } = await sb
        .from("servers")
        .update({
          stripe_customer_id: customerId ?? server.stripe_customer_id,
          stripe_subscription_id: sub.id,
          stripe_price_id: priceId,
          billing_interval: interval,
          forever_pro: true,
          // keep plan / price_lock / priority
          updated_at: new Date().toISOString(),
        })
        .eq("id", server.id);
      if (error) return { ok: false, detail: error.message };
      return { ok: true, detail: "protected_no_downgrade" };
    }

    const { error } = await sb
      .from("servers")
      .update({
        plan: "lapsed",
        stripe_customer_id: customerId ?? server.stripe_customer_id,
        stripe_subscription_id: sub.id,
        stripe_price_id: priceId,
        billing_interval: interval,
        priority_support: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", server.id);
    if (error) return { ok: false, detail: error.message };
    return { ok: true, detail: "lapsed" };
  }

  const nextPlan: PlanId =
    protectedForever && server.plan === "founding_pro"
      ? "founding_pro"
      : plan;

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
    trial_ends_at: null,
    updated_at: new Date().toISOString(),
  };
  if (protectedForever) patch.forever_pro = true;

  const { error } = await sb.from("servers").update(patch).eq("id", server.id);
  if (error) return { ok: false, detail: error.message };
  return { ok: true, detail: `plan=${nextPlan}` };
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

  if (isForeverProProtected(server)) {
    const { error } = await sb
      .from("servers")
      .update({
        stripe_subscription_id: null,
        stripe_price_id: null,
        billing_interval: null,
        stripe_customer_id: customerId ?? server.stripe_customer_id,
        forever_pro: true,
        // keep founding_pro / pro dogfood entitlements
        updated_at: new Date().toISOString(),
      })
      .eq("id", server.id);
    if (error) return { ok: false, detail: error.message };
    return { ok: true, detail: "protected_no_downgrade" };
  }

  const { error } = await sb
    .from("servers")
    .update({
      plan: "lapsed",
      stripe_subscription_id: null,
      stripe_price_id: null,
      billing_interval: null,
      stripe_customer_id: customerId ?? server.stripe_customer_id,
      priority_support: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", server.id);
  if (error) return { ok: false, detail: error.message };
  return { ok: true, detail: "lapsed" };
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
