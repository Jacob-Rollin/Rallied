import type { SupabaseClient } from "@supabase/supabase-js";
import { gamesMatch, normalizeGame } from "@rallied/shared";
import {
  actorUser,
  avatarUrl,
  displayName,
  ephemeral,
  getModalField,
  getOption,
  getSubcommand,
  InteractionResponseType,
  isMod,
  publicMessage,
  type Interaction,
  type InteractionResponse,
} from "../lib/discord.js";
import {
  LFG_ALL_GAMES,
  LFG_OTHER_GAME,
  lfgDeskMessage,
  lfgFindGameSelectMessage,
  lfgFindMessage,
  lfgHowItWorksMessage,
  lfgMyPartiesMessage,
  lfgPartyComponents,
  lfgPartyEmbed,
  publicEmbed,
} from "../lib/embeds.js";
import { formatError } from "../lib/errors.js";
import { ensureServerAndMember } from "../lib/supabase.js";

function ghostlessLabel(shows: number, ghosts: number): string {
  const total = shows + ghosts;
  if (total === 0) return "New in this server";
  const pct = Math.round((shows / total) * 1000) / 10;
  if (pct >= 90) return `Ghostless ${pct}%`;
  if (pct >= 75) return `Reliable ${pct}%`;
  return `Watch ${pct}%`;
}

async function countFilled(
  sb: SupabaseClient,
  partyId: string,
): Promise<number> {
  const { count } = await sb
    .from("lfg_party_members")
    .select("*", { count: "exact", head: true })
    .eq("party_id", partyId);
  return count ?? 0;
}

export async function createParty(opts: {
  sb: SupabaseClient;
  guildId: string;
  discordUserId: string;
  displayName: string;
  avatarUrl: string | null;
  game: string;
  slots: number;
  notes?: string;
}): Promise<InteractionResponse> {
  const { sb } = opts;
  const game = normalizeGame(opts.game);
  if (!game) {
    return ephemeral("Pick a game (catalog title or free text).");
  }

  const slots = Math.min(20, Math.max(2, Math.floor(opts.slots) || 5));
  const notes = (opts.notes ?? "").trim();

  const { server, member } = await ensureServerAndMember(
    sb,
    opts.guildId,
    undefined,
    opts.discordUserId,
    opts.displayName,
    opts.avatarUrl,
  );

  const { data: lockouts } = await sb
    .from("lockouts")
    .select("until, reason")
    .eq("server_id", server.id)
    .eq("member_id", member.id)
    .gt("until", new Date().toISOString())
    .limit(1);

  if (lockouts && lockouts.length > 0) {
    return ephemeral(
      `You're lockout'd from LFG in this server until ${lockouts[0].until}. Reason: ${lockouts[0].reason}`,
    );
  }

  const { data: party, error } = await sb
    .from("lfg_parties")
    .insert({
      server_id: server.id,
      host_member_id: member.id,
      game,
      rank_text: notes,
      slots,
      status: "open",
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    })
    .select("*")
    .single();

  if (error || !party) {
    return ephemeral(`Failed to create party: ${formatError(error ?? "unknown")}`);
  }

  await sb.from("lfg_party_members").insert({
    party_id: party.id,
    member_id: member.id,
    role: "host",
  });

  const { data: stats } = await sb
    .from("ghostless_stats")
    .select("shows, ghosts")
    .eq("server_id", server.id)
    .eq("member_id", member.id)
    .maybeSingle();

  const embed = lfgPartyEmbed({
    game,
    rankText: notes,
    slots,
    filled: 1,
    hostName: opts.displayName,
    hostMention: `<@${opts.discordUserId}>`,
    partyId: party.id,
    ghostlessLabel: ghostlessLabel(stats?.shows ?? 0, stats?.ghosts ?? 0),
  });

  return publicEmbed(embed, lfgPartyComponents(party.id));
}

export async function findParties(opts: {
  sb: SupabaseClient;
  guildId: string;
  discordUserId: string;
  displayName: string;
  gameFilter: string | null;
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

  const { data: parties, error } = await sb
    .from("lfg_parties")
    .select("id, game, rank_text, slots, status, host_member_id")
    .eq("server_id", server.id)
    .eq("status", "open")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) return ephemeral(`Lookup failed: ${formatError(error)}`);

  const filtered = (parties ?? []).filter((p) =>
    gameFilter ? gamesMatch(p.game, gameFilter) : true,
  );

  if (!filtered.length) {
    return ephemeral(
      gameFilter
        ? `No open **${gameFilter}** parties in this server.`
        : "No open LFG parties in this server.",
    );
  }

  const withCounts = await Promise.all(
    filtered.slice(0, 10).map(async (p) => {
      const filled = await countFilled(sb, p.id);
      return { ...p, filled };
    }),
  );

  const lines = withCounts.map(
    (p, i) =>
      `${i + 1}. **${p.game}** ${p.rank_text ? `(${p.rank_text})` : ""} — ${p.filled}/${p.slots} · \`${p.id.slice(0, 8)}\``,
  );

  const payload = lfgFindMessage({
    lines,
    parties: withCounts,
    gameFilter,
  });

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: payload,
  };
}

/** Admin: post the LFG desk panel in the current channel. */
export function postLfgDesk(): InteractionResponse {
  const payload = lfgDeskMessage();
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: payload,
  };
}

export async function handleLfg(interaction: Interaction, sb: SupabaseClient | null) {
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
    return postLfgDesk();
  }

  const { server, member } = await ensureServerAndMember(
    sb,
    interaction.guild_id,
    undefined,
    user.id,
    displayName(interaction),
    avatarUrl(user),
  );

  if (sub === "create") {
    const gameRaw = String(getOption(options, "game")?.value ?? "");
    const game = normalizeGame(gameRaw);
    if (!game) return ephemeral("Pick a game (type a few letters for suggestions).");

    const rank = String(getOption(options, "rank")?.value ?? "");
    const slots = Number(getOption(options, "slots")?.value ?? 5);

    return createParty({
      sb,
      guildId: interaction.guild_id,
      discordUserId: user.id,
      displayName: displayName(interaction),
      avatarUrl: avatarUrl(user),
      game,
      slots,
      notes: rank,
    });
  }

  if (sub === "find") {
    const gameFilterRaw = getOption(options, "game")?.value;
    const gameFilter = gameFilterRaw
      ? normalizeGame(String(gameFilterRaw))
      : null;

    return findParties({
      sb,
      guildId: interaction.guild_id,
      discordUserId: user.id,
      displayName: displayName(interaction),
      gameFilter,
    });
  }

  if (sub === "close") {
    const { data: party } = await sb
      .from("lfg_parties")
      .select("id")
      .eq("server_id", server.id)
      .eq("host_member_id", member.id)
      .eq("status", "open")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!party) return ephemeral("You don't have an open party to close.");

  await sb
    .from("lfg_parties")
    .update({
      status: "closed",
      deleted_at: new Date().toISOString(),
    })
    .eq("id", party.id);

  return publicMessage(`Party \`${party.id}\` closed.`, {
    clearComponents: true,
  });
}

  return ephemeral("Unknown `/lfg` subcommand. Try create, find, desk, or close.");
}

/** `/setup` — admin posts LFG desk in the current channel. */
export async function handleSetup(interaction: Interaction) {
  if (!interaction.guild_id) {
    return ephemeral("Setup only works inside a Discord server.");
  }
  if (!isMod(interaction)) {
    return ephemeral("Only mods can run `/setup` (`Manage Server` / Admin).");
  }
  return postLfgDesk();
}

/** Desk / modal / find-select component flows (not join/leave/close/vibe). */
export async function handleLfgDeskComponent(
  interaction: Interaction,
  sb: SupabaseClient,
  action: string,
): Promise<InteractionResponse | null> {
  const user = actorUser(interaction);
  if (!user || !interaction.guild_id) return ephemeral("Could not resolve user.");

  // create is handled synchronously in app.ts (modal) — never defer.
  if (action === "create") {
    return ephemeral("Tap **Create party** again — the form should open immediately.");
  }

  if (action === "find") {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: lfgFindGameSelectMessage(),
    };
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
  // lfg:createsubmit:<game or __other__>
  const gameFromId = customId.split(":").slice(2).join(":") || LFG_OTHER_GAME;

  const gameRaw =
    gameFromId === LFG_OTHER_GAME
      ? getModalField(interaction, "game")
      : gameFromId;
  const sizeRaw = getModalField(interaction, "size");
  const notes = getModalField(interaction, "notes");

  const slots = Number.parseInt(sizeRaw, 10);
  if (!Number.isFinite(slots) || slots < 2 || slots > 20) {
    return ephemeral("Party size must be a number from 2 to 20.");
  }

  return createParty({
    sb,
    guildId: interaction.guild_id,
    discordUserId: user.id,
    displayName: displayName(interaction),
    avatarUrl: avatarUrl(user),
    game: gameRaw,
    slots,
    notes,
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
      const filled = await countFilled(sb, row.party.id);
      return { ...row, filled };
    }),
  );

  const lines = withCounts.map((row) => {
    const hostTag = row.party.host_member_id === member.id ? " · host" : "";
    return `• **${row.party.game}** — ${row.filled}/${row.party.slots}${hostTag} · \`${row.party.id.slice(0, 8)}\``;
  });

  const hostParties = withCounts
    .filter((row) => row.party.host_member_id === member.id)
    .map((row) => ({ id: row.party.id, game: row.party.game }));

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: lfgMyPartiesMessage({ lines, hostParties }),
  };
}

export async function joinParty(opts: {
  sb: SupabaseClient;
  guildId: string;
  partyId: string;
  discordUserId: string;
  displayName: string;
  avatarUrl: string | null;
}) {
  const { sb } = opts;
  const { server, member } = await ensureServerAndMember(
    sb,
    opts.guildId,
    undefined,
    opts.discordUserId,
    opts.displayName,
    opts.avatarUrl,
  );

  const { data: lockouts } = await sb
    .from("lockouts")
    .select("until, reason")
    .eq("server_id", server.id)
    .eq("member_id", member.id)
    .gt("until", new Date().toISOString())
    .limit(1);

  if (lockouts && lockouts.length > 0) {
    return ephemeral(
      `You're lockout'd from LFG until ${lockouts[0].until}. Reason: ${lockouts[0].reason}`,
    );
  }

  const { data: party } = await sb
    .from("lfg_parties")
    .select("id, game, slots, status, server_id, host_member_id")
    .eq("id", opts.partyId)
    .eq("server_id", server.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!party || party.status !== "open") {
    return ephemeral("That party is closed or not in this server.");
  }

  const filled = await countFilled(sb, party.id);
  if (filled >= party.slots) {
    return ephemeral("That party is full.");
  }

  const { error } = await sb.from("lfg_party_members").upsert(
    {
      party_id: party.id,
      member_id: member.id,
      role: member.id === party.host_member_id ? "host" : "member",
    },
    { onConflict: "party_id,member_id" },
  );

  if (error) return ephemeral(`Could not join: ${formatError(error)}`);

  const nextFilled = await countFilled(sb, party.id);
  if (nextFilled >= party.slots) {
    await sb.from("lfg_parties").update({ status: "filled" }).eq("id", party.id);
  }

  return ephemeral(
    `Joined **${party.game}** party \`${party.id.slice(0, 8)}\` (${nextFilled}/${party.slots}).`,
  );
}

export async function leaveParty(opts: {
  sb: SupabaseClient;
  guildId: string;
  partyId: string;
  discordUserId: string;
  displayName: string;
}) {
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
    .select("id, game, host_member_id, status, server_id")
    .eq("id", opts.partyId)
    .eq("server_id", server.id)
    .maybeSingle();

  if (!party) return ephemeral("Party not found in this server.");

  if (party.host_member_id === member.id) {
    return ephemeral("Hosts can't leave — use **Close** instead.");
  }

  const { error } = await sb
    .from("lfg_party_members")
    .delete()
    .eq("party_id", party.id)
    .eq("member_id", member.id);

  if (error) return ephemeral(`Could not leave: ${formatError(error)}`);

  if (party.status === "filled") {
    await sb.from("lfg_parties").update({ status: "open" }).eq("id", party.id);
  }

  return ephemeral(`Left **${party.game}** party \`${party.id.slice(0, 8)}\`.`);
}

export async function closePartyById(opts: {
  sb: SupabaseClient;
  guildId: string;
  partyId: string;
  discordUserId: string;
  displayName: string;
}) {
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
    .select("id, host_member_id, status")
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

  await sb
    .from("lfg_parties")
    .update({
      status: "closed",
      deleted_at: new Date().toISOString(),
    })
    .eq("id", party.id);

  return publicMessage(`Party \`${party.id}\` closed.`, {
    clearComponents: true,
  });
}
