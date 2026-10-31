"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  COMMUNITY_PRICE_USD,
  FOUNDING_PRO_PRICE_USD,
  PLANS,
  PRO_PRICE_USD,
  formatAdminPlanLine,
  isCommunityTrialEligible,
  isPaidPlan,
  isProPlan,
  isStarterPlan,
  type PlanId,
} from "@rallied/shared";

type Interval = "month" | "year";

type Props = {
  guildId: string;
  serverName: string | null;
  plan: PlanId | string;
  priceLockCents: number | null;
  trialEndsAt: string | null;
  trialConsumedAt: string | null;
  userTrialConsumedAt: string | null;
  stripeCustomerId: string | null;
  billingInterval: "month" | "year" | null;
  foreverPro: boolean;
  stripeReady: boolean;
  checkoutFlash?: "success" | "cancel" | null;
};

type Sku = {
  plan: "community" | "pro" | "founding_pro";
  title: string;
  monthly: number;
  annual: number;
  blurb: string;
  accent: "lime" | "coral" | "founding";
};

const SKUS: Sku[] = [
  {
    plan: "community",
    title: "Community",
    monthly: COMMUNITY_PRICE_USD,
    annual: PLANS.community.annualCents / 100,
    blurb:
      "Unlimited guild LFG + Ghostless + strikes (per-host open cap is lobby hygiene, admin-set). First Checkout: 14-day trial (card required, charged after trial). One trial per Discord server and per Discord user.",
    accent: "lime",
  },
  {
    plan: "pro",
    title: "Pro",
    monthly: PRO_PRICE_USD,
    annual: PLANS.pro.annualCents / 100,
    blurb:
      "CSV export + trends, iCal, priority. Pro vanity = custom public accent + hide “Powered by Rallied” (Discord’s own guild icon is Community+ on /s and /servers).",
    accent: "coral",
  },
  {
    plan: "founding_pro",
    title: "Founding Pro",
    monthly: FOUNDING_PRO_PRICE_USD,
    annual: PLANS.founding_pro.annualCents / 100,
    blurb: `Full Pro (incl. vanity branding) at $${FOUNDING_PRO_PRICE_USD}/mo · ≤${PLANS.founding_pro.seatCap} seats (coupon / manual if sold out).`,
    accent: "founding",
  },
];

export function BillingClient({
  guildId,
  serverName,
  plan,
  priceLockCents,
  trialEndsAt,
  trialConsumedAt,
  userTrialConsumedAt,
  stripeCustomerId,
  billingInterval,
  foreverPro,
  stripeReady,
  checkoutFlash,
}: Props) {
  const router = useRouter();
  const [interval, setInterval] = useState<Interval>(
    billingInterval === "year" ? "year" : "month",
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pro = isProPlan(plan);
  const paid = isPaidPlan(plan);
  const starter = isStarterPlan(plan);
  const communityTrialEligible = isCommunityTrialEligible({
    trial_consumed_at: trialConsumedAt,
    user_trial_consumed_at: userTrialConsumedAt,
  });
  const planLine = formatAdminPlanLine(plan, { priceLockCents });

  async function startCheckout(
    target: "community" | "pro" | "founding_pro",
  ) {
    setError(null);
    setBusy(`checkout:${target}`);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          discordGuildId: guildId,
          plan: target,
          interval,
        }),
      });
      const data = (await res.json()) as {
        url?: string;
        error?: string;
        hint?: string;
        detail?: string;
      };
      if (!res.ok || !data.url) {
        setError(
          data.hint ||
            data.detail ||
            data.error ||
            "Checkout failed — check Stripe secrets / price IDs.",
        );
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setError(null);
    setBusy("portal");
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ discordGuildId: guildId }),
      });
      const data = (await res.json()) as {
        url?: string;
        error?: string;
        hint?: string;
        detail?: string;
      };
      if (!res.ok || !data.url) {
        setError(
          data.hint ||
            data.detail ||
            data.error ||
            "Portal failed — subscribe first.",
        );
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Portal failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      {checkoutFlash === "success" ? (
        <div className="rounded-brand border border-lime/40 bg-lime/10 px-4 py-3 text-sm text-white/90">
          Checkout complete — plan updates when the Stripe webhook lands (usually
          seconds).{" "}
          <button
            type="button"
            className="font-semibold text-lime hover:underline"
            onClick={() => router.refresh()}
          >
            Refresh
          </button>
        </div>
      ) : null}
      {checkoutFlash === "cancel" ? (
        <div className="rounded-brand border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70">
          Checkout canceled — no charge. Pick a plan below when you&apos;re ready.
        </div>
      ) : null}

      <section className="rounded-brand border border-lime/40 bg-lime/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-lime">
              Current plan
            </p>
            <h2 className="mt-1 font-display text-2xl tracking-wide">
              {serverName ?? "Server not in Supabase yet"}
            </h2>
            <p className="mt-1 text-sm text-white/90">
              {planLine}
              {billingInterval === "year" ? " · billed yearly" : ""}
            </p>
            {plan === "trial" && trialEndsAt ? (
              <p className="mt-1 text-xs text-white/60">
                Trial ends {new Date(trialEndsAt).toLocaleDateString()} — then
                Starter caps unless you stay subscribed. Cancel keeps access
                until that date (no charge if you cancel during trial).
              </p>
            ) : null}
            {paid && trialEndsAt ? (
              <p className="mt-1 text-xs text-white/60">
                Stripe trial through {new Date(trialEndsAt).toLocaleDateString()}
                — card on file, first charge after trial ends. Cancel anytime;
                access lasts through the trial.
              </p>
            ) : null}
            {starter ? (
              <p className="mt-1 text-xs text-coral/90">
                Starter: 2 open parties · 5 creates/24h · no Ghostless (this
                server).
                {communityTrialEligible
                  ? " Community Checkout includes a one-time 14-day trial (card required)."
                  : " Trial already used for this Discord server or your Discord account — Community bills from day one."}
              </p>
            ) : null}
            {pro && plan === "founding_pro" ? (
              <p className="mt-2 inline-block rounded-brand border border-lime/50 px-2 py-0.5 text-xs text-lime">
                Founding badge · Pro features · ≤{PLANS.founding_pro.seatCap}{" "}
                seats
                {foreverPro ? " · forever protected" : ""}
              </p>
            ) : null}
            {foreverPro && plan !== "founding_pro" ? (
              <p className="mt-2 text-xs text-lime/80">
                Forever-Pro protection on — billing changes will not strip
                entitlements.
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link href="/pricing" className="text-sm text-muted hover:text-coral">
              Compare plans (incl. vanity) →
            </Link>
            {stripeCustomerId ? (
              <button
                type="button"
                disabled={Boolean(busy) || !stripeReady}
                onClick={() => void openPortal()}
                className="rounded-brand border border-white/20 px-3 py-1.5 text-sm font-semibold text-white/90 transition hover:border-coral/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === "portal" ? "Opening…" : "Manage billing"}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted">Bill</span>
        <div className="inline-flex rounded-brand border border-white/15 p-0.5">
          <button
            type="button"
            onClick={() => setInterval("month")}
            className={`rounded-brand px-3 py-1.5 text-sm font-semibold transition ${
              interval === "month"
                ? "bg-coral text-slate"
                : "text-white/70 hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval("year")}
            className={`rounded-brand px-3 py-1.5 text-sm font-semibold transition ${
              interval === "year"
                ? "bg-coral text-slate"
                : "text-white/70 hover:text-white"
            }`}
          >
            Yearly
          </button>
        </div>
        {interval === "year" ? (
          <span className="text-xs text-lime/80">~2 months free</span>
        ) : null}
      </div>

      {!stripeReady ? (
        <p className="rounded-brand border border-coral/35 bg-coral/10 px-4 py-3 text-sm text-white/80">
          Stripe is not configured on this Worker yet. Add{" "}
          <code className="text-coral">STRIPE_SECRET_KEY</code> + price IDs on
          the web Worker, then Checkout buttons activate. Starter caps stay in
          force until a paid webhook lands.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-brand border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral">
          {error}
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        {SKUS.map((sku) => {
          const current = plan === sku.plan;
          const priceLabel =
            interval === "year"
              ? `$${sku.annual}/yr`
              : `$${sku.monthly}/mo`;
          const border =
            sku.accent === "coral"
              ? "border-coral/40 bg-coral/5"
              : sku.accent === "founding"
                ? "border-lime/35 bg-lime/5"
                : "border-white/10 bg-slate-elevated/40";
          return (
            <div
              key={sku.plan}
              className={`rounded-brand border p-4 ${border}`}
            >
              <p className="font-display text-lg tracking-wide">{sku.title}</p>
              <p className="mt-1 text-2xl">{priceLabel}</p>
              <p className="mt-1 text-xs text-white/45">per Discord server</p>
              <p className="mt-2 text-xs text-muted">{sku.blurb}</p>
              <button
                type="button"
                disabled={
                  Boolean(busy) || !stripeReady || (current && paid)
                }
                onClick={() => void startCheckout(sku.plan)}
                className={`mt-4 w-full rounded-brand px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  sku.accent === "coral"
                    ? "bg-coral text-slate hover:brightness-110"
                    : "border border-white/20 text-white hover:border-coral/50"
                }`}
              >
                {busy === `checkout:${sku.plan}`
                  ? "Redirecting…"
                  : current && paid
                    ? "Current plan"
                    : sku.plan === "founding_pro"
                      ? "Get Founding Pro"
                      : sku.plan === "pro"
                        ? "Upgrade to Pro"
                        : sku.plan === "community" && communityTrialEligible
                          ? "Start 14-day trial"
                          : "Subscribe"}
              </button>
            </div>
          );
        })}
      </section>

      <p className="text-xs text-muted">
        Per Discord server. Card required at Checkout. Cancel in{" "}
        <span className="text-white/70">Manage billing</span> keeps paid (or
        trial) access until the period / trial ends — then Starter. One Community
        trial per server and per Discord user (uninstall / new server does not
        reset it). Official Rallied and forever-protected servers are never
        downgraded.
      </p>
    </div>
  );
}
