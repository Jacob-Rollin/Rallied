import type { AggregatedVibeTag } from "@rallied/shared";
import {
  VIBE_TAG_SECTION_HINT,
  VIBE_TAG_SECTION_TITLE,
} from "@rallied/shared";

type Props = {
  tags: AggregatedVibeTag[];
  /** When true, hide the empty state (detail pages still show the section). */
  hideWhenEmpty?: boolean;
};

/**
 * Soft chip row for thresholded recent vibe tags.
 * Negatives use the same muted weight as positives — never a hero scarlet stamp.
 * Ghostless % remains the reliability headline elsewhere on the card.
 */
export function RecentVibes({ tags, hideWhenEmpty = false }: Props) {
  if (hideWhenEmpty && tags.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-lg tracking-wide text-white/90">
        {VIBE_TAG_SECTION_TITLE}
      </h2>
      <p className="mt-1 text-xs text-muted">{VIBE_TAG_SECTION_HINT}</p>
      {tags.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          No recent vibe tags yet (needs multiple teammates).
        </p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={VIBE_TAG_SECTION_TITLE}>
          {tags.map((t) => (
            <li key={t.tag}>
              <span
                className={
                  t.negative
                    ? "inline-flex items-baseline gap-1 rounded-brand border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-muted"
                    : "inline-flex items-baseline gap-1 rounded-brand border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-white/70"
                }
              >
                <span>{t.label}</span>
                <span className="tabular-nums text-muted">· {t.raterCount}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
