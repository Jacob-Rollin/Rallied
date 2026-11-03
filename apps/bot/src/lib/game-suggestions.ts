import type { SupabaseClient } from "@supabase/supabase-js";
import {
  GAME_CATALOG,
  buildCreateGameSuggestions,
  parseGameAliases,
  rankTopGames,
  type GameAliasMap,
} from "@rallied/shared";

/** Load per-guild aliases + recent/top resolved titles for create suggestions. */
export async function loadGuildGameSuggestionContext(
  sb: SupabaseClient,
  serverId: string,
  opts?: { partyLimit?: number; suggestionLimit?: number },
): Promise<{
  aliases: GameAliasMap;
  suggestions: string[];
}> {
  const partyLimit = opts?.partyLimit ?? 200;
  const suggestionLimit = opts?.suggestionLimit ?? 24;

  const [{ data: settingsRow }, { data: parties }] = await Promise.all([
    sb
      .from("server_settings")
      .select("game_aliases")
      .eq("server_id", serverId)
      .maybeSingle(),
    sb
      .from("lfg_parties")
      .select("game, created_at")
      .eq("server_id", serverId)
      .order("created_at", { ascending: false })
      .limit(partyLimit),
  ]);

  const aliases = parseGameAliases(settingsRow?.game_aliases);
  const games = ((parties ?? []) as { game?: string | null }[]).map(
    (p) => p.game,
  );
  const top = rankTopGames(games, { limit: 12, aliases }).map((g) => g.game);
  // Prefer recent uniques (first-seen in newest-first list) then top ranks.
  const recent: string[] = [];
  const seen = new Set<string>();
  for (const raw of games) {
    if (raw == null) continue;
    const t = String(raw).trim().replace(/\s+/g, " ");
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recent.push(t);
    if (recent.length >= 12) break;
  }

  const suggestions = buildCreateGameSuggestions({
    recentOrTop: [...recent, ...top],
    catalogNames: GAME_CATALOG.map((g) => g.name),
    aliases,
    limit: suggestionLimit,
  });

  return { aliases, suggestions };
}
