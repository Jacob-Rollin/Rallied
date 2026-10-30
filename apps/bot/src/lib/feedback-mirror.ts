import { feedbackMirrorEmbed } from "@rallied/shared";
import type { FeedbackKind, FeedbackSurface } from "@rallied/shared";
import type { BotEnv } from "./env.js";
import { webBaseUrl } from "./entitlements.js";

/**
 * Optional staff-channel mirror for new feedback.
 * Fail open: missing channel/token or Discord errors never block the reporter ack.
 */
export async function mirrorFeedbackToOpsChannel(
  env: BotEnv,
  report: {
    id: string;
    kind: FeedbackKind;
    surface: FeedbackSurface;
    title: string;
    details: string;
    reporterDisplayName: string;
    reporterDiscordUserId: string;
    guildName?: string | null;
    discordGuildId?: string | null;
  },
): Promise<{ posted: boolean }> {
  const channelId = (env.OPS_FEEDBACK_CHANNEL_ID ?? "").trim();
  if (!channelId || !/^\d{17,20}$/.test(channelId)) {
    return { posted: false };
  }
  if (!env.DISCORD_BOT_TOKEN) {
    console.log("[feedback] OPS mirror skipped — no bot token");
    return { posted: false };
  }

  const base = webBaseUrl(env).replace(/\/$/, "");
  const opsUrl = base ? `${base}/ops/${report.id}` : null;
  const body = feedbackMirrorEmbed({ ...report, opsUrl });

  try {
    const res = await fetch(
      `https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      console.warn(
        "[feedback] OPS mirror failed",
        res.status,
        await res.text().catch(() => ""),
      );
      return { posted: false };
    }
    return { posted: true };
  } catch (err) {
    console.warn("[feedback] OPS mirror error", err);
    return { posted: false };
  }
}
