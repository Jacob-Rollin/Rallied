import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  applyCheckoutCompleted,
  applySubscriptionDeleted,
  applySubscriptionUpdated,
  claimWebhookEvent,
} from "@/lib/billing-sync";
import {
  getStripe,
  getStripeWebhookSecret,
  stripeSubtleCrypto,
} from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Stripe webhook (test mode first).
 * Events: checkout.session.completed, customer.subscription.updated|deleted.
 * Idempotent via stripe_webhook_events.
 *
 * OpenNext / CF: prefer raw body via request.text(). If the platform already
 * parsed JSON, fall back to JSON.stringify of the body for constructEventAsync
 * (signature may fail — set Stripe Dashboard to send to this URL after deploy).
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const whSecret = getStripeWebhookSecret();
  if (!stripe || !whSecret) {
    return NextResponse.json(
      { error: "stripe_webhook_not_configured" },
      { status: 503 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err) {
    console.error("webhook body read", err);
    return NextResponse.json({ error: "body_read_failed" }, { status: 400 });
  }

  if (!rawBody) {
    return NextResponse.json({ error: "empty_body" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      whSecret,
      undefined,
      stripeSubtleCrypto,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("webhook signature", message);
    return NextResponse.json(
      { error: "invalid_signature", detail: message },
      { status: 400 },
    );
  }

  const sb = getServiceSupabase();
  if (!sb) {
    return NextResponse.json(
      { error: "supabase_unavailable" },
      { status: 503 },
    );
  }

  let claimed = false;
  try {
    claimed = await claimWebhookEvent(sb, event.id, event.type);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "idempotency_failed", detail: message },
      { status: 500 },
    );
  }

  if (!claimed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const result = await applyCheckoutCompleted(sb, session);
        if (!result.ok) {
          console.error("checkout.session.completed apply", result.detail);
        }
        // Prefer subscription object for price / interval accuracy
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (subId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subId);
            const subResult = await applySubscriptionUpdated(sb, sub);
            if (!subResult.ok) {
              console.error(
                "checkout→subscription sync",
                subResult.detail,
              );
            }
          } catch (err) {
            console.error("subscription retrieve after checkout", err);
          }
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const result = await applySubscriptionUpdated(sb, sub);
        if (!result.ok) {
          console.error("customer.subscription.updated apply", result.detail);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const result = await applySubscriptionDeleted(sb, sub);
        if (!result.ok) {
          console.error("customer.subscription.deleted apply", result.detail);
        }
        break;
      }
      default:
        // Acknowledge unused events (Stripe may send extras)
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("webhook handler", event.type, message);
    // Event claimed — return 200 to avoid infinite retry storms on logic bugs;
    // Stripe will not redeliver. Log for Jacob to replay if needed.
    return NextResponse.json(
      { received: true, applied: false, detail: message },
      { status: 200 },
    );
  }

  return NextResponse.json({ received: true });
}
