import type { BotEnv } from "./env.js";
import { createServiceClient } from "./supabase.js";
import { formatError } from "./errors.js";
import { refreshPartyCard, type PartyCardState } from "./party-message.js";
import { resolveDueReadyChecks } from "../handlers/ready-check.js";

/**
 * Close open/filled parties past expires_at and refresh Discord cards to Closed.
 * Also finalize ready checks whose grace window ended.
 */
export async function runBotHygiene(env: BotEnv): Promise<{
  expired: number;
  readyResolved: number;
}> {
  const sb = createServiceClient(env);
  if (!sb) {
    return { expired: 0, readyResolved: 0 };
  }

  let expired = 0;
  const now = new Date().toISOString();
  const { data: stale, error } = await sb
    .from("lfg_parties")
    .select(
      "id, game, rank_text, slots, status, host_member_id, discord_message_id, discord_channel_id, discord_thread_id",
    )
    .in("status", ["open", "filled"])
    .is("deleted_at", null)
    .lt("expires_at", now)
    .limit(40);

  if (error) {
    console.error("hygiene expire query", formatError(error));
  } else {
    for (const row of stale ?? []) {
      const { error: updErr } = await sb
        .from("lfg_parties")
        .update({
          status: "closed",
          deleted_at: now,
        })
        .eq("id", row.id)
        .in("status", ["open", "filled"]);
      if (updErr) {
        console.error("hygiene close", row.id, formatError(updErr));
        continue;
      }
      expired += 1;

      const card: PartyCardState = {
        id: row.id,
        game: row.game,
        rank_text: row.rank_text,
        slots: row.slots,
        status: "closed",
        host_member_id: row.host_member_id,
        discord_message_id: row.discord_message_id,
        discord_channel_id: row.discord_channel_id,
        discord_thread_id: row.discord_thread_id ?? null,
      };
      try {
        await refreshPartyCard(env, sb, card);
      } catch (err) {
        console.error("hygiene refresh card", row.id, err);
      }
    }
  }

  let readyResolved = 0;
  try {
    readyResolved = await resolveDueReadyChecks(sb, env);
  } catch (err) {
    console.error("hygiene ready checks", err);
  }

  return { expired, readyResolved };
}
