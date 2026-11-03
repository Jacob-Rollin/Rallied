/**
 * Fixed post-session vibe tags (after Showed up).
 * One tag per (party, rater, ratee) — upsert/overwrite.
 * Public display uses a rolling window + distinct-rater thresholds
 * so a single Toxic/AFK misclick never brands someone.
 */

export const VIBE_TAG_IDS = [
  "reliable",
  "communicator",
  "clutch",
  "friendly",
  "toxic",
  "afk",
] as const;

export type VibeTagId = (typeof VIBE_TAG_IDS)[number];

export const VIBE_TAG_POSITIVE = [
  "reliable",
  "communicator",
  "clutch",
  "friendly",
] as const satisfies readonly VibeTagId[];

export const VIBE_TAG_NEGATIVE = ["toxic", "afk"] as const satisfies readonly VibeTagId[];

export const VIBE_TAG_LABELS: Record<VibeTagId, string> = {
  reliable: "Reliable",
  communicator: "Communicator",
  clutch: "Clutch",
  friendly: "Friendly",
  toxic: "Toxic",
  afk: "AFK",
};

/** Rolling window for public / admin “Recent vibes” aggregates. */
export const VIBE_TAG_WINDOW_DAYS = 30;

/**
 * Minimum distinct raters before a tag surfaces publicly.
 * Applied to every tag (positives and negatives) so one joke never brands.
 */
export const VIBE_TAG_MIN_DISTINCT_RATERS = 2;

export const VIBE_TAG_SECTION_TITLE = "Recent vibes (30 days)";

export const VIBE_TAG_SECTION_HINT =
  "From teammates this month · needs multiple raters to show.";

/** Discord select “Skip” value — leaves vibe_tag null / unchanged. */
export const VIBE_TAG_SKIP_VALUE = "skip";

export function isVibeTagId(raw: unknown): raw is VibeTagId {
  return (
    typeof raw === "string" &&
    (VIBE_TAG_IDS as readonly string[]).includes(raw)
  );
}

export function parseVibeTag(raw: unknown): VibeTagId | null {
  if (raw == null || raw === "") return null;
  return isVibeTagId(raw) ? raw : null;
}

export function vibeTagLabel(tag: VibeTagId): string {
  return VIBE_TAG_LABELS[tag];
}

export function isNegativeVibeTag(tag: VibeTagId): boolean {
  return (VIBE_TAG_NEGATIVE as readonly string[]).includes(tag);
}

export type VibeTagRow = {
  tag: VibeTagId;
  raterId: string;
  createdAt: string;
};

export type AggregatedVibeTag = {
  tag: VibeTagId;
  label: string;
  /** Distinct raters in the window (display count). */
  raterCount: number;
  negative: boolean;
};

export type AggregateVibeTagsOptions = {
  /** Inclusive lookback; default VIBE_TAG_WINDOW_DAYS. */
  windowDays?: number;
  /** Default VIBE_TAG_MIN_DISTINCT_RATERS (2). */
  minDistinctRaters?: number;
  /** Anchor for “now”; default Date.now(). */
  now?: Date | number | string;
};

/**
 * Aggregate raw tag rows into public-safe chips.
 * Rule: show a tag only when ≥ minDistinctRaters distinct raters
 * tagged it inside the rolling window. Order: positives first (locked set
 * order), then negatives — negatives never reorder ahead of positives.
 */
export function aggregateRecentVibeTags(
  rows: readonly VibeTagRow[],
  opts: AggregateVibeTagsOptions = {},
): AggregatedVibeTag[] {
  const windowDays = opts.windowDays ?? VIBE_TAG_WINDOW_DAYS;
  const minRaters = opts.minDistinctRaters ?? VIBE_TAG_MIN_DISTINCT_RATERS;
  const nowMs = new Date(opts.now ?? Date.now()).getTime();
  const cutoff = nowMs - windowDays * 24 * 60 * 60 * 1000;

  const byTag = new Map<VibeTagId, Set<string>>();

  for (const row of rows) {
    if (!isVibeTagId(row.tag)) continue;
    if (!row.raterId) continue;
    const created = new Date(row.createdAt).getTime();
    if (!Number.isFinite(created) || created < cutoff) continue;
    let set = byTag.get(row.tag);
    if (!set) {
      set = new Set();
      byTag.set(row.tag, set);
    }
    set.add(row.raterId);
  }

  const out: AggregatedVibeTag[] = [];
  for (const tag of VIBE_TAG_IDS) {
    const raters = byTag.get(tag);
    const count = raters?.size ?? 0;
    if (count < minRaters) continue;
    out.push({
      tag,
      label: VIBE_TAG_LABELS[tag],
      raterCount: count,
      negative: isNegativeVibeTag(tag),
    });
  }
  return out;
}

/** ISO cutoff for a 30-day (or custom) window query. */
export function vibeTagWindowCutoffIso(
  windowDays = VIBE_TAG_WINDOW_DAYS,
  now: Date | number | string = Date.now(),
): string {
  const ms = new Date(now).getTime() - windowDays * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString();
}
