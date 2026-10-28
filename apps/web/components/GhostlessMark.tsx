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
 * Canonical Ghostless web mark: white outlined ghost + lime check lockup.
 * One integrated mark — not a solid JPG ghost beside a hollow checkbox.
 */
export function GhostlessMark({
  className,
  size = "sm",
  title,
}: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? SIZE_CLASS[size]}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      fill="none"
    >
      {title ? <title>{title}</title> : null}
      {/* Outlined ghost silhouette */}
      <path
        d="M12 3.2c-3.7 0-6.6 2.9-6.6 6.7v7.6c0 .35.4.55.68.35l1.52-1.08c.4-.28.94-.28 1.34 0l1.06.75c.4.28.94.28 1.34 0l1.06-.75c.4-.28.94-.28 1.34 0l1.06.75c.4.28.94.28 1.34 0l1.52-1.08c.28-.2.68 0 .68-.35v-7.6c0-3.8-2.9-6.7-6.68-6.7Z"
        stroke="#FFFFFF"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      {/* Eyes */}
      <circle cx="9.6" cy="10.2" r="1.05" fill="#FFFFFF" />
      <circle cx="14.4" cy="10.2" r="1.05" fill="#FFFFFF" />
      {/* Lime check integrated on the ghost */}
      <path
        d="M8.2 13.1 10.7 15.5 16.4 9.4"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
