import Link from "next/link";
import {
  COMMUNITY_PRICE_USD,
  FOUNDING_PRO_PRICE_USD,
  PLANS,
  PRO_PRICE_USD,
  isProPlan,
} from "@rallied/shared";
import { MOCK_SERVERS } from "@/lib/mock-data";

export default function BillingPage() {
  // Mock: show founding_pro demo as “current” switcher option; default Community
  const community = MOCK_SERVERS[0];
  const founding = MOCK_SERVERS[2];
  const current = founding; // demo badge path — founding_pro
  const pro = isProPlan(current.plan);
  const lock =
    current.price_lock_cents != null
      ? (current.price_lock_cents / 100).toFixed(2)
      : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Billing</h1>
        <p className="mt-1 text-sm text-muted">
          Per Discord server. Stripe Checkout / Customer Portal are placeholders —
          no real charges.
        </p>
      </div>

      <section className="rounded-brand border border-lime/40 bg-lime/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-lime">
              Current plan (mock)
            </p>
            <h2 className="mt-1 font-display text-2xl tracking-wide">
              {current.name}
            </h2>
            <p className="mt-1 text-sm text-white/90">
              {PLANS.founding_pro.label} · ${lock ?? FOUNDING_PRO_PRICE_USD}/mo
              locked
            </p>
            {pro ? (
              <p className="mt-2 inline-block rounded-brand border border-lime/50 px-2 py-0.5 text-xs text-lime">
                Founding badge · Pro features · ≤{PLANS.founding_pro.seatCap}{" "}
                seats program
              </p>
            ) : null}
          </div>
          <Link
            href="/pricing"
            className="text-sm text-muted hover:text-coral"
          >
            Compare plans →
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-brand border border-white/10 bg-slate-elevated/40 p-4">
          <p className="font-display text-lg tracking-wide">Community</p>
          <p className="mt-1 text-2xl">${COMMUNITY_PRICE_USD}/mo</p>
          <p className="mt-2 text-xs text-muted">
            Example list server: {community.name} ({community.plan})
          </p>
          <button
            type="button"
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-brand border border-white/15 px-3 py-2 text-sm text-muted"
          >
            Subscribe (Stripe soon)
          </button>
        </div>
        <div className="rounded-brand border border-coral/40 bg-coral/5 p-4">
          <p className="font-display text-lg tracking-wide">Upgrade to Pro</p>
          <p className="mt-1 text-2xl">${PRO_PRICE_USD}/mo</p>
          <p className="mt-2 text-xs text-muted">
            List Pro — analytics export, vanity, priority. Founding seats use $
            {FOUNDING_PRO_PRICE_USD} lock instead.
          </p>
          <button
            type="button"
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-brand bg-coral/40 px-3 py-2 text-sm font-semibold text-slate"
          >
            Upgrade (Stripe soon)
          </button>
        </div>
      </section>

      <p className="text-xs text-muted">
        Env later:{" "}
        <code className="text-coral">STRIPE_SECRET_KEY</code>,{" "}
        <code className="text-coral">STRIPE_WEBHOOK_SECRET</code>,{" "}
        <code className="text-coral">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>,
        price IDs for Community / Pro / Founding Pro.
      </p>
    </div>
  );
}
