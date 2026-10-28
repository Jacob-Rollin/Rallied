import type { SupabaseClient } from "@supabase/supabase-js";
import type { BotEnv } from "../lib/env.js";
import {
  ephemeral,
  InteractionResponseType,
  type InteractionResponse,
} from "../lib/discord.js";
import { readyCheckComponents, readyCheckEmbed } from "../lib/embeds.js";
import { formatError } from "../lib/errors.js";
import {
  editChannelMessage,
  fetchGuildParty,
  loadPartyMembers,
} from "../lib/party-message.js";
import { getServerSettings } from "../lib/settings.js";
import { ensureServerAndMember } from "../lib/supabase.js";

const API = "https://discord.com/api/v10";

async function postChannelMessage(
  env: BotEnv,
  channelId: string,
  body: { content?: string; embeds?: unknown[]; components?: unknown[] },
): Promise<{ id: string; channel_id: string } | null> {
  if (!env.DISCORD_BOT_TOKEN) return null;
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
      "ready-check post failed",
      res.status,
      await res.text().catch(() => ""),
    );
    return null;
  }
  return (await res.json()) as { id: string; channel_id: string };
}

async function loadReadyRoster(sb: SupabaseClient, partyId: string) {
  const { data, error } = await sb
    .from("lfg_party_members")
    .select(
      "role, ready_at, member:members!inner(id, discord_user_id, display_name)",
    )
    .eq("party_id", partyId);
  if (error) throw error;
  return (data ?? []).map((row) => {
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
      ready: Boolean(row.ready_at),
    };
  });
}

function buildReadyPayload(
  party: { id: string; game: string },
  roster: Awaited<ReturnType<typeof loadReadyRoster>>,
  graceEndsUnix: number,
  resolved = false,
) {
  const embed = readyCheckEmbed({
    game: party.game,
    partyId: party.id,
    graceEndsUnix,
    members: roster.map((m) => ({
      mention: `<@${m.discordUserId}>`,
      displayName: m.displayName,
      role: m.role,
      ready: m.ready,
    })),
    resolved,
  });
  return {
    embeds: [embed],
    components: readyCheckComponents(party.id, resolved),
  };
}

/** Host (or filled auto) starts a ready check with grace countdown. */
export async function startReadyCheck(opts: {
  sb: SupabaseClient;
  env: BotEnv;
  guildId: string;
  partyId: string;
  discordUserId: string;
  displayName: string;
  /** When true, skip host-only check (auto on fill). */
  allowAuto?: boolean;
}): Promise<InteractionResponse> {
  const { sb, env } = opts;
  const { server, member } = await ensureServerAndMember(
    sb,
    opts.guildId,
    undefined,
    opts.discordUserId,
    opts.displayName,
    null,
  );

  const { party, error: loadErr } = await fetchGuildParty(sb, {
    partyId: opts.partyId,
    serverId: server.id,
  });
  if (loadErr) return ephemeral(`Couldn't load that party: ${loadErr}`);
  if (!party) {
    return ephemeral("That party is closed or not in this server.");
  }
  if (party.status === "closed") {
    return ephemeral("That party is already closed.");
  }

  if (!opts.allowAuto && party.host_member_id !== member.id) {
    return ephemeral("Only the host can start Ready Check.");
  }

  const members = await loadPartyMembers(sb, party.id);
  if (members.length < 2) {
    return ephemeral("Need at least 2 people in the party for a ready check.");
  }

  const { data: fullParty } = await sb
    .from("lfg_parties")
    .select(
      "id, game, discord_channel_id, discord_thread_id, ready_check_started_at, grace_ends_at, ready_check_resolved_at",
    )
    .eq("id", party.id)
    .maybeSingle();

  if (!fullParty) return ephemeral("Party not found.");
  if (fullParty.ready_check_resolved_at) {
    return ephemeral("Ready check already finished for this party.");
  }
  if (
    fullParty.ready_check_started_at &&
    fullParty.grace_ends_at &&
    new Date(fullParty.grace_ends_at).getTime() > Date.now()
  ) {
    const t = Math.floor(new Date(fullParty.grace_ends_at).getTime() / 1000);
    return ephemeral(
      `Ready check already running — grace ends <t:${t}:R>. Tap **Ready**.`,
    );
  }

  const settings = await getServerSettings(sb, server.id);
  const graceMinutes = Math.max(
    1,
    Math.min(60, Number(settings.grace_minutes) || 5),
  );
  const graceEnds = new Date(Date.now() + graceMinutes * 60 * 1000);
  const graceEndsUnix = Math.floor(graceEnds.getTime() / 1000);

  await sb
    .from("lfg_party_members")
    .update({ ready_at: null })
    .eq("party_id", party.id);

  if (!opts.allowAuto) {
    await sb
      .from("lfg_party_members")
      .update({ ready_at: new Date().toISOString() })
      .eq("party_id", party.id)
      .eq("member_id", member.id);
  }

  const channelId =
    fullParty.discord_thread_id ||
    fullParty.discord_channel_id ||
    party.discord_thread_id ||
    party.discord_channel_id;
  if (!channelId) {
    return ephemeral(
      "Party card isn’t linked to a channel yet — try again after the card posts.",
    );
  }

  const roster = await loadReadyRoster(sb, party.id);
  const payload = buildReadyPayload(
    { id: party.id, game: party.game },
    roster,
    graceEndsUnix,
  );

  const posted = await postChannelMessage(env, channelId, {
    content: `Ready check for **${party.game}** — ${roster
      .map((m) => `<@${m.discordUserId}>`)
      .join(" ")}`,
    ...payload,
  });
  if (!posted) {
    return ephemeral("Couldn’t post the ready check message.");
  }

  await sb
    .from("lfg_parties")
    .update({
      ready_check_started_at: new Date().toISOString(),
      ready_check_message_id: posted.id,
      ready_check_channel_id: posted.channel_id || channelId,
      grace_ends_at: graceEnds.toISOString(),
      ready_check_resolved_at: null,
    })
    .eq("id", party.id);

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `Ready check started — grace <t:${graceEndsUnix}:R>. Tap **Ready** on the check message.`,
      flags: 64,
    },
    meta: { dismissAfterMs: 5_000 },
  };
}

/** Member marks themselves ready during an active check. */
export async function markReady(opts: {
  sb: SupabaseClient;
  env: BotEnv;
  guildId: string;
  partyId: string;
  discordUserId: string;
  displayName: string;
}): Promise<InteractionResponse> {
  const { sb, env } = opts;
  const { server, member } = await ensureServerAndMember(
    sb,
    opts.guildId,
    undefined,
    opts.discordUserId,
    opts.displayName,
    null,
  );

  const { party, error: loadErr } = await fetchGuildParty(sb, {
    partyId: opts.partyId,
    serverId: server.id,
  });
  if (loadErr) return ephemeral(`Couldn't load that party: ${loadErr}`);
  if (!party) {
    return ephemeral("That party is closed or not in this server.");
  }

  const { data: membership } = await sb
    .from("lfg_party_members")
    .select("id, ready_at")
    .eq("party_id", party.id)
    .eq("member_id", member.id)
    .maybeSingle();

  if (!membership) {
    return ephemeral("Join the party before tapping Ready.");
  }

  const { data: fullParty } = await sb
    .from("lfg_parties")
    .select(
      "id, game, grace_ends_at, ready_check_message_id, ready_check_channel_id, ready_check_resolved_at",
    )
    .eq("id", party.id)
    .maybeSingle();

  if (!fullParty?.grace_ends_at || fullParty.ready_check_resolved_at) {
    return ephemeral("No active ready check for this party.");
  }
  if (new Date(fullParty.grace_ends_at).getTime() <= Date.now()) {
    return ephemeral("Grace already ended — waiting on the sweep.");
  }

  if (!membership.ready_at) {
    await sb
      .from("lfg_party_members")
      .update({ ready_at: new Date().toISOString() })
      .eq("id", membership.id);
  }

  const graceEndsUnix = Math.floor(
    new Date(fullParty.grace_ends_at).getTime() / 1000,
  );
  const roster = await loadReadyRoster(sb, party.id);
  const payload = buildReadyPayload(
    { id: party.id, game: party.game },
    roster,
    graceEndsUnix,
  );

  if (fullParty.ready_check_channel_id && fullParty.ready_check_message_id) {
    await editChannelMessage(
      env,
      fullParty.ready_check_channel_id,
      fullParty.ready_check_message_id,
      payload,
    );
  }

  const readyCount = roster.filter((m) => m.ready).length;
  if (readyCount >= roster.length && roster.length > 0) {
    await finalizeReadyCheck(sb, env, party.id, { allReady: true });
    return ephemeral(
      "Everyone’s ready — nice. Optional: run **Vibe Check** after you play.",
    );
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `You’re marked **Ready** (${readyCount}/${roster.length}).`,
      flags: 64,
    },
    meta: { dismissAfterMs: 3_000 },
  };
}

/**
 * After grace (or all ready): bump ghostless/shows, strike no-shows, lock message.
 */
export async function finalizeReadyCheck(
  sb: SupabaseClient,
  env: BotEnv,
  partyId: string,
  opts?: { allReady?: boolean },
): Promise<{ resolved: boolean; noShows: number }> {
  const { data: party } = await sb
    .from("lfg_parties")
    .select(
      "id, game, server_id, grace_ends_at, ready_check_message_id, ready_check_channel_id, ready_check_resolved_at, host_member_id",
    )
    .eq("id", partyId)
    .maybeSingle();

  if (!party || party.ready_check_resolved_at) {
    return { resolved: false, noShows: 0 };
  }

  if (
    !opts?.allReady &&
    party.grace_ends_at &&
    new Date(party.grace_ends_at).getTime() > Date.now()
  ) {
    return { resolved: false, noShows: 0 };
  }

  const roster = await loadReadyRoster(sb, partyId);
  const settings = await getServerSettings(sb, party.server_id);
  let noShows = 0;

  for (const m of roster) {
    if (m.ready) {
      const { data: stats } = await sb
        .from("ghostless_stats")
        .select("shows, ghosts, vibe_sum, vibe_count")
        .eq("server_id", party.server_id)
        .eq("member_id", m.memberId)
        .maybeSingle();
      await sb.from("ghostless_stats").upsert(
        {
          server_id: party.server_id,
          member_id: m.memberId,
          shows: (stats?.shows ?? 0) + 1,
          ghosts: stats?.ghosts ?? 0,
          vibe_sum: stats?.vibe_sum ?? 0,
          vibe_count: stats?.vibe_count ?? 0,
        },
        { onConflict: "server_id,member_id" },
      );
      continue;
    }

    noShows += 1;
    const { data: stats } = await sb
      .from("ghostless_stats")
      .select("shows, ghosts, vibe_sum, vibe_count")
      .eq("server_id", party.server_id)
      .eq("member_id", m.memberId)
      .maybeSingle();
    await sb.from("ghostless_stats").upsert(
      {
        server_id: party.server_id,
        member_id: m.memberId,
        shows: stats?.shows ?? 0,
        ghosts: (stats?.ghosts ?? 0) + 1,
        vibe_sum: stats?.vibe_sum ?? 0,
        vibe_count: stats?.vibe_count ?? 0,
      },
      { onConflict: "server_id,member_id" },
    );

    await sb.from("strikes").insert({
      server_id: party.server_id,
      member_id: m.memberId,
      reason: `Ready-check no-show · ${party.game} (\`${party.id.slice(0, 8)}\`)`,
      created_by: party.host_member_id,
      active: true,
    });

    const { count } = await sb
      .from("strikes")
      .select("*", { count: "exact", head: true })
      .eq("server_id", party.server_id)
      .eq("member_id", m.memberId)
      .eq("active", true);

    if ((count ?? 0) >= settings.strike_threshold) {
      const until = new Date(
        Date.now() + settings.lockout_days * 24 * 60 * 60 * 1000,
      ).toISOString();
      await sb.from("lockouts").insert({
        server_id: party.server_id,
        member_id: m.memberId,
        until,
        reason: `Auto lockout: ${settings.strike_threshold}+ active strikes (this server)`,
      });
    }
  }

  await sb
    .from("lfg_parties")
    .update({ ready_check_resolved_at: new Date().toISOString() })
    .eq("id", partyId);

  const graceEndsUnix = party.grace_ends_at
    ? Math.floor(new Date(party.grace_ends_at).getTime() / 1000)
    : Math.floor(Date.now() / 1000);
  const finalRoster = await loadReadyRoster(sb, partyId);
  const payload = buildReadyPayload(
    { id: party.id, game: party.game },
    finalRoster,
    graceEndsUnix,
    true,
  );

  if (party.ready_check_channel_id && party.ready_check_message_id) {
    await editChannelMessage(
      env,
      party.ready_check_channel_id,
      party.ready_check_message_id,
      {
        content:
          noShows > 0
            ? `Ready check ended — **${noShows}** no-show${noShows === 1 ? "" : "s"} struck (this server).`
            : "Ready check ended — everyone was ready.",
        ...payload,
      },
    );
  }

  return { resolved: true, noShows };
}

export async function resolveDueReadyChecks(
  sb: SupabaseClient,
  env: BotEnv,
): Promise<number> {
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("lfg_parties")
    .select("id")
    .lte("grace_ends_at", now)
    .is("ready_check_resolved_at", null)
    .not("grace_ends_at", "is", null)
    .limit(25);

  if (error) {
    console.error("resolveDueReadyChecks", formatError(error));
    return 0;
  }

  let n = 0;
  for (const row of data ?? []) {
    const result = await finalizeReadyCheck(sb, env, row.id);
    if (result.resolved) n += 1;
  }
  return n;
}
