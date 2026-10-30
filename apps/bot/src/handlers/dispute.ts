import type { SupabaseClient } from "@supabase/supabase-js";
import type { BotEnv } from "../lib/env.js";
import {
  interactionGuildIdentity,
  actorUser,
  avatarUrl,
  displayName,
  ephemeral,
  getOption,
  getSubcommand,
  isMod,
  type Interaction,
} from "../lib/discord.js";
import {
  reliabilityEnabled,
  resolveEffectivePlan,
  upgradeEphemeral,
} from "../lib/entitlements.js";
import { ensureServerAndMember } from "../lib/supabase.js";

export async function handleDispute(
  interaction: Interaction,
  sb: SupabaseClient | null,
  env: BotEnv,
) {
  if (!interaction.guild_id) {
    return ephemeral("Disputes are per-server only.");
  }
  if (!sb) return ephemeral("Database not configured.");

  const user = actorUser(interaction);
  if (!user) return ephemeral("Could not resolve your Discord user.");

  const { name: sub, options } = getSubcommand(interaction.data);
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

  const plan = resolveEffectivePlan(server, env, interaction.guild_id);
  if (!reliabilityEnabled(plan)) {
    return upgradeEphemeral({ env, reason: "reliability" });
  }

  if (sub === "open" || !sub) {
    const strikeId = getOption(options.length ? options : interaction.data?.options, "strike_id")
      ?.value as string | undefined;
    const note = String(
      getOption(options.length ? options : interaction.data?.options, "note")?.value ?? "",
    );

    let resolvedStrikeId = strikeId ?? null;
    if (!resolvedStrikeId) {
      const { data: latest } = await sb
        .from("strikes")
        .select("id")
        .eq("server_id", server.id)
        .eq("member_id", member.id)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      resolvedStrikeId = latest?.id ?? null;
    }

    if (!resolvedStrikeId) {
      return ephemeral("No active strike to dispute. Pass `strike_id` if you have it.");
    }

    // Opener must be the ratee / strikee (their own strike).
    const { data: strikeRow } = await sb
      .from("strikes")
      .select("id, member_id")
      .eq("id", resolvedStrikeId)
      .eq("server_id", server.id)
      .maybeSingle();

    if (!strikeRow) {
      return ephemeral("Strike not found in this server.");
    }
    if (strikeRow.member_id !== member.id) {
      return ephemeral(
        "Only the player who received the strike can open this dispute.",
      );
    }

    const { data, error } = await sb
      .from("disputes")
      .insert({
        server_id: server.id,
        strike_id: resolvedStrikeId,
        opener_member_id: member.id,
        status: "open",
        notes: note || null,
      })
      .select("id")
      .single();

    if (error) return ephemeral(`Could not open dispute: ${error.message}`);
    return ephemeral(
      `Dispute \`${data.id}\` opened (this server). Mods review with \`/dispute resolve\` or Overturn / Uphold on the admin web Disputes page.`,
    );
  }

  if (sub === "resolve") {
    if (!isMod(interaction)) {
      return ephemeral("Mods only.");
    }
    const disputeId = String(getOption(options, "id")?.value ?? "");
    const outcome = String(getOption(options, "outcome")?.value ?? "upheld");
    const notes = String(getOption(options, "notes")?.value ?? "");

    if (!disputeId) return ephemeral("Pass dispute `id`.");
    if (outcome !== "upheld" && outcome !== "overturned") {
      return ephemeral("Outcome must be upheld or overturned.");
    }

    const { data: dispute, error: dErr } = await sb
      .from("disputes")
      .select("*")
      .eq("id", disputeId)
      .eq("server_id", server.id)
      .maybeSingle();

    if (dErr || !dispute) return ephemeral("Dispute not found in this server.");

    await sb
      .from("disputes")
      .update({
        status: outcome,
        resolver_member_id: member.id,
        notes: notes || dispute.notes,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", disputeId);

    if (outcome === "overturned" && dispute.strike_id) {
      await sb
        .from("strikes")
        .update({ active: false })
        .eq("id", dispute.strike_id)
        .eq("server_id", server.id);
    }

    return ephemeral(`Dispute \`${disputeId}\` → **${outcome}** (this server).`);
  }

  return ephemeral("Use `/dispute open` or `/dispute resolve`.");
}

/** Create dispute from a button — opener must be the ratee (flagged player). */
export async function openDisputeFromButton(
  sb: SupabaseClient,
  env: BotEnv,
  opts: {
    guildId: string;
    openerDiscordId: string;
    openerName: string;
    partyId: string;
    rateeMemberId: string;
  },
) {
  const { server, member } = await ensureServerAndMember(
    sb,
    opts.guildId,
    undefined,
    opts.openerDiscordId,
    opts.openerName,
    null,
    null,
    env,
  );

  const plan = resolveEffectivePlan(server, env, opts.guildId);
  if (!reliabilityEnabled(plan)) {
    return upgradeEphemeral({ env, reason: "reliability" });
  }

  if (member.id !== opts.rateeMemberId) {
    return ephemeral(
      "Only the flagged player can open this dispute. If that’s you, use `/dispute open`.",
    );
  }

  // Prefer linking latest vibe_check for this party/ratee
  const { data: vibe } = await sb
    .from("vibe_checks")
    .select("id")
    .eq("party_id", opts.partyId)
    .eq("ratee_id", opts.rateeMemberId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: strike } = await sb
    .from("strikes")
    .select("id")
    .eq("server_id", server.id)
    .eq("member_id", member.id)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!vibe?.id && !strike?.id) {
    return ephemeral(
      "Nothing to dispute yet — wait for a ghost flag or strike, then try again.",
    );
  }

  const { data, error } = await sb
    .from("disputes")
    .insert({
      server_id: server.id,
      strike_id: strike?.id ?? null,
      vibe_check_id: vibe?.id ?? null,
      opener_member_id: member.id,
      status: "open",
      notes: "Opened from Discord Dispute button",
    })
    .select("id")
    .single();

  if (error) return ephemeral(error.message);
  return ephemeral(`Dispute \`${data.id}\` opened. Mods will review (this server).`);
}
