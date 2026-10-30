type Size = "sm" | "md" | "lg";

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-6 w-6",
};

const GHOST_PATH =
  "M32 6c-11.2 0-20 8.6-20 20.2v22.1c0 2.4 2.7 3.7 4.6 2.2l4.1-3.2c1.7-1.3 4.1-1.3 5.8 0l3.5 2.7c1.7 1.3 4.1 1.3 5.8 0l3.5-2.7c1.7-1.3 4.1-1.3 5.8 0l4.1 3.2c1.9 1.5 4.6.2 4.6-2.2V26.2C52 14.6 43.2 6 32 6z";

/** Dark knockout / outline under the lime check (wider; tip on real ghost dome). */
const CHECK_DARK_PATH =
  "M10.68 43.24L29.65 55.26L53.46 24.42L53.25 23.54L53.01 22.67L52.75 21.82L52.46 20.99L52.14 20.17L51.79 19.37L51.43 18.58L51.03 17.82L50.62 17.07L50.18 16.34L49.72 15.63L49.23 14.94L48.72 14.27L48.20 13.62L47.65 12.99L47.08 12.39L26.75 38.74L17.32 32.76Z";

/** Bold lime check — short tip axially inset for black end-cap; long tip inset from dome. */
const CHECK_LIME_PATH =
  "M13.21 42.05L29.10 52.13L51.56 23.05L51.40 22.51L51.22 21.99L51.03 21.47L50.84 20.96L50.63 20.46L50.42 19.96L50.19 19.47L49.95 18.99L49.71 18.51L49.45 18.05L49.18 17.59L48.91 17.14L48.63 16.69L48.33 16.26L48.03 15.83L47.72 15.42L27.30 41.87L17.33 35.55Z";

type MarkProps = {
  className?: string;
  size?: Size;
  title?: string;
};

/**
 * Locked Ghostless mark #4: solid white ghost (no eyes) + bold lime check.
 * Long tip flush to the real ghost dome bezier; thin black outline on all
 * visible check edges including the short-arm end-cap.
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
