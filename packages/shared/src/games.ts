/** Curated multiplayer catalog + normalize/autocomplete helpers for Discord LFG. */

import {
  normalizeGameAliasKey,
  resolveGameAlias,
  type GameAliasMap,
} from "./game-aliases";

export type GameEntry = {
  /** Stable id for matching (not stored in DB — we store `name`). */
  slug: string;
  /** Canonical display name stored on parties. */
  name: string;
  /** Short aliases users type (val, lol, cod…). */
  aliases: string[];
};

/**
 * Popular multiplayer titles. Keep aliases lowercase; names are canonical.
 * Discord autocomplete returns at most 25 choices — filter with `autocompleteGames`.
 */
export const GAME_CATALOG: readonly GameEntry[] = [
  { slug: "valorant", name: "Valorant", aliases: ["val", "valo"] },
  {
    slug: "league-of-legends",
    name: "League of Legends",
    aliases: ["lol", "league", "wildrift"],
  },
  {
    slug: "call-of-duty",
    name: "Call of Duty",
    aliases: ["cod", "warzone", "mw3", "bo6"],
  },
  {
    slug: "overwatch-2",
    name: "Overwatch 2",
    aliases: ["ow", "ow2", "overwatch"],
  },
  {
    slug: "rainbow-six-siege",
    name: "Rainbow Six Siege",
    aliases: ["r6", "siege", "rainbow"],
  },
  {
    slug: "counter-strike-2",
    name: "Counter-Strike 2",
    aliases: ["cs2", "cs", "csgo", "counterstrike"],
  },
  { slug: "fortnite", name: "Fortnite", aliases: ["fn", "fort"] },
  { slug: "apex-legends", name: "Apex Legends", aliases: ["apex"] },
  {
    slug: "rocket-league",
    name: "Rocket League",
    aliases: ["rl", "rocket"],
  },
  {
    slug: "minecraft",
    name: "Minecraft",
    aliases: ["mc", "mine"],
  },
  { slug: "roblox", name: "Roblox", aliases: ["rbx"] },
  {
    slug: "destiny-2",
    name: "Destiny 2",
    aliases: ["d2", "destiny"],
  },
  {
    slug: "final-fantasy-xiv",
    name: "Final Fantasy XIV",
    aliases: ["ffxiv", "ff14", "xiv"],
  },
  {
    slug: "world-of-warcraft",
    name: "World of Warcraft",
    aliases: ["wow", "warcraft"],
  },
  { slug: "dota-2", name: "Dota 2", aliases: ["dota"] },
  {
    slug: "team-fight-tactics",
    name: "Teamfight Tactics",
    aliases: ["tft"],
  },
  {
    slug: "hearthstone",
    name: "Hearthstone",
    aliases: ["hs"],
  },
  {
    slug: "dead-by-daylight",
    name: "Dead by Daylight",
    aliases: ["dbd"],
  },
  {
    slug: "helldivers-2",
    name: "Helldivers 2",
    aliases: ["hd2", "helldivers"],
  },
  {
    slug: "marvel-rivals",
    name: "Marvel Rivals",
    aliases: ["rivals", "mr"],
  },
  {
    slug: "the-finals",
    name: "THE FINALS",
    aliases: ["finals"],
  },
  {
    slug: "escape-from-tarkov",
    name: "Escape from Tarkov",
    aliases: ["eft", "tarkov"],
  },
  {
    slug: "sea-of-thieves",
    name: "Sea of Thieves",
    aliases: ["sot"],
  },
  {
    slug: "gta-online",
    name: "GTA Online",
    aliases: ["gta", "gta5", "gtav"],
  },
  {
    slug: "splitgate-2",
    name: "Splitgate 2",
    aliases: ["splitgate", "sg2"],
  },
  {
    slug: "smite-2",
    name: "Smite 2",
    aliases: ["smite"],
  },
  {
    slug: "diablo-iv",
    name: "Diablo IV",
    aliases: ["d4", "diablo"],
  },
  {
    slug: "path-of-exile-2",
    name: "Path of Exile 2",
    aliases: ["poe2", "poe"],
  },
  {
    slug: "osu",
    name: "osu!",
    aliases: ["osu"],
  },
] as const;

const DISCORD_AUTOCOMPLETE_MAX = 25;

function normalizeKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[!']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function entryKeys(entry: GameEntry): string[] {
  return [entry.slug, entry.name, ...entry.aliases].map(normalizeKey);
}

/** Exact match on slug, canonical name, or alias → catalog entry. */
export function findGameEntry(input: string): GameEntry | undefined {
  const key = normalizeKey(input);
  if (!key) return undefined;
  return GAME_CATALOG.find((entry) => entryKeys(entry).includes(key));
}

/**
 * Map free text / alias to a canonical party `game` string.
 * Catalog hits become `entry.name`; otherwise trimmed free text (niche / Other).
 */
export function normalizeGame(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  const hit = findGameEntry(trimmed);
  return hit ? hit.name : trimmed;
}

/**
 * Catalog normalize, then per-server aliases (new creates only — does not
 * rewrite historical rows). Custom text still allowed when neither hits.
 */
export function normalizeGameWithAliases(
  input: string,
  aliases?: GameAliasMap | null,
): string {
  const catalog = normalizeGame(input);
  if (!catalog) return catalog;
  if (!aliases || Object.keys(aliases).length === 0) return catalog;
  // Prefer alias on the raw input (misspellings) then on catalog result.
  const fromRaw = resolveGameAlias(input, aliases);
  if (
    fromRaw &&
    normalizeGameAliasKey(fromRaw) !== normalizeGameAliasKey(String(input ?? "").trim())
  ) {
    return fromRaw;
  }
  return resolveGameAlias(catalog, aliases);
}

/** True when two game strings refer to the same title after normalize. */
export function gamesMatch(a: string, b: string): boolean {
  const na = normalizeGame(a);
  const nb = normalizeGame(b);
  if (!na || !nb) return false;
  if (normalizeKey(na) === normalizeKey(nb)) return true;
  const ea = findGameEntry(a);
  const eb = findGameEntry(b);
  return Boolean(ea && eb && ea.slug === eb.slug);
}

export type AutocompleteChoice = { name: string; value: string };

/**
 * Discord APPLICATION_COMMAND_AUTOCOMPLETE choices (≤25).
 * Prefers optional server recent/top resolved titles, then catalog.
 * Filters by typed prefix against name / slug / aliases.
 * If the typed string isn't an exact catalog hit, appends an Other choice
 * so niche games stay allowed (not a locked enum).
 */
export function autocompleteGames(
  focusedRaw: string,
  opts?: { serverSuggestions?: string[] },
): AutocompleteChoice[] {
  const focused = focusedRaw.trim();
  const key = normalizeKey(focused);
  const choices: AutocompleteChoice[] = [];
  const seen = new Set<string>();

  const pushChoice = (name: string, value: string) => {
    const v = value.trim().slice(0, 100);
    if (!v) return;
    const sk = normalizeKey(v);
    if (seen.has(sk)) return;
    seen.add(sk);
    choices.push({ name: name.slice(0, 100), value: v });
  };

  const serverPool = opts?.serverSuggestions ?? [];
  if (!key) {
    for (const s of serverPool) {
      if (choices.length >= DISCORD_AUTOCOMPLETE_MAX) break;
      pushChoice(s, s);
    }
  } else {
    const short = key.length <= 3;
    for (const s of serverPool) {
      if (choices.length >= DISCORD_AUTOCOMPLETE_MAX) break;
      const nk = normalizeKey(s);
      if (short ? nk.startsWith(key) : nk.startsWith(key) || nk.includes(key)) {
        pushChoice(s, s);
      }
    }
  }

  let matches: GameEntry[];
  if (!key) {
    matches = [...GAME_CATALOG];
  } else {
    // Short queries (val, lol): prefix-only so "val" ≠ substring of "rivals".
    // Longer queries may match a word/substring inside the canonical name.
    const short = key.length <= 3;
    matches = GAME_CATALOG.filter((entry) =>
      entryKeys(entry).some((k) =>
        short ? k.startsWith(key) : k.startsWith(key) || k.includes(key),
      ),
    );
    matches.sort((a, b) => {
      const aPrefix = entryKeys(a).some((k) => k.startsWith(key)) ? 0 : 1;
      const bPrefix = entryKeys(b).some((k) => k.startsWith(key)) ? 0 : 1;
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;
      return a.name.localeCompare(b.name);
    });
  }

  const exact = focused ? findGameEntry(focused) : undefined;

  for (const entry of matches) {
    if (choices.length >= DISCORD_AUTOCOMPLETE_MAX) break;
    pushChoice(entry.name, entry.name);
  }

  if (focused && !exact) {
    const otherLabel =
      focused.length > 90 ? `Other: ${focused.slice(0, 87)}…` : `Other: ${focused}`;
    const otherValue = focused.slice(0, 100);
    const otherKey = normalizeKey(otherValue);
    if (!seen.has(otherKey)) {
      if (choices.length >= DISCORD_AUTOCOMPLETE_MAX) {
        choices[DISCORD_AUTOCOMPLETE_MAX - 1] = {
          name: otherLabel,
          value: otherValue,
        };
      } else {
        choices.push({ name: otherLabel, value: otherValue });
      }
    }
  }

  return choices.slice(0, DISCORD_AUTOCOMPLETE_MAX);
}
