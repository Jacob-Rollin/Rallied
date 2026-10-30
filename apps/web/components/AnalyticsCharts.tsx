"use client";

import { chartTickIndexes } from "@rallied/shared";
import type { AnalyticsTrendPoint } from "@/lib/dashboard-data";
import { formatPctDelta, pctChange } from "@/lib/analytics-stats";

const BAR_MIN = 6;
const BAR_MAX = 112;
/** Tall enough to hold a readable in-bar label on mobile. */
const LABEL_INSIDE_MIN = 36;

type Metric = "parties" | "vibes" | "ghosts";

function DeltaLine({
  prior,
  current,
  lowerIsBetter = false,
}: {
  prior: number;
  current: number;
  /** Ghost flags etc. — decrease is good (lime), increase is bad (coral). */
  lowerIsBetter?: boolean;
}) {
  const pct = pctChange(current, prior);
  const up = pct != null && pct > 0;
  const down = pct != null && pct < 0;
  const flat = pct === 0;
  const good = lowerIsBetter ? down : up;
  const bad = lowerIsBetter ? up : down;

  return (
    <p
      className={`mt-1.5 text-xs tabular-nums ${
        good ? "text-lime" : bad ? "text-coral" : "text-muted"
      }`}
    >
      {pct == null ? (
        <span>vs prior · n/a</span>
      ) : (
        <>
          <span aria-hidden>{up ? "↑" : down ? "↓" : flat ? "→" : ""} </span>
          {formatPctDelta(pct)} vs prior
        </>
      )}
    </p>
  );
}

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
  const n = trend.length;
  // Week (≤7): every weekday tick. Longer series (incl. 12 months): ≤6 axis labels.
  const maxTicks = n <= 7 ? n : 6;
  const ticks = chartTickIndexes(n, maxTicks);
  // Ultra-tight bar chrome only for daily month/30d (dozens of columns).
  const dense = n > 12;

  return (
    <section className="rounded-brand border border-white/10 bg-slate-elevated/40 p-4 sm:p-5">
      <h2 className="font-display text-lg tracking-wide">{title}</h2>
      <div
        className={`mt-4 flex h-[168px] items-end ${
          dense ? "gap-0.5 sm:gap-1" : "gap-1.5 sm:gap-2"
        }`}
        role="img"
        aria-label={`${title} bar chart`}
      >
        {trend.map((d, i) => {
          const value = d[metric];
          const height =
            value <= 0
              ? BAR_MIN
              : BAR_MIN + (value / max) * (BAR_MAX - BAR_MIN);
          const labelInside = value > 0 && height >= LABEL_INSIDE_MIN;
          const showTick = ticks.has(i);

          return (
            <div
              key={`${metric}-${d.day}-${i}`}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
              title={`${d.day}: ${value}`}
            >
              {!labelInside ? (
                <span
                  className={`tabular-nums leading-none text-white/80 ${
                    dense
                      ? "text-[9px] sm:text-[10px]"
                      : "text-[10px] sm:text-[11px]"
                  } ${value <= 0 && dense ? "opacity-40" : ""}`}
                >
                  {/* Hide zero value labels when dense — cuts clutter */}
                  {dense && value <= 0 ? (
                    <span className="inline-block h-[10px]" aria-hidden />
                  ) : (
                    value
                  )}
                </span>
              ) : (
                <span className="h-[11px]" aria-hidden />
              )}
              <div
                className={`relative w-full rounded-sm ${barClassName} ${
                  value <= 0 ? "opacity-25" : ""
                } ${dense ? "max-w-none" : "max-w-[36px]"}`}
                style={{ height: `${height}px` }}
              >
                {labelInside ? (
                  <span className="absolute inset-x-0 top-1 text-center text-[10px] font-semibold tabular-nums leading-none text-slate sm:text-[11px]">
                    {value}
                  </span>
                ) : null}
              </div>
              <span
                className={`min-h-[1rem] text-center leading-none text-muted ${
                  dense
                    ? "text-[9px] tracking-tight sm:text-[10px]"
                    : "text-[10px] uppercase tracking-wide sm:text-[11px]"
                } ${showTick ? "" : "invisible"}`}
                aria-hidden={!showTick}
              >
                {showTick ? d.day : "·"}
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
  lowerIsBetter = false,
}: {
  label: string;
  value: number | string;
  /** Prior-period total for WoW %; omit to hide delta. */
  prior?: number | null;
  valueClassName?: string;
  /** Invert WoW colors (e.g. Ghost flags — lower is better). */
  lowerIsBetter?: boolean;
}) {
  const numeric =
    typeof value === "number"
      ? value
      : Number.isFinite(Number(value))
        ? Number(value)
        : null;

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
      {prior != null && numeric != null ? (
        <DeltaLine
          prior={prior}
          current={numeric}
          lowerIsBetter={lowerIsBetter}
        />
      ) : null}
    </div>
  );
}

export function AnalyticsSoftMetric({
  label,
  value,
  numericValue,
  prior,
  hint,
}: {
  label: string;
  value: string;
  /** Numeric form of `value` for WoW % (e.g. 91.2 for "91.2%"). */
  numericValue?: number | null;
  prior?: number | null;
  hint?: string;
}) {
  return (
    <div className="rounded-brand border border-white/10 bg-slate-elevated/30 px-3 py-3">
      <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-display text-xl tabular-nums text-white/95">
        {value}
      </p>
      {prior != null && numericValue != null ? (
        <DeltaLine prior={prior} current={numericValue} />
      ) : hint ? (
        <p className="mt-0.5 text-[11px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
