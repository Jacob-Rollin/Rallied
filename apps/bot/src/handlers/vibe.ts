import type { SupabaseClient } from "@supabase/supabase-js";
import type { BotEnv } from "../lib/env.js";
import {
  actorUser,
  avatarUrl,
  displayName,
  ephemeral,
  getOption,
  InteractionResponseType,
  type Interaction,
} from "../lib/discord.js";
import {
  vibeCheckMessage,
  vibeGhostDisputeMessage,
} from "../lib/embeds.js";
import { formatError } from "../lib/errors.js";
import { postThreadMessage } from "../lib/party-message.js";
import {
  freeReadyCheckNote,
  reliabilityEnabled,
  resolveEffectivePlan,
  upgradeEphemeral,
} from "../lib/entitlements.js";
import { maybeAssignGhostlessRole } from "../lib/roles.js";
import { getServerSettings, withinGraceWindow } from "../lib/settings.js";
import { ensureServerAndMember } from "../lib/supabase.js";

/** Slash `/vibe` — either submits directly or posts a button message when only user given. */
export async function handleVibe(
  interaction: Interaction,
  sb: SupabaseClient | null,
  env?: BotEnv,
) {
  if (!interaction.guild_id) {
    return ephemeral("Vibe Check only works inside a Discord server.");
  }
  if (!sb) {
    return ephemeral("Database not configured.");
  }

  const user = actorUser(interaction);
  if (!user) return ephemeral("Could not resolve your Discord user.");

  const options = interaction.data?.options ?? [];
  const targetId = String(getOption(options, "user")?.value ?? "");
  const showedOpt = getOption(options, "showed_up");
  const partyIdOpt = getOption(options, "party_id")?.value as string | undefined;

  if (!targetId) return ephemeral("Pick a user to rate.");
  if (targetId === user.id) return ephemeral("You can't vibe-check yourself.");

  const { server, member: rater } = await ensureServerAndMember(
    sb,
    interaction.guild_id,
    undefined,
    user.id,
    displayName(interaction),
    avatarUrl(user),
    null,
    env,
  );

  const { member: ratee } = await ensureServerAndMember(
    sb,
    interaction.guild_id,
    undefined,
    targetId,
    "member",
    null,
    null,
    env,
  );

  let partyId = partyIdOpt;
  if (!partyId) {
    const { data: recent } = await sb
      .from("lfg_party_members")
      .select("party_id, party:lfg_parties!inner(id, server_id, status)")
      .eq("member_id", rater.id)
      .limit(20);

    const candidate = (recent ?? []).find((row) => {
      const party = row.party as unknown as { server_id: string };
      return party?.server_id === server.id;
    });
    partyId = candidate?.party_id;
  }

  if (!partyId) {
    return ephemeral("No party found. Pass `party_id` from `/lfg create`.");
  }

  // If no showed_up flag, post interactive Vibe Check buttons instead
  if (showedOpt === undefined) {
    const payload = vibeCheckMessage({
      rateeMention: `<@${targetId}>`,
      partyId,
      rateeMemberId: ratee.id,
    });
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: payload,
    };
  }

  const showedUp = Boolean(showedOpt.value);
  const scoreRaw = getOption(options, "score")?.value;
  const vibeScore = scoreRaw === undefined ? null : Number(scoreRaw);
  const ghosted = Boolean(getOption(options, "ghosted")?.value ?? !showedUp);
  const note = (getOption(options, "note")?.value as string | undefined) ?? null;

  return recordVibe({
    sb,
    env,
    guildId: interaction.guild_id,
    serverId: server.id,
    partyId,
    raterId: rater.id,
    rateeId: ratee.id,
    rateeDiscordId: targetId,
    showedUp,
    vibeScore,
    ghosted,
    note,
  });
}

export async function recordVibe(opts: {
  sb: SupabaseClient;
  env?: BotEnv;
  guildId: string;
  serverId: string;
  partyId: string;
  raterId: string;
  rateeId: string;
  rateeDiscordId: string;
  showedUp: boolean;
  vibeScore: number | null;
  ghosted: boolean;
  note: string | null;
}) {
  const { sb, env } = opts;

  // Both rater and ratee must be seated (not waitlist) — anti-grief Ghostless.
  const { data: raterMem } = await sb
    .from("lfg_party_members")
    .select("id")
    .eq("party_id", opts.partyId)
    .eq("member_id", opts.raterId)
    .in("role", ["host", "member"])
    .maybeSingle();
  const { data: rateeMem } = await sb
    .from("lfg_party_members")
    .select("id")
    .eq("party_id", opts.partyId)
    .eq("member_id", opts.rateeId)
    .in("role", ["host", "member"])
    .maybeSingle();

  if (!raterMem || !rateeMem) {
    return ephemeral(
      "Both players must be in that party to Vibe Check (this server).",
    );
  }

  const { data: party } = await sb
    .from("lfg_parties")
    .select(
      "id, game, server_id, status, host_member_id, updated_at, created_at, ready_check_started_at, ready_check_resolved_at, discord_thread_id, discord_channel_id",
    )
    .eq("id", opts.partyId)
    .maybeSingle();

  if (!party || party.server_id !== opts.serverId) {
    return ephemeral("Party not found in this server.");
  }

  const settings = await getServerSettings(sb, opts.serverId);

  // Grace window: Ghosted inside grace does not count as ghost / strike.
  let ghosted = opts.ghosted;
  if (ghosted) {
    const start = new Date(party.updated_at || party.created_at).getTime();
    const minutesLate = (Date.now() - start) / 60000;
    if (withinGraceWindow(minutesLate, settings.grace_minutes)) {
      ghosted = false;
    }
  }

  const showedUp = ghosted ? false : opts.showedUp;

  const { data: existing } = await sb
    .from("vibe_checks")
    .select("id")
    .eq("party_id", opts.partyId)
    .eq("rater_id", opts.raterId)
    .eq("ratee_id", opts.rateeId)
    .maybeSingle();

  const isNew = !existing;

  const { error } = await sb.from("vibe_checks").upsert(
    {
      party_id: opts.partyId,
      rater_id: opts.raterId,
      ratee_id: opts.rateeId,
      showed_up: showedUp,
      vibe_score: opts.vibeScore,
      ghosted,
      note: opts.note,
    },
    { onConflict: "party_id,rater_id,ratee_id" },
  );

  if (error) return ephemeral(`Could not save vibe: ${error.message}`);

  const { data: serverRow } = await sb
    .from("servers")
    .select("plan, trial_ends_at, discord_guild_id")
    .eq("id", opts.serverId)
    .maybeSingle();

  const plan = env
    ? resolveEffectivePlan(
        {
          plan: serverRow?.plan as string | undefined,
          trial_ends_at: (serverRow?.trial_ends_at as string | null) ?? null,
          discord_guild_id:
            (serverRow?.discord_guild_id as string | null) ?? opts.guildId,
        },
        env,
        opts.guildId,
      )
    : ((serverRow?.plan as string | undefined) ?? "trial");

  const reliabilityOn = reliabilityEnabled(plan);

  const { data: stats } = await sb
    .from("ghostless_stats")
    .select("*")
    .eq("server_id", opts.serverId)
    .eq("member_id", opts.rateeId)
    .maybeSingle();

  let shows = stats?.shows ?? 0;
  let ghosts = stats?.ghosts ?? 0;
  let vibe_sum = stats?.vibe_sum ?? 0;
  let vibe_count = stats?.vibe_count ?? 0;

  // Ready-check owns shows/ghosts once the party is filled / RC started /
  // resolved — so a "Showed up" tap during grace cannot double-count with
  // finalizeReadyCheck. Re-taps never bump aggregates.
  const readyOwnsShows = Boolean(
    party.status === "filled" ||
      party.ready_check_started_at ||
      party.ready_check_resolved_at,
  );
  let struck = false;

  if (isNew && reliabilityOn) {
    if (showedUp && !readyOwnsShows) {
      shows += 1;
    }
    if (ghosted && !readyOwnsShows) {
      ghosts += 1;
    }
    if (opts.vibeScore != null) {
      vibe_sum += opts.vibeScore;
      vibe_count += 1;
    }

    await sb.from("ghostless_stats").upsert(
      {
        server_id: opts.serverId,
        member_id: opts.rateeId,
        shows,
        ghosts,
        vibe_sum,
        vibe_count,
      },
      { onConflict: "server_id,member_id" },
    );

    // Ghosted after grace → strike, unless ready-check owns this party.
    if (ghosted && !readyOwnsShows) {
      const alreadyStruck = await hasPartyNoShowStrike(
        sb,
        opts.serverId,
        opts.rateeId,
        party.id,
      );
      if (!alreadyStruck) {
        await sb.from("strikes").insert({
          server_id: opts.serverId,
          member_id: opts.rateeId,
          reason: `Vibe Ghosted · ${party.game} (\`${party.id.slice(0, 8)}\`)`,
          created_by: opts.raterId,
          active: true,
        });
        struck = true;

        const { count } = await sb
          .from("strikes")
          .select("*", { count: "exact", head: true })
          .eq("server_id", opts.serverId)
          .eq("member_id", opts.rateeId)
          .eq("active", true);

        if ((count ?? 0) >= settings.strike_threshold) {
          const until = new Date(
            Date.now() + settings.lockout_days * 24 * 60 * 60 * 1000,
          ).toISOString();
          await sb.from("lockouts").insert({
            server_id: opts.serverId,
            member_id: opts.rateeId,
            until,
            reason: `Auto lockout: ${settings.strike_threshold}+ active strikes (this server)`,
          });
        }
      }
    }
  }

  if (env && reliabilityOn) {
    await maybeAssignGhostlessRole(env, sb, {
      serverId: opts.serverId,
      guildId: opts.guildId,
      discordUserId: opts.rateeDiscordId,
      shows,
      ghosts,
    });
  }

  // Ratee-facing Dispute CTA (squad thread) when a Ghosted strike was issued.
  if (struck && env && reliabilityOn) {
    const channelId = party.discord_thread_id || party.discord_channel_id;
    if (channelId) {
      const payload = vibeGhostDisputeMessage({
        rateeMention: `<@${opts.rateeDiscordId}>`,
        partyId: party.id,
        rateeMemberId: opts.rateeId,
      });
      try {
        await postThreadMessage(env, channelId, payload.content ?? "", {
          components: payload.components,
        });
      } catch (err) {
        console.error("vibe dispute notify", formatError(err));
      }
    }
  }

  if (!isNew) {
    return ephemeral(
      `Updated Vibe Check for <@${opts.rateeDiscordId}> (stats unchanged — already counted).`,
    );
  }

  if (!reliabilityOn && env) {
    const upgrade = upgradeEphemeral({ env, reason: "reliability" });
    return {
      ...upgrade,
      data: {
        ...upgrade.data,
        content: `Vibe Check noted for <@${opts.rateeDiscordId}> — Ghostless stats & strikes stay off on Free. ${freeReadyCheckNote()}`,
      },
    };
  }

  const showNote = readyOwnsShows
    ? " · shows/ghosts owned by Ready Check (vibe score only)"
    : "";
  const strikeNote = struck
    ? " · strike issued (ratee can Dispute in the squad thread)"
    : ghosted && readyOwnsShows
      ? " · no extra strike (Ready Check owns no-shows for this party)"
      : "";

  return ephemeral(
    `Vibe Check saved for <@${opts.rateeDiscordId}> (this server). showed_up=${showedUp} ghosted=${ghosted}${opts.vibeScore != null ? ` score=${opts.vibeScore}` : ""}${showNote}${strikeNote}`,
  );
}

async function hasPartyNoShowStrike(
  sb: SupabaseClient,
  serverId: string,
  memberId: string,
  partyId: string,
): Promise<boolean> {
  const needle = partyId.slice(0, 8);
  const { data } = await sb
    .from("strikes")
    .select("id, reason")
    .eq("server_id", serverId)
    .eq("member_id", memberId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(10);

  return (data ?? []).some(
    (s) =>
      typeof s.reason === "string" &&
      s.reason.includes(needle) &&
      (s.reason.includes("Ready-check no-show") ||
        s.reason.includes("Vibe Ghosted")),
  );
}
