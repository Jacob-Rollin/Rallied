export type TopGameEntry = {
  game: string;
  parties: number;
};

type Props = {
  games: TopGameEntry[];
  /** Period heading (e.g. "This week", "This month"). */
  rangeLabel: string;
  /** Compact for public /s; roomier for /app */
  compact?: boolean;
  /** Deeper list copy for Analytics vs Overview/public. */
  variant?: "default" | "analytics";
};

/**
 * Ranked LFG party games for a guild window — one section, one purpose.
 * Blank titles are already excluded upstream via rankTopGames.
 */
export function TopGamesList({
  games,
  rangeLabel,
  compact = false,
  variant = "default",
}: Props) {
  const subtitle =
    variant === "analytics"
      ? `LFG creates by game · ${rangeLabel} (blank titles excluded).`
      : compact
        ? `Most posted on LFG · ${rangeLabel}.`
        : `Most LFG creates by game · ${rangeLabel}.`;

  return (
    <section className={compact ? "space-y-3" : "space-y-4"}>
      <div>
        <h2 className="font-display text-xl tracking-wide">Top games</h2>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
      {games.length === 0 ? (
        <p className="text-sm text-muted">No games in this range yet.</p>
      ) : (
        <ol
          className={
            compact
              ? "divide-y divide-white/10 rounded-brand border border-white/10 bg-slate-elevated/40 px-4"
              : "divide-y divide-white/10 border-y border-white/10"
          }
        >
          {games.map((g, i) => (
            <li
              key={`${g.game}-${i}`}
              className="flex justify-between gap-3 py-2.5 text-sm"
            >
              <span className="min-w-0 truncate text-white/90">
                <span className="tabular-nums text-muted">{i + 1}. </span>
                {g.game}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-coral">
                {g.parties}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
