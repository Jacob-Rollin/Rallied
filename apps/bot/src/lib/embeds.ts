import { BRAND, GAME_CATALOG, GHOSTLESS } from "@rallied/shared";
import { InteractionResponseType } from "./discord.js";

/** Discord embed / component helpers (Phase 1.5). */

/** Discord select menus allow at most 25 options. */
const SELECT_MAX = 25;
/** Reserved for "Other…" on create-game select. */
const CREATE_GAME_SLOTS = SELECT_MAX - 1;
/** Reserved for "All games" on find-game select. */
const FIND_GAME_SLOTS = SELECT_MAX - 1;

export const LFG_OTHER_GAME = "__other__";
export const LFG_ALL_GAMES = "__all__";

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

/**
 * Join / Leave / Close / Ready Check / Vibe.
 * Join hidden when filled/closed. Ready Check on open|filled (host starts Play mock).
 */
export function lfgPartyComponents(
  partyId: string,
  status: "open" | "filled" | "closed" = "open",
) {
  const rows: unknown[] = [];
  const primary: unknown[] = [];

  if (status === "open") {
    primary.push({
      type: 2,
      style: 3,
      label: "Join",
      custom_id: `lfg:join:${partyId}`,
    });
  }

  if (status === "open" || status === "filled") {
    primary.push(
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
    );
  }

  if (primary.length > 0) {
    rows.push({ type: 1, components: primary.slice(0, 5) });
  }

  const secondary: unknown[] = [];
  if (status === "open" || status === "filled") {
    secondary.push({
      type: 2,
      style: 1,
      label: status === "filled" ? "Ready Check" : "Ready Check",
      custom_id: `lfg:ready:${partyId}`,
    });
  }
  secondary.push({
    type: 2,
    style: 2,
    label: "Vibe Check",
    custom_id: `lfg:vibe:${partyId}`,
  });
  rows.push({ type: 1, components: secondary.slice(0, 5) });

  return rows;
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
  members?: { mention: string; role: string }[];
  threadId?: string | null;
  status?: "open" | "filled" | "closed";
}): Embed {
  const status = opts.status ?? "open";
  const titlePrefix =
    status === "filled" ? "Filled" : status === "closed" ? "Closed" : "LFG";
  const roster =
    opts.members && opts.members.length > 0
      ? opts.members
          .map((m) =>
            m.role === "host" ? `${m.mention} (host)` : m.mention,
          )
          .join("\n")
          .slice(0, 1024)
      : opts.hostMention;

  const fields: EmbedField[] = [
    { name: "Notes", value: opts.rankText || "Any", inline: true },
    {
      name: "Slots",
      value: `${opts.filled}/${opts.slots}`,
      inline: true,
    },
    {
      name: "Ghostless",
      value: opts.ghostlessLabel ?? "New in this server",
      inline: true,
    },
    { name: "Squad", value: roster, inline: false },
  ];

  if (opts.threadId) {
    fields.push({
      name: "Squad chat",
      value: `<#${opts.threadId}> — hop in to share codes / VC`,
      inline: false,
    });
  }

  return {
    title: `${titlePrefix} · ${opts.game}`,
    color: status === "closed" ? 0x6b7280 : status === "filled" ? LIME : CORAL,
    description:
      status === "open"
        ? "Tap **Join**, then coordinate in the squad thread."
        : status === "filled"
          ? "Party full — Leave frees a slot; Close when you're done."
          : "Party closed. Use **Vibe Check** to rate teammates.",
    fields,
    footer: { text: `Rallied · this server only · \`${opts.partyId.slice(0, 8)}\`` },
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

/** Empty find — nudge Create instead of a dead end. */
export function lfgFindEmptyMessage(gameFilter?: string | null) {
  const line = gameFilter
    ? `No open **${gameFilter}** parties in this server.`
    : "No open LFG parties in this server.";
  return {
    content: `${line}\nStart one?`,
    flags: 64,
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: "Create party",
            custom_id: "lfg:desk:create",
          },
        ],
      },
    ],
  };
}

/** Ephemeral confirm before closing a party. */
export function lfgCloseConfirmMessage(partyId: string, game: string) {
  return {
    content: `Close **${game}** party? This can't be undone.`,
    flags: 64,
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 4,
            label: "Confirm close",
            custom_id: `lfg:closeconfirm:${partyId}`,
          },
          {
            type: 2,
            style: 2,
            label: "Cancel",
            custom_id: `lfg:closecancel:${partyId}`,
          },
        ],
      },
    ],
  };
}

/** After fill/close — nudge into Vibe Check. */
export function lfgVibeNudgeMessage(partyId: string, game: string) {
  return {
    content: `**${game}** session wrapping up — rate your teammates?`,
    flags: 64,
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 1,
            label: "Vibe Check",
            custom_id: `lfg:vibe:${partyId}`,
          },
        ],
      },
    ],
  };
}

export function lfgDeskPinHintMessage() {
  return {
    content:
      "Desk posted. **Long-press → Pin** so it stays at the top of this channel (use `#lfg-board` if you have one).",
    flags: 64,
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
  /** Settings-driven badge (Ghostless only when rate + min sessions met). */
  badge: string;
  subtitle: string;
  eligibleGhostless: boolean;
}): Embed {
  const rate =
    opts.showRatePct == null ? "—" : `${opts.showRatePct}%`;

  return {
    title: opts.displayName,
    description: [
      opts.mention,
      opts.subtitle,
      opts.eligibleGhostless
        ? `${GHOSTLESS.mark} **${GHOSTLESS.name}** — earned on this server`
        : `Badge: **${opts.badge}** (this server only — not a global grade)`,
    ].join("\n"),
    color: opts.eligibleGhostless ? LIME : CORAL,
    fields: [
      { name: "Show rate", value: rate, inline: true },
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
    footer: { text: "Rallied Ghostless · this server only" },
  };
}

/** Ready-check embed matching landing Play mock (roster + grace timestamp). */
export function readyCheckEmbed(opts: {
  game: string;
  partyId: string;
  graceEndsUnix: number;
  members: {
    mention: string;
    displayName: string;
    role: string;
    ready: boolean;
  }[];
  resolved?: boolean;
}): Embed {
  const readyCount = opts.members.filter((m) => m.ready).length;
  const total = opts.members.length;
  const roster = opts.members
    .map((m) => {
      const host = m.role === "host" ? " (host)" : "";
      const mark = m.ready ? "✅ Ready" : "⏳ Waiting…";
      return `${mark} — ${m.mention}${host}`;
    })
    .join("\n")
    .slice(0, 1024);

  if (opts.resolved) {
    return {
      title: `Ready check · ${opts.game}`,
      description: "Grace ended — waiting members marked as no-shows (this server).",
      color: 0x6b7280,
      fields: [
        { name: "Roster", value: roster || "—", inline: false },
        {
          name: "Progress",
          value: `${readyCount}/${total} ready`,
          inline: true,
        },
      ],
      footer: { text: `Rallied · \`${opts.partyId.slice(0, 8)}\`` },
    };
  }

  return {
    title: `Ready check · ${opts.game}`,
    description: `Tap **Ready** before grace ends <t:${opts.graceEndsUnix}:R>. No-shows get a strike after grace (this server).`,
    color: LIME,
    fields: [
      { name: "Roster", value: roster || "—", inline: false },
      {
        name: "Progress",
        value: `${readyCount}/${total} ready · auto-strike after grace`,
        inline: false,
      },
      {
        name: "Grace",
        value: `<t:${opts.graceEndsUnix}:R> (<t:${opts.graceEndsUnix}:t>)`,
        inline: true,
      },
    ],
    footer: { text: `Rallied · \`${opts.partyId.slice(0, 8)}\`` },
    timestamp: new Date().toISOString(),
  };
}

export function readyCheckComponents(partyId: string, resolved = false) {
  if (resolved) {
    return [
      {
        type: 1,
        components: [
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
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 3,
          label: "Ready",
          custom_id: `lfg:readyup:${partyId}`,
        },
        {
          type: 2,
          style: 2,
          label: "Vibe Check",
          custom_id: `lfg:vibe:${partyId}`,
        },
      ],
    },
  ];
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

/** Pinned-style LFG desk panel (public channel message). */
export function lfgDeskMessage() {
  return {
    embeds: [
      {
        title: "Rallied LFG — find or start a squad",
        description:
          "Tap a button below — no slash commands needed. Parties stay **in this server** only.",
        color: CORAL,
        footer: { text: "Rallied · pin this message in your LFG channel" },
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: "Create party",
            custom_id: "lfg:desk:create",
          },
          {
            type: 2,
            style: 1,
            label: "Find party",
            custom_id: "lfg:desk:find",
          },
          {
            type: 2,
            style: 2,
            label: "My parties",
            custom_id: "lfg:desk:mine",
          },
          {
            type: 2,
            style: 2,
            label: "How it works",
            custom_id: "lfg:desk:help",
          },
        ],
      },
    ],
  };
}

function catalogSelectOptions(limit: number) {
  // Prefer slug values — unique, stable, safe in modal custom_ids.
  return GAME_CATALOG.slice(0, limit).map((g) => ({
    label: g.name.slice(0, 100),
    value: g.slug.slice(0, 100),
  }));
}

function resolveCatalogGame(key: string): string {
  const hit = GAME_CATALOG.find(
    (g) => g.slug === key || g.name.toLowerCase() === key.toLowerCase(),
  );
  return hit?.name ?? key;
}

/** Ephemeral: pick a game before the create modal (modals have no autocomplete). */
export function lfgCreateGameSelectMessage() {
  const options = [
    ...catalogSelectOptions(CREATE_GAME_SLOTS),
    {
      label: "Other (type game next)",
      value: LFG_OTHER_GAME,
      description: "Niche title — type it in the form",
    },
  ];

  return {
    content:
      "**Create party** — pick a game (keeps titles tidy for Find + analytics). Next popup: size, mic, notes.\n_After you submit, tap **Dismiss message** on this picker._",
    flags: 64,
    components: [
      {
        type: 1,
        components: [
          {
            type: 3,
            custom_id: "lfg:creategame",
            placeholder: "Select a game…",
            min_values: 1,
            max_values: 1,
            options,
          },
        ],
      },
    ],
  };
}

/** Ephemeral: optional game filter before find results. */
export function lfgFindGameSelectMessage() {
  const options = [
    {
      label: "All games",
      value: LFG_ALL_GAMES,
    },
    ...catalogSelectOptions(FIND_GAME_SLOTS),
  ];

  return {
    content: "**Find party** — filter by game, or show all.",
    flags: 64,
    components: [
      {
        type: 1,
        components: [
          {
            type: 3,
            custom_id: "lfg:findgame",
            placeholder: "Filter by game...",
            min_values: 1,
            max_values: 1,
            options,
          },
        ],
      },
    ],
  };
}

/**
 * Immediate MODAL response (type 9) — must not be deferred.
 * Discord modals cannot include select menus or checkboxes — game comes from
 * the prior select (or a text field for Other). Mic is a short text enum.
 */
export function lfgCreateModalResponse(gameKey: string) {
  const isOther = gameKey === LFG_OTHER_GAME;
  const display = isOther ? "" : resolveCatalogGame(gameKey);
  const idKey = isOther
    ? LFG_OTHER_GAME
    : (GAME_CATALOG.find(
        (g) =>
          g.slug === gameKey || g.name.toLowerCase() === gameKey.toLowerCase(),
      )?.slug ?? gameKey);
  const title = isOther ? "Create party" : `Create · ${display}`.slice(0, 45);
  const customId = `lfg:createsubmit:${idKey}`.slice(0, 100);

  const rows: unknown[] = [];

  if (isOther) {
    rows.push({
      type: 1,
      components: [
        {
          type: 4,
          custom_id: "game",
          label: "Game",
          style: 1,
          required: true,
          min_length: 1,
          max_length: 80,
          placeholder: "Valorant, val, lol, COD…",
        },
      ],
    });
  }

  rows.push({
    type: 1,
    components: [
      {
        type: 4,
        custom_id: "size",
        label: "Party size (2-20)",
        style: 1,
        required: true,
        min_length: 1,
        max_length: 2,
        value: "5",
        placeholder: "5",
      },
    ],
  });

  rows.push({
    type: 1,
    components: [
      {
        type: 4,
        custom_id: "mic",
        label: "Mic (optional)",
        style: 1,
        required: false,
        max_length: 20,
        placeholder: "required / optional / any",
      },
    ],
  });

  rows.push({
    type: 1,
    components: [
      {
        type: 4,
        custom_id: "notes",
        label: "Notes / rank (optional)",
        style: 2,
        required: false,
        max_length: 200,
        placeholder: "Rank, region, vibe…",
      },
    ],
  });

  return {
    type: InteractionResponseType.MODAL,
    data: {
      custom_id: customId,
      title,
      components: rows,
    },
  };
}

/** Normalize free-text mic answers into a short enum for cards + analytics. */
export function normalizeMic(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (!key) return "";
  if (
    ["required", "req", "yes", "y", "must", "mic on", "on mic"].includes(key) ||
    key.includes("requir")
  ) {
    return "Required";
  }
  if (
    ["optional", "opt", "no", "n", "mute", "no mic", "off"].includes(key) ||
    key.includes("optional")
  ) {
    return "Optional";
  }
  if (["any", "either", "n/a", "na", "whatever"].includes(key)) {
    return "Any";
  }
  return raw.trim().slice(0, 40);
}

/** Compose Notes field: mic enum + free notes (no schema change). */
export function composePartyNotes(micRaw: string, notesRaw: string): string {
  const mic = normalizeMic(micRaw);
  const notes = notesRaw.trim();
  if (mic && notes) return `Mic: ${mic} · ${notes}`;
  if (mic) return `Mic: ${mic}`;
  return notes;
}

/** Resolve modal/select game key (slug, name, or Other) to a party game string. */
export function resolveCreateGameKey(gameKey: string): string {
  if (gameKey === LFG_OTHER_GAME) return "";
  return resolveCatalogGame(gameKey);
}

export function lfgHowItWorksMessage() {
  return {
    content: [
      "**How Rallied LFG works** (this server only)",
      "• **Create party** — pick a game → form (size, mic, notes) → party card + **squad thread**.",
      "• **Join** — tap the **squad thread** under the card to share invite codes / VC.",
      "• **Ready Check** — when the squad fills (or host taps it): Ready / Waiting + grace timer; no-shows get a strike.",
      "• **Leave / Close** — Leave if you're a member; hosts Confirm-close, then **Vibe Check**.",
      "• **Find / My parties** — browse open parties in this server.",
      "• **`/ghostless`** — this-server show rate + Ghostless badge (not a global grade).",
      "Slash backups: `/lfg create` · `/lfg find` · `/vibe` · `/ghostless`",
    ].join("\n"),
    flags: 64,
  };
}

/** Ephemeral list of the actor's open parties with Close for hosts. */
export function lfgMyPartiesMessage(opts: {
  lines: string[];
  hostParties: { id: string; game: string }[];
}) {
  const components =
    opts.hostParties.length > 0
      ? [
          {
            type: 1,
            components: opts.hostParties.slice(0, 5).map((p) => ({
              type: 2,
              style: 4,
              label: `Close ${p.game}`.slice(0, 80),
              custom_id: `lfg:close:${p.id}`,
            })),
          },
        ]
      : [];

  return {
    content:
      opts.lines.length > 0
        ? `**Your open parties**\n${opts.lines.join("\n")}`
        : "You're not in any open parties in this server.",
    flags: 64,
    components,
  };
}
