import Link from "next/link";
import type { ReactNode } from "react";
import { isProPlan, type PlanId } from "@rallied/shared";
import type { ReliabilityHealth as Health } from "@/lib/reliability-health";
import { formatPctDelta, pctChange } from "@/lib/analytics-stats";

type Props = {
  health: Health;
  plan: PlanId | null | undefined;
  disputesHref: string;
  billingHref: string;
};

function Trend({
  current,
  prior,
  lowerIsBetter = false,
  unit = "%",
}: {
  current: number | null;
  prior: number | null;
  lowerIsBetter?: boolean;
  unit?: string;
}) {
  if (current == null || prior == null) {
    return (
      <p className="mt-1.5 text-xs text-muted">vs prior 7d · not enough data</p>
    );
  }
  const pct = pctChange(current, prior);
  const up = pct != null && pct > 0;
  const down = pct != null && pct < 0;
  const good = lowerIsBetter ? down : up;
  const bad = lowerIsBetter ? up : down;
  return (
    <p
      className={`mt-1.5 text-xs tabular-nums ${
        good ? "text-lime" : bad ? "text-coral" : "text-muted"
      }`}
    >
      {prior}
      {unit} → {current}
      {unit}
      {pct != null ? ` · ${formatPctDelta(pct)}` : ""}
    </p>
  );
}

function MetricBlock({
  label,
  value,
  empty,
  accent,
  children,
}: {
  label: string;
  value: string | null;
  empty: string | null;
  accent?: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-t border-white/10 pt-3 first:border-t-0 first:pt-0 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4 first:sm:border-l-0 first:sm:pl-0">
      <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
      {value != null ? (
        <p
          className={`mt-1 font-display text-2xl tabular-nums ${
            accent ?? "text-white"
          }`}
        >
          {value}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">{empty ?? "—"}</p>
      )}
      {children}
    </div>
  );
}

export function ReliabilityHealth({
  health,
  plan,
  disputesHref,
  billingHref,
}: Props) {
  const pro = isProPlan(plan);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-xl tracking-wide">
            Reliability health
          </h2>
          <p className="mt-1 text-sm text-muted">
            Last 7 days{pro ? " · Pro trends vs prior week" : " · Community lite"}
            . Honest empties — no demo fakes on live.
          </p>
        </div>
        {!pro ? (
          <Link
            href={billingHref}
            className="text-xs font-semibold text-coral hover:underline"
          >
            Pro unlocks week-over-week
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 rounded-brand border border-white/10 bg-slate-elevated/40 p-4 sm:grid-cols-3 sm:gap-0">
        <MetricBlock
          label="Ready no-show rate"
          value={
            health.noShowRatePct != null ? `${health.noShowRatePct}%` : null
          }
          empty={health.emptyHints.noShow}
          accent="text-coral"
        >
          {pro ? (
            <Trend
              current={health.noShowRatePct}
              prior={health.priorNoShowRatePct}
              lowerIsBetter
            />
          ) : null}
        </MetricBlock>

        <MetricBlock
          label="Vibe response rate"
          value={
            health.vibeResponseRatePct != null
              ? `${health.vibeResponseRatePct}%`
              : null
          }
          empty={health.emptyHints.vibe}
          accent="text-lime"
        >
          {pro ? (
            <Trend
              current={health.vibeResponseRatePct}
              prior={health.priorVibeResponseRatePct}
            />
          ) : null}
        </MetricBlock>

        <MetricBlock
          label="Open disputes"
          value={String(health.openDisputes)}
          empty={null}
        >
          <Link
            href={disputesHref}
            className="mt-1.5 inline-block text-xs text-coral hover:underline"
          >
            Review disputes
          </Link>
        </MetricBlock>
      </div>
    </section>
  );
}
