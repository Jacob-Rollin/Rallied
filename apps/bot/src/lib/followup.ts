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

/** Whether the deferred ACK should be ephemeral (must match final visibility). */
export function shouldDeferEphemeral(interaction: Interaction): boolean {
  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
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
  const ephemeral = shouldDeferEphemeral(interaction);
  const data = ephemeral ? { flags: EPHEMERAL_FLAG } : undefined;

  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    // New reply (not editing the button message) — type 5 matches prior type-4 replies.
    return {
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      data,
    };
  }

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
