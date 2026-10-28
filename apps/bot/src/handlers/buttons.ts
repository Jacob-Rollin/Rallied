import type { SupabaseClient } from "@supabase/supabase-js";
import type { BotEnv } from "../lib/env.js";
import {
  actorUser,
  displayName,
  ephemeral,
  InteractionResponseType,
  type Interaction,
} from "../lib/discord.js";
import { vibeCheckMessage, vibePickMemberMessage } from "../lib/embeds.js";
import { openDisputeFromButton } from "./dispute.js";
import {
  closePartyById,
  handleFindGameSelect,
  handleLfgDeskComponent,
  joinParty,
  leaveParty,
  promptCloseParty,
} from "./lfg.js";
import { recordVibe } from "./vibe.js";
import { ensureServerAndMember } from "../lib/supabase.js";

/**
 * custom_id formats:
 *   vibe:showed|good|ghosted:<partyId>:<rateeMemberId>
 *   vibe:score:<partyId>:<rateeMemberId>  (+ values[0] = 1–5)
 *   vibe:pick:<partyId>                   (+ values[0] = ratee member id)
 *   dispute:open:<partyId>:<rateeMemberId>
 *   lfg:join|leave|close|vibe:<partyId>
 *   lfg:closeconfirm|closecancel:<partyId>
 *   lfg:joinselect                        (+ values[0] = party id)
 *   lfg:desk:create|find|mine|help
 *   lfg:creategame / lfg:findgame
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
  const selected = interaction.data?.values?.[0];
  const messageFallback = interaction.message
    ? {
        channelId: interaction.message.channel_id ?? interaction.channel_id,
        messageId: interaction.message.id,
      }
    : interaction.channel_id
      ? { channelId: interaction.channel_id }
      : undefined;

  if (ns === "lfg") {
    if (action === "desk") {
      const desk = await handleLfgDeskComponent(interaction, sb, partyId ?? "");
      if (desk) return desk;
    }

    if (action === "findgame" && selected) {
      return handleFindGameSelect(interaction, sb, selected);
    }

    if (action === "joinselect" && selected) {
      return joinParty({
        sb,
        env,
        guildId: interaction.guild_id,
        partyId: selected,
        discordUserId: user.id,
        displayName: displayName(interaction),
        avatarUrl: null,
        messageFallback,
      });
    }

    if (action === "join" && partyId) {
      return joinParty({
        sb,
        env,
        guildId: interaction.guild_id,
        partyId,
        discordUserId: user.id,
        displayName: displayName(interaction),
        avatarUrl: null,
        messageFallback,
      });
    }

    if (action === "leave" && partyId) {
      return leaveParty({
        sb,
        env,
        guildId: interaction.guild_id,
        partyId,
        discordUserId: user.id,
        displayName: displayName(interaction),
        messageFallback,
      });
    }

    if (action === "close" && partyId) {
      return promptCloseParty({
        sb,
        guildId: interaction.guild_id,
        partyId,
        discordUserId: user.id,
        displayName: displayName(interaction),
      });
    }

    if (action === "closeconfirm" && partyId) {
      return closePartyById({
        sb,
        env,
        guildId: interaction.guild_id,
        partyId,
        discordUserId: user.id,
        displayName: displayName(interaction),
        messageFallback,
      });
    }

    if (action === "closecancel" && partyId) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "Close cancelled — party still open.",
          components: [],
          flags: 64,
        },
      };
    }

    if (action === "vibe" && partyId) {
      return startPartyVibePick(sb, interaction, partyId, user.id);
    }
  }

  if (ns === "dispute" && action === "open") {
    return openDisputeFromButton(sb, {
      guildId: interaction.guild_id,
      openerDiscordId: user.id,
      openerName: displayName(interaction),
      partyId: partyId!,
      rateeMemberId: rateeMemberId!,
    });
  }

  if (ns === "vibe" && action === "pick" && partyId && selected) {
    const { data: ratee } = await sb
      .from("members")
      .select("id, discord_user_id, display_name")
      .eq("id", selected)
      .maybeSingle();

    if (!ratee) return ephemeral("Member not found.");

    const payload = vibeCheckMessage({
      rateeMention: `<@${ratee.discord_user_id}>`,
      partyId,
      rateeMemberId: ratee.id,
    });

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { ...payload, flags: 64 },
    };
  }

  if (ns === "vibe" && action === "score" && partyId && rateeMemberId && selected) {
    const score = Number(selected);
    if (!Number.isFinite(score) || score < 1 || score > 5) {
      return ephemeral("Pick a vibe score from 1–5.");
    }

    const { server, member: rater } = await ensureServerAndMember(
      sb,
      interaction.guild_id,
      undefined,
      user.id,
      displayName(interaction),
      null,
    );

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
      showedUp: true,
      vibeScore: score,
      ghosted: false,
      note: `select:score:${score}`,
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

async function startPartyVibePick(
  sb: SupabaseClient,
  interaction: Interaction,
  partyId: string,
  actorDiscordId: string,
) {
  if (!interaction.guild_id) return ephemeral("Guild only.");

  const { server, member: actor } = await ensureServerAndMember(
    sb,
    interaction.guild_id,
    undefined,
    actorDiscordId,
    displayName(interaction),
    null,
  );

  const { data: party } = await sb
    .from("lfg_parties")
    .select("id, server_id")
    .eq("id", partyId)
    .eq("server_id", server.id)
    .maybeSingle();

  if (!party) return ephemeral("Party not found in this server.");

  const { data: rows } = await sb
    .from("lfg_party_members")
    .select("member_id, member:members!inner(id, discord_user_id, display_name)")
    .eq("party_id", partyId);

  const members = (rows ?? [])
    .map((row) => {
      const m = row.member as unknown as {
        id: string;
        discord_user_id: string;
        display_name: string;
      };
      return {
        memberId: m.id,
        label: m.display_name || m.discord_user_id,
        discordUserId: m.discord_user_id,
      };
    })
    .filter((m) => m.memberId !== actor.id);

  if (!members.length) {
    return ephemeral("No other party members to vibe-check yet.");
  }

  const payload = vibePickMemberMessage({ partyId, members });
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: payload,
  };
}
