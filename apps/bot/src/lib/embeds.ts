import { BRAND } from "@rallied/shared";

/** Discord embed / component helpers (Phase 1.5). */

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface Embed {
  title?: string;
  description?: string;
  color?: number;
  fields?: EmbedField[];
  footer?: { text: string };
  timestamp?: string;
}

export const CORAL = parseInt(BRAND.colors.coral.replace("#", ""), 16);
export const LIME = parseInt(BRAND.colors.ghostlessLime.replace("#", ""), 16);

export function lfgPartyEmbed(opts: {
  game: string;
  rankText: string;
  slots: number;
  filled: number;
  hostName: string;
  hostMention: string;
  partyId: string;
  ghostlessLabel?: string | null;
}): Embed {
  return {
    title: `LFG · ${opts.game}`,
    color: CORAL,
    fields: [
      { name: "Rank", value: opts.rankText || "Any", inline: true },
      {
        name: "Slots",
        value: `${opts.filled}/${opts.slots}`,
        inline: true,
      },
      {
        name: "Host",
        value: `${opts.hostMention} (${opts.hostName})`,
        inline: true,
      },
      {
        name: "Ghostless",
        value: opts.ghostlessLabel ?? "New in this server",
        inline: true,
      },
      {
        name: "Party id",
        value: `\`${opts.partyId}\``,
        inline: false,
      },
    ],
    footer: { text: "Rallied · this server only" },
    timestamp: new Date().toISOString(),
  };
}

export function ghostlessPlayerEmbed(opts: {
  displayName: string;
  mention: string;
  shows: number;
  ghosts: number;
  showRatePct: number | null;
  vibeAvg: number | null;
  strikeCount: number;
}): Embed {
  const rate =
    opts.showRatePct == null ? "—" : `${opts.showRatePct}% show rate`;
  const badge =
    opts.showRatePct == null
      ? "New"
      : opts.showRatePct >= 90
        ? "Ghostless"
        : opts.showRatePct >= 75
          ? "Reliable"
          : "Watch";

  return {
    title: `${opts.displayName} · ${badge}`,
    description: `${opts.mention} — **this server only** (not a global grade)`,
    color: opts.showRatePct != null && opts.showRatePct >= 90 ? LIME : CORAL,
    fields: [
      { name: "Shows", value: String(opts.shows), inline: true },
      { name: "Ghosts", value: String(opts.ghosts), inline: true },
      { name: "Rate", value: rate, inline: true },
      {
        name: "Avg vibe",
        value: opts.vibeAvg != null ? `${opts.vibeAvg}/5` : "—",
        inline: true,
      },
      {
        name: "Active strikes",
        value: String(opts.strikeCount),
        inline: true,
      },
    ],
    footer: { text: "Rallied Ghostless · per-server" },
  };
}

export function vibeCheckMessage(opts: {
  rateeMention: string;
  partyId: string;
  rateeMemberId: string;
}) {
  const custom = (action: string) =>
    `vibe:${action}:${opts.partyId}:${opts.rateeMemberId}`;

  return {
    content: `**Vibe Check** for ${opts.rateeMention} — how did they do? (this server)`,
    embeds: [
      {
        description:
          "Showed up · good vibes · or ghosted. Grace window applies before ghost strikes.",
        color: LIME,
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: "Showed up",
            custom_id: custom("showed"),
          },
          {
            type: 2,
            style: 1,
            label: "Vibes",
            custom_id: custom("good"),
          },
          {
            type: 2,
            style: 4,
            label: "Ghosted",
            custom_id: custom("ghosted"),
          },
          {
            type: 2,
            style: 2,
            label: "Dispute",
            custom_id: `dispute:open:${opts.partyId}:${opts.rateeMemberId}`,
          },
        ],
      },
    ],
  };
}

export function publicEmbed(embed: Embed, components?: unknown[]) {
  return {
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: {
      embeds: [embed],
      ...(components ? { components } : {}),
    },
  };
}

export function ephemeralEmbed(embed: Embed) {
  return {
    type: 4,
    data: {
      embeds: [embed],
      flags: 64,
    },
  };
}
