import { GHOSTLESS } from "@rallied/shared";

type Props = {
  showRatePct: number | null;
  compact?: boolean;
};

export function GhostlessBadge({ showRatePct, compact }: Props) {
  const label =
    showRatePct == null
      ? "New"
      : showRatePct >= 90
        ? GHOSTLESS.name
        : showRatePct >= 75
          ? "Reliable"
          : "Watch";

  const tone =
    showRatePct == null
      ? "border-muted/40 text-muted"
      : showRatePct >= 90
        ? "border-lime/60 text-lime bg-lime/10"
        : showRatePct >= 75
          ? "border-lime/30 text-lime/90"
          : "border-coral/50 text-coral";

  const mark =
    showRatePct != null && showRatePct >= 90
      ? GHOSTLESS.mark
      : GHOSTLESS.markEmpty;

  return (
    <span
      className={`animate-badge inline-flex items-center gap-1.5 rounded-brand border px-2 py-0.5 text-xs font-semibold tracking-wide ${tone}`}
      title="Per-server Ghostless reliability — not a global grade"
    >
      <span aria-hidden className="text-[11px] leading-none">
        {mark}
      </span>
      {compact ? label : `${label}${showRatePct != null ? ` ${showRatePct}%` : ""}`}
    </span>
  );
}
