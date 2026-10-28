import Link from "next/link";
import {
  BRAND,
  COMMUNITY_PRICE_USD,
  FOUNDING_PRO_PRICE_USD,
  PLANS,
  PRO_PRICE_USD,
  buildBotInviteUrl,
} from "@rallied/shared";
import { FeatureStepIcon } from "../components/FeatureStepIcon";

const HOW_IT_WORKS = [
  {
    title: "LFG",
    body: "Create a party in Discord. Join, fill, close — without another free LFG clone war.",
    icon: "slash" as const,
  },
  {
    title: "Play",
    body: "Ready checks and grace windows cut accidental no-shows before they become drama.",
    icon: "play" as const,
  },
  {
    title: "Vibe Check",
    body: "Post-session showed-up + vibe tags. Ghostless badge stays on this server only.",
    icon: "check" as const,
  },
];

const LANDING_TIERS = [
  {
    name: "Community",
    price: COMMUNITY_PRICE_USD,
    annual: PLANS.community.annualCents / 100,
    blurb: "Core LFG, strikes, Ghostless, and admin web per server.",
  },
  {
    name: "Pro",
    price: PRO_PRICE_USD,
    annual: PLANS.pro.annualCents / 100,
    blurb: "Export, trends, vanity branding, and priority support.",
  },
  {
    name: "Founding",
    price: FOUNDING_PRO_PRICE_USD,
    annual: PLANS.founding_pro.annualCents / 100,
    blurb: `Pro locked at $${FOUNDING_PRO_PRICE_USD}/mo for early servers (≤${PLANS.founding_pro.seatCap}).`,
    accent: true as const,
  },
];

export default function MarketingPage() {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "";
  const inviteHref = clientId ? buildBotInviteUrl(clientId) : "#add-bot";

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between bg-transparent px-4 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/rallied-wm-transparent-dark.png"
          alt="Rallied"
          className="h-12 w-auto bg-transparent sm:h-14"
        />
        <a
          href="/api/auth/discord"
          className="rounded-brand border border-white/20 px-4 py-2.5 text-base font-medium text-white/90 transition hover:border-coral/50 hover:text-white"
        >
          Log in
        </a>
      </header>

      <section className="relative mx-auto flex min-h-[min(100svh,820px)] max-w-5xl flex-col justify-center px-4 pb-20 pt-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[-8%] top-0 -z-10 flex justify-center overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/rallied-square-dark.jpg"
            alt=""
            className="animate-rise h-[min(88vw,560px)] w-[min(88vw,560px)] object-cover opacity-[0.22] sm:opacity-[0.28]"
            style={{
              maskImage:
                "radial-gradient(ellipse 70% 65% at 50% 42%, black 20%, transparent 72%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 70% 65% at 50% 42%, black 20%, transparent 72%)",
            }}
          />
        </div>

        <p className="animate-rise font-display text-5xl leading-none tracking-wide text-white sm:text-7xl md:text-8xl">
          {BRAND.name}
        </p>
        <h1
          className="animate-rise mt-5 max-w-xl text-xl text-white/90 sm:text-2xl"
          style={{ animationDelay: "60ms" }}
        >
          {BRAND.tagline}
        </h1>
        <p
          className="animate-rise mt-3 max-w-md text-muted"
          style={{ animationDelay: "120ms" }}
        >
          Parties, Vibe Check, and Ghostless reliability — scoped to each Discord
          server. No global shame board.
        </p>
        <div
          className="animate-rise mt-8 flex flex-wrap gap-3"
          style={{ animationDelay: "180ms" }}
        >
          <a
            href={inviteHref}
            className="rounded-brand bg-coral px-5 py-2.5 font-semibold text-slate transition hover:brightness-110"
          >
            Add to Discord
          </a>
          <a
            href="#how-it-works"
            className="rounded-brand border border-white/25 px-5 py-2.5 font-semibold text-white/90 transition hover:border-lime/50 hover:text-lime"
          >
            Learn more
          </a>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-white/10 bg-black/20 py-14">
        <div className="mx-auto grid max-w-5xl gap-9 px-4 sm:grid-cols-3 sm:gap-8">
          {HOW_IT_WORKS.map((step, i) => (
            <div
              key={step.title}
              className="animate-rise"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <p className="font-display text-xs tracking-[0.14em] text-coral">
                {String(i + 1).padStart(2, "0")}
              </p>
              <div className="mt-1.5 flex items-center gap-2.5">
                <FeatureStepIcon
                  kind={step.icon}
                  className="animate-feature-icon"
                />
                <h2 className="font-display text-2xl leading-none tracking-wide">
                  {step.title}
                </h2>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="font-display text-3xl tracking-wide">Pricing</h2>
        <p className="mt-2 max-w-lg text-muted">
          Per Discord server. Reliability core on Community; Pro adds export and
          vanity.
        </p>

        <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
          {LANDING_TIERS.map((tier) => (
            <li
              key={tier.name}
              className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
            >
              <div className="min-w-0">
                <p
                  className={`font-display text-xl tracking-wide ${
                    "accent" in tier && tier.accent ? "text-lime" : "text-white"
                  }`}
                >
                  {tier.name}
                </p>
                <p className="mt-1 text-sm text-muted">{tier.blurb}</p>
              </div>
              <p className="shrink-0 text-white sm:text-right">
                <span className="text-lg">${tier.price}</span>
                <span className="text-sm text-muted">/mo</span>
                <span className="mt-0.5 block text-xs text-muted">
                  ${tier.annual}/yr
                  {"accent" in tier && tier.accent ? " locked" : ""}
                </span>
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          <a
            href={inviteHref}
            className="rounded-brand bg-coral px-5 py-2.5 font-semibold text-slate transition hover:brightness-110"
          >
            Add to Discord
          </a>
          <Link
            href="/pricing"
            className="text-sm text-white/80 underline-offset-4 transition hover:text-lime hover:underline"
          >
            See full pricing
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Example public server (mock):{" "}
            <Link href="/s/demo-esports" className="text-coral/90 hover:underline">
              /s/demo-esports
            </Link>
            {" · "}
            <Link
              href="/s/founding-beta"
              className="text-white/70 hover:underline"
            >
              Founding
            </Link>
            {" · "}
            <Link href="/me" className="text-white/70 hover:underline">
              Your cards
            </Link>
          </p>
          <p className="text-xs text-muted/80">
            {BRAND.name} · {BRAND.domain}
          </p>
        </div>
      </footer>
    </div>
  );
}
