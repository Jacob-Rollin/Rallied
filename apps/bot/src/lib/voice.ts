import type { SupabaseClient } from "@supabase/supabase-js";
import type { BotEnv } from "./env.js";

const API = "https://discord.com/api/v10";
/** Guild channel type: voice */
const CHANNEL_TYPE_VOICE = 2;

async function botFetch(
  env: BotEnv,
  path: string,
  init: RequestInit,
): Promise<Response | null> {
  if (!env.DISCORD_BOT_TOKEN) {
    console.error("voice: DISCORD_BOT_TOKEN missing");
    return null;
  }
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      ...(init.headers ?? {}),
    },
  });
}

async function channelParentId(
  env: BotEnv,
  channelId: string,
): Promise<string | null> {
  const res = await botFetch(env, `/channels/${channelId}`, { method: "GET" });
  if (!res?.ok) return null;
  try {
    const json = (await res.json()) as { parent_id?: string | null };
    return json.parent_id ?? null;
  } catch {
    return null;
  }
}

/**
 * Create a temp voice channel for a party under the same category as the
 * desk/card text channel when possible. Soft-fails (returns null) if the bot
 * lacks Manage Channels.
 */
export async function createPartyVoiceChannel(
  env: BotEnv,
  opts: {
    guildId: string;
    textChannelId: string;
    game: string;
    partyId: string;
  },
): Promise<string | null> {
  const parentId = await channelParentId(env, opts.textChannelId);
  const short = opts.partyId.replace(/-/g, "").slice(0, 6);
  const name = `LFG · ${opts.game} · ${short}`.slice(0, 100);

  const body: Record<string, unknown> = {
    name,
    type: CHANNEL_TYPE_VOICE,
    reason: `Rallied LFG party ${opts.partyId.slice(0, 8)}`,
  };
  if (parentId) body.parent_id = parentId;

  const res = await botFetch(env, `/guilds/${opts.guildId}/channels`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res) return null;
  if (!res.ok) {
    console.error(
      "createPartyVoiceChannel failed",
      res.status,
      await res.text().catch(() => ""),
    );
    return null;
  }
  try {
    const json = (await res.json()) as { id?: string };
    return json.id ?? null;
  } catch {
    return null;
  }
}

export async function deleteDiscordChannel(
  env: BotEnv,
  channelId: string,
  reason = "Rallied party closed",
): Promise<boolean> {
  const res = await botFetch(
    env,
    `/channels/${channelId}?reason=${encodeURIComponent(reason)}`,
    { method: "DELETE" },
  );
  if (!res) return false;
  if (!res.ok && res.status !== 404) {
    console.error(
      "deleteDiscordChannel failed",
      res.status,
      await res.text().catch(() => ""),
    );
    return false;
  }
  return true;
}

/** Delete stored temp VC and clear the column (idempotent). */
export async function cleanupPartyVoice(
  env: BotEnv,
  sb: SupabaseClient,
  party: { id: string; discord_voice_channel_id?: string | null },
): Promise<void> {
  const voiceId = party.discord_voice_channel_id ?? null;
  if (!voiceId) return;

  await deleteDiscordChannel(env, voiceId, "Rallied party closed/expired");
  const { error } = await sb
    .from("lfg_parties")
    .update({ discord_voice_channel_id: null })
    .eq("id", party.id);
  if (error) {
    console.error("cleanupPartyVoice clear column", party.id, error.message);
  }
}

export function discordChannelUrl(guildId: string, channelId: string): string {
  return `https://discord.com/channels/${guildId}/${channelId}`;
}
