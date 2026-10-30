/**
 * Stripe client for the web Worker (OpenNext / Cloudflare).
 * Secrets stay server-only via getRuntimeEnv — never NEXT_PUBLIC_*.
 */
import Stripe from "stripe";
import {
  PLANS,
  type BillingInterval,
  type PaidCheckoutPlan,
} from "@rallied/shared";
import { getRuntimeEnv } from "./runtime-env";

export const stripeSubtleCrypto = Stripe.createSubtleCryptoProvider();

export type StripePriceKey =
  | "community_month"
  | "community_year"
  | "pro_month"
  | "pro_year"
  | "founding_pro_month"
  | "founding_pro_year";

const PRICE_ENV: Record<StripePriceKey, string[]> = {
  community_month: [
    "STRIPE_PRICE_COMMUNITY_MONTHLY",
    "STRIPE_PRICE_COMMUNITY",
  ],
  community_year: ["STRIPE_PRICE_COMMUNITY_YEARLY"],
  pro_month: ["STRIPE_PRICE_PRO_MONTHLY", "STRIPE_PRICE_PRO"],
  pro_year: ["STRIPE_PRICE_PRO_YEARLY"],
  founding_pro_month: [
    "STRIPE_PRICE_FOUNDING_PRO_MONTHLY",
    "STRIPE_PRICE_FOUNDING_PRO",
  ],
  founding_pro_year: ["STRIPE_PRICE_FOUNDING_PRO_YEARLY"],
};

let stripeClient: Stripe | null = null;

export function getStripeSecretKey(): string | undefined {
  return getRuntimeEnv("STRIPE_SECRET_KEY");
}

export function getStripeWebhookSecret(): string | undefined {
  return getRuntimeEnv("STRIPE_WEBHOOK_SECRET");
}

export function stripeConfigured(): boolean {
  return Boolean(getStripeSecretKey());
}

export function getStripe(): Stripe | null {
  const key = getStripeSecretKey();
  if (!key) return null;
  if (stripeClient) return stripeClient;
  stripeClient = new Stripe(key, {
    apiVersion: "2025-02-24.acacia",
    httpClient: Stripe.createFetchHttpClient(),
    typescript: true,
  });
  return stripeClient;
}

function firstEnv(names: string[]): string | undefined {
  for (const name of names) {
    const v = getRuntimeEnv(name);
    if (v?.trim()) return v.trim();
  }
  return undefined;
}

export function getStripePriceId(
  plan: PaidCheckoutPlan,
  interval: BillingInterval,
): string | undefined {
  const key = `${plan}_${interval}` as StripePriceKey;
  return firstEnv(PRICE_ENV[key] ?? []);
}

export function resolvePlanFromPriceId(
  priceId: string | null | undefined,
): { plan: PaidCheckoutPlan; interval: BillingInterval } | null {
  if (!priceId) return null;
  const pairs: Array<{
    plan: PaidCheckoutPlan;
    interval: BillingInterval;
  }> = [
    { plan: "community", interval: "month" },
    { plan: "community", interval: "year" },
    { plan: "pro", interval: "month" },
    { plan: "pro", interval: "year" },
    { plan: "founding_pro", interval: "month" },
    { plan: "founding_pro", interval: "year" },
  ];
  for (const p of pairs) {
    const id = getStripePriceId(p.plan, p.interval);
    if (id && id === priceId) return p;
  }
  return null;
}

export function listPriceConfigStatus(): Record<
  StripePriceKey,
  { configured: boolean; envKeys: string[] }
> {
  const out = {} as Record<
    StripePriceKey,
    { configured: boolean; envKeys: string[] }
  >;
  for (const key of Object.keys(PRICE_ENV) as StripePriceKey[]) {
    out[key] = {
      configured: Boolean(firstEnv(PRICE_ENV[key])),
      envKeys: PRICE_ENV[key],
    };
  }
  return out;
}

export function appBaseUrl(): string {
  return (
    getRuntimeEnv("NEXT_PUBLIC_APP_URL")?.replace(/\/$/, "") ||
    "https://rallied.gg"
  );
}

export function displayAmountFor(
  plan: PaidCheckoutPlan,
  interval: BillingInterval,
): { dollars: number; label: string } {
  if (interval === "year") {
    const cents = PLANS[plan].annualCents;
    return { dollars: cents / 100, label: `$${cents / 100}/yr` };
  }
  return {
    dollars: PLANS[plan].priceMonthly,
    label: `$${PLANS[plan].priceMonthly}/mo`,
  };
}
