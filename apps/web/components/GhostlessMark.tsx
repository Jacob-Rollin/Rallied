type Size = "sm" | "md" | "lg";

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-6 w-6",
};

const GHOST_PATH =
  "M32 6c-11.2 0-20 8.6-20 20.2v22.1c0 2.4 2.7 3.7 4.6 2.2l4.1-3.2c1.7-1.3 4.1-1.3 5.8 0l3.5 2.7c1.7 1.3 4.1 1.3 5.8 0l3.5-2.7c1.7-1.3 4.1-1.3 5.8 0l4.1 3.2c1.9 1.5 4.6.2 4.6-2.2V26.2C52 14.6 43.2 6 32 6z";

/** Dark knockout under the lime check (slightly wider). */
const CHECK_DARK_PATH =
  "M11.06 42.65L29.49 54.33L51.98 25.21L51.87 23.91L51.68 22.62L51.40 21.35L51.05 20.09L50.61 18.87L50.09 17.67L49.50 16.51L48.83 15.39L48.09 14.32L47.28 13.29L26.91 39.67L16.94 33.35Z";

/** Bold lime check — top-right tip follows the ghost dome arc. */
const CHECK_LIME_PATH =
  "M11.86 41.38L29.14 52.33L51.75 23.05L51.58 22.13L51.37 21.22L51.12 20.33L50.82 19.44L50.49 18.58L50.11 17.72L49.70 16.89L49.25 16.08L48.76 15.28L48.23 14.52L27.26 41.67L16.14 34.62Z";

type MarkProps = {
  className?: string;
  size?: Size;
  title?: string;
};

/**
 * Locked Ghostless mark #4: solid white ghost (no eyes) + bold lime check.
 * Top-right check tip is arc-clipped to the ghost dome (no flat square-cap cut).
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
