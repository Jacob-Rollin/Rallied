import Link from "next/link";
import {
  COMMUNITY_PRICE_USD,
  FOUNDING_PRO_PRICE_USD,
  PLANS,
  PRO_PRICE_USD,
  isProPlan,
} from "@rallied/shared";
import { DemoDataBanner } from "@/components/DemoDataBanner";
import { DEMO_GUILD_ID } from "@/lib/demo";
import { loadDashboard } from "@/lib/dashboard-data";

export default async function DemoBillingPage() {
  const data = await loadDashboard(DEMO_GUILD_ID, true);
  const current = data.server;
  const plan = current?.plan ?? "community";
  const pro = isProPlan(plan);
  const lock =
    current?.price_lock_cents != null
      ? (current.price_lock_cents / 100).toFixed(2)
      : null;

  const planLabel =
    plan === "founding_pro"
      ? PLANS.founding_pro.label
      : plan === "pro"
        ? PLANS.pro.label
        : plan === "community"
          ? PLANS.community.label
          : plan;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Billing</h1>
        <p className="mt-1 text-sm text-muted">
          Demo preview only — live Checkout lives on{" "}
          <Link href="/app/billing" className="text-coral hover:underline">
            /app/billing
          </Link>{" "}
          after Log in.
        </p>
      </div>

      <DemoDataBanner />

      <section className="rounded-brand border border-lime/40 bg-lime/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-lime">
              Current plan
            </p>
            <h2 className="mt-1 font-display text-2xl tracking-wide">
              {current?.name ?? "Demo server"}
            </h2>
            <p className="mt-1 text-sm text-white/90">
              {planLabel}
              {lock
                ? ` · $${lock}/mo locked`
                : plan === "pro"
                  ? ` · $${PRO_PRICE_USD}/mo`
                  : plan === "community"
                    ? ` · $${COMMUNITY_PRICE_USD}/mo`
                    : ""}
            </p>
            {pro && plan === "founding_pro" ? (
              <p className="mt-2 inline-block rounded-brand border border-lime/50 px-2 py-0.5 text-xs text-lime">
                Founding badge · Pro features · ≤{PLANS.founding_pro.seatCap}{" "}
                seats program
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted">
                Real servers start with a 14-day Community trial, then Starter
                caps or ${COMMUNITY_PRICE_USD}/mo /server.
              </p>
            )}
          </div>
          <Link href="/pricing" className="text-sm text-muted hover:text-coral">
            Compare plans →
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-brand border border-white/10 bg-slate-elevated/40 p-4">
          <p className="font-display text-lg tracking-wide">Community</p>
          <p className="mt-1 text-2xl">
            ${COMMUNITY_PRICE_USD}
            <span className="font-body text-sm font-normal text-white/55">
              /mo /server
            </span>
          </p>
          <p className="mt-1 text-xs font-medium text-lime">14-day free trial</p>
          <p className="mt-2 text-xs text-muted">Full LFG + Ghostless + strikes</p>
          <button
            type="button"
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-brand border border-white/15 px-3 py-2 text-sm text-muted"
          >
            Subscribe (demo)
          </button>
        </div>
        <div className="rounded-brand border border-coral/40 bg-coral/5 p-4">
          <p className="font-display text-lg tracking-wide">Upgrade to Pro</p>
          <p className="mt-1 text-2xl">
            ${PRO_PRICE_USD}
            <span className="font-body text-sm font-normal text-white/55">
              /mo /server
            </span>
          </p>
          <p className="mt-1 text-xs font-medium text-white/55">
            No separate trial — Community trial first
          </p>
          <p className="mt-2 text-xs text-muted">
            Analytics export, vanity, iCal, priority. Founding seats use $
            {FOUNDING_PRO_PRICE_USD} lock (≤{PLANS.founding_pro.seatCap}).
          </p>
          <button
            type="button"
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-brand bg-coral/40 px-3 py-2 text-sm font-semibold text-slate"
          >
            Upgrade (demo)
          </button>
        </div>
      </section>
    </div>
  );
}
