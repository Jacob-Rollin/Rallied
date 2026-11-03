import { autocompleteGames } from "@rallied/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  InteractionResponseType,
  type CommandOption,
  type Interaction,
  type InteractionResponse,
} from "../lib/discord.js";
import type { BotEnv } from "../lib/env.js";
import { loadGuildGameSuggestionContext } from "../lib/game-suggestions.js";
import { createServiceClient } from "../lib/supabase.js";

/** Walk nested options (subcommand → option) for the focused autocomplete field. */
function findFocusedOption(
  options: CommandOption[] | undefined,
): CommandOption | undefined {
  if (!options?.length) return undefined;
  for (const opt of options) {
    if (opt.focused) return opt;
    const nested = findFocusedOption(opt.options);
    if (nested) return nested;
  }
  return undefined;
}

async function serverSuggestionsForGuild(
  sb: SupabaseClient | null,
  guildId: string | undefined,
): Promise<string[] | undefined> {
  if (!sb || !guildId) return undefined;
  try {
    const { data: server } = await sb
      .from("servers")
      .select("id")
      .eq("discord_guild_id", guildId)
      .maybeSingle();
    if (!server?.id) return undefined;
    const { suggestions } = await loadGuildGameSuggestionContext(
      sb,
      String(server.id),
      { suggestionLimit: 15 },
    );
    return suggestions;
  } catch (err) {
    console.error("autocomplete server suggestions failed", err);
    return undefined;
  }
}

/**
 * APPLICATION_COMMAND_AUTOCOMPLETE must reply within 3s — never defer.
 * Includes this guild's recent/top resolved games when Supabase is available.
 */
export async function handleAutocomplete(
  interaction: Interaction,
  env: BotEnv,
): Promise<InteractionResponse> {
  const focused = findFocusedOption(interaction.data?.options);
  const name = focused?.name ?? "";
  const value = focused?.value != null ? String(focused.value) : "";

  if (name === "game") {
    const sb = createServiceClient(env);
    const serverSuggestions = await serverSuggestionsForGuild(
      sb,
      interaction.guild_id,
    );
    return {
      type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
      data: {
        choices: autocompleteGames(value, { serverSuggestions }),
      },
    };
  }

  return {
    type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
    data: { choices: [] },
  };
}
