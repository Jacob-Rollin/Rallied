import type { SupabaseClient } from "@supabase/supabase-js";
import { discordAppId, type BotEnv } from "./env.js";
import {
  EPHEMERAL_FLAG,
  InteractionResponseType,
  InteractionType,
  type Interaction,
  type InteractionMessageData,
  type InteractionResponse,
} from "./discord.js";
import { lfgDeskPinHintMessage, lfgVibeNudgeMessage } from "./embeds.js";
import {
  persistPartyMessageIds,
  refreshPartyCard,
  startPartyThread,
  type PartyCardState,
} from "./party-message.js";
import { createServiceClient } from "./supabase.js";
import { startReadyCheck } from "../handlers/ready-check.js";

const API = "https://discord.com/api/v10";

function webhookBase(env: BotEnv, interaction: Interaction): string {
  const appId = discordAppId(env);
  return `${API}/webhooks/${appId}/${interaction.token}`;
}

/**
 * Components that should replace their own message (type 6) instead of
 * stacking a new ephemeral. Never use for desk buttons on the pinned panel
 * or Join/Leave/Vibe on public party cards — those need a fresh ephemeral.
 */
export function shouldUpdateComponentMessage(interaction: Interaction): boolean {
  if (interaction.type !== InteractionType.MESSAGE_COMPONENT) return false;
  const id = interaction.data?.custom_id ?? "";
  // findgame uses a fresh ephemeral (type 5) — type 6 update was flaky on mobile
  // after the sync Find picker and showed "This interaction failed".
  return (
    id === "lfg:joinselect" ||
    id.startsWith("lfg:closeconfirm:") ||
    id.startsWith("lfg:closecancel:")
  );
}

/** Whether the deferred ACK should be ephemeral (must match final visibility). */
export function shouldDeferEphemeral(interaction: Interaction): boolean {
  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    if (shouldUpdateComponentMessage(interaction)) return false;
    return true;
  }

  if (interaction.type === InteractionType.MODAL_SUBMIT) {
    const customId = interaction.data?.custom_id ?? "";
    if (customId.startsWith("lfg:createsubmit:")) return false;
    return true;
  }

  const name = interaction.data?.name;
  if (name === "lfg") {
    const sub = interaction.data?.options?.[0]?.name;
    // create / desk post public; close now shows ephemeral confirm
    if (sub === "create" || sub === "desk") return false;
    return true;
  }

  if (name === "setup") {
    return false;
  }

  if (name === "vibe") {
    const showed = interaction.data?.options?.find((o) => o.name === "showed_up");
    if (showed === undefined) return false;
    return true;
  }

  return true;
}

/** Immediate Discord ACK within the 3s window. */
export function deferredAck(interaction: Interaction): InteractionResponse {
  if (shouldUpdateComponentMessage(interaction)) {
    return { type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE };
  }

  const ephemeral = shouldDeferEphemeral(interaction);
  const data = ephemeral ? { flags: EPHEMERAL_FLAG } : undefined;

  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data,
  };
}

export async function editOriginalResponse(
  env: BotEnv,
  interaction: Interaction,
  data: InteractionMessageData,
): Promise<{ id: string; channel_id?: string } | null> {
  const url = `${webhookBase(env, interaction)}/messages/@original`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    console.error(
      "editOriginalResponse failed",
      res.status,
      await res.text().catch(() => ""),
    );
    return null;
  }
  try {
    const json = (await res.json()) as { id?: string; channel_id?: string };
    return json.id ? { id: json.id, channel_id: json.channel_id } : null;
  } catch {
    return null;
  }
}

export async function createFollowupMessage(
  env: BotEnv,
  interaction: Interaction,
  data: InteractionMessageData,
): Promise<boolean> {
  const url = webhookBase(env, interaction);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    console.error(
      "createFollowupMessage failed",
      res.status,
      await res.text().catch(() => ""),
    );
    return false;
  }
  return true;
}

export async function deleteOriginalResponse(
  env: BotEnv,
  interaction: Interaction,
): Promise<void> {
  const url = `${webhookBase(env, interaction)}/messages/@original`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    console.error(
      "deleteOriginalResponse failed",
      res.status,
      await res.text().catch(() => ""),
    );
  }
}

function isEphemeralData(data: InteractionMessageData | undefined): boolean {
  return Boolean(data?.flags && (data.flags & EPHEMERAL_FLAG) === EPHEMERAL_FLAG);
}

async function postChannelMessage(
  env: BotEnv,
  channelId: string,
  data: InteractionMessageData,
): Promise<{ id: string } | null> {
  if (!env.DISCORD_BOT_TOKEN) {
    console.error("postChannelMessage: DISCORD_BOT_TOKEN missing");
    return null;
  }
  const { flags: _f, ...body } = data;
  const res = await fetch(`${API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(
      "postChannelMessage failed",
      res.status,
      await res.text().catch(() => ""),
    );
    return null;
  }
  try {
    const json = (await res.json()) as { id?: string };
    return json.id ? { id: json.id } : null;
  } catch {
    return null;
  }
}

async function afterPartyPosted(
  env: BotEnv,
  sb: SupabaseClient,
  partyId: string,
  channelId: string,
  messageId: string,
  guildId?: string | null,
): Promise<void> {
  type PostedPartyRow = {
    id: string;
    game: string;
    rank_text: string;
    mic?: string | null;
    region?: string | null;
    slots: number;
    status: string;
    host_member_id: string;
    discord_message_id: string | null;
    discord_channel_id: string | null;
    discord_thread_id?: string | null;
    discord_voice_channel_id?: string | null;
    scheduled_start_at?: string | null;
  };

  let party: PostedPartyRow | null = null;
  let partyErr: { message?: string } | null = null;

  {
    const res = await sb
      .from("lfg_parties")
      .select(
        "id, game, rank_text, mic, region, slots, status, host_member_id, discord_message_id, discord_channel_id, discord_thread_id, discord_voice_channel_id, scheduled_start_at",
      )
      .eq("id", partyId)
      .maybeSingle();
    party = (res.data as PostedPartyRow | null) ?? null;
    partyErr = res.error;
  }

  if (
    partyErr &&
    /mic|region|discord_voice_channel_id|scheduled_start_at/i.test(
      partyErr.message ?? "",
    )
  ) {
    const res = await sb
      .from("lfg_parties")
      .select(
        "id, game, rank_text, slots, status, host_member_id, discord_message_id, discord_channel_id, discord_thread_id",
      )
      .eq("id", partyId)
      .maybeSingle();
    party = (res.data as PostedPartyRow | null) ?? null;
  }

  if (!party) {
    await persistPartyMessageIds(sb, partyId, { channelId, messageId });
    return;
  }

  const threadId = await startPartyThread(env, channelId, messageId, party.game);

  let voiceChannelId: string | null = party.discord_voice_channel_id ?? null;
  if (!voiceChannelId && guildId) {
    const { createPartyVoiceChannel } = await import("./voice.js");
    voiceChannelId = await createPartyVoiceChannel(env, {
      guildId,
      textChannelId: channelId,
      game: party.game,
      partyId,
    });
  }

  await persistPartyMessageIds(sb, partyId, {
    channelId,
    messageId,
    threadId,
    voiceChannelId,
  });

  const card: PartyCardState = {
    id: party.id,
    game: party.game,
    rank_text: party.rank_text,
    mic: party.mic ?? "",
    region: party.region ?? "",
    slots: party.slots,
    status: party.status,
    host_member_id: party.host_member_id,
    scheduled_start_at: party.scheduled_start_at ?? null,
    discord_channel_id: channelId,
    discord_message_id: messageId,
    discord_thread_id: threadId,
    discord_voice_channel_id: voiceChannelId,
    discord_guild_id: guildId ?? null,
  };
  await refreshPartyCard(env, sb, card, { guildId: guildId ?? undefined });
}

/**
 * Deliver a handler InteractionResponse after a deferred ACK.
 * Prefer editing @original; if ephemeral visibility mismatches the defer, fall back.
 */
export async function deliverDeferredResponse(
  env: BotEnv,
  interaction: Interaction,
  response: InteractionResponse,
  deferredEphemeral: boolean,
): Promise<void> {
  const meta = response.meta;
  const data: InteractionMessageData =
    response.data ?? { content: "Done." };

  let postedMessage: { id: string; channel_id?: string } | null = null;

  if (shouldUpdateComponentMessage(interaction)) {
    const updateBody = {
      content: data.content ?? "Done.",
      embeds: data.embeds ?? [],
      components: data.components ?? [],
    };
    postedMessage = await editOriginalResponse(env, interaction, updateBody);
    if (!postedMessage) {
      // Don't leave Discord spinning — fall back to a new ephemeral note.
      await createFollowupMessage(env, interaction, {
        ...updateBody,
        flags: EPHEMERAL_FLAG,
      });
    }
  } else {
    const wantsEphemeral = isEphemeralData(data);

    if (deferredEphemeral === wantsEphemeral) {
      postedMessage = await editOriginalResponse(env, interaction, data);
      if (!postedMessage && wantsEphemeral) {
        await createFollowupMessage(env, interaction, data);
      }
    } else if (!deferredEphemeral && wantsEphemeral) {
      await deleteOriginalResponse(env, interaction);
      await createFollowupMessage(env, interaction, data);
    } else {
      const channelId = interaction.channel_id;
      const posted =
        channelId && (await postChannelMessage(env, channelId, data));
      await editOriginalResponse(env, interaction, {
        content: posted
          ? "Posted to the channel."
          : "Could not post publicly — check bot permissions / channel.",
        components: [],
      });
      if (posted && channelId) {
        postedMessage = { id: posted.id, channel_id: channelId };
      }
    }
  }

  if (meta?.persistPartyMessage && postedMessage?.id) {
    const channelId =
      postedMessage.channel_id || interaction.channel_id || "";
    if (channelId) {
      const sb = createServiceClient(env);
      if (sb) {
        await afterPartyPosted(
          env,
          sb,
          meta.persistPartyMessage.partyId,
          channelId,
          postedMessage.id,
          interaction.guild_id,
        );
      }
    }
  }

  if (meta?.pinHint) {
    await createFollowupMessage(env, interaction, lfgDeskPinHintMessage());
  }

  // Start ready-check before the vibe nudge so ready_check_started_at is set
  // before players can tap "Showed up" (avoids show double-count with finalize).
  if (meta?.startReadyCheck && interaction.guild_id) {
    const sb = createServiceClient(env);
    if (sb) {
      try {
        await startReadyCheck({
          sb,
          env,
          guildId: interaction.guild_id,
          partyId: meta.startReadyCheck.partyId,
          discordUserId: meta.startReadyCheck.discordUserId,
          displayName: meta.startReadyCheck.displayName,
          allowAuto: true,
        });
      } catch (err) {
        console.error("auto startReadyCheck failed", err);
      }
    }
  }

  if (meta?.vibeNudge) {
    await createFollowupMessage(
      env,
      interaction,
      lfgVibeNudgeMessage(meta.vibeNudge.partyId, meta.vibeNudge.game),
    );
  }

  if (meta?.dismissAfterMs && meta.dismissAfterMs > 0) {
    await sleep(meta.dismissAfterMs);
    await deleteOriginalResponse(env, interaction);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function deliverErrorFollowup(
  env: BotEnv,
  interaction: Interaction,
  message: string,
  deferredEphemeral: boolean,
): Promise<void> {
  const data: InteractionMessageData = {
    content: `Something went wrong: ${message}`,
    flags: EPHEMERAL_FLAG,
  };
  try {
    if (shouldUpdateComponentMessage(interaction)) {
      await editOriginalResponse(env, interaction, {
        content: data.content,
        embeds: [],
        components: [],
      });
      return;
    }
    if (deferredEphemeral) {
      await editOriginalResponse(env, interaction, data);
    } else {
      await deleteOriginalResponse(env, interaction);
      await createFollowupMessage(env, interaction, data);
    }
  } catch (err) {
    console.error("deliverErrorFollowup failed", err);
  }
}
