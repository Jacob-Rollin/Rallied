import Link from "next/link";
import type { Metadata } from "next";
import {
  BRAND,
  COMMUNITY_PRICE_USD,
  FOUNDING_PRO_PRICE_USD,
  PLANS,
  PRO_PRICE_USD,
} from "@rallied/shared";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata: Metadata = {
  title: `Changelog — ${BRAND.name}`,
  description: `What shipped for ${BRAND.name} customers: bot, admin dashboard, pricing, and Ghostless.`,
};

const ENTRIES: {
  date: string;
  title: string;
  body: string;
}[] = [
  {
    date: "2026-10-30",
    title: "Founding seats · pricing clarity",
    body: `Founding Pro capped at ≤${PLANS.founding_pro.seatCap} seats (was 50). Prices stay Community $${COMMUNITY_PRICE_USD}/mo · Pro $${PRO_PRICE_USD}/mo · Founding $${FOUNDING_PRO_PRICE_USD}/mo locked — billed per Discord server. 14-day trial is Community features only (not Pro).`,
  },
  {
    date: "2026-10-30",
    title: "Stripe billing on /app/billing",
    body: `Subscribe or upgrade from Billing: Community $${COMMUNITY_PRICE_USD}/mo ($${PLANS.community.annualCents / 100}/yr), Pro $${PRO_PRICE_USD}/mo ($${PLANS.pro.annualCents / 100}/yr), Founding Pro $${FOUNDING_PRO_PRICE_USD} locked. Checkout + Customer Portal (Manage billing). Starter caps stay until you pay.`,
  },
  {
    date: "2026-10-30",
    title: "Premium Overview strips",
    body: "Admin Overview: This month (Most reliable + Top hosts), Reliability health (7-day no-show / vibe response / open disputes), upcoming scheduled parties, and Standby promotions this week. Analytics sections clearer with prior-week trends when available.",
  },
  {
    date: "2026-10-30",
    title: "Pro iCal + web disputes",
    body: "Pro / Founding: Settings → Calendar subscribe — copy a .ics URL for upcoming scheduled parties (Apple / Google Calendar; no Google login). Community+ admins Overturn or Uphold disputes on /app/disputes (same as /dispute resolve in Discord).",
  },
  {
    date: "2026-10-30",
    title: "Standby, join gates, /leaderboard",
    body: "Ready Check no-shows free seats and promote the waitlist (Standby). Settings: Min Ghostless % to Join + Enforce lockout on Join. /leaderboard (and desk button) shows Most reliable + Top hosts for this server.",
  },
  {
    date: "2026-10-30",
    title: "Starter caps = per Discord server",
    body: "Starter limits (2 open parties + 5 creates/24h) are for this server — not per user. Ghostless rules summary on Pricing with a link to the guide.",
  },
  {
    date: "2026-10-30",
    title: "Bot invite permissions",
    body: "Add to Discord invite includes Manage Channels (temp voice), threads, roles, Connect, and Move Members. Existing installs: re-authorize the bot if voice or threads fail.",
  },
  {
    date: "2026-10-29",
    title: "LFG parity — voice, waitlist, filters, schedule",
    body: "Temp voice (Join VC), waitlist when full, mic / rank / region on create + Find filters, optional scheduled start with ~T-10m reminder. Still this server only.",
  },
  {
    date: "2026-10-29",
    title: "Server directory",
    body: "Public /servers lists communities that opt in (public page + invite). Per-server reliability, not cross-server player grades.",
  },
  {
    date: "2026-10-29",
    title: "Path B plans",
    body: `Starter free under caps after trial (no Ghostless / strikes). Community $${COMMUNITY_PRICE_USD}/mo · Pro $${PRO_PRICE_USD}/mo · Founding Pro $${FOUNDING_PRO_PRICE_USD} locked. 14-day Community trial first.`,
  },
  {
    date: "2026-10-28",
    title: "Ghostless mark + public cards",
    body: "Solid white ghost + lime check on public /s pages and player cards. Strikes stay admin-only, this server only.",
  },
  {
    date: "2026-10-28",
    title: "Public page Settings",
    body: "Settings Save writes slug, public toggles, directory list + invite. Pro vanity: hide Powered by, accent, Discord guild icon on /s.",
  },
  {
    date: "2026-10-28",
    title: "LFG desk in Discord",
    body: "Pinned desk: Create / Find / Mine / How it works / Leaderboard. Party cards with Join, Leave, Close, Ready Check, and post-session Vibe Check.",
  },
  {
    date: "2026-10-27",
    title: "Admin web + guide",
    body: "Dashboard for Overview, People, Settings, disputes, analytics. /guide walks setup → desk → Ghostless → /app admin.",
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader variant="solid" />

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:pt-12">
        <p className="font-display text-xs tracking-[0.16em] text-coral">
          SHIP LOG
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-wide sm:text-5xl">
          Changelog
        </h1>
        <p className="mt-3 max-w-xl text-white/75">
          What customers see in Discord and on the admin site. Not a roadmap.
        </p>

        <ol className="mt-12 space-y-10">
          {ENTRIES.map((entry) => (
            <li key={`${entry.date}-${entry.title}`} className="relative">
              <p className="font-mono text-xs tabular-nums text-white/45">
                {entry.date}
              </p>
              <h2 className="mt-1 font-display text-xl tracking-wide text-white">
                {entry.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                {entry.body}
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-14 text-sm text-white/50">
          <Link href="/guide" className="text-coral hover:underline">
            Guide
          </Link>
          {" · "}
          <Link href="/pricing" className="text-coral hover:underline">
            Pricing
          </Link>
          {" · "}
          <Link href="/servers" className="text-coral hover:underline">
            Servers
          </Link>
          {" · "}
          <Link href="/demo" className="text-coral hover:underline">
            Demo
          </Link>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
