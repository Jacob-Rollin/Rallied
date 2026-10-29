type Size = "sm" | "md" | "lg";

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-6 w-6",
};

const GHOST_PATH =
  "M32 6c-11.2 0-20 8.6-20 20.2v22.1c0 2.4 2.7 3.7 4.6 2.2l4.1-3.2c1.7-1.3 4.1-1.3 5.8 0l3.5 2.7c1.7 1.3 4.1 1.3 5.8 0l3.5-2.7c1.7-1.3 4.1-1.3 5.8 0l4.1 3.2c1.9 1.5 4.6.2 4.6-2.2V26.2C52 14.6 43.2 6 32 6z";

/** Dark knockout / outline under the lime check (wider; tip on dome). */
const CHECK_DARK_PATH =
  "M10.68 43.24L29.65 55.26L52.00 26.32L51.97 25.09L51.86 23.85L51.68 22.63L51.42 21.42L51.09 20.22L50.68 19.05L50.20 17.91L49.65 16.80L49.04 15.73L48.36 14.69L47.61 13.70L46.81 12.76L26.75 38.74L17.32 32.76Z";

/** Bold lime check — tip inset from dome so black rim wraps all edges. */
const CHECK_LIME_PATH =
  "M11.94 41.25L29.10 52.13L49.64 25.54L49.59 24.75L49.51 23.96L49.39 23.18L49.24 22.41L49.05 21.64L48.83 20.88L48.57 20.13L48.28 19.39L47.96 18.67L47.61 17.96L47.23 17.27L46.81 16.60L27.30 41.87L16.06 34.75Z";

type MarkProps = {
  className?: string;
  size?: Size;
  title?: string;
};

/**
 * Locked Ghostless mark #4: solid white ghost (no eyes) + bold lime check.
 * Tip follows the ghost dome; thin black outline on all visible check edges.
 */
export function GhostlessMark({
  className,
  size = "sm",
  title,
}: MarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className ?? SIZE_CLASS[size]}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path fill="#FFFFFF" d={GHOST_PATH} />
      <path fill="#0F1419" d={CHECK_DARK_PATH} />
      <path fill="#B8F000" d={CHECK_LIME_PATH} />
    </svg>
  );
}
