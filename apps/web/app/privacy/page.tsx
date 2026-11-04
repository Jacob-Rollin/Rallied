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
      description={`This Privacy Policy describes how Rallied ("we", "us", "our") processes information when you use the Rallied Discord bot, the rallied.gg website, and the web dashboard at /app.`}
      lastUpdated="November 4, 2026"
      draft={false}
      sections={[
        {
          id: "who",
          title: "Who We Are",
          children: (
            <>
              <p>Rallied operates as an independent software project.</p>
              <ul className="list-disc space-y-1 pl-5 text-white/70">
                <li>
                  <strong className="font-semibold text-white">
                    Project Name:
                  </strong>{" "}
                  Rallied
                </li>
                <li>
                  <strong className="font-semibold text-white">Website:</strong>{" "}
                  rallied.gg
                </li>
                <li>
                  <strong className="font-semibold text-white">
                    Privacy &amp; Support Contact:
                  </strong>{" "}
                  <a
                    href="mailto:support@rallied.gg"
                    className="text-coral hover:underline"
                  >
                    support@rallied.gg
                  </a>
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "scope",
          title: "What This Covers",
          children: (
            <>
              <p>
                Rallied is a Discord LFG and per-server reliability utility.
                Ghostless tracks per-server reliability metrics — it is siloed
                per Discord server and is not a cross-server public grade or
                blacklist network.
              </p>
              <p>
                Sign-in uses Discord OAuth only. We do not offer email/password
                accounts.
              </p>
            </>
          ),
        },
        {
          id: "isolation",
          title: "Data Isolation",
          children: (
            <p>
              Reliability and strike-style data are scoped to each Discord
              server. We do not publish a cross-server player grade database.
              Stats and strikes for Server A are not exposed as a shared
              reputation network for Server B.
            </p>
          ),
        },
        {
          id: "collect",
          title: "What We Collect",
          children: (
            <>
              <p>Depending on use, we may process:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="font-semibold text-white">
                    Discord identifiers:
                  </strong>{" "}
                  Guild IDs, user IDs, usernames/display names, avatars from
                  Discord OAuth or the Bot API, and role IDs used for Rallied Mod
                  access.
                </li>
                <li>
                  <strong className="font-semibold text-white">
                    Server settings:
                  </strong>{" "}
                  LFG desk settings, join gates, lockouts, public page toggles,
                  game-name aliases, and related admin configuration.
                </li>
                <li>
                  <strong className="font-semibold text-white">
                    LFG activity:
                  </strong>{" "}
                  Parties, membership, waitlists, ready checks, schedules, and
                  related event history for that server.
                </li>
                <li>
                  <strong className="font-semibold text-white">
                    Reliability data (per-server):
                  </strong>{" "}
                  Vibe Checks / vibe tags, Ghostless stats, strikes, disputes,
                  host/leaderboard aggregates.
                </li>
                <li>
                  <strong className="font-semibold text-white">Billing:</strong>{" "}
                  Plan, trial markers, Stripe customer/subscription IDs. Card
                  data is handled by Stripe — we do not store full card numbers.
                </li>
                <li>
                  <strong className="font-semibold text-white">Feedback:</strong>{" "}
                  Reports via{" "}
                  <code className="rounded bg-white/10 px-1 py-0.5 text-white/85">
                    /feedback
                  </code>{" "}
                  or dashboard Report, including Discord user ID and optional
                  guild context.
                </li>
                <li>
                  <strong className="font-semibold text-white">
                    Technical logs:
                  </strong>{" "}
                  Request/error/hosting logs (e.g. Cloudflare Workers) for
                  security and reliability.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "oauth",
          title: "Discord OAuth and Bot API",
          children: (
            <>
              <p>
                Discord OAuth identifies you for dashboard access and to check
                Manage Server / Administrator / Rallied Mod access.
              </p>
              <p>
                Inviting the bot grants the permissions requested at install
                (including application commands). We use guild data to run LFG
                desks, ready checks, reliability features, and related admin
                tools.
              </p>
              <p>
                Use of Rallied is subject to Discord’s{" "}
                <a
                  href="https://discord.com/developers/docs/policies-and-agreements/developer-terms-of-service"
                  className="text-coral hover:underline"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Developer Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="https://discord.com/developers/docs/policies-and-agreements/developer-policy"
                  className="text-coral hover:underline"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Developer Policy
                </a>
                .
              </p>
            </>
          ),
        },
        {
          id: "use",
          title: "How We Use Information",
          children: (
            <ul className="list-disc space-y-2 pl-5">
              <li>Provide LFG matching and party flows in Discord</li>
              <li>Compute and show per-server Ghostless, vibes, and strikes</li>
              <li>Authenticate dashboard users and enforce access roles</li>
              <li>Run Stripe billing, trials, and plan entitlements</li>
              <li>Triage feedback and bugs</li>
              <li>Secure, operate, and improve the Service</li>
            </ul>
          ),
        },
        {
          id: "processors",
          title: "Processors",
          children: (
            <>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="font-semibold text-white">Discord</strong> —
                  auth, bot/API
                </li>
                <li>
                  <strong className="font-semibold text-white">Stripe</strong> —
                  checkout, billing
                </li>
                <li>
                  <strong className="font-semibold text-white">Cloudflare</strong>{" "}
                  — Workers hosting / edge
                </li>
                <li>
                  <strong className="font-semibold text-white">Supabase</strong> —
                  database
                </li>
              </ul>
              <p>
                Each processes data under their own policies as needed to run
                Rallied.
              </p>
            </>
          ),
        },
        {
          id: "sharing",
          title: "Sharing and Selling",
          children: (
            <>
              <p>
                <strong className="font-semibold text-white">
                  We do not sell personal data.
                </strong>{" "}
                We share data with processors above, or when required by law, or
                to protect users and the Service.
              </p>
              <p>
                Public directory pages or shareable cards show summaries only
                when admins opt in; they remain server-scoped.
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
                Re-running{" "}
                <code className="rounded bg-white/10 px-1 py-0.5 text-white/85">
                  /setup
                </code>{" "}
                or reinstalling the bot does not wipe historical LFG/reliability
                history for that guild while the bot remains in use.
              </p>
              <p>
                After prolonged inactivity (default about{" "}
                <strong className="font-semibold text-white">90 days</strong> with
                no meaningful activity), we may soft-archive server data. Billing
                records and trial-eligibility markers (including one Community
                trial per guild and per Discord user) may be kept for accounting,
                compliance, and anti-abuse.
              </p>
            </>
          ),
        },
        {
          id: "kids",
          title: "Children and Discord Policies",
          children: (
            <p>
              Rallied is not for children under 13 (or older if Discord requires
              a higher age in your region). Use must comply with Discord’s Terms
              and Developer Policy.
            </p>
          ),
        },
        {
          id: "choices",
          title: "Your Choices and Deletion",
          children: (
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="font-semibold text-white">
                  Revoke web access:
                </strong>{" "}
                Log out of rallied.gg and revoke Rallied under Discord → User
                Settings → Authorized Apps. Admins can remove the bot from the
                server.
              </li>
              <li>
                <strong className="font-semibold text-white">
                  Delete / access requests:
                </strong>{" "}
                Email{" "}
                <a
                  href="mailto:support@rallied.gg"
                  className="text-coral hover:underline"
                >
                  support@rallied.gg
                </a>{" "}
                from an account we can associate with your Discord user ID
                (include your Discord user ID). We will delete or anonymize
                personal data tied to that user where feasible within{" "}
                <strong className="font-semibold text-white">30 days</strong> of
                a verified request, except data we must keep for law, security,
                billing, or anti-abuse (e.g. trial-consumption markers), or
                aggregate/server records that do not identify you. We also honor
                verified deletion requests and Discord / developer-policy
                deletion requirements within that same reasonable period.
              </li>
              <li>
                <strong className="font-semibold text-white">
                  Server-owned data:
                </strong>{" "}
                Removing the bot stops new collection; historical server
                aggregates may remain per retention rules above until
                archive/deletion cycles run.
              </li>
            </ul>
          ),
        },
        {
          id: "changes",
          title: "Changes",
          children: (
            <p>
              We may update this Policy and the Last Updated date. Material
              changes may also appear in our changelog or product notices.
            </p>
          ),
        },
        {
          id: "contact",
          title: "Contact",
          children: (
            <p>
              <a
                href="mailto:support@rallied.gg"
                className="text-coral hover:underline"
              >
                support@rallied.gg
              </a>
            </p>
          ),
        },
      ]}
    />
  );
}
