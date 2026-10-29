import Link from "next/link";
import type { Metadata } from "next";
import {
  BRAND,
  COMMUNITY_PRICE_USD,
  FOUNDING_PRO_PRICE_USD,
  PLANS,
  PRO_PRICE_USD,
  buildBotInviteUrl,
} from "@rallied/shared";
import { AddToDiscordButton } from "../../components/AddToDiscordButton";
import { TierCheck } from "../../components/LandingFeatureMocks";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata: Metadata = {
  title: `Pricing — ${BRAND.name}`,
  description:
    "Community $5.99/mo, Pro $9.99/mo, Founding Pro $8.99 locked. Compare LFG, Ghostless, admin, and Pro extras.",
};

const TIERS = [
  {
    id: "community" as const,
    name: "Community",
    price: COMMUNITY_PRICE_USD,
    annual: PLANS.community.annualCents / 100,
    blurb: "Full LFG + Ghostless + strikes. The reliability core.",
    trial: true,
    accent: false,
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: PRO_PRICE_USD,
    annual: PLANS.pro.annualCents / 100,
    blurb: "Export, vanity branding, priority support.",
    trial: true,
    accent: false,
  },
  {
    id: "founding_pro" as const,
    name: "Founding Pro",
    price: FOUNDING_PRO_PRICE_USD,
    annual: PLANS.founding_pro.annualCents / 100,
    blurb: `Pro locked at $${FOUNDING_PRO_PRICE_USD}/mo · ≤${PLANS.founding_pro.seatCap} seats.`,
    trial: false,
    accent: true,
  },
] as const;

type Cell = "yes" | "no" | "partial" | string;

const MATRIX: {
  label: string;
  unpaid: Cell;
  community: Cell;
  pro: Cell;
}[] = [
  { label: "LFG create / join", unpaid: "no", community: "yes", pro: "yes" },
  {
    label: "Ghostless / Vibe Check",
    unpaid: "no",
    community: "yes",
    pro: "yes",
  },
  {
    label: "Strikes + LFG lockout",
    unpaid: "no",
    community: "yes",
    pro: "yes",
  },
  {
    label: "Disputes queue",
    unpaid: "no",
    community: "yes",
    pro: "yes",
  },
  {
    label: "Admin web (People, Rules)",
    unpaid: "Read-only",
    community: "yes",
    pro: "yes",
  },
  {
    label: "Public server page",
    unpaid: "View",
    community: "yes",
    pro: "yes",
  },
  {
    label: "Weekly digest",
    unpaid: "no",
    community: "yes",
    pro: "yes",
  },
  {
    label: "Analytics / CSV export",
    unpaid: "no",
    community: "This week",
    pro: "Export + trends",
  },
  {
    label: "Vanity (hide Powered by)",
    unpaid: "no",
    community: "no",
    pro: "yes",
  },
  {
    label: "Support",
    unpaid: "Docs",
    community: "Email 48–72h",
    pro: "Priority 24–48h",
  },
];

function CellValue({ value }: { value: Cell }) {
  if (value === "yes") {
    return (
      <span className="inline-flex text-lime" aria-label="Included">
        <TierCheck accent="lime" />
      </span>
    );
  }
  if (value === "no") {
    return <span className="text-white/30">—</span>;
  }
  return <span className="text-xs text-white/80 sm:text-sm">{value}</span>;
}

export default function PricingPage() {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "";
  const inviteHref = clientId ? buildBotInviteUrl(clientId) : "#add-bot";

  return (
    <div className="min-h-screen">
      <SiteHeader variant="solid" />

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:pt-12">
        <p className="font-display text-xs tracking-[0.16em] text-coral">
          PRICING
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-wide sm:text-5xl">
          Compare plans
        </h1>
        <p className="mt-3 max-w-xl text-white/75">
          Per Discord server. Community{" "}
          <span className="text-white">${COMMUNITY_PRICE_USD}/mo</span> ($
          {PLANS.community.annualCents / 100}/yr) · Pro{" "}
          <span className="text-white">${PRO_PRICE_USD}/mo</span> ($
          {PLANS.pro.annualCents / 100}/yr) · Founding = Pro at{" "}
          <span className="text-coral">${FOUNDING_PRO_PRICE_USD}/mo locked</span>{" "}
          (≤{PLANS.founding_pro.seatCap}).
        </p>
        <p className="mt-2 max-w-xl text-sm text-white/55">
          14-day Community trial · first-month money-back if you pay early.
          After trial unpaid → LFG create off (read-only).
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`flex flex-col rounded-brand border p-5 ${
                tier.accent
                  ? "border-coral bg-slate-elevated/50"
                  : "border-white/12 bg-slate-elevated/30"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-xl tracking-wide text-white">
                  {tier.name}
                </p>
                {tier.accent ? (
                  <span className="rounded-brand border border-coral/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-coral">
                    ≤{PLANS.founding_pro.seatCap} seats
                  </span>
                ) : null}
              </div>
              <p
                className={`mt-3 tabular-nums ${
                  tier.accent
                    ? "font-display text-4xl tracking-wide text-white"
                    : "text-2xl text-white"
                }`}
              >
                ${tier.price}
                <span className="font-body text-sm font-normal text-white/55">
                  /mo
                </span>
              </p>
              <p className="mt-1 text-xs text-white/55">
                ${tier.annual}/yr{tier.accent ? " locked" : ""}
              </p>
              {tier.trial ? (
                <p className="mt-2 text-xs font-medium text-lime">
                  14-day free trial
                </p>
              ) : (
                <p className="mt-2 text-xs font-medium text-coral">
                  Pro features · price lock
                </p>
              )}
              <p className="mt-3 text-sm leading-relaxed text-white/75">
                {tier.blurb}
              </p>
            </div>
          ))}
        </div>

        <section className="mt-14">
          <h2 className="font-display text-2xl tracking-wide text-white">
            Feature comparison
          </h2>
          <p className="mt-1 text-sm text-white/55">
            Founding Pro = full Pro column at the locked price.
          </p>

          {/* Mobile: stacked cards */}
          <div className="mt-6 space-y-3 md:hidden">
            {MATRIX.map((row) => (
              <div
                key={row.label}
                className="rounded-brand border border-white/10 bg-slate-elevated/30 px-4 py-3"
              >
                <p className="text-sm font-medium text-white">{row.label}</p>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div>
                    <dt className="text-white/45">After trial</dt>
                    <dd className="mt-1 flex justify-center">
                      <CellValue value={row.unpaid} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Community</dt>
                    <dd className="mt-1 flex justify-center">
                      <CellValue value={row.community} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Pro</dt>
                    <dd className="mt-1 flex justify-center">
                      <CellValue value={row.pro} />
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="mt-6 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/15 text-xs uppercase tracking-wider text-white/45">
                  <th className="py-3 pr-4 font-medium">Capability</th>
                  <th className="px-3 py-3 font-medium">After trial</th>
                  <th className="px-3 py-3 font-medium">Community</th>
                  <th className="px-3 py-3 font-medium">Pro / Founding</th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-white/8 text-white/85"
                  >
                    <td className="py-3.5 pr-4 font-medium text-white">
                      {row.label}
                    </td>
                    <td className="px-3 py-3.5">
                      <CellValue value={row.unpaid} />
                    </td>
                    <td className="px-3 py-3.5">
                      <CellValue value={row.community} />
                    </td>
                    <td className="px-3 py-3.5">
                      <CellValue value={row.pro} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-12 flex flex-col gap-4 rounded-brand border border-white/10 bg-slate-elevated/40 px-5 py-8 sm:px-8">
          <h2 className="font-display text-2xl tracking-wide text-white">
            Ready to install
          </h2>
          <p className="max-w-lg text-sm text-white/70">
            Add the bot, walk the demo, or read the setup guide. Checkout
            wires later — trial messaging is live.
          </p>
          <div className="flex flex-wrap gap-3">
            <AddToDiscordButton href={inviteHref} />
            <Link
              href="/demo"
              className="rounded-brand border border-white/25 px-5 py-2.5 font-semibold text-white/90 transition hover:border-lime/50 hover:text-lime"
            >
              Explore demo
            </Link>
            <Link
              href="/guide"
              className="rounded-brand border border-coral/70 px-5 py-2.5 font-semibold text-coral transition hover:bg-coral/10"
            >
              Setup guide
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
