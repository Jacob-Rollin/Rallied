import type { SupabaseClient } from "@supabase/supabase-js";
import type { BotEnv } from "../lib/env.js";
import {
  actorUser,
  avatarUrl,
  displayName,
  ephemeral,
  getOption,
  InteractionResponseType,
  type Interaction,
} from "../lib/discord.js";
import { vibeCheckMessage } from "../lib/embeds.js";
import { maybeAssignGhostlessRole } from "../lib/roles.js";
import { getServerSettings, withinGraceWindow } from "../lib/settings.js";
import { ensureServerAndMember } from "../lib/supabase.js";

/** Slash `/vibe` — either submits directly or posts a button message when only user given. */
export async function handleVibe(
  interaction: Interaction,
  sb: SupabaseClient | null,
  env?: BotEnv,
) {
  if (!interaction.guild_id) {
    return ephemeral("Vibe Check only works inside a Discord server.");
  }
  if (!sb) {
    return ephemeral("Database not configured.");
  }

  const user = actorUser(interaction);
  if (!user) return ephemeral("Could not resolve your Discord user.");

  const options = interaction.data?.options ?? [];
  const targetId = String(getOption(options, "user")?.value ?? "");
  const showedOpt = getOption(options, "showed_up");
  const partyIdOpt = getOption(options, "party_id")?.value as string | undefined;

  if (!targetId) return ephemeral("Pick a user to rate.");
  if (targetId === user.id) return ephemeral("You can't vibe-check yourself.");

  const { server, member: rater } = await ensureServerAndMember(
    sb,
    interaction.guild_id,
    undefined,
    user.id,
    displayName(interaction),
    avatarUrl(user),
  );

  const { member: ratee } = await ensureServerAndMember(
    sb,
    interaction.guild_id,
    undefined,
    targetId,
    "member",
    null,
  );

  let partyId = partyIdOpt;
  if (!partyId) {
    const { data: recent } = await sb
      .from("lfg_party_members")
      .select("party_id, party:lfg_parties!inner(id, server_id, status)")
      .eq("member_id", rater.id)
      .limit(20);

    const candidate = (recent ?? []).find((row) => {
      const party = row.party as unknown as { server_id: string };
      return party?.server_id === server.id;
    });
    partyId = candidate?.party_id;
  }

  if (!partyId) {
    return ephemeral("No party found. Pass `party_id` from `/lfg create`.");
  }

  // If no showed_up flag, post interactive Vibe Check buttons instead
  if (showedOpt === undefined) {
    const payload = vibeCheckMessage({
      rateeMention: `<@${targetId}>`,
      partyId,
      rateeMemberId: ratee.id,
    });
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: payload,
    };
  }

  const showedUp = Boolean(showedOpt.value);
  const scoreRaw = getOption(options, "score")?.value;
  const vibeScore = scoreRaw === undefined ? null : Number(scoreRaw);
  let ghosted = Boolean(getOption(options, "ghosted")?.value ?? !showedUp);
  const note = (getOption(options, "note")?.value as string | undefined) ?? null;

  // Grace window: if party filled recently, don't count as ghost for strike path
  const settings = await getServerSettings(sb, server.id);
  const { data: party } = await sb
    .from("lfg_parties")
    .select("updated_at, created_at")
    .eq("id", partyId)
    .maybeSingle();
  if (party && ghosted) {
    const start = new Date(party.updated_at || party.created_at).getTime();
    const minutesLate = (Date.now() - start) / 60000;
    if (withinGraceWindow(minutesLate, settings.grace_minutes)) {
      ghosted = false;
    }
  }

  return recordVibe({
    sb,
    env,
    guildId: interaction.guild_id,
    serverId: server.id,
    partyId,
    raterId: rater.id,
    rateeId: ratee.id,
    rateeDiscordId: targetId,
    showedUp,
    vibeScore,
    ghosted,
    note,
  });
}

export async function recordVibe(opts: {
  sb: SupabaseClient;
  env?: BotEnv;
  guildId: string;
  serverId: string;
  partyId: string;
  raterId: string;
  rateeId: string;
  rateeDiscordId: string;
  showedUp: boolean;
  vibeScore: number | null;
  ghosted: boolean;
  note: string | null;
}) {
  const { sb, env } = opts;
  const { error } = await sb.from("vibe_checks").upsert(
    {
      party_id: opts.partyId,
      rater_id: opts.raterId,
      ratee_id: opts.rateeId,
      showed_up: opts.showedUp,
      vibe_score: opts.vibeScore,
      ghosted: opts.ghosted,
      note: opts.note,
    },
    { onConflict: "party_id,rater_id,ratee_id" },
  );

  if (error) return ephemeral(`Could not save vibe: ${error.message}`);

  const { data: stats } = await sb
    .from("ghostless_stats")
    .select("*")
    .eq("server_id", opts.serverId)
    .eq("member_id", opts.rateeId)
    .maybeSingle();

  const shows = (stats?.shows ?? 0) + (opts.showedUp ? 1 : 0);
  const ghosts = (stats?.ghosts ?? 0) + (opts.ghosted ? 1 : 0);
  const vibe_sum = (stats?.vibe_sum ?? 0) + (opts.vibeScore ?? 0);
  const vibe_count = (stats?.vibe_count ?? 0) + (opts.vibeScore != null ? 1 : 0);

  await sb.from("ghostless_stats").upsert(
    {
      server_id: opts.serverId,
      member_id: opts.rateeId,
      shows,
      ghosts,
      vibe_sum,
      vibe_count,
    },
    { onConflict: "server_id,member_id" },
  );

  if (env) {
    await maybeAssignGhostlessRole(env, sb, {
      serverId: opts.serverId,
      guildId: opts.guildId,
      discordUserId: opts.rateeDiscordId,
      shows,
      ghosts,
    });
  }

  return ephemeral(
    `Vibe Check saved for <@${opts.rateeDiscordId}> (this server). showed_up=${opts.showedUp} ghosted=${opts.ghosted}${opts.vibeScore != null ? ` score=${opts.vibeScore}` : ""}`,
  );
}
