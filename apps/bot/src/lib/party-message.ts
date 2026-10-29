import type { SupabaseClient } from "@supabase/supabase-js";
import type { BotEnv } from "./env.js";
import type { Embed } from "./embeds.js";
import {
  lfgPartyComponents,
  lfgPartyEmbed,
} from "./embeds.js";
import { ghostlessCardLabel } from "./ghostless.js";
import { getServerSettings } from "./settings.js";
import { discordChannelUrl } from "./voice.js";

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
  mic?: string | null;
  region?: string | null;
  slots: number;
  status: string;
  host_member_id: string;
  discord_message_id: string | null;
  discord_channel_id: string | null;
  discord_thread_id: string | null;
  discord_voice_channel_id?: string | null;
  scheduled_start_at?: string | null;
  /** Discord guild id for Join VC deep link (optional). */
  discord_guild_id?: string | null;
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

/** Seated members only (host + member) — excludes waitlist. */
export async function countSeated(
  sb: SupabaseClient,
  partyId: string,
): Promise<number> {
  const { count } = await sb
    .from("lfg_party_members")
    .select("*", { count: "exact", head: true })
    .eq("party_id", partyId)
    .in("role", ["host", "member"]);
  return count ?? 0;
}

export async function countWaitlist(
  sb: SupabaseClient,
  partyId: string,
): Promise<number> {
  const { count } = await sb
    .from("lfg_party_members")
    .select("*", { count: "exact", head: true })
    .eq("party_id", partyId)
    .eq("role", "waitlist");
  return count ?? 0;
}

/**
 * Promote the oldest waitlisted member into a seat.
 * Returns the promoted Discord user id when successful.
 */
export async function promoteFromWaitlist(
  sb: SupabaseClient,
  partyId: string,
): Promise<{ memberId: string; discordUserId: string; displayName: string } | null> {
  const { data: next } = await sb
    .from("lfg_party_members")
    .select(
      "id, member_id, member:members!inner(id, discord_user_id, display_name)",
    )
    .eq("party_id", partyId)
    .eq("role", "waitlist")
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!next) return null;

  const { error } = await sb
    .from("lfg_party_members")
    .update({ role: "member" })
    .eq("id", next.id)
    .eq("role", "waitlist");

  if (error) {
    console.error("promoteFromWaitlist", partyId, error.message);
    return null;
  }

  const m = next.member as unknown as {
    id: string;
    discord_user_id: string;
    display_name: string;
  };

  return {
    memberId: m.id,
    discordUserId: m.discord_user_id,
    displayName: m.display_name || m.discord_user_id,
  };
}

export async function buildPartyCardPayload(
  sb: SupabaseClient,
  party: PartyCardState,
  opts?: { threadId?: string | null; guildId?: string | null },
): Promise<{ embeds: Embed[]; components: unknown[] }> {
  const members = await loadPartyMembers(sb, party.id);
  const seated = members.filter(
    (m) => m.role === "host" || m.role === "member",
  );
  const waitlisted = members.filter((m) => m.role === "waitlist");
  const host =
    seated.find((m) => m.memberId === party.host_member_id) ?? seated[0];

  let hostGhostless: string | null = null;
  let guildId = opts?.guildId ?? party.discord_guild_id ?? null;
  if (host) {
    const { data: partyRow } = await sb
      .from("lfg_parties")
      .select("server_id, server:servers!inner(discord_guild_id)")
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
      if (!guildId) {
        const srv = partyRow.server as unknown as {
          discord_guild_id?: string;
        };
        guildId = srv?.discord_guild_id ?? null;
      }
    }
  }

  const threadId = opts?.threadId ?? party.discord_thread_id;
  const status =
    party.status === "filled" || party.status === "closed"
      ? (party.status as "filled" | "closed")
      : seated.length >= party.slots
        ? "filled"
        : "open";

  const voiceId = party.discord_voice_channel_id ?? null;
  const voiceUrl =
    voiceId && guildId ? discordChannelUrl(guildId, voiceId) : null;

  const embed = lfgPartyEmbed({
    game: party.game,
    rankText: party.rank_text,
    mic: party.mic ?? "",
    region: party.region ?? "",
    slots: party.slots,
    filled: seated.length,
    waitlistCount: waitlisted.length,
    hostName: host?.displayName ?? "host",
    hostMention: host ? `<@${host.discordUserId}>` : "host",
    partyId: party.id,
    ghostlessLabel: hostGhostless,
    members: members.map((m) => ({
      mention: `<@${m.discordUserId}>`,
      role: m.role,
    })),
    threadId,
    voiceChannelId: voiceId,
    scheduledStartAt: party.scheduled_start_at ?? null,
    status,
  });

  return {
    embeds: [embed],
    components: lfgPartyComponents(party.id, status, { voiceUrl }),
  };
}

/** Refresh the public party card in-channel (slots, roster, buttons). */
export async function refreshPartyCard(
  env: BotEnv,
  sb: SupabaseClient,
  party: PartyCardState,
  fallback?: { channelId?: string; messageId?: string; guildId?: string },
): Promise<boolean> {
  const channelId = party.discord_channel_id ?? fallback?.channelId ?? null;
  const messageId = party.discord_message_id ?? fallback?.messageId ?? null;
  if (!channelId || !messageId) return false;

  const payload = await buildPartyCardPayload(sb, party, {
    guildId: fallback?.guildId ?? party.discord_guild_id,
  });
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
    voiceChannelId?: string | null;
  },
): Promise<void> {
  const patch: Record<string, string | null> = {
    discord_channel_id: ids.channelId,
    discord_message_id: ids.messageId,
  };
  if (ids.threadId) patch.discord_thread_id = ids.threadId;
  if (ids.voiceChannelId) {
    patch.discord_voice_channel_id = ids.voiceChannelId;
  }

  const { error } = await sb.from("lfg_parties").update(patch).eq("id", partyId);
  if (error) {
    console.error("persistPartyMessageIds failed", error);
    // Retry without new columns if migration 008 not applied yet.
    if (
      /discord_voice_channel_id|discord_thread_id/i.test(error.message ?? "")
    ) {
      const { error: fallbackErr } = await sb
        .from("lfg_parties")
        .update({
          discord_channel_id: ids.channelId,
          discord_message_id: ids.messageId,
          ...(ids.threadId ? { discord_thread_id: ids.threadId } : {}),
        })
        .eq("id", partyId);
      if (fallbackErr) {
        console.error("persistPartyMessageIds fallback failed", fallbackErr);
      }
    }
  }
}

const PARTY_SELECT_FULL =
  "id, game, rank_text, mic, region, slots, status, host_member_id, discord_message_id, discord_channel_id, discord_thread_id, discord_voice_channel_id, scheduled_start_at, server_id";
const PARTY_SELECT_WITH_THREAD =
  "id, game, rank_text, slots, status, host_member_id, discord_message_id, discord_channel_id, discord_thread_id, server_id";
const PARTY_SELECT_BASE =
  "id, game, rank_text, slots, status, host_member_id, discord_message_id, discord_channel_id, server_id";

function mapPartyRow(
  data: Record<string, unknown>,
): PartyCardState & { server_id: string } {
  return {
    id: String(data.id),
    game: String(data.game),
    rank_text: String(data.rank_text ?? ""),
    mic: (data.mic as string | null | undefined) ?? "",
    region: (data.region as string | null | undefined) ?? "",
    slots: Number(data.slots),
    status: String(data.status),
    host_member_id: String(data.host_member_id),
    discord_message_id: (data.discord_message_id as string | null) ?? null,
    discord_channel_id: (data.discord_channel_id as string | null) ?? null,
    discord_thread_id: (data.discord_thread_id as string | null) ?? null,
    discord_voice_channel_id:
      (data.discord_voice_channel_id as string | null | undefined) ?? null,
    scheduled_start_at:
      (data.scheduled_start_at as string | null | undefined) ?? null,
    server_id: String(data.server_id),
  };
}

/** Load a party for this guild; tolerates missing 005/008 columns. */
export async function fetchGuildParty(
  sb: SupabaseClient,
  opts: { partyId: string; serverId: string },
): Promise<{
  party: (PartyCardState & { server_id: string }) | null;
  error: string | null;
}> {
  let { data, error } = await sb
    .from("lfg_parties")
    .select(PARTY_SELECT_FULL)
    .eq("id", opts.partyId)
    .eq("server_id", opts.serverId)
    .is("deleted_at", null)
    .maybeSingle();

  if (
    error &&
    /discord_voice_channel_id|scheduled_start_at|\bmic\b|\bregion\b/i.test(
      error.message ?? "",
    )
  ) {
    ({ data, error } = await sb
      .from("lfg_parties")
      .select(PARTY_SELECT_WITH_THREAD)
      .eq("id", opts.partyId)
      .eq("server_id", opts.serverId)
      .is("deleted_at", null)
      .maybeSingle());
  }

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
    party: mapPartyRow(data as Record<string, unknown>),
    error: null,
  };
}
