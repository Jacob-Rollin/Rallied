import { autocompleteGames } from "@rallied/shared";
import {
  InteractionResponseType,
  type CommandOption,
  type Interaction,
  type InteractionResponse,
} from "../lib/discord.js";

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

/**
 * APPLICATION_COMMAND_AUTOCOMPLETE must reply within 3s — never defer.
 * Currently only game string options use autocomplete.
 */
export function handleAutocomplete(interaction: Interaction): InteractionResponse {
  const focused = findFocusedOption(interaction.data?.options);
  const name = focused?.name ?? "";
  const value = focused?.value != null ? String(focused.value) : "";

  if (name === "game") {
    return {
      type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
      data: {
        choices: autocompleteGames(value),
      },
    };
  }

  return {
    type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
    data: { choices: [] },
  };
}
