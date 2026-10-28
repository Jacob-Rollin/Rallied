import { BRAND } from "@rallied/shared";
import { InteractionResponseType } from "./discord.js";

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

/** Join / Leave / Close / Vibe actions on a public party embed. */
export function lfgPartyComponents(partyId: string) {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 3,
          label: "Join",
          custom_id: `lfg:join:${partyId}`,
        },
        {
          type: 2,
          style: 2,
          label: "Leave",
          custom_id: `lfg:leave:${partyId}`,
        },
        {
          type: 2,
          style: 4,
          label: "Close",
          custom_id: `lfg:close:${partyId}`,
        },
        {
          type: 2,
          style: 1,
          label: "Vibe Check",
          custom_id: `lfg:vibe:${partyId}`,
        },
      ],
    },
  ];
}

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

/** Ephemeral find results: pick a party from a select (mobile-friendly). */
export function lfgFindMessage(opts: {
  lines: string[];
  parties: { id: string; game: string; rank_text: string; slots: number; filled: number }[];
  gameFilter?: string | null;
}) {
  const header = opts.gameFilter
    ? `Open **${opts.gameFilter}** parties (this server):`
    : "Open parties (this server):";

  const options = opts.parties.slice(0, 25).map((p, i) => {
    const label = `${p.game} · ${p.filled}/${p.slots}`.slice(0, 100);
    const desc = (p.rank_text || "Any rank").slice(0, 100);
    return {
      label: label.length ? label : `Party ${i + 1}`,
      description: desc,
      value: p.id,
    };
  });

  const components =
    options.length > 0
      ? [
          {
            type: 1,
            components: [
              {
                type: 3,
                custom_id: "lfg:joinselect",
                placeholder: "Tap to join a party…",
                min_values: 1,
                max_values: 1,
                options,
              },
            ],
          },
        ]
      : [];

  return {
    content: `${header}\n${opts.lines.join("\n")}`,
    flags: 64,
    components,
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
          "Tap a quick result, or pick a vibe score 1–5. Grace window applies before ghost strikes.",
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
      {
        type: 1,
        components: [
          {
            type: 3,
            custom_id: `vibe:score:${opts.partyId}:${opts.rateeMemberId}`,
            placeholder: "Rate vibe 1–5 (counts as showed up)",
            min_values: 1,
            max_values: 1,
            options: [
              { label: "1 — Rough", value: "1", description: "Showed up, rough session" },
              { label: "2 — Meh", value: "2", description: "Showed up" },
              { label: "3 — Fine", value: "3", description: "Showed up, solid" },
              { label: "4 — Good", value: "4", description: "Showed up, good vibes" },
              { label: "5 — Great", value: "5", description: "Showed up, great teammate" },
            ],
          },
        ],
      },
    ],
  };
}

/** Ephemeral: pick which party member to vibe-check. */
export function vibePickMemberMessage(opts: {
  partyId: string;
  members: { memberId: string; label: string }[];
}) {
  const options = opts.members.slice(0, 25).map((m) => ({
    label: m.label.slice(0, 100),
    value: m.memberId,
  }));

  return {
    content: "Who do you want to Vibe Check? (this party, this server)",
    flags: 64,
    components: [
      {
        type: 1,
        components: [
          {
            type: 3,
            custom_id: `vibe:pick:${opts.partyId}`,
            placeholder: "Pick a teammate…",
            min_values: 1,
            max_values: 1,
            options,
          },
        ],
      },
    ],
  };
}

export function publicEmbed(embed: Embed, components?: unknown[]) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [embed],
      ...(components ? { components } : {}),
    },
  };
}

export function ephemeralEmbed(embed: Embed) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [embed],
      flags: 64,
    },
  };
}
