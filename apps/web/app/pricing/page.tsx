import Link from "next/link";
import {
  FOUNDING_PRO_PRICE_USD,
  PLANS,
  PRO_PRICE_USD,
  COMMUNITY_PRICE_USD,
} from "@rallied/shared";

const TIERS = [
  {
    id: "community",
    name: "Community",
    price: COMMUNITY_PRICE_USD,
    blurb: "Full LFG + Ghostless + strikes + disputes. The reliability core.",
    features: [
      "LFG parties + Vibe Check",
      "Per-server strikes & lockouts",
      "Disputes queue",
      "Public server page",
      "Weekly digest",
      "This-week summary",
    ],
    cta: "Start trial",
    featured: false,
  },
  {
    id: "founding_pro",
    name: "Founding Pro",
    price: FOUNDING_PRO_PRICE_USD,
    blurb: `Pro features locked at $${FOUNDING_PRO_PRICE_USD}/mo · ≤${PLANS.founding_pro.seatCap} seats. Not Community $3.99.`,
    features: [
      "Everything in Community",
      "Analytics trends + CSV export",
      "Hide “Powered by” + accent",
      "Priority support",
      "Price lock while sub active",
      "Founding badge (opt-in)",
    ],
    cta: "Apply for Founding",
    featured: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: PRO_PRICE_USD,
    blurb: "List Pro after Founding fills — export, vanity, priority.",
    features: [
      "Everything in Community",
      "Analytics trends + CSV export",
      "Hide “Powered by” + accent",
      "Priority support",
      "Multi-guild 10% note (3+)",
      "Priority dispute queue (when built)",
    ],
    cta: "Upgrade to Pro",
    featured: false,
  },
] as const;

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between bg-transparent px-4 py-5">
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/rallied-wm-transparent-dark.png"
            alt="Rallied"
            className="h-12 w-auto bg-transparent sm:h-14"
          />
        </Link>
        <Link
          href="/app/billing"
          className="rounded-brand border border-white/20 px-4 py-2.5 text-base font-medium text-white/90 transition hover:border-coral/50 hover:text-white"
        >
          Billing
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8">
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">
          Pricing
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          No free-forever full LFG. Community{" "}
          <strong className="font-normal text-white">${COMMUNITY_PRICE_USD}/mo</strong>
          {" · "}
          Pro{" "}
          <strong className="font-normal text-white">${PRO_PRICE_USD}/mo</strong>
          {" · "}
          Founding Pro{" "}
          <strong className="font-normal text-lime">
            ${FOUNDING_PRO_PRICE_USD}/mo locked
          </strong>{" "}
          (≤50). Stripe Checkout is a placeholder — no charges yet.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`flex flex-col rounded-brand border p-6 ${
                tier.featured
                  ? "border-lime/50 bg-lime/5"
                  : "border-white/10 bg-slate-elevated/40"
              }`}
            >
              <p className="font-display text-2xl tracking-wide">{tier.name}</p>
              <p className="mt-2 text-3xl text-white">
                ${tier.price}
                <span className="text-sm text-muted">/mo</span>
              </p>
              <p className="mt-3 text-sm text-muted">{tier.blurb}</p>
              <ul className="mt-6 flex-1 space-y-2 text-sm text-white/85">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-lime">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled
                title="Stripe Checkout placeholder — set STRIPE_* later"
                className={`mt-8 w-full cursor-not-allowed rounded-brand px-4 py-2.5 text-sm font-semibold ${
                  tier.featured
                    ? "bg-lime/40 text-slate"
                    : "border border-white/20 text-muted"
                }`}
              >
                {tier.cta} (soon)
              </button>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-muted">
          14-day Community trial · first-month money-back · per Discord server.{" "}
          <Link href="/docs" className="pointer-events-none text-coral/50">
            Details in pricing doc
          </Link>
        </p>
      </main>
    </div>
  );
}
