import Link from "next/link";
import {
  COMMUNITY_PRICE_USD,
  FOUNDING_PRO_PRICE_USD,
  PLANS,
  PRO_PRICE_USD,
} from "@rallied/shared";

const TIERS = [
  {
    id: "community" as const,
    name: "Community",
    price: COMMUNITY_PRICE_USD,
    annual: PLANS.community.annualCents / 100,
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
    id: "pro" as const,
    name: "Pro",
    price: PRO_PRICE_USD,
    annual: PLANS.pro.annualCents / 100,
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
  {
    id: "founding_pro" as const,
    name: "Founding Pro",
    price: FOUNDING_PRO_PRICE_USD,
    annual: PLANS.founding_pro.annualCents / 100,
    blurb: `Pro features locked at $${FOUNDING_PRO_PRICE_USD}/mo · ≤${PLANS.founding_pro.seatCap} seats.`,
    features: [
      "Everything in Pro",
      "Analytics trends + CSV export",
      "Hide “Powered by” + accent",
      "Priority support",
      "Price lock while sub active",
      "Founding badge (opt-in)",
    ],
    cta: "Apply for Founding",
    featured: true,
  },
];

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
        <p className="mt-3 max-w-xl text-white/75">
          No free-forever full LFG. Community{" "}
          <strong className="font-normal text-white">
            ${COMMUNITY_PRICE_USD}/mo
          </strong>{" "}
          (${PLANS.community.annualCents / 100}/yr)
          {" · "}
          Pro{" "}
          <strong className="font-normal text-white">${PRO_PRICE_USD}/mo</strong>{" "}
          (${PLANS.pro.annualCents / 100}/yr)
          {" · "}
          Founding Pro{" "}
          <strong className="font-normal text-coral">
            ${FOUNDING_PRO_PRICE_USD}/mo locked
          </strong>{" "}
          (≤{PLANS.founding_pro.seatCap}).
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`flex flex-col rounded-brand border p-6 ${
                tier.featured
                  ? "border-coral bg-slate-elevated/50"
                  : "border-white/12 bg-slate-elevated/40"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-2xl tracking-wide">{tier.name}</p>
                {tier.featured ? (
                  <span className="rounded-brand border border-coral/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-coral">
                    Limited · ≤{PLANS.founding_pro.seatCap} servers
                  </span>
                ) : null}
              </div>
              <p
                className={`mt-2 text-white ${
                  tier.featured
                    ? "font-display text-4xl tracking-wide"
                    : "text-3xl"
                }`}
              >
                ${tier.price}
                <span className="font-body text-sm font-normal text-white/55">
                  /mo
                </span>
              </p>
              <p className="mt-1 text-xs text-white/55">
                ${tier.annual}/yr
                {tier.id === "founding_pro" ? " locked" : ""}
              </p>
              <p className="mt-3 text-sm text-white/75">{tier.blurb}</p>
              <ul className="mt-6 flex-1 space-y-2 text-sm text-white/85">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span
                      className={`mt-0.5 inline-flex shrink-0 ${
                        tier.featured ? "text-coral" : "text-lime"
                      }`}
                      aria-hidden
                    >
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
                        <path
                          d="M3.4 8.2 6.6 11.3 12.6 4.6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.85"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled
                title="Checkout coming soon"
                className={`mt-8 w-full cursor-not-allowed rounded-brand px-4 py-2.5 text-sm font-semibold ${
                  tier.featured
                    ? "bg-coral/50 text-slate"
                    : "border border-white/20 text-white/55"
                }`}
              >
                {tier.cta} (soon)
              </button>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-white/55">
          14-day Community trial · first-month money-back · per Discord server.
        </p>
      </main>
    </div>
  );
}
