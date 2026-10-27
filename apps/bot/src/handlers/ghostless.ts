import type { SupabaseClient } from "@supabase/supabase-js";
import {
  actorUser,
  avatarUrl,
  displayName,
  ephemeral,
  getOption,
  type Interaction,
} from "../lib/discord.js";
import { ephemeralEmbed, ghostlessPlayerEmbed } from "../lib/embeds.js";
import { ensureServerAndMember } from "../lib/supabase.js";

export async function handleGhostless(
  interaction: Interaction,
  sb: SupabaseClient | null,
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
    undefined,
    user.id,
    displayName(interaction),
    avatarUrl(user),
  );

  const { server, member: target } = await ensureServerAndMember(
    sb,
    interaction.guild_id,
    undefined,
    targetId,
    "member",
    null,
  );

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
  const total = shows + ghosts;
  const rate = total === 0 ? null : Math.round((shows / total) * 1000) / 10;
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
  });

  return ephemeralEmbed(embed);
}
