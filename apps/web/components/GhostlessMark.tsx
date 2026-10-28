type Size = "sm" | "md" | "lg";

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-6 w-6",
};

type MarkProps = {
  className?: string;
  size?: Size;
  title?: string;
};

/**
 * Locked Ghostless mark #4: solid white ghost silhouette (no eyes) +
 * bold lime check across the body. No green ring. One lockup for pills.
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
      <path
        fill="#FFFFFF"
        d="M32 6c-11.2 0-20 8.6-20 20.2v22.1c0 2.4 2.7 3.7 4.6 2.2l4.1-3.2c1.7-1.3 4.1-1.3 5.8 0l3.5 2.7c1.7 1.3 4.1 1.3 5.8 0l3.5-2.7c1.7-1.3 4.1-1.3 5.8 0l4.1 3.2c1.9 1.5 4.6.2 4.6-2.2V26.2C52 14.6 43.2 6 32 6z"
      />
      {/* Dark knockout so lime check stays crisp on the white ghost */}
      <path
        fill="none"
        stroke="#0F1419"
        strokeWidth="11"
        strokeLinecap="square"
        strokeLinejoin="miter"
        d="M18.5 34.5 28.2 43.5 48 20.5"
      />
      <path
        fill="none"
        stroke="#B8F000"
        strokeWidth="8"
        strokeLinecap="square"
        strokeLinejoin="miter"
        d="M18.5 34.5 28.2 43.5 48 20.5"
      />
    </svg>
  );
}
