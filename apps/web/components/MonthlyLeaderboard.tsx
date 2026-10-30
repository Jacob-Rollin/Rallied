type EntryReliable = {
  displayName: string;
  showRatePct: number;
};

type EntryHost = {
  displayName: string;
  partiesHosted: number;
};

type Props = {
  monthLabel: string;
  mostReliable: EntryReliable[];
  topHosts: EntryHost[];
  /** Compact for public /s; roomier for /app */
  compact?: boolean;
};

export function MonthlyLeaderboard({
  monthLabel,
  mostReliable,
  topHosts,
  compact = false,
}: Props) {
  return (
    <section className={compact ? "space-y-3" : "space-y-4"}>
      <div>
        <h2 className="font-display text-xl tracking-wide">
          {compact ? `Leaderboard · ${monthLabel}` : `This month · ${monthLabel}`}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {compact
            ? "This server only — Most reliable (Ghostless %) and Top hosts."
            : "Most reliable + Top hosts — same board as /leaderboard (this server only)."}
        </p>
      </div>
      <div
        className={
          compact
            ? "grid gap-4 sm:grid-cols-2"
            : "grid gap-0 overflow-hidden rounded-brand border border-white/10 bg-slate-elevated/40 sm:grid-cols-2"
        }
      >
        <div
          className={
            compact
              ? "rounded-brand border border-white/10 bg-slate-elevated/40 p-4"
              : "border-b border-white/10 p-4 sm:border-b-0 sm:border-r"
          }
        >
          <p className="text-xs uppercase tracking-wider text-lime">
            Most reliable
          </p>
          {mostReliable.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No ranked players yet.</p>
          ) : (
            <ol className="mt-3 space-y-2 text-sm">
              {mostReliable.map((r, i) => (
                <li
                  key={`${r.displayName}-${i}`}
                  className="flex justify-between gap-2"
                >
                  <span>
                    <span className="text-muted">{i + 1}.</span> {r.displayName}
                  </span>
                  <span className="font-semibold text-lime">
                    {r.showRatePct}%
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div
          className={
            compact
              ? "rounded-brand border border-white/10 bg-slate-elevated/40 p-4"
              : "p-4"
          }
        >
          <p className="text-xs uppercase tracking-wider text-coral">
            Top hosts
          </p>
          {topHosts.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No hosts this month yet.</p>
          ) : (
            <ol className="mt-3 space-y-2 text-sm">
              {topHosts.map((h, i) => (
                <li
                  key={`${h.displayName}-${i}`}
                  className="flex justify-between gap-2"
                >
                  <span>
                    <span className="text-muted">{i + 1}.</span> {h.displayName}
                  </span>
                  <span className="font-semibold text-white/90">
                    {h.partiesHosted}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
