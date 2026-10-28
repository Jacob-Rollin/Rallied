"use client";

import type { AnalyticsTrendPoint } from "@/lib/dashboard-data";
import { formatPctDelta } from "@/lib/analytics-stats";

const BAR_MIN = 6;
const BAR_MAX = 112;

type Metric = "parties" | "vibes" | "ghosts";

export function AnalyticsWeekBarChart({
  title,
  trend,
  metric,
  barClassName = "bg-lime",
}: {
  title: string;
  trend: AnalyticsTrendPoint[];
  metric: Metric;
  /** Tailwind classes for bar fill — default Ghostless lime. */
  barClassName?: string;
}) {
  const max = Math.max(...trend.map((d) => d[metric]), 1);

  return (
    <section className="rounded-brand border border-white/10 bg-slate-elevated/40 p-4 sm:p-5">
      <h2 className="font-display text-lg tracking-wide">{title}</h2>
      <div
        className="mt-5 flex h-[140px] items-end gap-1.5 sm:gap-2"
        role="img"
        aria-label={`${title} bar chart, Monday through Sunday`}
      >
        {trend.map((d, i) => {
          const value = d[metric];
          const height =
            value <= 0
              ? BAR_MIN
              : BAR_MIN + (value / max) * (BAR_MAX - BAR_MIN);
          return (
            <div
              key={`${metric}-${d.day}-${i}`}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
              title={`${d.day}: ${value}`}
            >
              <div
                className={`w-full max-w-[36px] rounded-sm ${barClassName} ${
                  value <= 0 ? "opacity-25" : ""
                }`}
                style={{ height: `${height}px` }}
                aria-hidden
              />
              <span className="text-[10px] uppercase tracking-wide text-muted sm:text-[11px]">
                {d.day}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AnalyticsKpiCard({
  label,
  value,
  prior,
  valueClassName,
}: {
  label: string;
  value: number | string;
  /** Prior-period total for WoW %; omit to hide delta. */
  prior?: number | null;
  valueClassName?: string;
}) {
  const numeric =
    typeof value === "number" ? value : Number.isFinite(Number(value))
      ? Number(value)
      : null;
  const pct =
    prior != null && numeric != null
      ? prior === 0
        ? numeric === 0
          ? 0
          : null
        : Math.round(((numeric - prior) / prior) * 100)
      : null;
  const up = pct != null && pct > 0;
  const down = pct != null && pct < 0;
  const flat = pct === 0;

  return (
    <div className="rounded-brand border border-white/10 bg-slate-elevated/50 p-4">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p
        className={`mt-2 font-display text-3xl tabular-nums ${
          valueClassName ?? "text-white"
        }`}
      >
        {value}
      </p>
      {prior != null ? (
        <p
          className={`mt-1.5 text-xs tabular-nums ${
            up
              ? "text-lime"
              : down
                ? "text-coral"
                : flat
                  ? "text-muted"
                  : "text-muted"
          }`}
        >
          {pct == null ? (
            <span>vs prior 7d · n/a</span>
          ) : (
            <>
              <span aria-hidden>{up ? "↑" : down ? "↓" : "→"} </span>
              {formatPctDelta(pct)} vs prior 7d
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}

export function AnalyticsSoftMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-brand border border-white/10 bg-slate-elevated/30 px-3 py-3">
      <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-display text-xl tabular-nums text-white/95">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}
