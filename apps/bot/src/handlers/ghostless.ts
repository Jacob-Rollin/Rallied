import type { SupabaseClient } from "@supabase/supabase-js";
import type { BotEnv } from "../lib/env.js";
import {
  interactionGuildIdentity,
  actorUser,
  avatarUrl,
  displayName,
  ephemeral,
  getOption,
  type Interaction,
} from "../lib/discord.js";
import { ephemeralEmbed, ghostlessPlayerEmbed } from "../lib/embeds.js";
import {
  reliabilityEnabled,
  resolveEffectivePlan,
  upgradeEphemeral,
} from "../lib/entitlements.js";
import {
  ghostlessBadge,
  ghostlessSubtitle,
  showRatePct,
} from "../lib/ghostless.js";
import { getServerSettings } from "../lib/settings.js";
import { ensureServerAndMember } from "../lib/supabase.js";

export async function handleGhostless(
  interaction: Interaction,
  sb: SupabaseClient | null,
  env: BotEnv,
) {
  if (!interaction.guild_id) {
    return ephemeral("Ghostless stats are per-server only — run this in a guild.");
  }
  if (!sb) return ephemeral("Database not configured.");

  const user = actorUser(interaction);
  if (!user) return ephemeral("Could not resolve your Discord user.");

  const targetId =
    String(getOption(interaction.data?.options, "user")?.value ?? "") || user.id;

  await ensureServerAndMember(
    sb,
    interaction.guild_id,
    interaction.guild?.name,
    user.id,
    displayName(interaction),
    avatarUrl(user),
    interactionGuildIdentity(interaction).iconUrl,
    env,
  );

  const { server, member: target } = await ensureServerAndMember(
    sb,
    interaction.guild_id,
    interaction.guild?.name,
    targetId,
    "member",
    null,
    interactionGuildIdentity(interaction).iconUrl,
    env,
  );

  const plan = resolveEffectivePlan(server, env, interaction.guild_id);
  if (!reliabilityEnabled(plan)) {
    return upgradeEphemeral({ env, reason: "reliability" });
  }

  const settings = await getServerSettings(sb, server.id);

  const { data: stats } = await sb
    .from("ghostless_stats")
    .select("shows, ghosts, vibe_sum, vibe_count")
    .eq("server_id", server.id)
    .eq("member_id", target.id)
    .maybeSingle();

  const { count: strikeCount } = await sb
    .from("strikes")
    .select("*", { count: "exact", head: true })
    .eq("server_id", server.id)
    .eq("member_id", target.id)
    .eq("active", true);

  const shows = stats?.shows ?? 0;
  const ghosts = stats?.ghosts ?? 0;
  const rate = showRatePct(shows, ghosts);
  const badge = ghostlessBadge(shows, ghosts, settings);
  const vibeAvg =
    stats && stats.vibe_count > 0
      ? Math.round((stats.vibe_sum / stats.vibe_count) * 100) / 100
      : null;

  const embed = ghostlessPlayerEmbed({
    displayName: target.display_name || "Member",
    mention: `<@${targetId}>`,
    shows,
    ghosts,
    showRatePct: rate,
    vibeAvg,
    strikeCount: strikeCount ?? 0,
    badge,
    subtitle: ghostlessSubtitle(shows, ghosts),
    eligibleGhostless: badge === "Ghostless",
  });

  return ephemeralEmbed(embed);
}
