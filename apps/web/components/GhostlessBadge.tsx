import { GHOSTLESS } from "@rallied/shared";
import { GhostlessLogo, GhostlessMark } from "./GhostlessMark";

type Props = {
  showRatePct: number | null;
  compact?: boolean;
  /** Show compact Ghostless seal beside the pill when Ghostless threshold met. */
  showLogo?: boolean;
};

export function GhostlessBadge({
  showRatePct,
  compact,
  showLogo = false,
}: Props) {
  const label =
    showRatePct == null
      ? "New"
      : showRatePct >= 90
        ? GHOSTLESS.name
        : showRatePct >= 75
          ? "Reliable"
          : "Watch";

  const isGhostless = showRatePct != null && showRatePct >= 90;

  const tone =
    showRatePct == null
      ? "border-muted/40 text-muted"
      : isGhostless
        ? "border-lime/60 text-lime bg-lime/10"
        : showRatePct >= 75
          ? "border-lime/30 text-lime/90"
          : "border-coral/50 text-coral";

  return (
    <span className="inline-flex items-center gap-1.5">
      {showLogo && isGhostless ? (
        <GhostlessLogo className="h-4 w-4" alt="" />
      ) : null}
      <span
        className={`animate-badge inline-flex items-center gap-1.5 rounded-brand border px-2 py-0.5 text-xs font-semibold tracking-wide ${tone}`}
        title="Per-server Ghostless reliability — not a global grade"
      >
        <GhostlessMark size="sm" />
        {compact
          ? label
          : `${label}${showRatePct != null ? ` ${showRatePct}%` : ""}`}
      </span>
    </span>
  );
}
