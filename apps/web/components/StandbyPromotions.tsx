import type { ReliabilityHealth } from "@/lib/reliability-health";

type Props = {
  health: ReliabilityHealth | null;
  /** Active dashboard range label. */
  rangeLabel?: string;
};

export function StandbyPromotions({
  health,
  rangeLabel = "This week",
}: Props) {
  const count = health?.standbyPromotionsThisWeek ?? null;
  const hint = health?.emptyHints.standby ?? null;

  return (
    <section className="space-y-2">
      <div>
        <h2 className="font-display text-xl tracking-wide">
          Standby · {rangeLabel}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Waitlist promotions after ready-check no-shows (UTC).
        </p>
      </div>
      {count != null && count > 0 ? (
        <p className="font-display text-4xl tabular-nums text-lime">{count}</p>
      ) : (
        <div className="rounded-brand border border-dashed border-white/15 px-4 py-3">
          <p className="font-display text-3xl tabular-nums text-white/40">
            {count == null ? "—" : "0"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {hint ?? `No standby promotions logged · ${rangeLabel}.`}
          </p>
        </div>
      )}
    </section>
  );
}
