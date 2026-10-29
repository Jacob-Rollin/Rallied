import Link from "next/link";
import {
  BRAND,
  COMMUNITY_PRICE_USD,
  FOUNDING_PRO_PRICE_USD,
  PLANS,
  PRO_PRICE_USD,
  buildBotInviteUrl,
} from "@rallied/shared";
import { AddToDiscordButton } from "../components/AddToDiscordButton";
import { FeatureStepIcon } from "../components/FeatureStepIcon";
import { GhostlessMark } from "../components/GhostlessMark";
import {
  GhostlessBadgeMock,
  LfgPartyEmbedMock,
  ReadyCheckMock,
  TierCheck,
  VibeCheckActionsMock,
} from "../components/LandingFeatureMocks";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

const HOW_IT_WORKS: {
  title: string;
  body: string;
  note?: string;
  icon: "slash" | "play" | "check";
  preview: "lfg" | "play" | "vibe";
}[] = [
  {
    title: "LFG",
    body: "Create a party inside Discord. Join, fill, and close lobbies without messy text channels or free LFG clone wars.",
    note: "Pinned LFG desk · or `/lfg create` / `/lfg find`",
    icon: "slash",
    preview: "lfg",
  },
  {
    title: "Play",
    body: "Automated ready checks and grace windows cut accidental no-shows before they become server drama.",
    icon: "play",
    preview: "play",
  },
  {
    title: "Vibe Check",
    body: "Post-session Showed up / Ghosted + vibe scores. Ready Check owns show counts when it ran; Ghostless stays per-server.",
    icon: "check",
    preview: "vibe",
  },
];

const HERO_PILLARS = [
  { label: "LFG", icon: "slash" as const },
  { label: "Play", icon: "play" as const },
  { label: "Ghostless", icon: "check" as const },
];

const LANDING_TIERS = [
  {
    id: "free" as const,
    name: "Starter",
    price: 0,
    annual: null as number | null,
    blurb: "LFG under caps. No Ghostless.",
    features: ["2 open parties", "5 creates / day", "Soft ready-check"],
    founding: false as const,
  },
  {
    id: "community" as const,
    name: "Community",
    price: COMMUNITY_PRICE_USD,
    annual: PLANS.community.annualCents / 100,
    blurb: "Unlimited LFG + Ghostless + strikes.",
    features: ["Unlimited parties", "Ghostless + strikes", "Public page"],
    founding: false as const,
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: PRO_PRICE_USD,
    annual: PLANS.pro.annualCents / 100,
    blurb: "Export, vanity, priority support.",
    features: ["Everything in Community", "CSV export + trends", "Vanity"],
    founding: false as const,
  },
  {
    id: "founding_pro" as const,
    name: "Founding",
    price: FOUNDING_PRO_PRICE_USD,
    annual: PLANS.founding_pro.annualCents / 100,
    blurb: `Pro at $${FOUNDING_PRO_PRICE_USD}/mo locked.`,
    features: [
      "Full Pro",
      "Price lock while active",
      `≤${PLANS.founding_pro.seatCap} seats`,
    ],
    founding: true as const,
  },
];

/** Edge-to-edge Discord LFG embed silhouette — texture only, not a mockup card. */
function HeroLfgSilhouette() {
  return (
    <svg
      className="hero-lfg-silhouette absolute inset-0 h-full w-full"
      viewBox="0 0 960 640"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.25">
        <rect x="72" y="96" width="420" height="268" rx="10" opacity="0.55" />
        <rect x="96" y="120" width="36" height="36" rx="8" opacity="0.7" />
        <path d="M148 132h168M148 148h112" opacity="0.55" />
        <path d="M96 178h372" opacity="0.28" />
        <rect x="96" y="198" width="372" height="72" rx="6" opacity="0.35" />
        <path d="M112 220h210M112 240h160" opacity="0.45" />
        <rect x="96" y="290" width="88" height="28" rx="6" opacity="0.5" />
        <rect x="196" y="290" width="72" height="28" rx="6" opacity="0.35" />
        <circle cx="360" cy="304" r="10" opacity="0.4" />
        <circle cx="386" cy="304" r="10" opacity="0.4" />
        <circle cx="412" cy="304" r="10" opacity="0.4" />
        <path d="M428 304h28" opacity="0.3" />

        <rect x="540" y="168" width="348" height="220" rx="10" opacity="0.4" />
        <rect x="564" y="192" width="28" height="28" rx="7" opacity="0.55" />
        <path d="M606 202h140M606 216h96" opacity="0.4" />
        <rect x="564" y="248" width="300" height="56" rx="6" opacity="0.28" />
        <rect x="564" y="324" width="76" height="26" rx="6" opacity="0.4" />
        <rect x="652" y="324" width="64" height="26" rx="6" opacity="0.28" />
      </g>
    </svg>
  );
}

function FeaturePreview({ kind }: { kind: "lfg" | "play" | "vibe" }) {
  if (kind === "lfg") return <LfgPartyEmbedMock />;
  if (kind === "play") return <ReadyCheckMock />;
  return <VibeCheckActionsMock />;
}

export default function MarketingPage() {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "";
  const inviteHref = clientId ? buildBotInviteUrl(clientId) : "#add-bot";

  return (
    <div className="min-h-screen">
      <SiteHeader variant="hero" />

      {/* Negative margin pulls hero atmosphere under the sticky translucent header */}
      <section className="hero-stage relative -mt-[3.25rem] flex min-h-[100svh] flex-col overflow-hidden pt-[3.25rem] sm:-mt-14 sm:pt-14">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="hero-wash hero-wash--coral" />
          <div className="hero-wash hero-wash--lime" />
          <div className="hero-wash hero-wash--slate" />

          <div className="absolute inset-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/rallied-square-dark.jpg"
              alt=""
              className="hero-brand-mark h-[min(118vw,720px)] w-[min(118vw,720px)] object-cover"
            />
          </div>

          <div className="absolute inset-0 text-white/[0.07]">
            <HeroLfgSilhouette />
          </div>

          <div className="hero-vignette absolute inset-0" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 pb-14 pt-4 sm:pb-16 sm:pt-6">
          <p className="animate-rise font-display text-5xl leading-none tracking-wide text-white sm:text-7xl md:text-8xl">
            {BRAND.name}
          </p>
          <h1
            className="animate-rise mt-4 max-w-xl text-xl text-white/90 sm:mt-5 sm:text-2xl"
            style={{ animationDelay: "60ms" }}
          >
            {BRAND.tagline}
          </h1>
          <p
            className="animate-rise mt-2.5 max-w-md text-white/70 sm:mt-3"
            style={{ animationDelay: "120ms" }}
          >
            Parties, Vibe Check, and Ghostless reliability — scoped to each Discord
            server. No global shame board.
          </p>

          <p
            className="animate-rise mt-5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm tracking-wide text-white/70 sm:mt-6"
            style={{ animationDelay: "160ms" }}
          >
            {HERO_PILLARS.map((pillar, i) => (
              <span key={pillar.label} className="inline-flex items-center gap-1.5">
                {i > 0 ? (
                  <span className="mr-0.5 text-white/30" aria-hidden>
                    ·
                  </span>
                ) : null}
                <span
                  className="animate-hero-pillar inline-flex"
                  style={{ animationDelay: `${220 + i * 90}ms` }}
                >
                  <FeatureStepIcon kind={pillar.icon} variant="bare" />
                </span>
                <span>{pillar.label}</span>
              </span>
            ))}
          </p>

          <div
            className="animate-rise mt-6 flex flex-wrap gap-3 sm:mt-7"
            style={{ animationDelay: "220ms" }}
          >
            <AddToDiscordButton href={inviteHref} />
            <Link
              href="/demo"
              className="rounded-brand border border-white/25 px-5 py-2.5 font-semibold text-white/90 transition hover:border-lime/50 hover:text-lime"
            >
              Explore live demo
            </Link>
            <a
              href="#how-it-works"
              className="rounded-brand border border-transparent px-4 py-2.5 font-medium text-white/65 transition hover:text-white"
            >
              Learn more
            </a>
          </div>
          <p
            className="animate-rise mt-3 max-w-lg text-sm text-white/55"
            style={{ animationDelay: "260ms" }}
          >
            14-day full trial, then Starter caps — Community ${COMMUNITY_PRICE_USD}
            unlocks Ghostless. Invite needs Manage Server (or Admin).
          </p>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-16 border-t border-white/10 bg-black/20 py-14">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 sm:grid-cols-3 sm:gap-8">
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
              <p className="mt-2.5 text-sm leading-relaxed text-white/80">
                {step.body}
              </p>
              {step.note ? (
                <p className="mt-2 text-xs text-white/45">{step.note}</p>
              ) : null}
              <FeaturePreview kind={step.preview} />
            </div>
          ))}
        </div>
      </section>

      <section
        id="ghostless"
        className="scroll-mt-16 border-t border-white/10 py-14"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 sm:flex-row sm:items-center sm:justify-between sm:gap-12">
          <div className="max-w-xl">
            <div className="flex items-center gap-2.5">
              <GhostlessMark size="lg" />
              <h2 className="font-display text-3xl tracking-wide text-white">
                Ghostless
              </h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">
              A per-server show-rate badge — not global karma. One ghost
              doesn&apos;t auto-kill Ghostless; you earn it locally after enough
              sessions at your server&apos;s threshold.
            </p>
            <a
              href="/guide#ghostless"
              className="mt-5 inline-flex text-sm font-medium text-lime transition hover:underline"
            >
              See how Ghostless works
            </a>
          </div>
          <div className="w-full max-w-sm shrink-0 sm:ml-auto">
            <GhostlessBadgeMock />
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-16 mx-auto max-w-5xl px-4 py-16">
        <h2 className="font-display text-3xl tracking-wide">Pricing</h2>
        <p className="mt-2 max-w-lg text-white/75">
          Starter free under caps · Community ${COMMUNITY_PRICE_USD}/mo · Pro $
          {PRO_PRICE_USD}/mo · Founding ${FOUNDING_PRO_PRICE_USD}/mo locked (≤
          {PLANS.founding_pro.seatCap}). 14-day trial · first-month money-back.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
          {LANDING_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`flex flex-col rounded-brand border p-5 ${
                tier.founding
                  ? "border-coral bg-slate-elevated/50"
                  : "border-white/12 bg-slate-elevated/30"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-xl tracking-wide text-white">
                  {tier.name}
                </p>
                {tier.founding ? (
                  <span className="rounded-brand border border-coral/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-coral">
                    Limited
                  </span>
                ) : null}
              </div>
              <p
                className={`mt-3 tabular-nums ${
                  tier.founding
                    ? "font-display text-4xl tracking-wide text-white"
                    : "text-2xl text-white"
                }`}
              >
                {tier.price === 0 ? "$0" : `$${tier.price}`}
                <span className="font-body text-sm font-normal text-white/55">
                  /mo
                </span>
              </p>
              <p className="mt-1 text-xs text-white/55">
                {tier.annual != null ? `$${tier.annual}/yr` : "Caps only"}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/75">
                {tier.blurb}
              </p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-white/85">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <TierCheck accent={tier.founding ? "coral" : "lime"} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <AddToDiscordButton href={inviteHref} />
            <Link
              href="/pricing"
              className="rounded-brand border border-coral/70 px-5 py-2.5 font-semibold text-coral transition hover:bg-coral/10"
            >
              Compare plans
            </Link>
            <Link
              href="/demo"
              className="rounded-brand border border-white/25 px-5 py-2.5 font-semibold text-white/90 transition hover:border-lime/50 hover:text-lime"
            >
              Explore live demo
            </Link>
            <Link
              href="/guide"
              className="text-sm text-white/80 underline-offset-4 transition hover:text-lime hover:underline"
            >
              How it works
            </Link>
          </div>
          <p className="text-sm text-white/55">
            Serious communities need Community. Install needs Manage Server.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
