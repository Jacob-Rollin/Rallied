import { feedbackMirrorEmbed } from "@rallied/shared";
import type { FeedbackKind, FeedbackSurface } from "@rallied/shared";
import { getRuntimeEnv } from "./runtime-env";

/**
 * Optional staff-channel mirror when a report is created from the web.
 * Fail open if OPS_FEEDBACK_CHANNEL_ID or DISCORD_BOT_TOKEN unset / Discord fails.
 */
export async function mirrorFeedbackToOpsChannel(report: {
  id: string;
  kind: FeedbackKind;
  surface: FeedbackSurface;
  title: string;
  details: string;
  reporterDisplayName: string;
  reporterDiscordUserId: string;
  guildName?: string | null;
  discordGuildId?: string | null;
}): Promise<{ posted: boolean }> {
  const channelId = (getRuntimeEnv("OPS_FEEDBACK_CHANNEL_ID") ?? "").trim();
  const token = getRuntimeEnv("DISCORD_BOT_TOKEN");
  if (!channelId || !/^\d{17,20}$/.test(channelId) || !token) {
    return { posted: false };
  }

  const appUrl = (getRuntimeEnv("NEXT_PUBLIC_APP_URL") ?? "").replace(/\/$/, "");
  const opsUrl = appUrl ? `${appUrl}/ops/${report.id}` : null;
  const body = feedbackMirrorEmbed({ ...report, opsUrl });

  try {
    const res = await fetch(
      `https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
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
