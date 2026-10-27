import type { SupabaseClient } from "@supabase/supabase-js";
import {
  actorUser,
  avatarUrl,
  displayName,
  ephemeral,
  getOption,
  getSubcommand,
  publicMessage,
  type Interaction,
} from "../lib/discord.js";
import { lfgPartyEmbed, publicEmbed } from "../lib/embeds.js";
import { ensureServerAndMember } from "../lib/supabase.js";

function ghostlessLabel(shows: number, ghosts: number): string {
  const total = shows + ghosts;
  if (total === 0) return "New in this server";
  const pct = Math.round((shows / total) * 1000) / 10;
  if (pct >= 90) return `Ghostless ${pct}%`;
  if (pct >= 75) return `Reliable ${pct}%`;
  return `Watch ${pct}%`;
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

  const { server, member } = await ensureServerAndMember(
    sb,
    interaction.guild_id,
    undefined,
    user.id,
    displayName(interaction),
    avatarUrl(user),
  );

  if (sub === "create") {
    const game = String(getOption(options, "game")?.value ?? "");
    const rank = String(getOption(options, "rank")?.value ?? "");
    const slots = Number(getOption(options, "slots")?.value ?? 5);

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
        rank_text: rank,
        slots,
        status: "open",
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      })
      .select("*")
      .single();

    if (error || !party) {
      return ephemeral(`Failed to create party: ${error?.message ?? "unknown"}`);
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
      rankText: rank,
      slots,
      filled: 1,
      hostName: displayName(interaction),
      hostMention: `<@${user.id}>`,
      partyId: party.id,
      ghostlessLabel: ghostlessLabel(stats?.shows ?? 0, stats?.ghosts ?? 0),
    });

    return publicEmbed(embed);
  }

  if (sub === "find") {
    const { data: parties, error } = await sb
      .from("lfg_parties")
      .select("id, game, rank_text, slots, status, host_member_id")
      .eq("server_id", server.id)
      .eq("status", "open")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) return ephemeral(`Lookup failed: ${error.message}`);
    if (!parties?.length) return ephemeral("No open LFG parties in this server.");

    const lines = parties.map(
      (p, i) =>
        `${i + 1}. **${p.game}** ${p.rank_text ? `(${p.rank_text})` : ""} — ${p.slots} slots · \`${p.id.slice(0, 8)}\``,
    );
    return ephemeral(`Open parties (this server):\n${lines.join("\n")}`);
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

    return publicMessage(`Party \`${party.id}\` closed.`);
  }

  return ephemeral("Unknown `/lfg` subcommand. Try create, find, or close.");
}
