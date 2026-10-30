import Link from "next/link";
import type { Metadata } from "next";
import { BRAND, COMMUNITY_PRICE_USD, PRO_PRICE_USD } from "@rallied/shared";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata: Metadata = {
  title: `Changelog — ${BRAND.name}`,
  description: `Recent shipping for ${BRAND.name}: Path B pricing, LFG parity, directory, Ghostless, and public pages.`,
};

const ENTRIES: {
  date: string;
  title: string;
  body: string;
}[] = [
  {
    date: "2026-10-30",
    title: "Pro iCal subscribe + web dispute resolve",
    body: "Pro / Founding: Settings → Calendar subscribe generates a tokenized .ics URL for upcoming scheduled parties (our Worker only — no Google OAuth). Community+ admins Overturn / Uphold on /app/disputes (same semantics as /dispute resolve).",
  },
  {
    date: "2026-10-30",
    title: "Bot invite permissions (re-auth)",
    body: "Add to Discord invite integer is 311671409680 (includes Manage Channels for temp voice, plus threads / roles / Connect / Move Members). Existing installs: re-authorize with that permissions value or fix the bot role — calculator alone does not update an installed bot.",
  },
  {
    date: "2026-10-29",
    title: "LFG parity — voice, waitlist, filters, schedule",
    body: "Temp voice (Join VC; bot needs Manage Channels), waitlist when full, mic / rank / region on create + Find filters, optional scheduled start with ~T-10m reminder. Still this server only — no LFG Network.",
  },
  {
    date: "2026-10-29",
    title: "Opt-in server directory + changelog",
    body: "Public /servers lists communities that opt in (public page + invite). Listing is per-server reliability, not cross-server player grades. This page tracks shipping for Founding trust.",
  },
  {
    date: "2026-10-29",
    title: "Path B monetization",
    body: `Starter free under caps (2 open parties, 5 creates/day after trial; no Ghostless / strikes). Community $${COMMUNITY_PRICE_USD}/mo · Pro $${PRO_PRICE_USD}/mo · Founding Pro $8.99 locked. 14-day full trial first.`,
  },
  {
    date: "2026-10-28",
    title: "Ghostless mark + public cards",
    body: "Solid white ghost + lime check lockup on public /s pages and player cards. Strikes stay admin-only, this server only.",
  },
  {
    date: "2026-10-28",
    title: "Demo Pro vanity + Settings Save",
    body: "Demo Settings can preview Pro vanity (hide Powered by / accent / Discord guild icon on /s). Live Settings Save writes slug, public toggles, directory list + invite URL.",
  },
  {
    date: "2026-10-28",
    title: "LFG desk in Discord",
    body: "Pinned desk panel: Create / Find / Mine / How it works. Party cards with Join, Leave, Close, Ready Check, and post-session Vibe Check nudge.",
  },
  {
    date: "2026-10-27",
    title: "Admin web + guide",
    body: "Dashboard for People, Settings, disputes, analytics (Pro). Marketing /guide walks setup → desk → Ghostless → /app admin.",
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
          Short, honest notes on what landed. Not a roadmap.
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
