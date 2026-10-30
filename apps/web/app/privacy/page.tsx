import type { Metadata } from "next";
import { BRAND } from "@rallied/shared";
import { LegalDoc } from "../../components/LegalDoc";

export const metadata: Metadata = {
  title: `Privacy Policy — ${BRAND.name}`,
  description: `How ${BRAND.name} collects and uses Discord and billing data for LFG and Ghostless.`,
};

export default function PrivacyPage() {
  return (
    <LegalDoc
      eyebrow="LEGAL"
      title="Privacy Policy"
      description={`How ${BRAND.name} (${BRAND.domain}) handles data for the Discord bot and OAuth web dashboard.`}
      sections={[
        {
          id: "who",
          title: "Who we are",
          children: (
            <>
              <p>
                This draft Privacy Policy describes how{" "}
                <strong className="font-semibold text-white">Rallied</strong>{" "}
                (“we”, “us”) processes information when you use the Rallied
                Discord bot, the rallied.gg website, and the Discord OAuth
                dashboard at{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-white/85">
                  /app
                </code>
                .
              </p>
              <p>
                <strong className="font-semibold text-white">Operator:</strong>{" "}
                Jacob / the Rallied product. Replace before treating this as a
                binding policy:
              </p>
              <ul className="list-disc space-y-1 pl-5 text-white/70">
                <li>
                  Legal entity:{" "}
                  <span className="text-coral/90">[Legal entity name]</span>
                </li>
                <li>
                  Mailing address:{" "}
                  <span className="text-coral/90">[Mailing address]</span>
                </li>
                <li>
                  Privacy / support contact:{" "}
                  <a
                    href="mailto:support@rallied.gg"
                    className="text-coral hover:underline"
                  >
                    support@rallied.gg
                  </a>{" "}
                  <span className="text-white/45">
                    (provisional — replace if you use a different inbox)
                  </span>
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "scope",
          title: "What this covers",
          children: (
            <>
              <p>
                Rallied is a Discord LFG and per-server reliability product.
                Ghostless is a <em>per-server</em> reliability badge and related
                stats — not a cross-server public shame or grade database.
              </p>
              <p>
                Accounts are Discord OAuth only. We do not offer email/password
                signup. Players primarily use Discord; server admins and
                designated Rallied Mods use the web dashboard.
              </p>
            </>
          ),
        },
        {
          id: "collect",
          title: "What we collect",
          children: (
            <>
              <p>Depending on how you use Rallied, we may process:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="font-semibold text-white">
                    Discord identifiers
                  </strong>{" "}
                  — guild (server) IDs, user IDs, usernames/display names and
                  avatars Discord provides via OAuth or the bot API, and role
                  IDs you configure for Rallied Mod access.
                </li>
                <li>
                  <strong className="font-semibold text-white">
                    Server settings
                  </strong>{" "}
                  — LFG desk configuration, join gates (e.g. min Ghostless %),
                  lockouts, public page / directory toggles, vanity options on
                  paid plans, and related admin preferences.
                </li>
                <li>
                  <strong className="font-semibold text-white">
                    LFG activity
                  </strong>{" "}
                  — parties, membership, waitlists, ready checks, scheduled
                  starts, and related event history for that Discord server.
                </li>
                <li>
                  <strong className="font-semibold text-white">
                    Reliability data (per server)
                  </strong>{" "}
                  — Vibe Check responses, Ghostless scores/badges, strikes,
                  disputes, and host/leaderboard aggregates. These stay scoped
                  to each Discord guild; we do not operate a public
                  cross-server player grade network.
                </li>
                <li>
                  <strong className="font-semibold text-white">Billing</strong> —
                  plan, trial status, and Stripe customer/subscription
                  identifiers needed to run Checkout and Customer Portal. Card
                  numbers are handled by Stripe, not stored on Rallied servers.
                </li>
                <li>
                  <strong className="font-semibold text-white">Feedback</strong>{" "}
                  — bug and suggestion reports from Discord{" "}
                  <code className="rounded bg-white/10 px-1 py-0.5 text-white/85">
                    /feedback
                  </code>{" "}
                  or Report in{" "}
                  <code className="rounded bg-white/10 px-1 py-0.5 text-white/85">
                    /app
                  </code>
                  , including the Discord user who submitted them and optional
                  guild context, stored for ops triage.
                </li>
                <li>
                  <strong className="font-semibold text-white">
                    Technical logs
                  </strong>{" "}
                  — routine request, error, and operational logs from hosting
                  (e.g. Cloudflare Workers) as needed to run and secure the
                  service.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "oauth",
          title: "Discord OAuth and the bot",
          children: (
            <>
              <p>
                When you Log in on rallied.gg, Discord OAuth authenticates you.
                We use the resulting session to show servers you can administer
                (or access as a Rallied Mod) and to apply permissions. We do not
                replace Discord accounts with a separate email/password login.
              </p>
              <p>
                When a server admin adds the Rallied bot, Discord grants the bot
                access to that guild within the permissions requested at invite
                time. The bot reads and writes messages, channels, and related
                guild data needed for LFG desks, ready checks, and reliability
                features.
              </p>
            </>
          ),
        },
        {
          id: "use",
          title: "How we use information",
          children: (
            <>
              <ul className="list-disc space-y-2 pl-5">
                <li>Provide LFG matching, desks, and party tooling in Discord.</li>
                <li>
                  Compute and display per-server Ghostless / vibe / strike
                  reliability features and admin analytics.
                </li>
                <li>
                  Authenticate dashboard users and enforce owner vs Rallied Mod
                  access.
                </li>
                <li>
                  Process subscriptions, trials, and cancellations via Stripe.
                </li>
                <li>
                  Triage feedback in a private ops inbox (and optional staff
                  Discord mirror).
                </li>
                <li>Maintain, secure, and improve the service.</li>
              </ul>
            </>
          ),
        },
        {
          id: "processors",
          title: "Processors and infrastructure",
          children: (
            <>
              <p>
                We use service providers (“processors”) to operate Rallied.
                Current core stack:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="font-semibold text-white">Discord</strong> —
                  authentication, bot messaging, and guild APIs.
                </li>
                <li>
                  <strong className="font-semibold text-white">Stripe</strong> —
                  Checkout, Customer Portal, invoices, and payment processing.
                </li>
                <li>
                  <strong className="font-semibold text-white">
                    Cloudflare Workers
                  </strong>{" "}
                  — hosting the web app / Worker edge runtime.
                </li>
                <li>
                  <strong className="font-semibold text-white">Supabase</strong> —
                  primary application database and related backend storage.
                </li>
              </ul>
              <p>
                These providers process data under their own terms and privacy
                policies, limited to what is needed to provide their services to
                us.
              </p>
            </>
          ),
        },
        {
          id: "sharing",
          title: "Sharing and selling",
          children: (
            <>
              <p>
                We do <strong className="font-semibold text-white">not sell</strong>{" "}
                personal data. We share information with processors as above, when
                required by law, to protect rights and safety, or with your
                direction (for example, content you choose to make public on an
                opted-in server page).
              </p>
              <p>
                Public server pages and shareable per-server player cards may
                show aggregates and Ghostless spotlight information that admins
                enable for that guild — still per server, not a cross-server
                grade network.
              </p>
            </>
          ),
        },
        {
          id: "retention",
          title: "Retention",
          children: (
            <>
              <p>
                Re-running Discord{" "}
                <code className="rounded bg-white/10 px-1 py-0.5 text-white/85">
                  /setup
                </code>{" "}
                or reinstalling the bot is intended to keep historical LFG,
                Ghostless, strike, and related guild data so reliability history
                is not wiped by setup.
              </p>
              <p>
                After prolonged inactivity (default about{" "}
                <strong className="font-semibold text-white">90 days</strong> with
                no meaningful guild activity), we may soft-archive a server’s
                data rather than treat setup as a wipe. Soft-archive is
                operational retention hygiene, not a promise of indefinite
                storage. Billing and trial-consumption records may be kept as
                needed for subscriptions and anti-abuse (including one Community
                trial per Discord guild).
              </p>
              <p>
                Feedback reports are retained as needed for triage and product
                improvement, then deleted or minimized when no longer useful.
              </p>
            </>
          ),
        },
        {
          id: "kids",
          title: "Children and Discord rules",
          children: (
            <>
              <p>
                Rallied is designed for Discord communities and is not directed at
                children under 13 (or the minimum age Discord requires in your
                region). You must comply with Discord’s Terms of Service and
                policies, including age requirements, when using Rallied.
              </p>
              <p>
                Server admins are responsible for how their community uses
                reliability features (including strikes and public pages) in line
                with Discord rules and applicable law.
              </p>
            </>
          ),
        },
        {
          id: "rights",
          title: "Your choices and requests",
          children: (
            <>
              <p>
                You can disconnect OAuth by logging out and revoking Rallied’s
                access in Discord’s authorized-app settings. Server admins can
                remove the bot from a guild. Removing the bot does not
                automatically erase historical guild data we retain under the
                retention rules above.
              </p>
              <p>
                To ask about access, correction, or deletion of personal data we
                hold, contact{" "}
                <a
                  href="mailto:support@rallied.gg"
                  className="text-coral hover:underline"
                >
                  support@rallied.gg
                </a>
                . We may need to verify you control the relevant Discord account
                or guild.
              </p>
            </>
          ),
        },
        {
          id: "changes",
          title: "Changes",
          children: (
            <p>
              We may update this Privacy Policy as the product evolves. The “Last
              updated” date at the top will change when we post a revision.
              Material changes may also be noted on the site changelog or in
              product communications. Continued use after an update means you
              acknowledge the revised draft (subject to counsel review before this
              document is treated as binding).
            </p>
          ),
        },
        {
          id: "contact",
          title: "Contact",
          children: (
            <>
              <p>
                Questions about privacy:{" "}
                <a
                  href="mailto:support@rallied.gg"
                  className="text-coral hover:underline"
                >
                  support@rallied.gg
                </a>
                .
              </p>
              <p className="text-white/55">
                Replace entity name, mailing address, and contact email before
                relying on this as an official policy.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
