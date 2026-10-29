import type { SupabaseClient } from "@supabase/supabase-js";
import type { BotEnv } from "./env.js";
import type { Embed } from "./embeds.js";
import {
  lfgPartyComponents,
  lfgPartyEmbed,
} from "./embeds.js";
import { ghostlessCardLabel } from "./ghostless.js";
import { getServerSettings } from "./settings.js";

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
  extras?: { components?: unknown[]; embeds?: unknown[] },
): Promise<boolean> {
  const res = await botFetch(env, `/channels/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content,
      ...(extras?.components ? { components: extras.components } : {}),
      ...(extras?.embeds ? { embeds: extras.embeds } : {}),
    }),
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
      const settings = await getServerSettings(sb, partyRow.server_id);
      const { data: stats } = await sb
        .from("ghostless_stats")
        .select("shows, ghosts")
        .eq("server_id", partyRow.server_id)
        .eq("member_id", host.memberId)
        .maybeSingle();
      hostGhostless = ghostlessCardLabel(
        stats?.shows ?? 0,
        stats?.ghosts ?? 0,
        settings,
      );
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
  const { error } = await sb
    .from("lfg_parties")
    .update({
      discord_channel_id: ids.channelId,
      discord_message_id: ids.messageId,
    })
    .eq("id", partyId);
  if (error) {
    console.error("persistPartyMessageIds channel/message failed", error);
  }

  // Optional column from migration 005 — don't fail Join/Leave if unset.
  if (ids.threadId) {
    const { error: threadErr } = await sb
      .from("lfg_parties")
      .update({ discord_thread_id: ids.threadId })
      .eq("id", partyId);
    if (threadErr) {
      console.error(
        "persistPartyMessageIds thread id failed (apply supabase/migrations/005_party_thread.sql?)",
        threadErr,
      );
    }
  }
}

const PARTY_SELECT_WITH_THREAD =
  "id, game, rank_text, slots, status, host_member_id, discord_message_id, discord_channel_id, discord_thread_id, server_id";
const PARTY_SELECT_BASE =
  "id, game, rank_text, slots, status, host_member_id, discord_message_id, discord_channel_id, server_id";

/** Load a party for this guild; tolerates missing discord_thread_id column. */
export async function fetchGuildParty(
  sb: SupabaseClient,
  opts: { partyId: string; serverId: string },
): Promise<{
  party: (PartyCardState & { server_id: string }) | null;
  error: string | null;
}> {
  let { data, error } = await sb
    .from("lfg_parties")
    .select(PARTY_SELECT_WITH_THREAD)
    .eq("id", opts.partyId)
    .eq("server_id", opts.serverId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error && /discord_thread_id/i.test(error.message ?? "")) {
    ({ data, error } = await sb
      .from("lfg_parties")
      .select(PARTY_SELECT_BASE)
      .eq("id", opts.partyId)
      .eq("server_id", opts.serverId)
      .is("deleted_at", null)
      .maybeSingle());
  }

  if (error) {
    return { party: null, error: error.message };
  }
  if (!data) {
    return { party: null, error: null };
  }

  return {
    party: {
      id: data.id,
      game: data.game,
      rank_text: data.rank_text,
      slots: data.slots,
      status: data.status,
      host_member_id: data.host_member_id,
      discord_message_id: data.discord_message_id ?? null,
      discord_channel_id: data.discord_channel_id ?? null,
      discord_thread_id:
        (data as { discord_thread_id?: string | null }).discord_thread_id ??
        null,
      server_id: data.server_id,
    },
    error: null,
  };
}
