import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isFeedbackKind,
  type FeedbackKind,
  type FeedbackSurface,
} from "@rallied/shared";
import type { BotEnv } from "../lib/env.js";
import {
  actorUser,
  displayName,
  ephemeral,
  getOption,
  type Interaction,
} from "../lib/discord.js";
import { mirrorFeedbackToOpsChannel } from "../lib/feedback-mirror.js";

/**
 * /feedback — any guild member can report a bug or suggestion.
 * Inserts into feedback_reports (service role) + optional OPS channel mirror.
 */
export async function handleFeedback(
  interaction: Interaction,
  sb: SupabaseClient | null,
  env: BotEnv,
) {
  if (!interaction.guild_id) {
    return ephemeral("Use /feedback inside a Discord server with Rallied.");
  }
  if (!sb) return ephemeral("Database not configured.");

  const user = actorUser(interaction);
  if (!user) return ephemeral("Could not resolve your Discord user.");

  const options = interaction.data?.options ?? [];
  const kindRaw = String(getOption(options, "type")?.value ?? "").trim();
  const title = String(getOption(options, "title")?.value ?? "").trim();
  const details = String(getOption(options, "details")?.value ?? "").trim();

  if (!isFeedbackKind(kindRaw)) {
    return ephemeral("Pick type: bug or suggestion.");
  }
  const kind: FeedbackKind = kindRaw;
  if (!title || title.length > 120) {
    return ephemeral("Title required (max 120 characters).");
  }
  if (!details || details.length > 1800) {
    return ephemeral("Details required (max 1800 characters).");
  }

  const surface: FeedbackSurface = "bot";
  const reporterName = displayName(interaction);
  const guildName =
    (interaction.guild?.name ?? "").trim() || null;

  const { data, error } = await sb
    .from("feedback_reports")
    .insert({
      kind,
      surface,
      status: "new",
      title,
      details,
      reporter_discord_user_id: user.id,
      reporter_display_name: reporterName,
      discord_guild_id: interaction.guild_id,
      guild_name: guildName,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    console.error("[feedback] insert failed", error);
    return ephemeral(
      `Could not save your report: ${error?.message ?? "unknown error"}`,
    );
  }

  const reportId = data.id as string;

  // Fail open — reporter already stored.
  await mirrorFeedbackToOpsChannel(env, {
    id: reportId,
    kind,
    surface,
    title,
    details,
    reporterDisplayName: reporterName,
    reporterDiscordUserId: user.id,
    guildName,
    discordGuildId: interaction.guild_id,
  });

  const kindLabel = kind === "bug" ? "Bug" : "Suggestion";
  return ephemeral(
    `${kindLabel} received — thanks. The Rallied team will triage it. (id \`${reportId.slice(0, 8)}…\`)`,
  );
}
