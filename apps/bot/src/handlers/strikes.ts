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
import { getServerSettings } from "../lib/settings.js";
import { ensureServerAndMember } from "../lib/supabase.js";

/**
 * Strike ladder uses server_settings.strike_threshold / lockout_days.
 * Grace window (grace_minutes) is applied when recording ghosts in vibe handlers —
 * strikes themselves are issued by mods or after confirmed ghosts outside grace.
 */
export async function handleStrikes(
  interaction: Interaction,
  sb: SupabaseClient | null,
  env: BotEnv,
) {
  if (!interaction.guild_id) {
    return ephemeral("Strikes are per-server only.");
  }
  if (!isMod(interaction)) {
    return ephemeral("Mods only (`Manage Server` or higher).");
  }
  if (!sb) return ephemeral("Database not configured.");

  const user = actorUser(interaction);
  if (!user) return ephemeral("Could not resolve your Discord user.");

  const { name: sub, options } = getSubcommand(interaction.data);
  const targetId = String(getOption(options, "user")?.value ?? "");
  if (!targetId) return ephemeral("Pick a user.");

  const { server, member: mod } = await ensureServerAndMember(
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
    return upgradeEphemeral({
      env,
      reason: "reliability",
      guildId: interaction.guild_id,
    });
  }

  const settings = await getServerSettings(sb, server.id);

  const { member: target } = await ensureServerAndMember(
    sb,
    interaction.guild_id,
    interaction.guild?.name,
    targetId,
    "member",
    null,
    interactionGuildIdentity(interaction).iconUrl,
    env,
  );

  if (sub === "list") {
    const { data, error } = await sb
      .from("strikes")
      .select("id, reason, created_at, active")
      .eq("server_id", server.id)
      .eq("member_id", target.id)
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) return ephemeral(error.message);
    if (!data?.length) {
      return ephemeral(`No active strikes for <@${targetId}> in this server.`);
    }
    const lines = data.map(
      (s, i) =>
        `${i + 1}. \`${s.id.slice(0, 8)}\` ${s.reason} · ${new Date(s.created_at).toLocaleDateString()}`,
    );
    return ephemeral(
      `Active strikes for <@${targetId}> (this server). Grace=${settings.grace_minutes}m · lockout at ${settings.strike_threshold}:\n${lines.join("\n")}`,
    );
  }

  if (sub === "add") {
    const reason = String(getOption(options, "reason")?.value ?? "");
    const { error } = await sb.from("strikes").insert({
      server_id: server.id,
      member_id: target.id,
      reason,
      created_by: mod.id,
      active: true,
    });
    if (error) return ephemeral(error.message);

    const { count } = await sb
      .from("strikes")
      .select("*", { count: "exact", head: true })
      .eq("server_id", server.id)
      .eq("member_id", target.id)
      .eq("active", true);

    let extra = "";
    if ((count ?? 0) >= settings.strike_threshold) {
      const until = new Date(
        Date.now() + settings.lockout_days * 24 * 60 * 60 * 1000,
      ).toISOString();
      await sb.from("lockouts").insert({
        server_id: server.id,
        member_id: target.id,
        until,
        reason: `Auto lockout: ${settings.strike_threshold}+ active strikes (this server)`,
      });
      extra = ` Lockout until ${until}.`;
    }

    return ephemeral(`Strike added for <@${targetId}> (this server).${extra}`);
  }

  if (sub === "remove") {
    const strikeId = String(getOption(options, "strike_id")?.value ?? "");
    if (!strikeId) return ephemeral("Pass strike_id to deactivate.");
    const { error } = await sb
      .from("strikes")
      .update({ active: false })
      .eq("id", strikeId)
      .eq("server_id", server.id);
    if (error) return ephemeral(error.message);
    return ephemeral(`Strike \`${strikeId}\` deactivated (this server).`);
  }

  return ephemeral("Use `/strikes list`, `/strikes add`, or `/strikes remove`.");
}
