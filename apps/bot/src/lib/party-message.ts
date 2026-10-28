import type { SupabaseClient } from "@supabase/supabase-js";
import type { BotEnv } from "./env.js";
import type { Embed } from "./embeds.js";
import {
  lfgPartyComponents,
  lfgPartyEmbed,
} from "./embeds.js";

const API = "https://discord.com/api/v10";

export type PartyMemberRow = {
  memberId: string;
  discordUserId: string;
  displayName: string;
  role: string;
};

export type PartyCardState = {
  id: string;
  game: string;
  rank_text: string;
  slots: number;
  status: string;
  host_member_id: string;
  discord_message_id: string | null;
  discord_channel_id: string | null;
  discord_thread_id: string | null;
};

async function botFetch(
  env: BotEnv,
  path: string,
  init: RequestInit,
): Promise<Response | null> {
  if (!env.DISCORD_BOT_TOKEN) {
    console.error("party-message: DISCORD_BOT_TOKEN missing");
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

export async function editChannelMessage(
  env: BotEnv,
  channelId: string,
  messageId: string,
  body: {
    content?: string | null;
    embeds?: Embed[];
    components?: unknown[];
  },
): Promise<boolean> {
  const res = await botFetch(env, `/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res) return false;
  if (!res.ok) {
    console.error(
      "editChannelMessage failed",
      res.status,
      await res.text().catch(() => ""),
    );
    return false;
  }
  return true;
}

/** Start a public thread under the party card for squad coordination. */
export async function startPartyThread(
  env: BotEnv,
  channelId: string,
  messageId: string,
  game: string,
): Promise<string | null> {
  const name = `Squad · ${game}`.slice(0, 100);
  const res = await botFetch(
    env,
    `/channels/${channelId}/messages/${messageId}/threads`,
    {
      method: "POST",
      body: JSON.stringify({
        name,
        auto_archive_duration: 1440,
      }),
    },
  );
  if (!res) return null;
  if (!res.ok) {
    console.error(
      "startPartyThread failed",
      res.status,
      await res.text().catch(() => ""),
    );
    return null;
  }
  const json = (await res.json()) as { id?: string };
  return json.id ?? null;
}

export async function postThreadMessage(
  env: BotEnv,
  threadId: string,
  content: string,
): Promise<boolean> {
  const res = await botFetch(env, `/channels/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  if (!res) return false;
  if (!res.ok) {
    console.error(
      "postThreadMessage failed",
      res.status,
      await res.text().catch(() => ""),
    );
    return false;
  }
  return true;
}

export async function loadPartyMembers(
  sb: SupabaseClient,
  partyId: string,
): Promise<PartyMemberRow[]> {
  const { data: rows } = await sb
    .from("lfg_party_members")
    .select("role, member:members!inner(id, discord_user_id, display_name)")
    .eq("party_id", partyId);

  return (rows ?? []).map((row) => {
    const m = row.member as unknown as {
      id: string;
      discord_user_id: string;
      display_name: string;
    };
    return {
      memberId: m.id,
      discordUserId: m.discord_user_id,
      displayName: m.display_name || m.discord_user_id,
      role: String(row.role),
    };
  });
}

function ghostlessLabel(shows: number, ghosts: number): string {
  const total = shows + ghosts;
  if (total === 0) return "New in this server";
  const pct = Math.round((shows / total) * 1000) / 10;
  if (pct >= 90) return `Ghostless ${pct}%`;
  if (pct >= 75) return `Reliable ${pct}%`;
  return `Watch ${pct}%`;
}

export async function buildPartyCardPayload(
  sb: SupabaseClient,
  party: PartyCardState,
  opts?: { threadId?: string | null },
): Promise<{ embeds: Embed[]; components: unknown[] }> {
  const members = await loadPartyMembers(sb, party.id);
  const host =
    members.find((m) => m.memberId === party.host_member_id) ?? members[0];

  let hostGhostless: string | null = null;
  if (host) {
    const { data: partyRow } = await sb
      .from("lfg_parties")
      .select("server_id")
      .eq("id", party.id)
      .maybeSingle();
    if (partyRow) {
      const { data: stats } = await sb
        .from("ghostless_stats")
        .select("shows, ghosts")
        .eq("server_id", partyRow.server_id)
        .eq("member_id", host.memberId)
        .maybeSingle();
      hostGhostless = ghostlessLabel(stats?.shows ?? 0, stats?.ghosts ?? 0);
    }
  }

  const threadId = opts?.threadId ?? party.discord_thread_id;
  const status =
    party.status === "filled" || party.status === "closed"
      ? (party.status as "filled" | "closed")
      : members.length >= party.slots
        ? "filled"
        : "open";

  const embed = lfgPartyEmbed({
    game: party.game,
    rankText: party.rank_text,
    slots: party.slots,
    filled: members.length,
    hostName: host?.displayName ?? "host",
    hostMention: host ? `<@${host.discordUserId}>` : "host",
    partyId: party.id,
    ghostlessLabel: hostGhostless,
    members: members.map((m) => ({
      mention: `<@${m.discordUserId}>`,
      role: m.role,
    })),
    threadId,
    status,
  });

  return {
    embeds: [embed],
    components: lfgPartyComponents(party.id, status),
  };
}

/** Refresh the public party card in-channel (slots, roster, buttons). */
export async function refreshPartyCard(
  env: BotEnv,
  sb: SupabaseClient,
  party: PartyCardState,
  fallback?: { channelId?: string; messageId?: string },
): Promise<boolean> {
  const channelId = party.discord_channel_id ?? fallback?.channelId ?? null;
  const messageId = party.discord_message_id ?? fallback?.messageId ?? null;
  if (!channelId || !messageId) return false;

  const payload = await buildPartyCardPayload(sb, party);
  return editChannelMessage(env, channelId, messageId, {
    content: null,
    ...payload,
  });
}

export async function persistPartyMessageIds(
  sb: SupabaseClient,
  partyId: string,
  ids: {
    channelId: string;
    messageId: string;
    threadId?: string | null;
  },
): Promise<void> {
  await sb
    .from("lfg_parties")
    .update({
      discord_channel_id: ids.channelId,
      discord_message_id: ids.messageId,
      ...(ids.threadId ? { discord_thread_id: ids.threadId } : {}),
    })
    .eq("id", partyId);
}
