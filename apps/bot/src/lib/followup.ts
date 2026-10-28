import { discordAppId, type BotEnv } from "./env.js";
import {
  EPHEMERAL_FLAG,
  InteractionResponseType,
  InteractionType,
  type Interaction,
  type InteractionMessageData,
  type InteractionResponse,
} from "./discord.js";

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
  return (
    id === "lfg:findgame" ||
    id === "lfg:joinselect" ||
    id.startsWith("lfg:close:")
  );
}

/** Whether the deferred ACK should be ephemeral (must match final visibility). */
export function shouldDeferEphemeral(interaction: Interaction): boolean {
  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    // In-place updates inherit the source message visibility.
    if (shouldUpdateComponentMessage(interaction)) return false;
    // Desk / party buttons reply ephemeral (public posts go via bot token when needed).
    return true;
  }

  if (interaction.type === InteractionType.MODAL_SUBMIT) {
    const customId = interaction.data?.custom_id ?? "";
    // Create-party modal posts a public party embed.
    if (customId.startsWith("lfg:createsubmit:")) return false;
    return true;
  }

  const name = interaction.data?.name;
  if (name === "lfg") {
    const sub = interaction.data?.options?.[0]?.name;
    // create / close / desk post public channel messages
    if (sub === "create" || sub === "close" || sub === "desk") return false;
    return true;
  }

  if (name === "setup") {
    // Posts the public LFG desk panel.
    return false;
  }

  if (name === "vibe") {
    const showed = interaction.data?.options?.find((o) => o.name === "showed_up");
    // Without showed_up, handler posts public Vibe Check buttons
    if (showed === undefined) return false;
    return true;
  }

  return true;
}

/** Immediate Discord ACK within the 3s window. */
export function deferredAck(interaction: Interaction): InteractionResponse {
  if (shouldUpdateComponentMessage(interaction)) {
    // Replace the select / button message in place (no extra chat clutter).
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
): Promise<boolean> {
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
    return false;
  }
  return true;
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
): Promise<boolean> {
  if (!env.DISCORD_BOT_TOKEN) {
    console.error("postChannelMessage: DISCORD_BOT_TOKEN missing");
    return false;
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
    return false;
  }
  return true;
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
  const data: InteractionMessageData =
    response.data ?? { content: "Done." };

  // Type-6 component updates: always edit the source message; drop stale selects.
  if (shouldUpdateComponentMessage(interaction)) {
    await editOriginalResponse(env, interaction, {
      content: data.content ?? "Done.",
      embeds: data.embeds ?? [],
      components: data.components ?? [],
    });
    return;
  }

  const wantsEphemeral = isEphemeralData(data);

  if (deferredEphemeral === wantsEphemeral) {
    await editOriginalResponse(env, interaction, data);
    return;
  }

  if (!deferredEphemeral && wantsEphemeral) {
    // Public "thinking…" — replace with ephemeral follow-up.
    await deleteOriginalResponse(env, interaction);
    await createFollowupMessage(env, interaction, data);
    return;
  }

  // Deferred ephemeral but handler wants public: interaction follow-ups stay
  // tied to ephemeral; post to the channel with the bot token instead.
  const posted =
    interaction.channel_id &&
    (await postChannelMessage(env, interaction.channel_id, data));
  await editOriginalResponse(env, interaction, {
    content: posted
      ? "Posted to the channel."
      : "Could not post publicly — check bot permissions / channel.",
    components: [],
  });
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
