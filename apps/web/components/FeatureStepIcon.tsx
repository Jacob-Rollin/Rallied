type FeatureIconKind = "slash" | "play" | "check";

type Props = {
  kind: FeatureIconKind;
  className?: string;
};

const accents: Record<FeatureIconKind, string> = {
  slash: "border-coral/70 text-coral",
  play: "border-coral/70 text-coral",
  check: "border-lime/70 text-lime",
};

function Glyph({ kind }: { kind: FeatureIconKind }) {
  if (kind === "slash") {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
        <path
          d="M10.2 2.5 5.8 13.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === "play") {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
        <path d="M5.5 3.6v8.8L12.2 8 5.5 3.6Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M3.4 8.2 6.6 11.3 12.6 4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Small terminal-style mark for marketing feature steps (not a card). */
export function FeatureStepIcon({ kind, className = "" }: Props) {
  return (
    <span
      className={`feature-step-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border bg-black/25 ${accents[kind]} ${className}`}
      aria-hidden
    >
      <Glyph kind={kind} />
    </span>
  );
}
