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
      description={`Rules for using ${BRAND.name} (${BRAND.domain}) — Discord LFG, Ghostless, and the admin dashboard.`}
      sections={[
        {
          id: "agreement",
          title: "Agreement",
          children: (
            <>
              <p>
                These draft Terms of Service (“Terms”) govern access to and use of
                Rallied’s Discord bot, website, and Discord OAuth dashboard
                (together, the “Service”). By installing the bot, logging in, or
                otherwise using the Service, you agree to these Terms.
              </p>
              <p>
                <strong className="font-semibold text-white">Operator:</strong>{" "}
                Jacob / the Rallied product. Replace before treating this as
                binding:
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
                  Support:{" "}
                  <a
                    href="mailto:support@rallied.gg"
                    className="text-coral hover:underline"
                  >
                    support@rallied.gg
                  </a>{" "}
                  <span className="text-white/45">
                    (provisional — replaceable)
                  </span>
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "service",
          title: "The Service",
          children: (
            <>
              <p>
                Rallied provides Discord LFG tooling and per-server reliability
                features. Ghostless is a per-server reliability badge and related
                stats — not a cross-server public shame or grade database.
              </p>
              <p>
                The Service includes the Discord bot, public marketing pages,
                optional public server/player pages, and an admin web dashboard
                authenticated only via Discord OAuth (no email/password
                accounts). Feature availability depends on plan (Starter,
                Community, Pro, Founding) as described on{" "}
                <Link href="/pricing" className="text-coral hover:underline">
                  Pricing
                </Link>
                .
              </p>
            </>
          ),
        },
        {
          id: "discord",
          title: "Discord dependency",
          children: (
            <>
              <p>
                Rallied depends on Discord. You must comply with Discord’s Terms
                of Service, Community Guidelines, and Developer / Bot policies.
                Outages, API changes, permission models, or enforcement actions
                by Discord may limit or interrupt the Service. We are not
                responsible for Discord’s platforms or decisions.
              </p>
              <p>
                Removing the bot from a guild, revoking OAuth, or losing Discord
                access may prevent use of Rallied for that server or account.
              </p>
            </>
          ),
        },
        {
          id: "accounts",
          title: "Accounts and admin responsibility",
          children: (
            <>
              <p>
                Dashboard access requires Discord OAuth. Server owners /
                administrators (typically Manage Guild or Administrator plus bot
                present) control Settings and Billing. On Community+ plans,
                owners may grant Rallied Mod Discord role(s) for limited
                dashboard areas (not Billing or Settings writes).
              </p>
              <p>
                You are responsible for activity under your Discord account and
                for how your guild configures and uses reliability features
                (strikes, lockouts, public pages, Ghostless displays). Keep bot
                permissions appropriate and do not share dashboard sessions.
              </p>
            </>
          ),
        },
        {
          id: "acceptable-use",
          title: "Acceptable use",
          children: (
            <>
              <p>You agree not to:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Use Rallied to harass, dox, or unlawfully shame people, or to
                  operate an unlawful cross-server blacklist.
                </li>
                <li>
                  Abuse, disrupt, or overload the Service; scrape or reverse
                  engineer except as allowed by law; or bypass plan caps,
                  trials, or access controls.
                </li>
                <li>
                  Misrepresent affiliation with Rallied, or use the Service in
                  violation of Discord rules or applicable law.
                </li>
                <li>
                  Submit malware, spam, or abusive content via feedback channels
                  or bot interactions.
                </li>
              </ul>
              <p>
                We may suspend or terminate access for violations, abuse, or risk
                to the Service or other users.
              </p>
            </>
          ),
        },
        {
          id: "billing",
          title: "Subscriptions, trials, and cancel",
          children: (
            <>
              <p>
                Plans are billed <strong className="font-semibold text-white">per Discord server</strong>{" "}
                (Path B):
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="font-semibold text-white">Starter</strong> —
                  free, tightly capped matching (e.g. limited open parties and
                  creates per day); no Ghostless / strikes / public Ghostless
                  features as described on Pricing.
                </li>
                <li>
                  <strong className="font-semibold text-white">Community</strong>{" "}
                  — $4.99/mo (annual option as listed on Pricing).
                </li>
                <li>
                  <strong className="font-semibold text-white">Pro</strong> —
                  $9.99/mo (annual option as listed on Pricing).
                </li>
                <li>
                  <strong className="font-semibold text-white">Founding</strong> —
                  Pro features locked at $8.99/mo, limited to ≤10 seats /
                  servers as offered.
                </li>
              </ul>
              <p>
                <strong className="font-semibold text-white">
                  Community trial:
                </strong>{" "}
                Checkout requires a payment card. Eligible guilds get one 14-day
                Community trial; we charge after the trial unless you cancel in
                time. <em>One trial per Discord guild forever</em> —
                uninstalling, canceling, or reinstalling does not grant another
                trial.
              </p>
              <p>
                <strong className="font-semibold text-white">Cancel:</strong>{" "}
                Canceling during a trial keeps Community access until the trial
                ends, then Starter (no charge if canceled before the first
                charge). Canceling after paying keeps the paid plan until the end
                of the current billing period (`cancel_at_period_end`), then
                Starter. Cancel does not immediately cut access mid-period or
                mid-trial.
              </p>
              <p>
                Payments are processed by Stripe. Taxes may apply. Prices may
                change for future periods with notice on the site or in product
                communications; Founding locks apply only as described in the
                offer.
              </p>
            </>
          ),
        },
        {
          id: "refunds",
          title: "No money-back guarantee",
          children: (
            <p>
              Rallied does{" "}
              <strong className="font-semibold text-white">
                not
              </strong>{" "}
              market a first-month money-back guarantee. Except where required by
              law, fees are non-refundable. Canceling stops future charges
              according to the trial / period rules above; it does not entitle
              you to a refund for time already paid unless we expressly agree in
              writing or law requires it.
            </p>
          ),
        },
        {
          id: "feedback",
          title: "Feedback",
          children: (
            <p>
              You may submit bugs or suggestions via Discord{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 text-white/85">
                /feedback
              </code>{" "}
              or Report in{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 text-white/85">
                /app
              </code>
              . Feedback is triaged in a private ops inbox. You grant Rallied a
              non-exclusive, royalty-free license to use feedback to operate and
              improve the Service. Feedback is not a support SLA.
            </p>
          ),
        },
        {
          id: "ip",
          title: "Intellectual property",
          children: (
            <p>
              Rallied, the rallied.gg site, bot branding, and related materials
              are owned by us or our licensors. Ghostless branding refers to
              Rallied’s reliability feature/badge. You retain rights in content
              you submit, subject to the licenses needed for us to host and
              display it in the Service (including Discord-facing messages and
              opted-in public pages).
            </p>
          ),
        },
        {
          id: "disclaimer",
          title: "Disclaimer of warranties",
          children: (
            <p>
              THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM
              EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR
              IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, AND NON-INFRINGEMENT. We do not warrant uninterrupted or
              error-free operation, or that reliability scores will prevent
              no-shows or disputes in your community.
            </p>
          ),
        },
        {
          id: "liability",
          title: "Limitation of liability",
          children: (
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, RALLIED AND ITS OPERATORS
              WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, DATA, OR
              GOODWILL. OUR TOTAL LIABILITY FOR CLAIMS ARISING OUT OF THE SERVICE
              WILL NOT EXCEED THE AMOUNTS YOU PAID US FOR THE SERVICE IN THE
              TWELVE (12) MONTHS BEFORE THE CLAIM (OR USD $50 IF YOU HAVE NOT
              PAID). Some jurisdictions do not allow certain limitations; in
              those cases, our liability is limited to the fullest extent
              allowed.
            </p>
          ),
        },
        {
          id: "termination",
          title: "Termination",
          children: (
            <p>
              You may stop using the Service at any time (remove the bot, cancel
              subscriptions via Stripe Customer Portal, revoke OAuth). We may
              suspend or terminate access for breach of these Terms, non-payment,
              abuse, legal risk, or discontinuation of the Service. Upon
              termination, paid access continues only through the applicable
              trial or paid period end as described in Billing; data retention
              follows our{" "}
              <Link href="/privacy" className="text-coral hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          ),
        },
        {
          id: "law",
          title: "Governing law",
          children: (
            <p>
              These Terms are governed by the laws of{" "}
              <span className="text-coral/90">[State]</span>, USA, without regard
              to conflict-of-law rules, except where mandatory consumer
              protections apply. Courts in{" "}
              <span className="text-coral/90">[State]</span>, USA, will have
              exclusive jurisdiction, subject to applicable law.{" "}
              <span className="text-white/55">
                Jacob fills governing law / venue before relying on this as
                binding.
              </span>
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes to these Terms",
          children: (
            <p>
              We may update these Terms as the product evolves. The “Last
              updated” date will change when we post a revision. Material changes
              may be noted on the changelog or in product communications.
              Continued use after an update constitutes acceptance of the revised
              draft, subject to counsel review before this document is treated as
              binding.
            </p>
          ),
        },
        {
          id: "contact",
          title: "Contact",
          children: (
            <>
              <p>
                Questions about these Terms:{" "}
                <a
                  href="mailto:support@rallied.gg"
                  className="text-coral hover:underline"
                >
                  support@rallied.gg
                </a>
                .
              </p>
              <p className="text-white/55">
                Replace entity name, mailing address, support email, and
                governing law placeholders before relying on this as official
                Terms.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
