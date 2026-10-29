import { DiscordMark } from "./DiscordMark";

type Props = {
  href: string;
  className?: string;
  children?: React.ReactNode;
  /** Solid coral (default) or outline for secondary slots. */
  variant?: "coral" | "outline";
};

/**
 * Primary invite CTA — Discord mark on the far left; keeps existing sizing.
 */
export function AddToDiscordButton({
  href,
  className,
  children = "Add to Discord",
  variant = "coral",
}: Props) {
  const base =
    variant === "coral"
      ? "bg-coral text-slate hover:brightness-110"
      : "border border-white/20 text-white/90 hover:border-coral/50 hover:text-white";

  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-brand px-5 py-2.5 text-sm font-semibold transition sm:text-base ${base} ${className ?? ""}`}
    >
      <DiscordMark className="h-[1.15em] w-[1.15em] shrink-0" />
      <span>{children}</span>
    </a>
  );
}
