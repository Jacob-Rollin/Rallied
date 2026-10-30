import Link from "next/link";
import {
  COMMUNITY_PRICE_USD,
  isStarterPlan,
  type PlanId,
} from "@rallied/shared";

type Props = {
  plan: PlanId | string | null | undefined;
  trialEndsAt?: string | null;
  billingHref: string;
};

/** Overview banner for trial / Starter (free · lapsed) states. */
export function PlanBanner({ plan, trialEndsAt, billingHref }: Props) {
  const p = plan ?? "trial";

  if (p === "trial") {
    const ends = trialEndsAt ? new Date(trialEndsAt) : null;
    const daysLeft =
      ends && Number.isFinite(ends.getTime())
        ? Math.max(
            0,
            Math.ceil((ends.getTime() - Date.now()) / 86400_000),
          )
        : null;
    return (
      <div className="rounded-brand border border-lime/35 bg-lime/10 px-4 py-3 text-sm text-white/90">
        <p className="font-medium text-lime">
          Community trial
          {daysLeft != null ? ` · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : ""}
        </p>
        <p className="mt-1 text-white/70">
          Full Ghostless + unlimited LFG while the trial runs. After that this
          server drops to Starter caps (2 open · 5 creates/24h) unless you
          upgrade.
        </p>
        <Link
          href={billingHref}
          className="mt-2 inline-block text-sm font-semibold text-coral hover:underline"
        >
          See plans →
        </Link>
      </div>
    );
  }

  if (isStarterPlan(p)) {
    return (
      <div className="rounded-brand border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-white/90">
        <p className="font-medium text-coral">Starter plan</p>
        <p className="mt-1 text-white/70">
          Matching under caps for this server (2 open · 5 creates/24h) ·
          Ghostless and strikes off. Busy communities hit this fast. Community
          is ${COMMUNITY_PRICE_USD}/mo for unlimited LFG + reliability.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            href="/pricing"
            className="text-sm font-semibold text-coral hover:underline"
          >
            Upgrade to Community →
          </Link>
          <Link
            href={billingHref}
            className="text-sm text-white/60 hover:text-white hover:underline"
          >
            Billing
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
