/**
 * Per-server game name aliases (Top games hygiene).
 * Keys are normalizeGameAliasKey(raw); values are canonical display strings.
 * Resolve at read time — do not rewrite lfg_parties.game.
 */

/** Trim + collapse whitespace + lowercase (same spirit as top-games grouping). */
export function normalizeGameAliasKey(raw: string): string {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Trim + collapse whitespace for display / storage of canonical names. */
export function normalizeGameDisplay(raw: string): string {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

export type GameAliasMap = Record<string, string>;

/** Coerce JSON / unknown into a clean alias map. */
export function parseGameAliases(raw: unknown): GameAliasMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: GameAliasMap = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const key = normalizeGameAliasKey(k);
    const display = normalizeGameDisplay(String(v ?? ""));
    if (!key || !display) continue;
    // Identity mappings are noise.
    if (key === normalizeGameAliasKey(display)) continue;
    out[key] = display;
  }
  return out;
}

/**
 * Apply per-server aliases to a raw party game string.
 * Returns trimmed display; empty input stays empty.
 */
export function resolveGameAlias(
  raw: string | null | undefined,
  aliases: GameAliasMap | null | undefined,
): string {
  const trimmed = normalizeGameDisplay(String(raw ?? ""));
  if (!trimmed) return "";
  if (!aliases) return trimmed;
  const hit = aliases[normalizeGameAliasKey(trimmed)];
  return hit ? normalizeGameDisplay(hit) : trimmed;
}

/**
 * Merge raw spellings into a canonical display name.
 * Returns a new map (does not mutate). Skips identity keys.
 */
export function mergeGameAliases(
  current: GameAliasMap,
  raws: string[],
  canonicalRaw: string,
): GameAliasMap {
  const canonical = normalizeGameDisplay(canonicalRaw);
  if (!canonical) return { ...current };
  const canonKey = normalizeGameAliasKey(canonical);
  const next: GameAliasMap = { ...current };

  for (const raw of raws) {
    const key = normalizeGameAliasKey(raw);
    if (!key || key === canonKey) continue;
    next[key] = canonical;
  }

  // If anything previously aliased *to* one of the merged raws, leave those
  // alone — admins merge explicitly. Re-point keys that targeted a raw we
  // just folded only when that raw's key matches an existing alias value's key.
  for (const [k, v] of Object.entries(next)) {
    const vKey = normalizeGameAliasKey(v);
    if (raws.some((r) => normalizeGameAliasKey(r) === vKey) && vKey !== canonKey) {
      next[k] = canonical;
    }
  }

  return parseGameAliases(next);
}

export function removeGameAlias(
  current: GameAliasMap,
  aliasKeyRaw: string,
): GameAliasMap {
  const key = normalizeGameAliasKey(aliasKeyRaw);
  if (!key) return { ...current };
  const next = { ...current };
  delete next[key];
  return next;
}

export type DistinctGameRow = {
  /** Raw spelling as stored on lfg_parties.game */
  raw: string;
  parties: number;
  /** After alias resolution */
  resolved: string;
  /** True when raw key maps through an alias */
  aliased: boolean;
};

/**
 * Aggregate distinct raw game strings (for Settings hygiene UI).
 * Blank titles excluded.
 */
export function listDistinctGames(
  games: (string | null | undefined)[],
  aliases?: GameAliasMap | null,
): DistinctGameRow[] {
  const counts = new Map<string, number>();
  for (const raw of games) {
    const trimmed = normalizeGameDisplay(String(raw ?? ""));
    if (!trimmed) continue;
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([raw, parties]) => {
      const resolved = resolveGameAlias(raw, aliases);
      const aliased =
        Boolean(aliases?.[normalizeGameAliasKey(raw)]) &&
        normalizeGameAliasKey(raw) !== normalizeGameAliasKey(resolved);
      return { raw, parties, resolved, aliased };
    })
    .sort((a, b) => {
      if (b.parties !== a.parties) return b.parties - a.parties;
      return a.raw.localeCompare(b.raw);
    });
}

/**
 * Build create-suggestion labels: recent/top resolved games first, then
 * catalog names, deduped (case-insensitive). Custom text stays allowed upstream.
 */
export function buildCreateGameSuggestions(opts: {
  recentOrTop?: string[];
  catalogNames?: string[];
  aliases?: GameAliasMap | null;
  limit?: number;
}): string[] {
  const limit = opts.limit ?? 24;
  const aliases = opts.aliases ?? {};
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (labelRaw: string) => {
    const label = resolveGameAlias(labelRaw, aliases);
    if (!label) return;
    const key = normalizeGameAliasKey(label);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(label);
  };

  for (const g of opts.recentOrTop ?? []) {
    if (out.length >= limit) break;
    push(g);
  }
  for (const g of opts.catalogNames ?? []) {
    if (out.length >= limit) break;
    push(g);
  }
  return out;
}
