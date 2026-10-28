type Size = "sm" | "md" | "lg";

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-5 w-5",
};

type MarkProps = {
  className?: string;
  size?: Size;
  title?: string;
};

/**
 * Canonical Ghostless web mark: lime check inside the square box.
 * Matches the landing Vibe Check mock — not hollow ▢ + separate ✓.
 */
export function GhostlessMark({
  className,
  size = "sm",
  title,
}: MarkProps) {
  return (
    <svg
      viewBox="0 0 14 14"
      className={className ?? SIZE_CLASS[size]}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <rect
        x="1.5"
        y="1.5"
        width="11"
        height="11"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        opacity="0.85"
      />
      <path
        d="M3.8 7.2 6.1 9.4 10.2 4.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  /** Accessible label; empty string hides from AT when parent already labels. */
  alt?: string;
};

/**
 * Compact Ghostless brand logo (white ghost + lime check) for section
 * headings / chips. Does not replace the Rallied wordmark in site chrome.
 */
export function GhostlessLogo({
  className = "h-5 w-5",
  alt = "Ghostless",
}: LogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/ghostless-icon.jpg"
      alt={alt}
      className={`rounded-sm object-cover ${className}`}
    />
  );
}
