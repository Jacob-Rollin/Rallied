import type { SupabaseClient } from "@supabase/supabase-js";
import type { BotEnv } from "./env.js";
import { getServerSettings } from "./settings.js";

/**
 * Weekly digest stub — cron-ready.
 * Posts summary to digest_channel_id, or console.logs if unset.
 *
 * Wire Cloudflare Cron Triggers / Railway cron to call `runWeeklyDigest`.
 */
export async function runWeeklyDigest(
  env: BotEnv,
  sb: SupabaseClient,
  serverId: string,
  guildId: string,
): Promise<{ posted: boolean; summary: string }> {
  const settings = await getServerSettings(sb, serverId);

  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

  const { count: parties } = await sb
    .from("lfg_parties")
    .select("*", { count: "exact", head: true })
    .eq("server_id", serverId)
    .gte("created_at", weekAgo);

  const { count: strikes } = await sb
    .from("strikes")
    .select("*", { count: "exact", head: true })
    .eq("server_id", serverId)
    .eq("active", true);

  const { data: stats } = await sb
    .from("ghostless_stats")
    .select("shows, ghosts")
    .eq("server_id", serverId);

  let shows = 0;
  let ghosts = 0;
  for (const row of stats ?? []) {
    shows += row.shows;
    ghosts += row.ghosts;
  }
  const total = shows + ghosts;
  const ghostlessPct =
    total === 0 ? null : Math.round((shows / total) * 1000) / 10;

  const summary = [
    `**Rallied weekly digest** (this server)`,
    `Parties (7d): **${parties ?? 0}**`,
    `Ghostless pool show rate: **${ghostlessPct ?? "—"}%** (${shows} shows / ${ghosts} ghosts)`,
    `Active strikes: **${strikes ?? 0}**`,
  ].join("\n");

  if (!settings.digest_channel_id) {
    console.log("[digest] channel unset — log only", { guildId, summary });
    return { posted: false, summary };
  }

  if (!env.DISCORD_BOT_TOKEN) {
    console.log("[digest] no bot token", summary);
    return { posted: false, summary };
  }

  const res = await fetch(
    `https://discord.com/api/v10/channels/${settings.digest_channel_id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: summary }),
    },
  );

  if (!res.ok) {
    console.warn("[digest] post failed", res.status, await res.text());
    return { posted: false, summary };
  }
  return { posted: true, summary };
}
