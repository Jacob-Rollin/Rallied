import Link from "next/link";
import type { Metadata } from "next";
import { BRAND, buildBotInviteUrl } from "@rallied/shared";
import { AddToDiscordButton } from "../../components/AddToDiscordButton";
import { GhostlessMark } from "../../components/GhostlessMark";
import {
  CreatePartyFlowMock,
  FilledClosedPairMock,
  FindPartyGuideMock,
  GhostlessGuideMock,
  LfgDeskMock,
  PartySeatsTransitionMock,
  ReadyCheckGuideMock,
  VibeCheckGuideMock,
} from "../../components/DiscordGuideMocks";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata: Metadata = {
  title: `How it works — ${BRAND.name}`,
  description:
    "Visual guide to Rallied LFG desk, temp voice, waitlist, filters, schedule, Ready Check, Vibe Check, Ghostless, and the admin web dashboard — matching live Discord bot behavior.",
};

const SECTIONS = [
  { id: "setup", label: "Setup" },
  { id: "desk", label: "LFG desk" },
  { id: "create", label: "Create" },
  { id: "party", label: "Party card" },
  { id: "find", label: "Find" },
  { id: "ready", label: "Ready Check" },
  { id: "vibe", label: "Vibe Check" },
  { id: "ghostless", label: "Ghostless" },
  { id: "admin", label: "Admin web" },
] as const;

export default function GuidePage() {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "";
  const inviteHref = clientId ? buildBotInviteUrl(clientId) : "#add-bot";

  return (
    <div className="min-h-screen">
      <SiteHeader variant="hero" />

      <div className="relative overflow-hidden border-b border-white/10">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="hero-wash hero-wash--coral opacity-70" />
          <div className="hero-wash hero-wash--lime opacity-60" />
          <div className="hero-wash hero-wash--slate" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 pb-12 pt-8 sm:pb-16 sm:pt-10">
          <p className="animate-rise font-display text-xs tracking-[0.16em] text-coral">
            HOW IT WORKS
          </p>
          <h1
            className="animate-rise mt-2 max-w-2xl font-display text-4xl leading-none tracking-wide text-white sm:text-5xl md:text-6xl"
            style={{ animationDelay: "40ms" }}
          >
            From channel setup to Ghostless
          </h1>
          <p
            className="animate-rise mt-4 max-w-xl text-base text-white/75 sm:text-lg"
            style={{ animationDelay: "80ms" }}
          >
            Set up Rallied on any Discord server, walk what players see in
            Discord, then open the admin web dashboard — labels match the live
            bot.
          </p>
          <div
            className="animate-rise mt-6 flex flex-wrap gap-3"
            style={{ animationDelay: "120ms" }}
          >
            <AddToDiscordButton href={inviteHref} />
            <Link
              href="/login"
              className="rounded-brand border border-white/25 px-5 py-2.5 font-semibold text-white/90 transition hover:border-coral/50 hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/demo"
              className="rounded-brand border border-white/25 px-5 py-2.5 font-semibold text-white/90 transition hover:border-lime/50 hover:text-lime"
            >
              Explore demo
            </Link>
          </div>
          <p
            className="animate-rise mt-3 max-w-lg text-sm text-white/50"
            style={{ animationDelay: "160ms" }}
          >
            Install needs Manage Server (or Admin). Pin the LFG desk in Discord,
            then Log in for the real{" "}
            <code className="text-white/65">/app</code> dashboard — Explore demo
            is an optional sandbox.
          </p>
        </div>
      </div>

      <nav
        className="sticky top-[3.25rem] z-20 border-b border-white/10 bg-slate/90 backdrop-blur-md sm:top-[3.5rem]"
        aria-label="Guide sections"
      >
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="shrink-0 rounded-brand px-3 py-1.5 text-sm text-white/65 transition hover:bg-white/5 hover:text-white"
            >
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-5xl space-y-20 px-4 py-14 sm:py-16">
        <section id="setup" className="scroll-mt-32">
          <p className="font-display text-xs tracking-[0.14em] text-coral">
            00
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-wide text-white">
            Set up on your server
          </h2>
          <ol className="mt-4 max-w-2xl list-none space-y-4 text-sm leading-relaxed text-white/75">
            <li className="flex gap-3">
              <span className="font-display text-xs tracking-wide text-coral">
                1
              </span>
              <span>
                <strong className="font-semibold text-white">
                  Add Rallied
                </strong>{" "}
                with Manage Server (or Admin). Invite opens Discord&apos;s
                OAuth — pick the guild where LFG should live.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-xs tracking-wide text-coral">
                2
              </span>
              <span>
                <strong className="font-semibold text-white">
                  Create a text channel
                </strong>{" "}
                for parties — a common name is{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-white/85">
                  #lfg-board
                </code>
                . Any name works; pick one players will find.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-xs tracking-wide text-coral">
                3
              </span>
              <span>
                <strong className="font-semibold text-white">
                  Grant the bot permissions
                </strong>
                :{" "}
                <strong className="font-semibold text-white">
                  Manage Channels
                </strong>{" "}
                (temp voice create/delete), View Channel, Send Messages, Embed
                Links, Create Public Threads, Send Messages in Threads, Manage
                Roles, Connect, Move Members, Use Application Commands.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-xs tracking-wide text-coral">
                4
              </span>
              <span>
                In the channel, run{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-white/85">
                  /setup
                </code>{" "}
                or{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-white/85">
                  /lfg desk
                </code>
                , then long-press →{" "}
                <strong className="font-semibold text-white">Pin</strong> the
                desk message so it stays at the top.
              </span>
            </li>
          </ol>
          <p className="mt-4 text-xs text-white/45">
            Players use desk buttons after that — Create / Find / My parties /
            How it works. Slash commands remain as backup.
          </p>
        </section>

        <section id="desk" className="scroll-mt-32">
          <p className="font-display text-xs tracking-[0.14em] text-coral">
            01
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-wide text-white">
            Pin the LFG desk
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
            After setup, the pinned desk is the home base. Four buttons: Create
            party, Find party, My parties, How it works — no slash required for
            players. Example channel name below is a suggestion only.
          </p>
          <div className="mt-6 max-w-lg">
            <LfgDeskMock />
          </div>
        </section>

        <section id="create" className="scroll-mt-32">
          <p className="font-display text-xs tracking-[0.14em] text-coral">
            02
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-wide text-white">
            Create a party
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
            Create party opens a game select first (catalog + Other), then a
            modal with up to five text fields: party size, mic, rank, region,
            and optional start time (
            <code className="text-white/65">in 30m</code> / UTC). Discord
            modals can&apos;t nest dropdowns — game stays a prior select; mic
            normalizes to Required / Optional / Any. A scheduled start gets a
            ~T-10m reminder.
          </p>
          <div className="mt-6">
            <CreatePartyFlowMock />
          </div>
          <p className="mt-4 text-xs text-white/45">
            Slash backup:{" "}
            <code className="text-white/65">/lfg create</code> (game
            autocomplete + the same filters).
          </p>
        </section>

        <section id="party" className="scroll-mt-32">
          <p className="font-display text-xs tracking-[0.14em] text-coral">
            03
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-wide text-white">
            Live party card
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
            Public embed posts Rank / Mic / Region / Slots, plus Join / Leave /
            Close, Ready Check, Vibe Check, and{" "}
            <strong className="font-semibold text-white">Join VC</strong> when
            temp voice is up (bot needs Manage Channels). Slots update live
            (e.g. 3/5 → 4/5). When full,{" "}
            <strong className="font-semibold text-white">Waitlist</strong>{" "}
            queues the next seat. A squad thread opens under the card for codes.
          </p>
          <div className="mt-6">
            <PartySeatsTransitionMock />
          </div>
        </section>

        <section id="find" className="scroll-mt-32">
          <p className="font-display text-xs tracking-[0.14em] text-coral">
            03b
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-wide text-white">
            Find with filters
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
            Desk <strong className="font-semibold text-white">Find</strong>{" "}
            browses open parties by game. Slash{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-white/85">
              /lfg find
            </code>{" "}
            also filters by mic and region — same fields hosts set on create.
            Results stay in this server only.
          </p>
          <div className="mt-6 max-w-md">
            <FindPartyGuideMock />
          </div>
        </section>

        <section id="ready" className="scroll-mt-32">
          <p className="font-display text-xs tracking-[0.14em] text-coral">
            04
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-wide text-white">
            Ready Check, filled, closed
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
            When the last seat fills (or the host taps Ready Check), a grace
            countdown starts — host (and the filler on auto) start Ready.
            Roster shows Ready / Waiting. After grace, no-shows get a strike on
            this server on{" "}
            <strong className="font-semibold text-white">Community+</strong>{" "}
            (Starter free has soft ready-check only — no strikes). Filled cards
            swap Join for Waitlist; Closed strips Join / Leave / Close / voice
            but keeps Vibe Check.
          </p>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <ReadyCheckGuideMock />
            <ReadyCheckGuideMock resolved />
          </div>
          <div className="mt-8">
            <FilledClosedPairMock />
          </div>
          <p className="mt-4 text-xs text-white/45">
            Default grace: 5 minutes (server setting). Close asks Confirm close /
            Cancel first (temp voice deleted on close).
          </p>
        </section>

        <section id="vibe" className="scroll-mt-32">
          <p className="font-display text-xs tracking-[0.14em] text-coral">
            05
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-wide text-white">
            Post-session Vibe Check
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
            After fill or close, Rallied nudges you to rate teammates. Showed up
            / Ghosted plus optional vibe 1–5. Ready Check owns show/ghost counts
            when it already ran; Ghosted after grace issues a strike on
            Community+ (no double strike with Ready Check). Starter free does
            not progress Ghostless. Only the flagged player can Dispute.
          </p>
          <div className="mt-6">
            <VibeCheckGuideMock />
          </div>
          <p className="mt-4 text-xs text-white/45">
            Slash backup: <code className="text-white/65">/vibe</code>.
          </p>
        </section>

        <section id="ghostless" className="scroll-mt-32">
          <p className="font-display text-xs tracking-[0.14em] text-lime">
            06
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="font-display text-3xl tracking-wide text-white">
              Ghostless badge
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-brand border border-lime/50 bg-lime/10 px-2.5 py-1 text-xs font-semibold text-lime">
              <GhostlessMark size="sm" />
              Local reliability
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
            Ghostless is a{" "}
            <strong className="font-semibold text-white">
              per-server show-rate badge
            </strong>
            , not global karma and not an LFG Network passport. One ghost
            doesn&apos;t auto-kill it — you earn it locally after enough
            sessions at your server&apos;s threshold (defaults: ≥90% show rate
            and ≥10 sessions). Included on Community+ / trial — not on Starter
            free.{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-white/85">
              /ghostless @user
            </code>{" "}
            shows This server · N shows · M ghosts.
          </p>
          <div className="mt-6 max-w-md">
            <GhostlessGuideMock />
          </div>
        </section>

        <section id="admin" className="scroll-mt-32">
          <p className="font-display text-xs tracking-[0.14em] text-coral">
            07
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-wide text-white">
            Admin web dashboard
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
            After the bot is in your server, open the site and{" "}
            <strong className="font-semibold text-white">Log in</strong> with
            Discord OAuth. You need Manage Server (or Admin) on that guild —
            same bar as the invite.
          </p>

          <ol className="mt-6 max-w-2xl list-none space-y-4 text-sm leading-relaxed text-white/75">
            <li className="flex gap-3">
              <span className="font-display text-xs tracking-wide text-coral">
                1
              </span>
              <span>
                <strong className="font-semibold text-white">Log in</strong>{" "}
                (header or below) → Discord authorize. You land on{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-white/85">
                  /app
                </code>
                .
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-xs tracking-wide text-coral">
                2
              </span>
              <span>
                <strong className="font-semibold text-white">
                  Pick your server
                </strong>{" "}
                from the switcher — no guild id typing. Only servers you can
                manage (with the bot present) show as ready.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-xs tracking-wide text-coral">
                3
              </span>
              <span>
                <strong className="font-semibold text-white">What you see</strong>
                : Overview (open parties / members / strikes), LFG parties,
                People, Analytics, Settings, and Disputes (list + status —
                resolve still in Discord for now).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-xs tracking-wide text-coral">
                4
              </span>
              <span>
                <strong className="font-semibold text-white">Settings</strong>:
                turn the public page on/off, set a vanity slug (
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-white/85">
                  /s/your-slug
                </code>
                ), opt into{" "}
                <strong className="font-semibold text-white">
                  List in directory
                </strong>{" "}
                (
                <Link href="/servers" className="text-coral hover:underline">
                  /servers
                </Link>
                ) with a Discord invite URL, then{" "}
                <strong className="font-semibold text-white">Save</strong>{" "}
                (writes live). Pro / Founding unlock vanity (hide Powered by,
                accent, Discord guild icon on the public page).
              </span>
            </li>
          </ol>

          <div className="mt-6 max-w-2xl space-y-3 rounded-brand border border-white/10 bg-slate-elevated/40 px-4 py-4 text-sm text-white/75 sm:px-5">
            <p>
              <strong className="font-semibold text-white">
                Public page vs admin
              </strong>
              —{" "}
              <code className="text-white/85">/s/…</code> is what members and
              visitors see.{" "}
              <code className="text-white/85">/app</code> is the signed-in
              admin board (Log in). Directory listing is opt-in and still
              per-server — no cross-server player DB.
            </p>
            <p>
              <strong className="font-semibold text-white">
                Explore demo
              </strong>{" "}
              at{" "}
              <Link href="/demo" className="text-lime hover:underline">
                /demo
              </Link>{" "}
              is an optional sandbox (including a Demo Pro vanity preview). Your
              real dashboard is always{" "}
              <Link href="/app" className="text-coral hover:underline">
                /app
              </Link>{" "}
              after Log in.
            </p>
            <p>
              <strong className="font-semibold text-white">Plans</strong> — 14-day
              trial, then Starter free (2 open + 5 creates/24h for this server,
              no Ghostless). Community $4.99 · Pro $9.99 · Founding $8.99. See{" "}
              <Link href="/pricing" className="text-coral hover:underline">
                Pricing
              </Link>
              .
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/login?next=%2Fapp"
              className="rounded-brand bg-coral px-5 py-2.5 font-semibold text-slate transition hover:brightness-110"
            >
              Log in to /app
            </Link>
            <Link
              href="/demo"
              className="rounded-brand border border-white/25 px-5 py-2.5 font-semibold text-white/90 transition hover:border-lime/50 hover:text-lime"
            >
              Explore demo
            </Link>
          </div>
        </section>

        <section className="rounded-brand border border-white/10 bg-slate-elevated/40 px-5 py-8 sm:px-8">
          <h2 className="font-display text-2xl tracking-wide text-white">
            Ready to try it
          </h2>
          <p className="mt-2 max-w-lg text-sm text-white/70">
            Add Rallied to Discord, pin the LFG desk, then Log in for your live{" "}
            <code className="text-white/85">/app</code> dashboard — or walk the
            sandbox demo first.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <AddToDiscordButton href={inviteHref} />
            <Link
              href="/login"
              className="rounded-brand border border-white/25 px-5 py-2.5 font-semibold text-white/90 transition hover:border-coral/50 hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/demo"
              className="rounded-brand border border-white/25 px-5 py-2.5 font-semibold text-white/90 transition hover:border-lime/50 hover:text-lime"
            >
              Explore demo
            </Link>
            <Link
              href="/pricing"
              className="rounded-brand border border-coral/70 px-5 py-2.5 font-semibold text-coral transition hover:bg-coral/10"
            >
              Pricing
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
