import type { SupabaseClient } from "@supabase/supabase-js";
import { gamesMatch, normalizeGame } from "@rallied/shared";
import type { BotEnv } from "../lib/env.js";
import {
  interactionGuildIdentity,
  actorUser,
  avatarUrl,
  displayName,
  ephemeral,
  getModalField,
  getOption,
  getSubcommand,
  InteractionResponseType,
  isMod,
  type Interaction,
  type InteractionResponse,
} from "../lib/discord.js";
import {
  LFG_ALL_GAMES,
  LFG_OTHER_GAME,
  lfgCloseConfirmMessage,
  lfgDeskMessage,
  lfgFindEmptyMessage,
  lfgFindMessage,
  lfgHowItWorksMessage,
  lfgMyPartiesMessage,
  lfgPartyComponents,
  lfgPartyEmbed,
  normalizeMic,
  normalizeRegion,
  publicEmbed,
  resolveCreateGameKey,
} from "../lib/embeds.js";
import { formatError } from "../lib/errors.js";
import {
  checkCreateCaps,
  resolveEffectivePlan,
} from "../lib/entitlements.js";
import { ghostlessCardLabel } from "../lib/ghostless.js";
import {
  evaluateJoinGates,
  joinGateEphemeralMessage,
} from "../lib/join-gates.js";
import {
  countSeated,
  countWaitlist,
  fetchGuildParty,
  loadPartyMembers,
  postThreadMessage,
  promoteFromWaitlist,
  refreshPartyCard,
  type PartyCardState,
} from "../lib/party-message.js";
import { parseScheduleStart } from "../lib/schedule.js";
import { getServerSettings } from "../lib/settings.js";
import { ensureServerAndMember } from "../lib/supabase.js";
import { cleanupPartyVoice } from "../lib/voice.js";
import { showLeaderboardForGuild } from "./leaderboard.js";
import { startReadyCheck } from "./ready-check.js";

function asCard(
  party: PartyCardState & { server_id?: string },
  guildId?: string,
): PartyCardState {
  return {
    id: party.id,
    game: party.game,
    rank_text: party.rank_text,
    mic: party.mic ?? "",
    region: party.region ?? "",
    slots: party.slots,
    status: party.status,
    host_member_id: party.host_member_id,
    discord_message_id: party.discord_message_id,
    discord_channel_id: party.discord_channel_id,
    discord_thread_id: party.discord_thread_id,
    discord_voice_channel_id: party.discord_voice_channel_id ?? null,
    scheduled_start_at: party.scheduled_start_at ?? null,
    discord_guild_id: guildId ?? party.discord_guild_id ?? null,
  };
}

function rosterLine(
  members: Awaited<ReturnType<typeof loadPartyMembers>>,
  seatedOnly = true,
): string {
  return members
    .filter((m) =>
      seatedOnly ? m.role === "host" || m.role === "member" : true,
    )
    .map((m) =>
      m.role === "host"
        ? `<@${m.discordUserId}> (host)`
        : m.role === "waitlist"
          ? `<@${m.discordUserId}> (wait)`
          : `<@${m.discordUserId}>`,
    )
    .join(", ");
}

function textMatches(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true;
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}

export async function createParty(opts: {
  sb: SupabaseClient;
  env: BotEnv;
  guildId: string;
  discordUserId: string;
  displayName: string;
  avatarUrl: string | null;
  game: string;
  slots: number;
  rankText?: string;
  mic?: string;
  region?: string;
  scheduledStartAt?: string | null;
  /** @deprecated use rankText + mic + region */
  notes?: string;
}): Promise<InteractionResponse> {
  const { sb, env } = opts;
  const game = normalizeGame(opts.game);
  if (!game) {
    return ephemeral("Pick a game (catalog title or free text).");
  }

  const slots = Math.min(20, Math.max(2, Math.floor(opts.slots) || 5));
  const mic = normalizeMic(opts.mic ?? "");
  const region = normalizeRegion(opts.region ?? "");
  const rankText = (opts.rankText ?? opts.notes ?? "").trim();
  const scheduledStartAt = opts.scheduledStartAt ?? null;

  const { server, member } = await ensureServerAndMember(
    sb,
    opts.guildId,
    undefined,
    opts.discordUserId,
    opts.displayName,
    opts.avatarUrl,
    null,
    env,
  );

  const plan = resolveEffectivePlan(server, env, opts.guildId);
  const capBlock = await checkCreateCaps({
    sb,
    env,
    serverId: server.id,
    plan,
    guildId: opts.guildId,
  });
  if (capBlock) return capBlock;

  const createSettings = await getServerSettings(sb, server.id);
  const createGate = await evaluateJoinGates({
    sb,
    serverId: server.id,
    memberId: member.id,
    plan,
    settings: createSettings,
  });
  const createGateMsg = joinGateEphemeralMessage(createGate);
  if (createGateMsg) return ephemeral(createGateMsg);

  const { data: existingHost } = await sb
    .from("lfg_parties")
    .select("id, game")
    .eq("server_id", server.id)
    .eq("host_member_id", member.id)
    .in("status", ["open", "filled"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingHost) {
    return ephemeral(
      `You already host **${existingHost.game}** (\`${existingHost.id.slice(0, 8)}\`). Close it before creating another.`,
    );
  }

  // Extend TTL when scheduled further out so cron doesn't close early.
  let expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  if (scheduledStartAt) {
    const startMs = new Date(scheduledStartAt).getTime();
    if (Number.isFinite(startMs)) {
      expiresAt = new Date(Math.max(expiresAt.getTime(), startMs + 2 * 60 * 60 * 1000));
    }
  }

  const insertRow: Record<string, unknown> = {
    server_id: server.id,
    host_member_id: member.id,
    game,
    rank_text: rankText,
    slots,
    status: "open",
    expires_at: expiresAt.toISOString(),
  };
  // New columns — omit if migration 008 not applied (retry below).
  insertRow.mic = mic;
  insertRow.region = region;
  if (scheduledStartAt) insertRow.scheduled_start_at = scheduledStartAt;

  let { data: party, error } = await sb
    .from("lfg_parties")
    .insert(insertRow)
    .select("*")
    .single();

  if (
    error &&
    /mic|region|scheduled_start_at/i.test(error.message ?? "")
  ) {
    // Fallback: store filters in rank_text until migration is applied.
    const legacyNotes = [mic && `Mic: ${mic}`, region && `Region: ${region}`, rankText]
      .filter(Boolean)
      .join(" · ");
    ({ data: party, error } = await sb
      .from("lfg_parties")
      .insert({
        server_id: server.id,
        host_member_id: member.id,
        game,
        rank_text: legacyNotes,
        slots,
        status: "open",
        expires_at: expiresAt.toISOString(),
      })
      .select("*")
      .single());
  }

  if (error || !party) {
    return ephemeral(`Failed to create party: ${formatError(error ?? "unknown")}`);
  }

  const { error: hostMemErr } = await sb.from("lfg_party_members").insert({
    party_id: party.id,
    member_id: member.id,
    role: "host",
  });

  if (hostMemErr) {
    await sb
      .from("lfg_parties")
      .update({
        status: "closed",
        deleted_at: new Date().toISOString(),
      })
      .eq("id", party.id);
    return ephemeral(
      `Failed to seat you as host: ${formatError(hostMemErr)}. Party rolled back.`,
    );
  }

  const settings = await getServerSettings(sb, server.id);
  const { data: stats } = await sb
    .from("ghostless_stats")
    .select("shows, ghosts")
    .eq("server_id", server.id)
    .eq("member_id", member.id)
    .maybeSingle();

  const embed = lfgPartyEmbed({
    game,
    rankText: (party.rank_text as string) || rankText,
    mic: (party.mic as string | undefined) ?? mic,
    region: (party.region as string | undefined) ?? region,
    slots,
    filled: 1,
    hostName: opts.displayName,
    hostMention: `<@${opts.discordUserId}>`,
    partyId: party.id,
    ghostlessLabel: ghostlessCardLabel(
      stats?.shows ?? 0,
      stats?.ghosts ?? 0,
      settings,
    ),
    members: [
      {
        mention: `<@${opts.discordUserId}>`,
        role: "host",
      },
    ],
    scheduledStartAt:
      (party.scheduled_start_at as string | null | undefined) ??
      scheduledStartAt,
    status: "open",
  });

  return {
    ...publicEmbed(embed, lfgPartyComponents(party.id, "open")),
    meta: { persistPartyMessage: { partyId: party.id } },
  };
}

export async function findParties(opts: {
  sb: SupabaseClient;
  guildId: string;
  discordUserId: string;
  displayName: string;
  gameFilter: string | null;
  micFilter?: string | null;
  regionFilter?: string | null;
  rankFilter?: string | null;
}): Promise<InteractionResponse> {
  const { sb } = opts;
  const { server } = await ensureServerAndMember(
    sb,
    opts.guildId,
    undefined,
    opts.discordUserId,
    opts.displayName,
    null,
  );

  const gameFilter = opts.gameFilter ? normalizeGame(opts.gameFilter) : null;
  const micFilter = normalizeMic(opts.micFilter ?? "");
  const regionFilter = (opts.regionFilter ?? "").trim();
  const rankFilter = (opts.rankFilter ?? "").trim();

  type FindRow = {
    id: string;
    game: string;
    rank_text: string;
    mic?: string;
    region?: string;
    slots: number;
    status: string;
    host_member_id: string;
    expires_at: string | null;
  };

  let parties: FindRow[] | null = null;
  let error: { message?: string } | null = null;

  {
    const res = await sb
      .from("lfg_parties")
      .select(
        "id, game, rank_text, mic, region, slots, status, host_member_id, expires_at",
      )
      .eq("server_id", server.id)
      .in("status", ["open", "filled"])
      .is("deleted_at", null)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(25);
    parties = (res.data as FindRow[] | null) ?? null;
    error = res.error;
  }

  if (error && /mic|region/i.test(error.message ?? "")) {
    const res = await sb
      .from("lfg_parties")
      .select("id, game, rank_text, slots, status, host_member_id, expires_at")
      .eq("server_id", server.id)
      .in("status", ["open", "filled"])
      .is("deleted_at", null)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(25);
    parties = (res.data as FindRow[] | null) ?? null;
    error = res.error;
  }

  if (error) return ephemeral(`Lookup failed: ${formatError(error)}`);

  const filtered = (parties ?? []).filter((p) => {
    if (gameFilter && !gamesMatch(p.game, gameFilter)) return false;
    const mic = String(p.mic ?? "");
    const region = String(p.region ?? "");
    const rank = String(p.rank_text ?? "");
    // Mic: prefer column; also match legacy "Mic: Required" in notes.
    if (micFilter) {
      const hay = `${mic} ${rank}`.toLowerCase();
      if (!hay.includes(micFilter.toLowerCase())) return false;
    }
    if (regionFilter && !textMatches(`${region} ${rank}`, regionFilter)) {
      return false;
    }
    if (rankFilter && !textMatches(rank, rankFilter)) return false;
    return true;
  });

  if (!filtered.length) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: lfgFindEmptyMessage(gameFilter),
    };
  }

  const withCounts = await Promise.all(
    filtered.slice(0, 10).map(async (p) => {
      const filled = await countSeated(sb, p.id);
      return {
        ...p,
        mic: String((p as { mic?: string }).mic ?? ""),
        region: String((p as { region?: string }).region ?? ""),
        filled,
      };
    }),
  );

  const lines = withCounts.map((p, i) => {
    const bits = [p.rank_text, p.mic, p.region].filter(Boolean).join(" · ");
    return `${i + 1}. **${p.game}**${bits ? ` (${bits})` : ""} — ${p.filled}/${p.slots} · \`${p.id.slice(0, 8)}\``;
  });

  const filterBits = [
    micFilter && `mic=${micFilter}`,
    regionFilter && `region=${regionFilter}`,
    rankFilter && `rank=${rankFilter}`,
  ].filter(Boolean);

  const payload = lfgFindMessage({
    lines,
    parties: withCounts,
    gameFilter,
    filterSummary: filterBits.length ? filterBits.join(", ") : null,
  });

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: payload,
  };
}

/** Admin: post the LFG desk panel in the current channel. */
export function postLfgDesk(): InteractionResponse {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: lfgDeskMessage(),
    meta: { pinHint: true },
  };
}

export async function handleLfg(
  interaction: Interaction,
  sb: SupabaseClient | null,
  env: BotEnv,
) {
  if (!interaction.guild_id) {
    return ephemeral("LFG only works inside a Discord server.");
  }
  if (!sb) {
    return ephemeral("Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  const user = actorUser(interaction);
  if (!user) return ephemeral("Could not resolve your Discord user.");

  const { name: sub, options } = getSubcommand(interaction.data);

  if (sub === "desk") {
    if (!isMod(interaction)) {
      return ephemeral("Only mods can post the LFG desk (`Manage Server` / Admin).");
    }
    await ensureServerAndMember(
      sb,
      interaction.guild_id,
      interaction.guild?.name,
      user.id,
      displayName(interaction),
      avatarUrl(user),
      interactionGuildIdentity(interaction).iconUrl,
      env,
    );
    return postLfgDesk();
  }

  const { server, member } = await ensureServerAndMember(
    sb,
    interaction.guild_id,
    interaction.guild?.name,
    user.id,
    displayName(interaction),
    avatarUrl(user),
    interactionGuildIdentity(interaction).iconUrl,
    env,
  );

  if (sub === "create") {
    const gameRaw = String(getOption(options, "game")?.value ?? "");
    const game = normalizeGame(gameRaw);
    if (!game) return ephemeral("Pick a game (type a few letters for suggestions).");

    const rank = String(getOption(options, "rank")?.value ?? "");
    const mic = String(getOption(options, "mic")?.value ?? "");
    const region = String(getOption(options, "region")?.value ?? "");
    const startRaw = String(getOption(options, "start")?.value ?? "");
    const slots = Number(getOption(options, "slots")?.value ?? 5);

    let scheduledStartAt: string | null = null;
    if (startRaw.trim()) {
      const parsed = parseScheduleStart(startRaw);
      if (!parsed.ok) return ephemeral(parsed.error);
      scheduledStartAt = parsed.at?.toISOString() ?? null;
    }

    return createParty({
      sb,
      env,
      guildId: interaction.guild_id,
      discordUserId: user.id,
      displayName: displayName(interaction),
      avatarUrl: avatarUrl(user),
      game,
      slots,
      rankText: rank,
      mic,
      region,
      scheduledStartAt,
    });
  }

  if (sub === "find") {
    const gameFilterRaw = getOption(options, "game")?.value;
    const gameFilter = gameFilterRaw
      ? normalizeGame(String(gameFilterRaw))
      : null;
    const micFilter = getOption(options, "mic")?.value
      ? String(getOption(options, "mic")?.value)
      : null;
    const regionFilter = getOption(options, "region")?.value
      ? String(getOption(options, "region")?.value)
      : null;
    const rankFilter = getOption(options, "rank")?.value
      ? String(getOption(options, "rank")?.value)
      : null;

    return findParties({
      sb,
      guildId: interaction.guild_id,
      discordUserId: user.id,
      displayName: displayName(interaction),
      gameFilter,
      micFilter,
      regionFilter,
      rankFilter,
    });
  }

  if (sub === "close") {
    const { data: party } = await sb
      .from("lfg_parties")
      .select("id, game")
      .eq("server_id", server.id)
      .eq("host_member_id", member.id)
      .in("status", ["open", "filled"])
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!party) return ephemeral("You don't have an open party to close.");

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: lfgCloseConfirmMessage(party.id, party.game),
    };
  }

  return ephemeral("Unknown `/lfg` subcommand. Try create, find, desk, or close.");
}

/** `/setup` — admin posts LFG desk; new installs start on Starter (`plan=free`). */
export async function handleSetup(
  interaction: Interaction,
  sb: SupabaseClient | null,
  env: BotEnv,
) {
  if (!interaction.guild_id) {
    return ephemeral("Setup only works inside a Discord server.");
  }
  if (!isMod(interaction)) {
    return ephemeral("Only mods can run `/setup` (`Manage Server` / Admin).");
  }
  const user = actorUser(interaction);
  if (sb && user) {
    await ensureServerAndMember(
      sb,
      interaction.guild_id,
      interaction.guild?.name,
      user.id,
      displayName(interaction),
      avatarUrl(user),
      interactionGuildIdentity(interaction).iconUrl,
      env,
    );
  }
  return postLfgDesk();
}

/** Desk / modal / find-select component flows (not join/leave/close/vibe). */
export async function handleLfgDeskComponent(
  interaction: Interaction,
  sb: SupabaseClient,
  action: string,
  env?: BotEnv,
): Promise<InteractionResponse | null> {
  const user = actorUser(interaction);
  if (!user || !interaction.guild_id) return ephemeral("Could not resolve user.");

  if (action === "create") {
    return ephemeral("Tap **Create party** again to pick a game.");
  }

  if (action === "find") {
    return findParties({
      sb,
      guildId: interaction.guild_id,
      discordUserId: user.id,
      displayName: displayName(interaction),
      gameFilter: null,
    });
  }

  if (action === "help") {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: lfgHowItWorksMessage(),
    };
  }

  if (action === "mine") {
    return listMyParties({
      sb,
      guildId: interaction.guild_id,
      discordUserId: user.id,
      displayName: displayName(interaction),
    });
  }

  if (action === "leaderboard" && env) {
    return showLeaderboardForGuild({
      sb,
      env,
      guildId: interaction.guild_id,
      discordUserId: user.id,
      displayName: displayName(interaction),
      avatarUrl: null,
    });
  }

  return null;
}

export async function handleFindGameSelect(
  interaction: Interaction,
  sb: SupabaseClient,
  selected: string,
): Promise<InteractionResponse> {
  const user = actorUser(interaction);
  if (!user || !interaction.guild_id) {
    return ephemeral("Could not resolve user.");
  }

  const gameFilter =
    selected === LFG_ALL_GAMES || !selected ? null : normalizeGame(selected);

  return findParties({
    sb,
    guildId: interaction.guild_id,
    discordUserId: user.id,
    displayName: displayName(interaction),
    gameFilter,
  });
}

export async function handleCreateModalSubmit(
  interaction: Interaction,
  sb: SupabaseClient | null,
  env: BotEnv,
): Promise<InteractionResponse> {
  if (!interaction.guild_id) {
    return ephemeral("LFG only works inside a Discord server.");
  }
  if (!sb) {
    return ephemeral("Database not configured.");
  }

  const user = actorUser(interaction);
  if (!user) return ephemeral("Could not resolve your Discord user.");

  const customId = interaction.data?.custom_id ?? "";
  const gameFromId = customId.split(":").slice(2).join(":") || LFG_OTHER_GAME;
  const isOther = gameFromId === LFG_OTHER_GAME;

  const gameRaw = isOther
    ? getModalField(interaction, "game")
    : resolveCreateGameKey(gameFromId);
  const sizeRaw = getModalField(interaction, "size");
  const mic = getModalField(interaction, "mic");
  const startRaw = getModalField(interaction, "start");

  let rankText = "";
  let region = "";
  if (isOther) {
    rankText = getModalField(interaction, "notes").trim();
  } else {
    rankText = getModalField(interaction, "rank").trim();
    region = getModalField(interaction, "region");
  }

  const slots = Number.parseInt(sizeRaw, 10);
  if (!Number.isFinite(slots) || slots < 2 || slots > 20) {
    return ephemeral("Party size must be a number from 2 to 20.");
  }

  let scheduledStartAt: string | null = null;
  if (startRaw.trim()) {
    const parsed = parseScheduleStart(startRaw);
    if (!parsed.ok) return ephemeral(parsed.error);
    scheduledStartAt = parsed.at?.toISOString() ?? null;
  }

  return createParty({
    sb,
    env,
    guildId: interaction.guild_id,
    discordUserId: user.id,
    displayName: displayName(interaction),
    avatarUrl: avatarUrl(user),
    game: gameRaw,
    slots,
    rankText,
    mic,
    region,
    scheduledStartAt,
  });
}

async function listMyParties(opts: {
  sb: SupabaseClient;
  guildId: string;
  discordUserId: string;
  displayName: string;
}): Promise<InteractionResponse> {
  const { sb } = opts;
  const { server, member } = await ensureServerAndMember(
    sb,
    opts.guildId,
    undefined,
    opts.discordUserId,
    opts.displayName,
    null,
  );

  const { data: memberships, error } = await sb
    .from("lfg_party_members")
    .select(
      "role, party:lfg_parties!inner(id, game, rank_text, slots, status, host_member_id, server_id, deleted_at)",
    )
    .eq("member_id", member.id);

  if (error) return ephemeral(`Lookup failed: ${formatError(error)}`);

  type PartyRow = {
    id: string;
    game: string;
    rank_text: string;
    slots: number;
    status: string;
    host_member_id: string;
    server_id: string;
    deleted_at: string | null;
  };

  const open = (memberships ?? [])
    .map((row) => {
      const party = row.party as unknown as PartyRow;
      return { role: row.role as string, party };
    })
    .filter(
      (row) =>
        row.party &&
        row.party.server_id === server.id &&
        row.party.deleted_at == null &&
        (row.party.status === "open" || row.party.status === "filled"),
    );

  const withCounts = await Promise.all(
    open.slice(0, 10).map(async (row) => {
      const filled = await countSeated(sb, row.party.id);
      return { ...row, filled };
    }),
  );

  const lines = withCounts.map((row) => {
    const hostTag = row.party.host_member_id === member.id ? " · host" : "";
    const waitTag = row.role === "waitlist" ? " · waitlist" : "";
    return `• **${row.party.game}** — ${row.filled}/${row.party.slots}${hostTag}${waitTag} · \`${row.party.id.slice(0, 8)}\``;
  });

  const hostParties = withCounts
    .filter((row) => row.party.host_member_id === member.id)
    .map((row) => ({ id: row.party.id, game: row.party.game }));

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: lfgMyPartiesMessage({ lines, hostParties }),
  };
}

export async function promptCloseParty(opts: {
  sb: SupabaseClient;
  guildId: string;
  partyId: string;
  discordUserId: string;
  displayName: string;
}): Promise<InteractionResponse> {
  const { sb } = opts;
  const { server, member } = await ensureServerAndMember(
    sb,
    opts.guildId,
    undefined,
    opts.discordUserId,
    opts.displayName,
    null,
  );

  const { data: party } = await sb
    .from("lfg_parties")
    .select("id, game, host_member_id, status")
    .eq("id", opts.partyId)
    .eq("server_id", server.id)
    .maybeSingle();

  if (!party) return ephemeral("Party not found in this server.");
  if (party.host_member_id !== member.id) {
    return ephemeral("Only the host can close this party.");
  }
  if (party.status !== "open" && party.status !== "filled") {
    return ephemeral("That party is already closed.");
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: lfgCloseConfirmMessage(party.id, party.game),
  };
}

export async function joinParty(opts: {
  sb: SupabaseClient;
  env: BotEnv;
  guildId: string;
  partyId: string;
  discordUserId: string;
  displayName: string;
  avatarUrl: string | null;
  messageFallback?: { channelId?: string; messageId?: string };
}): Promise<InteractionResponse> {
  const { sb, env } = opts;
  const { server, member } = await ensureServerAndMember(
    sb,
    opts.guildId,
    undefined,
    opts.discordUserId,
    opts.displayName,
    opts.avatarUrl,
  );

  const plan = resolveEffectivePlan(server, env, opts.guildId);
  const settings = await getServerSettings(sb, server.id);
  const gate = await evaluateJoinGates({
    sb,
    serverId: server.id,
    memberId: member.id,
    plan,
    settings,
  });
  const gateMsg = joinGateEphemeralMessage(gate);
  if (gateMsg) return ephemeral(gateMsg);

  const { party, error: loadErr } = await fetchGuildParty(sb, {
    partyId: opts.partyId,
    serverId: server.id,
  });

  if (loadErr) {
    return ephemeral(`Couldn't load that party: ${loadErr}`);
  }
  if (!party) {
    return ephemeral("Party not found in this server (it may have been closed).");
  }
  if (party.status !== "open" && party.status !== "filled") {
    return ephemeral("That party is closed.");
  }

  if (party.host_member_id === member.id) {
    const seated = await countSeated(sb, party.id);
    const thread = party.discord_thread_id
      ? ` Coordinate in <#${party.discord_thread_id}>.`
      : " Open the squad thread under the card to coordinate.";
    const voice = party.discord_voice_channel_id
      ? ` Voice: <#${party.discord_voice_channel_id}>.`
      : "";
    return ephemeral(
      `You're already the host of **${party.game}** (${seated}/${party.slots}).${thread}${voice}`,
    );
  }

  const { data: alreadyIn } = await sb
    .from("lfg_party_members")
    .select("id, role")
    .eq("party_id", party.id)
    .eq("member_id", member.id)
    .maybeSingle();

  let joinedAsWaitlist = false;
  let justJoined = false;

  if (!alreadyIn) {
    const filled = await countSeated(sb, party.id);
    const isFull = filled >= party.slots || party.status === "filled";

    if (isFull) {
      const { error } = await sb.from("lfg_party_members").insert({
        party_id: party.id,
        member_id: member.id,
        role: "waitlist",
      });
      if (error) {
        // Role check may reject waitlist pre-migration — fall back to message.
        if (/role|check/i.test(error.message ?? "")) {
          return ephemeral(
            "That party is full. (Waitlist needs migration 008 — ask an admin to apply SQL.)",
          );
        }
        return ephemeral(`Could not join waitlist: ${formatError(error)}`);
      }
      joinedAsWaitlist = true;
      justJoined = true;
    } else {
      const { error } = await sb.from("lfg_party_members").insert({
        party_id: party.id,
        member_id: member.id,
        role: "member",
      });

      if (error) return ephemeral(`Could not join: ${formatError(error)}`);

      const afterInsert = await countSeated(sb, party.id);
      if (afterInsert > party.slots) {
        await sb
          .from("lfg_party_members")
          .delete()
          .eq("party_id", party.id)
          .eq("member_id", member.id);
        // Race: seat taken — try waitlist instead.
        const { error: wlErr } = await sb.from("lfg_party_members").insert({
          party_id: party.id,
          member_id: member.id,
          role: "waitlist",
        });
        if (wlErr) {
          return ephemeral("That party just filled — try another or Waitlist again.");
        }
        joinedAsWaitlist = true;
        justJoined = true;
        await sb
          .from("lfg_parties")
          .update({
            status: "filled",
            expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          })
          .eq("id", party.id)
          .in("status", ["open", "filled"]);
        party.status = "filled";
      } else {
        justJoined = true;
      }
    }
  } else if (alreadyIn.role === "waitlist") {
    const waiting = await countWaitlist(sb, party.id);
    return ephemeral(
      `You're already on the waitlist for **${party.game}** (#${waiting}). Leave to drop off.`,
    );
  } else {
    // Already seated — refresh card and remind.
    const nextFilled = await countSeated(sb, party.id);
    await refreshPartyCard(env, sb, asCard(party, opts.guildId), {
      ...opts.messageFallback,
      guildId: opts.guildId,
    });
    return ephemeral(
      `You're already in **${party.game}** (${nextFilled}/${party.slots}).`,
    );
  }

  const nextFilled = await countSeated(sb, party.id);
  const becameFull = !joinedAsWaitlist && nextFilled >= party.slots;
  if (becameFull) {
    await sb
      .from("lfg_parties")
      .update({
        status: "filled",
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", party.id)
      .in("status", ["open", "filled"]);
    party.status = "filled";
  } else if (joinedAsWaitlist && party.status === "open" && nextFilled >= party.slots) {
    await sb
      .from("lfg_parties")
      .update({ status: "filled" })
      .eq("id", party.id)
      .eq("status", "open");
    party.status = "filled";
  }

  if (
    (!party.discord_message_id || !party.discord_channel_id) &&
    opts.messageFallback?.messageId &&
    opts.messageFallback?.channelId
  ) {
    await sb
      .from("lfg_parties")
      .update({
        discord_message_id: opts.messageFallback.messageId,
        discord_channel_id: opts.messageFallback.channelId,
      })
      .eq("id", party.id);
    party.discord_message_id = opts.messageFallback.messageId;
    party.discord_channel_id = opts.messageFallback.channelId;
  }

  await refreshPartyCard(env, sb, asCard(party, opts.guildId), {
    ...opts.messageFallback,
    guildId: opts.guildId,
  });

  const members = await loadPartyMembers(sb, party.id);
  const waitCount = members.filter((m) => m.role === "waitlist").length;

  if (party.discord_thread_id && justJoined) {
    await postThreadMessage(
      env,
      party.discord_thread_id,
      joinedAsWaitlist
        ? `<@${opts.discordUserId}> joined the **waitlist** (${waitCount} waiting).`
        : `<@${opts.discordUserId}> joined (**${nextFilled}/${party.slots}**).`,
    );
  }

  if (joinedAsWaitlist) {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: [
          `You're **#${waitCount}** on the waitlist for **${party.game}**.`,
          "You'll be promoted when a seat frees (someone Leaves).",
        ].join("\n"),
        flags: 64,
      },
      meta: { dismissAfterMs: 12_000 },
    };
  }

  const voiceLine = party.discord_voice_channel_id
    ? `Voice: <#${party.discord_voice_channel_id}>`
    : null;
  const connect = [
    "**Connect with your squad:**",
    party.discord_thread_id
      ? `1. Tap <#${party.discord_thread_id}> (squad thread)`
      : "1. Open the thread under the party card",
    voiceLine
      ? `2. Hop into ${voiceLine}`
      : "2. Share game invite / ask who’s hopping on VC",
  ].join("\n");

  const content = [
    `Joined **${party.game}** (${nextFilled}/${party.slots}).`,
    `Squad: ${rosterLine(members)}.`,
    connect,
  ].join("\n");

  const response: InteractionResponse = {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: 64 },
    meta: { dismissAfterMs: becameFull ? 6_000 : 20_000 },
  };

  if (becameFull) {
    response.meta = {
      ...response.meta,
      vibeNudge: { partyId: party.id, game: party.game },
      startReadyCheck: {
        partyId: party.id,
        discordUserId: opts.discordUserId,
        displayName: opts.displayName,
      },
    };
  }

  return response;
}

export async function leaveParty(opts: {
  sb: SupabaseClient;
  env: BotEnv;
  guildId: string;
  partyId: string;
  discordUserId: string;
  displayName: string;
  messageFallback?: { channelId?: string; messageId?: string };
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

  if (loadErr) {
    return {
      ...ephemeral(`Couldn't load that party: ${loadErr}`),
      meta: { dismissAfterMs: 6_000 },
    };
  }
  if (!party) {
    return {
      ...ephemeral("Party not found in this server."),
      meta: { dismissAfterMs: 4_000 },
    };
  }

  if (party.host_member_id === member.id) {
    return {
      ...ephemeral("Hosts can't leave — use **Close** (then Confirm)."),
      meta: { dismissAfterMs: 5_000 },
    };
  }

  const { data: membership } = await sb
    .from("lfg_party_members")
    .select("id, role")
    .eq("party_id", party.id)
    .eq("member_id", member.id)
    .maybeSingle();

  if (!membership) {
    return {
      ...ephemeral("You're not in that party."),
      meta: { dismissAfterMs: 4_000 },
    };
  }

  const wasWaitlist = membership.role === "waitlist";

  const { error } = await sb
    .from("lfg_party_members")
    .delete()
    .eq("party_id", party.id)
    .eq("member_id", member.id);

  if (error) {
    return {
      ...ephemeral(`Could not leave: ${formatError(error)}`),
      meta: { dismissAfterMs: 6_000 },
    };
  }

  let promoted: Awaited<ReturnType<typeof promoteFromWaitlist>> = null;
  if (!wasWaitlist) {
    promoted = await promoteFromWaitlist(sb, party.id);
    const seated = await countSeated(sb, party.id);
    if (seated >= party.slots) {
      await sb
        .from("lfg_parties")
        .update({ status: "filled" })
        .eq("id", party.id)
        .in("status", ["open", "filled"]);
      party.status = "filled";
    } else if (party.status === "filled") {
      await sb.from("lfg_parties").update({ status: "open" }).eq("id", party.id);
      party.status = "open";
    }
  }

  await refreshPartyCard(env, sb, asCard(party, opts.guildId), {
    ...opts.messageFallback,
    guildId: opts.guildId,
  });

  if (party.discord_thread_id) {
    const lines = [
      wasWaitlist
        ? `<@${opts.discordUserId}> left the waitlist.`
        : `<@${opts.discordUserId}> left the party.`,
    ];
    if (promoted) {
      lines.push(
        `<@${promoted.discordUserId}> promoted from waitlist — you're in!`,
      );
    }
    await postThreadMessage(env, party.discord_thread_id, lines.join("\n"));
  }

  const content = wasWaitlist
    ? `Left the waitlist for **${party.game}**.`
    : promoted
      ? `Left **${party.game}**. <@${promoted.discordUserId}> was promoted from the waitlist.`
      : `Left **${party.game}**. You’re off the squad list.\n` +
        `_Older “Only you can see this” notes above can’t be deleted by the bot — tap **Dismiss message** on those._`;

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content,
      flags: 64,
    },
    meta: { dismissAfterMs: 6_000 },
  };
}

export async function closePartyById(opts: {
  sb: SupabaseClient;
  env: BotEnv;
  guildId: string;
  partyId: string;
  discordUserId: string;
  displayName: string;
  messageFallback?: { channelId?: string; messageId?: string };
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

  if (loadErr) {
    return ephemeral(`Couldn't load that party: ${loadErr}`);
  }
  if (!party) return ephemeral("Party not found in this server.");
  if (party.host_member_id !== member.id) {
    return ephemeral("Only the host can close this party.");
  }
  if (party.status !== "open" && party.status !== "filled") {
    return ephemeral("That party is already closed.");
  }

  await sb
    .from("lfg_parties")
    .update({
      status: "closed",
      deleted_at: new Date().toISOString(),
    })
    .eq("id", party.id);

  await cleanupPartyVoice(env, sb, party);

  party.status = "closed";
  party.discord_voice_channel_id = null;
  await refreshPartyCard(env, sb, asCard(party, opts.guildId), {
    ...opts.messageFallback,
    guildId: opts.guildId,
  });

  if (party.discord_thread_id) {
    await postThreadMessage(
      env,
      party.discord_thread_id,
      "Party closed. Use **Vibe Check** on the card to rate teammates.",
    );
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `**${party.game}** party closed.`,
      components: [],
      flags: 64,
    },
    meta: {
      vibeNudge: { partyId: party.id, game: party.game },
      dismissAfterMs: 4_000,
    },
  };
}
