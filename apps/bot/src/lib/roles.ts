import type { SupabaseClient } from "@supabase/supabase-js";
import type { BotEnv } from "./env.js";
import { getServerSettings } from "./settings.js";

/**
 * Assign Ghostless role when threshold met. Skips if ghostless_role_id unset
 * or bot token / Manage Roles missing.
 */
export async function maybeAssignGhostlessRole(
  env: BotEnv,
  sb: SupabaseClient,
  opts: {
    serverId: string;
    guildId: string;
    discordUserId: string;
    shows: number;
    ghosts: number;
  },
): Promise<{ assigned: boolean; reason: string }> {
  const settings = await getServerSettings(sb, opts.serverId);
  if (!settings.ghostless_role_id) {
    return { assigned: false, reason: "ghostless_role_id unset — skip" };
  }

  const total = opts.shows + opts.ghosts;
  if (total < settings.ghostless_role_min_sessions) {
    return {
      assigned: false,
      reason: `need ${settings.ghostless_role_min_sessions} sessions`,
    };
  }
  const rate = (opts.shows / total) * 100;
  if (rate < Number(settings.ghostless_role_threshold_pct)) {
    return {
      assigned: false,
      reason: `show rate ${rate.toFixed(1)}% below threshold`,
    };
  }

  if (!env.DISCORD_BOT_TOKEN) {
    return { assigned: false, reason: "DISCORD_BOT_TOKEN missing" };
  }

  const url = `https://discord.com/api/v10/guilds/${opts.guildId}/members/${opts.discordUserId}/roles/${settings.ghostless_role_id}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      "X-Audit-Log-Reason": "Rallied Ghostless threshold (this server)",
    },
  });

  if (res.status === 204 || res.ok) {
    return { assigned: true, reason: "role assigned" };
  }
  return {
    assigned: false,
    reason: `Discord API ${res.status}: ${await res.text()}`,
  };
}
