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
    date: "2026-10-31",
    title: "Per-host open party cap",
    body: "Stops lobby spam: Community+ defaults to 3 open parties per host per server (Settings: 1–10). Starter still uses guild caps (2 open · 5 creates/24h); per-host cannot exceed the guild open cap. Create error: “Close or fill one of your open parties first (N/M).” Closing frees the slot. Not a plan downgrade — guild-wide open parties stay unlimited on paid.",
  },
  {
    date: "2026-10-30",
    title: "Dashboard time ranges",
    body: "Overview and Analytics share a UTC range control: This week (Mon–Sun, default), This month, Last 30 days, or All time. Filters leaderboard Top hosts, reliability health, standby, and charts — Ghostless Most reliable stays lifetime and is labeled. History is still kept while the bot is installed; ranges do not wipe data.",
  },
  {
    date: "2026-10-30",
    title: "Privacy & Terms pages",
    body: "Draft Privacy Policy and Terms of Service are on /privacy and /terms (footer links). Cover Discord OAuth, per-server Ghostless data, Stripe billing / Community trial rules, and retention — not lawyer-reviewed; placeholders for entity and mailing address.",
  },
  {
    date: "2026-10-30",
    title: "History survives /setup",
    body: "Re-running /setup (or reinstalling the bot) only re-pins the LFG desk — it does not wipe parties, Ghostless, or Top hosts. Closed parties still count toward Top hosts this month. Inactive servers may be soft-archived after 90 days with no activity (not on setup).",
  },
  {
    date: "2026-10-30",
    title: "Report bugs & suggestions",
    body: "Anyone in a server with Rallied can use Discord /feedback (type + title + details). Admins and Rallied Mods can also tap Report in /app. The team triages in a private ops inbox — no public ticket board.",
  },
  {
    date: "2026-10-30",
    title: "Community trial · cancel keeps access",
    body: `Community Checkout requires a card. First trial per Discord server and per Discord user is 14 days (charged after trial). Cancel during trial or after paying keeps access until trial/period end, then Starter. Uninstall / new server does not grant another trial. Official / forever_pro never downgraded.`,
  },
  {
    date: "2026-10-30",
    title: "Rallied Mod dashboard access",
    body: "Community+ (trial / Community / Pro / Founding): owners pick Discord role(s) in Settings → Rallied Mod roles. Members with those roles Log in to Overview, LFG, People, Disputes (Overturn/Uphold), and Analytics — not Settings writes or Billing. Starter: no Mod access (upgrade CTA). Owners with Manage Server still get the full /app.",
  },
  {
    date: "2026-10-30",
    title: "Server names on /servers",
    body: "Directory and public /s pages show your Discord server’s real name and icon.",
  },
  {
    date: "2026-10-30",
    title: "Founding seats · pricing clarity",
    body: `Founding Pro capped at ≤${PLANS.founding_pro.seatCap} seats. Prices stay Community $${COMMUNITY_PRICE_USD}/mo · Pro $${PRO_PRICE_USD}/mo · Founding $${FOUNDING_PRO_PRICE_USD}/mo locked — billed per Discord server. 14-day trial is Community features only (not Pro).`,
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
    title: "Standby, join gates, Board",
    body: "Ready Check no-shows free seats and promote the waitlist (Standby). Settings: Min Ghostless % to Join + Enforce lockout on Join. Desk Board (and /leaderboard) shows Most reliable + Top hosts for this server.",
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
    body: `Install starts on Starter (matching under caps; no Ghostless / strikes). Community trial via Checkout + card (14 days, once per server & Discord user). Community $${COMMUNITY_PRICE_USD}/mo · Pro $${PRO_PRICE_USD}/mo · Founding Pro $${FOUNDING_PRO_PRICE_USD} locked.`,
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
    body: "Pinned desk: Create / Find / Mine / Board / How it works. Party cards with Join, Leave, Close, Ready Check, and post-session Vibe Check.",
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
          {" · "}
          <Link href="/privacy" className="text-coral hover:underline">
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="text-coral hover:underline">
            Terms
          </Link>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
