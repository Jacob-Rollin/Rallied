import type { SupabaseClient } from "@supabase/supabase-js";
import type { BotEnv } from "../lib/env.js";
import { ephemeral, type Interaction } from "../lib/discord.js";
import { formatError } from "../lib/errors.js";
import { handleButton } from "./buttons.js";
import { handleDispute } from "./dispute.js";
import { handleGhostless } from "./ghostless.js";
import { handleLfg } from "./lfg.js";
import { handleStrikes } from "./strikes.js";
import { handleVibe } from "./vibe.js";

export async function routeCommand(
  interaction: Interaction,
  sb: SupabaseClient | null,
  env: BotEnv,
) {
  const name = interaction.data?.name;
  try {
    switch (name) {
      case "lfg":
        return await handleLfg(interaction, sb);
      case "vibe":
        return await handleVibe(interaction, sb, env);
      case "strikes":
        return await handleStrikes(interaction, sb);
      case "ghostless":
        return await handleGhostless(interaction, sb);
      case "dispute":
        return await handleDispute(interaction, sb);
      default:
        return ephemeral(`Unknown command: ${name ?? "?"}`);
    }
  } catch (err) {
    const msg = formatError(err);
    console.error("command error", name, msg, err);
    return ephemeral(`Something went wrong: ${msg}`);
  }
}

export async function routeComponent(
  interaction: Interaction,
  sb: SupabaseClient | null,
  env: BotEnv,
) {
  try {
    return await handleButton(interaction, sb, env);
  } catch (err) {
    const msg = formatError(err);
    console.error("component error", msg, err);
    return ephemeral(`Something went wrong: ${msg}`);
  }
}
