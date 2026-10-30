import type { SupabaseClient } from "@supabase/supabase-js";
import type { BotEnv } from "../lib/env.js";
import {
  actorUser,
  avatarUrl,
  displayName,
  ephemeral,
  type Interaction,
} from "../lib/discord.js";
import { ephemeralEmbed, leaderboardEmbed } from "../lib/embeds.js";
import {
  reliabilityEnabled,
  resolveEffectivePlan,
  upgradeEphemeral,
} from "../lib/entitlements.js";
import { loadServerLeaderboard } from "../lib/leaderboard.js";
import { ensureServerAndMember } from "../lib/supabase.js";

export async function handleLeaderboard(
  interaction: Interaction,
  sb: SupabaseClient | null,
  env: BotEnv,
) {
  if (!interaction.guild_id) {
    return ephemeral("Leaderboards are per-server — run this in a guild.");
  }
  if (!sb) return ephemeral("Database not configured.");

  const user = actorUser(interaction);
  if (!user) return ephemeral("Could not resolve your Discord user.");

  const { server } = await ensureServerAndMember(
    sb,
    interaction.guild_id,
    undefined,
    user.id,
    displayName(interaction),
    avatarUrl(user),
    null,
    env,
  );

  const plan = resolveEffectivePlan(server, env, interaction.guild_id);
  if (!reliabilityEnabled(plan)) {
    return upgradeEphemeral({ env, reason: "reliability" });
  }

  const board = await loadServerLeaderboard(sb, server.id);
  return ephemeralEmbed(
    leaderboardEmbed({
      serverName: server.name || "This server",
      monthLabel: board.monthLabel,
      mostReliable: board.mostReliable,
      topHosts: board.topHosts,
    }),
  );
}

/** Desk button → same board (ephemeral). */
export async function showLeaderboardForGuild(opts: {
  sb: SupabaseClient;
  env: BotEnv;
  guildId: string;
  discordUserId: string;
  displayName: string;
  avatarUrl: string | null;
}) {
  const { server } = await ensureServerAndMember(
    opts.sb,
    opts.guildId,
    undefined,
    opts.discordUserId,
    opts.displayName,
    opts.avatarUrl,
    null,
    opts.env,
  );
  const plan = resolveEffectivePlan(server, opts.env, opts.guildId);
  if (!reliabilityEnabled(plan)) {
    return upgradeEphemeral({ env: opts.env, reason: "reliability" });
  }
  const board = await loadServerLeaderboard(opts.sb, server.id);
  return ephemeralEmbed(
    leaderboardEmbed({
      serverName: server.name || "This server",
      monthLabel: board.monthLabel,
      mostReliable: board.mostReliable,
      topHosts: board.topHosts,
    }),
  );
}
