import type { SupabaseClient } from "@supabase/supabase-js";
import type { BotEnv } from "../lib/env.js";
import {
  actorUser,
  displayName,
  ephemeral,
  type Interaction,
} from "../lib/discord.js";
import { openDisputeFromButton } from "./dispute.js";
import { recordVibe } from "./vibe.js";
import { ensureServerAndMember } from "../lib/supabase.js";

/**
 * custom_id formats:
 *   vibe:showed|good|ghosted:<partyId>:<rateeMemberId>
 *   dispute:open:<partyId>:<rateeMemberId>
 */
export async function handleButton(
  interaction: Interaction,
  sb: SupabaseClient | null,
  env: BotEnv,
) {
  const customId = interaction.data?.custom_id;
  if (!customId) return ephemeral("Unknown button.");
  if (!interaction.guild_id) return ephemeral("Guild only.");
  if (!sb) return ephemeral("Database not configured.");

  const user = actorUser(interaction);
  if (!user) return ephemeral("Could not resolve user.");

  const parts = customId.split(":");
  const [ns, action, partyId, rateeMemberId] = parts;

  if (ns === "dispute" && action === "open") {
    return openDisputeFromButton(sb, {
      guildId: interaction.guild_id,
      openerDiscordId: user.id,
      openerName: displayName(interaction),
      partyId: partyId!,
      rateeMemberId: rateeMemberId!,
    });
  }

  if (ns === "vibe" && partyId && rateeMemberId) {
    const { server, member: rater } = await ensureServerAndMember(
      sb,
      interaction.guild_id,
      undefined,
      user.id,
      displayName(interaction),
      null,
    );

    const showedUp = action === "showed" || action === "good";
    const ghosted = action === "ghosted";
    const vibeScore = action === "good" ? 5 : action === "showed" ? 4 : null;

    // Resolve ratee's discord id for role assign
    const { data: ratee } = await sb
      .from("members")
      .select("discord_user_id")
      .eq("id", rateeMemberId)
      .maybeSingle();

    return recordVibe({
      sb,
      env,
      guildId: interaction.guild_id,
      serverId: server.id,
      partyId,
      raterId: rater.id,
      rateeId: rateeMemberId,
      rateeDiscordId: ratee?.discord_user_id ?? rateeMemberId,
      showedUp,
      vibeScore,
      ghosted,
      note: `button:${action}`,
    });
  }

  return ephemeral(`Unhandled button: ${customId}`);
}
