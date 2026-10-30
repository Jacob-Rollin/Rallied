import type { BotEnv } from "./env.js";
import { lapseAllExpiredTrials } from "./entitlements.js";
import { createServiceClient } from "./supabase.js";
import { formatError } from "./errors.js";
import {
  postThreadMessage,
  refreshPartyCard,
  type PartyCardState,
} from "./party-message.js";
import { resolveDueReadyChecks } from "../handlers/ready-check.js";
import { runRetentionPass } from "./retention.js";
import { cleanupPartyVoice } from "./voice.js";

const API = "https://discord.com/api/v10";

/**
 * Close open/filled parties past expires_at and refresh Discord cards to Closed.
 * Also finalize ready checks, lapse expired trials, schedule reminders, and
 * (opt-in) inactivity soft-archive. Soft-close sets deleted_at for Find UI —
 * rows stay for Top hosts / Ghostless history. Never deletes servers on leave.
 */
export async function runBotHygiene(env: BotEnv): Promise<{
  expired: number;
  readyResolved: number;
  trialsLapsed: number;
  reminders: number;
  retentionSkipped: boolean;
  retentionCandidates: number;
  retentionArchived: number;
}> {
  const sb = createServiceClient(env);
  if (!sb) {
    return {
      expired: 0,
      readyResolved: 0,
      trialsLapsed: 0,
      reminders: 0,
      retentionSkipped: true,
      retentionCandidates: 0,
      retentionArchived: 0,
    };
  }

  let trialsLapsed = 0;
  try {
    trialsLapsed = await lapseAllExpiredTrials(sb);
  } catch (err) {
    console.error("hygiene trial lapse", err);
  }

  let expired = 0;
  const now = new Date().toISOString();

  /** Optional 008 columns are optional so the pre-migration fallback select type-checks. */
  type StalePartyRow = {
    id: string;
    game: string;
    rank_text: string;
    mic?: string | null;
    region?: string | null;
    slots: number;
    status: string;
    host_member_id: string;
    discord_message_id: string | null;
    discord_channel_id: string | null;
    discord_thread_id?: string | null;
    discord_voice_channel_id?: string | null;
    scheduled_start_at?: string | null;
  };

  let stale: StalePartyRow[] | null = null;
  let error: { message?: string } | null = null;

  {
    const res = await sb
      .from("lfg_parties")
      .select(
        "id, game, rank_text, mic, region, slots, status, host_member_id, discord_message_id, discord_channel_id, discord_thread_id, discord_voice_channel_id, scheduled_start_at",
      )
      .in("status", ["open", "filled"])
      .is("deleted_at", null)
      .lt("expires_at", now)
      .limit(40);
    stale = (res.data as StalePartyRow[] | null) ?? null;
    error = res.error;
  }

  if (
    error &&
    /mic|region|discord_voice_channel_id|scheduled_start_at/i.test(
      error.message ?? "",
    )
  ) {
    const res = await sb
      .from("lfg_parties")
      .select(
        "id, game, rank_text, slots, status, host_member_id, discord_message_id, discord_channel_id, discord_thread_id",
      )
      .in("status", ["open", "filled"])
      .is("deleted_at", null)
      .lt("expires_at", now)
      .limit(40);
    stale = (res.data as StalePartyRow[] | null) ?? null;
    error = res.error;
  }

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

      try {
        await cleanupPartyVoice(env, sb, {
          id: row.id,
          discord_voice_channel_id: row.discord_voice_channel_id ?? null,
        });
      } catch (err) {
        console.error("hygiene voice cleanup", row.id, err);
      }

      const card: PartyCardState = {
        id: row.id,
        game: row.game,
        rank_text: row.rank_text,
        mic: row.mic ?? "",
        region: row.region ?? "",
        slots: row.slots,
        status: "closed",
        host_member_id: row.host_member_id,
        discord_message_id: row.discord_message_id,
        discord_channel_id: row.discord_channel_id,
        discord_thread_id: row.discord_thread_id ?? null,
        discord_voice_channel_id: null,
        scheduled_start_at: row.scheduled_start_at ?? null,
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

  let reminders = 0;
  try {
    reminders = await sendDueScheduleReminders(env, sb);
  } catch (err) {
    console.error("hygiene schedule reminders", err);
  }

  let retentionSkipped = true;
  let retentionCandidates = 0;
  let retentionArchived = 0;
  try {
    const retention = await runRetentionPass(sb, env);
    retentionSkipped = retention.skipped;
    retentionCandidates = retention.candidates;
    retentionArchived = retention.archived;
  } catch (err) {
    console.error("hygiene retention", err);
  }

  return {
    expired,
    readyResolved,
    trialsLapsed,
    reminders,
    retentionSkipped,
    retentionCandidates,
    retentionArchived,
  };
}

/**
 * Ping parties whose scheduled_start_at is within the next 10 minutes
 * (or up to 5 minutes overdue) and have not been reminded yet.
 */
async function sendDueScheduleReminders(
  env: BotEnv,
  sb: NonNullable<ReturnType<typeof createServiceClient>>,
): Promise<number> {
  const now = Date.now();
  const windowStart = new Date(now - 5 * 60_000).toISOString();
  const windowEnd = new Date(now + 10 * 60_000).toISOString();

  const { data: due, error } = await sb
    .from("lfg_parties")
    .select(
      "id, game, scheduled_start_at, discord_channel_id, discord_thread_id, discord_voice_channel_id, host_member_id, server_id",
    )
    .in("status", ["open", "filled"])
    .is("deleted_at", null)
    .is("schedule_reminder_sent_at", null)
    .gte("scheduled_start_at", windowStart)
    .lte("scheduled_start_at", windowEnd)
    .limit(25);

  if (error) {
    // Column may be missing pre-migration — soft skip.
    if (/schedule_reminder_sent_at|scheduled_start_at/i.test(error.message)) {
      return 0;
    }
    console.error("schedule remind query", formatError(error));
    return 0;
  }

  let sent = 0;
  for (const row of due ?? []) {
    const startAt = row.scheduled_start_at as string;
    const unix = Math.floor(new Date(startAt).getTime() / 1000);
    const voice = row.discord_voice_channel_id
      ? ` Voice: <#${row.discord_voice_channel_id}>.`
      : "";
    const content =
      `⏰ **${row.game}** starts <t:${unix}:R> (<t:${unix}:t>).` +
      ` Hop in the squad.${voice}`;

    let delivered = false;
    if (row.discord_thread_id) {
      delivered = await postThreadMessage(env, row.discord_thread_id, content);
    }
    if (!delivered && row.discord_channel_id) {
      delivered = await postChannelPing(
        env,
        row.discord_channel_id,
        content,
      );
    }

    // Best-effort host DM
    try {
      const { data: host } = await sb
        .from("members")
        .select("discord_user_id")
        .eq("id", row.host_member_id)
        .maybeSingle();
      if (host?.discord_user_id) {
        await dmUser(env, host.discord_user_id, content);
      }
    } catch (err) {
      console.error("schedule host dm", row.id, err);
    }

    const { error: markErr } = await sb
      .from("lfg_parties")
      .update({ schedule_reminder_sent_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("schedule_reminder_sent_at", null);
    if (markErr) {
      console.error("schedule mark sent", row.id, formatError(markErr));
      continue;
    }
    if (delivered) sent += 1;
    else sent += 1; // still count marked reminders
  }

  return sent;
}

async function postChannelPing(
  env: BotEnv,
  channelId: string,
  content: string,
): Promise<boolean> {
  if (!env.DISCORD_BOT_TOKEN) return false;
  const res = await fetch(`${API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    console.error(
      "schedule channel ping failed",
      res.status,
      await res.text().catch(() => ""),
    );
    return false;
  }
  return true;
}

async function dmUser(
  env: BotEnv,
  userId: string,
  content: string,
): Promise<boolean> {
  if (!env.DISCORD_BOT_TOKEN) return false;
  const dmRes = await fetch(`${API}/users/@me/channels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
    },
    body: JSON.stringify({ recipient_id: userId }),
  });
  if (!dmRes.ok) return false;
  const dm = (await dmRes.json()) as { id?: string };
  if (!dm.id) return false;
  const res = await fetch(`${API}/channels/${dm.id}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
    },
    body: JSON.stringify({ content }),
  });
  return res.ok;
}
