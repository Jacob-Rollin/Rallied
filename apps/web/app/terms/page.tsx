import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@rallied/shared";
import { LegalDoc } from "../../components/LegalDoc";

export const metadata: Metadata = {
  title: `Terms of Service — ${BRAND.name}`,
  description: `Terms for using ${BRAND.name}: Discord bot, dashboard, Path B plans, and Ghostless.`,
};

export default function TermsPage() {
  return (
    <LegalDoc
      eyebrow="LEGAL"
      title="Terms of Service"
      description={`These Terms of Service ("Terms") govern your access to and use of Rallied's Discord bot, website, and Discord OAuth dashboard (together, the "Service"). By installing the bot, logging in, or otherwise using the Service, you agree to these Terms.`}
      lastUpdated="November 4, 2026"
      draft={false}
      sections={[
        {
          id: "agreement",
          title: "Agreement and Operator",
          children: (
            <>
              <p>
                The Service is operated as an independent software project under
                the brand name Rallied.
              </p>
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
                    Support Contact:
                  </strong>{" "}
                  <a
                    href="mailto:support@rallied.gg"
                    className="text-coral hover:underline"
                  >
                    support@rallied.gg
                  </a>
                </li>
              </ul>
              <p>
                By using the Service, you confirm you meet Discord’s minimum age
                requirements in your region (at least 13, or older where
                required) and that you have authority to bind your server or
                organization to these Terms.
              </p>
            </>
          ),
        },
        {
          id: "service",
          title: "The Service",
          children: (
            <>
              <p>
                Rallied provides Discord LFG (Looking For Group) tools and
                per-server community reliability features. Ghostless tracks
                per-server reliability metrics; it is siloed to each Discord
                server and is not a public, cross-server shaming or blacklist
                database.
              </p>
              <p>
                The Service includes our Discord bot, marketing pages, optional
                public server pages, and an admin dashboard via Discord OAuth
                only. Features and limits depend on your plan (Starter,
                Community, Pro, Founding) as described on our{" "}
                <Link href="/pricing" className="text-coral hover:underline">
                  Pricing
                </Link>{" "}
                page.
              </p>
            </>
          ),
        },
        {
          id: "discord",
          title: "Discord Platform Dependency",
          children: (
            <>
              <p>
                Rallied is a third-party app on Discord. Use of Rallied requires
                ongoing compliance with Discord’s Terms, Community Guidelines,
                and Developer/Bot Policies.
              </p>
              <p>
                Outages, API changes, permission changes, or Discord enforcement
                may limit or end parts of the Service. We are not responsible for
                Discord’s platform decisions or downtime.
              </p>
            </>
          ),
        },
        {
          id: "accounts",
          title: "Accounts and Administration",
          children: (
            <>
              <p>
                Dashboard login uses Discord OAuth. Server owners and users with
                Manage Server or Administrator control configuration and billing
                for that server. On paid tiers that support it, owners may grant
                limited dashboard access via designated Discord roles (Rallied
                Mod).
              </p>
              <p>
                You are responsible for activity under your Discord account.
                Server admins are responsible for how they configure and use
                reliability features (strikes, lockouts, join gates, public
                pages). Keep bot permissions appropriate and do not share live
                dashboard sessions.
              </p>
            </>
          ),
        },
        {
          id: "acceptable-use",
          title: "Acceptable Use",
          children: (
            <>
              <p>You will not, and will not allow others to:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Use Rallied to stalk, harass, dox, or maliciously shame users,
                  or to run an unlawful cross-server punitive blacklist.
                </li>
                <li>Misrepresent reliability data or abuse dispute flows.</li>
                <li>
                  Interfere with, disrupt, or overload our systems, scrape the
                  Service systematically, or reverse-engineer the Service except
                  as allowed by law.
                </li>
                <li>Bypass plan caps, trial limits, or admin controls.</li>
                <li>
                  Send malware, spam, or abusive content through feedback,
                  Report, or bot inputs.
                </li>
              </ul>
              <p>
                We may suspend, rate-limit, or terminate access for violations.
              </p>
            </>
          ),
        },
        {
          id: "billing",
          title: "Subscriptions, Trials, and Cancellations",
          children: (
            <>
              <p>
                Paid plans are billed{" "}
                <strong className="font-semibold text-white">
                  per Discord server
                </strong>{" "}
                via Stripe:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="font-semibold text-white">
                    Starter (Free):
                  </strong>{" "}
                  Capped LFG only (including limits such as open parties and
                  creates per day). No Ghostless, strikes, or public Ghostless
                  directory features as described on Pricing.
                </li>
                <li>
                  <strong className="font-semibold text-white">Community:</strong>{" "}
                  $4.99/mo (or annual pricing on the website).
                </li>
                <li>
                  <strong className="font-semibold text-white">Pro:</strong>{" "}
                  $9.99/mo (or annual pricing on the website).
                </li>
                <li>
                  <strong className="font-semibold text-white">
                    Founding Pro:
                  </strong>{" "}
                  $8.99/mo with Pro features, limited to ≤10 founding seats.
                </li>
              </ul>
              <p>
                <strong className="font-semibold text-white">
                  Community trial:
                </strong>{" "}
                14-day trial requires a card at Stripe Checkout. You are charged
                the standard rate when the trial ends unless you cancel first.
                Eligibility is{" "}
                <strong className="font-semibold text-white">
                  one Community trial per Discord guild forever and one per
                  Discord user (the Checkout initiator)
                </strong>
                . Both must be eligible. Uninstalling, canceling, or moving the
                bot does not grant another trial.
              </p>
              <p>
                <strong className="font-semibold text-white">
                  Cancellation:
                </strong>{" "}
                Cancel anytime in the Stripe Customer Portal. Cancel during trial
                → keep Community until trial end, then Starter (no charge).
                Cancel after paying → keep the paid plan until the end of the
                current period (
                <code className="rounded bg-white/10 px-1 py-0.5 text-white/85">
                  cancel_at_period_end
                </code>
                ), then Starter. Taxes may apply.
              </p>
            </>
          ),
        },
        {
          id: "refunds",
          title: "No Money-Back Guarantee",
          children: (
            <p>
              Fees are non-refundable. We do not offer a first-month money-back
              guarantee. Canceling stops future charges but does not refund
              unused time in the current period, except where required by law.
            </p>
          ),
        },
        {
          id: "feedback",
          title: "Feedback",
          children: (
            <p>
              Feedback via{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 text-white/85">
                /feedback
              </code>
              , Report, or similar grants Rallied a perpetual, irrevocable,
              royalty-free, worldwide license to use it to improve the Service.
              Feedback is not an SLA.
            </p>
          ),
        },
        {
          id: "ip",
          title: "Intellectual Property",
          children: (
            <p>
              Rallied, rallied.gg, bot branding, and Ghostless marks are owned by
              the project and its licensors. You keep rights to your content; you
              grant us a license to process and display it as needed to operate
              the Service.
            </p>
          ),
        },
        {
          id: "disclaimer",
          title: "Disclaimer of Warranties",
          children: (
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
              AVAILABLE.&quot; TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE
              DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
              NON-INFRINGEMENT. WE DO NOT WARRANT ERROR-FREE OPERATION OR THAT
              GHOSTLESS WILL ELIMINATE NO-SHOWS OR DISPUTES.
            </p>
          ),
        },
        {
          id: "liability",
          title: "Limitation of Liability",
          children: (
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, RALLIED AND ITS OPERATORS
              ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
              PUNITIVE DAMAGES, INCLUDING LOST PROFITS OR DATA. TOTAL LIABILITY
              FOR CLAIMS ARISING FROM THE SERVICE WILL NOT EXCEED THE AMOUNTS YOU
              PAID TO RALLIED IN THE 12 MONTHS BEFORE THE CLAIM (OR USD $50 IF
              YOU USED ONLY THE FREE TIER).
            </p>
          ),
        },
        {
          id: "termination",
          title: "Termination",
          children: (
            <p>
              You may stop using the Service by removing the bot, revoking
              Discord authorization, or canceling in Stripe. We may suspend or
              end access for non-payment, abuse, legal risk, or if we shut down
              the project.
            </p>
          ),
        },
        {
          id: "law",
          title: "Governing Law",
          children: (
            <p>
              These Terms are governed by the laws of the United States, without
              regard to conflict-of-law rules, except where mandatory consumer
              protections apply. Venue for disputes will be determined under
              applicable law until a specific state venue is designated by the
              operator.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes",
          children: (
            <p>
              We may update these Terms by changing the Last Updated date.
              Material billing or platform changes may also be noted in our
              changelog or product messaging. Continued use after changes means
              you accept the updated Terms.
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
