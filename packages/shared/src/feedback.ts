import type { FeedbackKind, FeedbackSurface, FeedbackStatus } from "./types";
import {
  FEEDBACK_KINDS,
  FEEDBACK_STATUSES,
  FEEDBACK_SURFACES,
} from "./constants";

export function isFeedbackKind(v: unknown): v is FeedbackKind {
  return (
    typeof v === "string" &&
    (FEEDBACK_KINDS as readonly string[]).includes(v)
  );
}

export function isFeedbackSurface(v: unknown): v is FeedbackSurface {
  return (
    typeof v === "string" &&
    (FEEDBACK_SURFACES as readonly string[]).includes(v)
  );
}

export function isFeedbackStatus(v: unknown): v is FeedbackStatus {
  return (
    typeof v === "string" &&
    (FEEDBACK_STATUSES as readonly string[]).includes(v)
  );
}

/** Discord embed payload for optional OPS_FEEDBACK_CHANNEL_ID mirror. */
export function feedbackMirrorEmbed(input: {
  id: string;
  kind: FeedbackKind;
  surface: FeedbackSurface;
  title: string;
  details: string;
  reporterDisplayName: string;
  reporterDiscordUserId: string;
  guildName?: string | null;
  discordGuildId?: string | null;
  opsUrl?: string | null;
}): {
  embeds: Array<{
    title: string;
    color: number;
    description: string;
    fields: Array<{ name: string; value: string; inline?: boolean }>;
    footer: { text: string };
    timestamp: string;
  }>;
} {
  const kindLabel = input.kind === "bug" ? "Bug" : "Suggestion";
  const color = input.kind === "bug" ? 0xff5a3d : 0xb8f000;
  const details =
    input.details.trim().length > 800
      ? `${input.details.trim().slice(0, 797)}…`
      : input.details.trim() || "—";
  const guild =
    input.guildName?.trim() ||
    input.discordGuildId?.trim() ||
    "—";
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: "Kind", value: kindLabel, inline: true },
    { name: "Surface", value: input.surface, inline: true },
    { name: "Guild", value: guild.slice(0, 100), inline: true },
    {
      name: "Reporter",
      value: `${input.reporterDisplayName || "unknown"} (\`${input.reporterDiscordUserId}\`)`,
      inline: false,
    },
  ];
  if (input.opsUrl) {
    fields.push({
      name: "Ops",
      value: `[Open in /ops](${input.opsUrl})`,
      inline: false,
    });
  }
  return {
    embeds: [
      {
        title: `${kindLabel}: ${input.title.slice(0, 200)}`,
        color,
        description: details,
        fields,
        footer: { text: `id ${input.id}` },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
