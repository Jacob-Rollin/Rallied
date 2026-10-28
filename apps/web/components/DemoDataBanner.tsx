/** Compact notice for the explicit /demo admin board (not the live /app ?mock=1 path). */

export function DemoDataBanner() {
  return (
    <p
      className="rounded-brand border border-white/15 px-3 py-2 text-xs text-muted"
      role="status"
    >
      <span className="font-semibold uppercase tracking-wider">Demo / mock</span>
      {" — "}
      Sample parties, Ghostless stats, strikes, and disputes for evaluation.
      Nothing here is connected to your Discord.
    </p>
  );
}
