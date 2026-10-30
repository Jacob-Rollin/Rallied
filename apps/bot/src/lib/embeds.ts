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
 * Join / Waitlist / Leave / Close / Ready Check / Vibe (+ optional Join VC link).
 * Filled parties keep a Waitlist button. Ready Check on open|filled.
 */
export function lfgPartyComponents(
  partyId: string,
  status: "open" | "filled" | "closed" = "open",
  opts?: { voiceUrl?: string | null },
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
  } else if (status === "filled") {
    primary.push({
      type: 2,
      style: 2,
      label: "Waitlist",
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
      label: "Ready Check",
      custom_id: `lfg:ready:${partyId}`,
    });
  }
  secondary.push({
    type: 2,
    style: 2,
    label: "Vibe Check",
    custom_id: `lfg:vibe:${partyId}`,
  });
  if (opts?.voiceUrl && (status === "open" || status === "filled")) {
    secondary.push({
      type: 2,
      style: 5,
      label: "Join VC",
      url: opts.voiceUrl,
    });
  }
  rows.push({ type: 1, components: secondary.slice(0, 5) });

  return rows;
}

export function lfgPartyEmbed(opts: {
  game: string;
  rankText: string;
  mic?: string;
  region?: string;
  slots: number;
  filled: number;
  waitlistCount?: number;
  hostName: string;
  hostMention: string;
  partyId: string;
  ghostlessLabel?: string | null;
  members?: { mention: string; role: string }[];
  threadId?: string | null;
  voiceChannelId?: string | null;
  scheduledStartAt?: string | null;
  status?: "open" | "filled" | "closed";
}): Embed {
  const status = opts.status ?? "open";
  const titlePrefix =
    status === "filled" ? "Filled" : status === "closed" ? "Closed" : "LFG";
  const seated =
    opts.members?.filter((m) => m.role === "host" || m.role === "member") ??
    [];
  const waitlisted =
    opts.members?.filter((m) => m.role === "waitlist") ?? [];
  const roster =
    seated.length > 0
      ? seated
          .map((m) =>
            m.role === "host" ? `${m.mention} (host)` : m.mention,
          )
          .join("\n")
          .slice(0, 1024)
      : opts.hostMention;

  const waitlistCount = opts.waitlistCount ?? waitlisted.length;
  const slotsValue =
    waitlistCount > 0
      ? `${opts.filled}/${opts.slots} · ${waitlistCount} wait`
      : `${opts.filled}/${opts.slots}`;

  const fields: EmbedField[] = [
    { name: "Rank", value: opts.rankText || "Any", inline: true },
    { name: "Mic", value: opts.mic || "Any", inline: true },
    { name: "Region", value: opts.region || "Any", inline: true },
    {
      name: "Slots",
      value: slotsValue,
      inline: true,
    },
    {
      name: "Ghostless",
      value: opts.ghostlessLabel ?? "New in this server",
      inline: true,
    },
  ];

  if (opts.scheduledStartAt) {
    const unix = Math.floor(new Date(opts.scheduledStartAt).getTime() / 1000);
    fields.push({
      name: "Starts",
      value: `<t:${unix}:f> · <t:${unix}:R>`,
      inline: true,
    });
  }

  fields.push({ name: "Squad", value: roster, inline: false });

  if (waitlistCount > 0 && waitlisted.length > 0) {
    fields.push({
      name: "Waitlist",
      value: waitlisted
        .map((m) => m.mention)
        .join(", ")
        .slice(0, 1024),
      inline: false,
    });
  }

  if (opts.voiceChannelId) {
    fields.push({
      name: "Voice",
      value: `<#${opts.voiceChannelId}> — tap **Join VC** or the channel`,
      inline: false,
    });
  }

  if (opts.threadId) {
    fields.push({
      name: "Squad chat",
      value: `<#${opts.threadId}> — hop in to share codes`,
      inline: false,
    });
  }

  return {
    title: `${titlePrefix} · ${opts.game}`,
    color: status === "closed" ? 0x6b7280 : status === "filled" ? LIME : CORAL,
    description:
      status === "open"
        ? "Tap **Join**, then hop into voice / the squad thread."
        : status === "filled"
          ? "Party full — **Waitlist** for the next seat; Leave frees a slot."
          : "Party closed. Use **Vibe Check** to rate teammates.",
    fields,
    footer: { text: `Rallied · this server only · \`${opts.partyId.slice(0, 8)}\`` },
    timestamp: new Date().toISOString(),
  };
}

/** Ephemeral find results: pick a party from a select (mobile-friendly). */
export function lfgFindMessage(opts: {
  lines: string[];
  parties: {
    id: string;
    game: string;
    rank_text: string;
    mic?: string;
    region?: string;
    slots: number;
    filled: number;
  }[];
  gameFilter?: string | null;
  filterSummary?: string | null;
}) {
  const headerParts = [
    opts.gameFilter
      ? `Open **${opts.gameFilter}** parties (this server):`
      : "Open parties (this server):",
  ];
  if (opts.filterSummary) {
    headerParts.push(`_Filters: ${opts.filterSummary}_`);
  }
  const header = headerParts.join("\n");

  const options = opts.parties.slice(0, 25).map((p, i) => {
    const label = `${p.game} · ${p.filled}/${p.slots}`.slice(0, 100);
    const bits = [p.rank_text, p.mic, p.region].filter(Boolean);
    const desc = (bits.join(" · ") || "Any rank / mic / region").slice(0, 100);
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

/** Per-server monthly Most reliable + Top hosts (Community+). */
export function leaderboardEmbed(opts: {
  serverName: string;
  monthLabel: string;
  mostReliable: {
    displayName: string;
    discordUserId?: string;
    showRatePct: number;
  }[];
  topHosts: {
    displayName: string;
    discordUserId?: string;
    partiesHosted: number;
  }[];
}): Embed {
  const reliableLines =
    opts.mostReliable.length === 0
      ? "_No one with enough sessions yet._"
      : opts.mostReliable
          .map((r, i) => {
            const who = r.discordUserId
              ? `<@${r.discordUserId}>`
              : r.displayName;
            return `**${i + 1}.** ${who} — **${r.showRatePct}%**`;
          })
          .join("\n");

  const hostLines =
    opts.topHosts.length === 0
      ? "_No parties hosted this month yet._"
      : opts.topHosts
          .map((h, i) => {
            const who = h.discordUserId
              ? `<@${h.discordUserId}>`
              : h.displayName;
            const n = h.partiesHosted;
            return `**${i + 1}.** ${who} — **${n}** part${n === 1 ? "y" : "ies"}`;
          })
          .join("\n");

  return {
    title: `Leaderboard · ${opts.monthLabel}`,
    description: `**${opts.serverName}** only — not a cross-server network.`,
    color: LIME,
    fields: [
      {
        name: "Most reliable (Ghostless %)",
        value: reliableLines.slice(0, 1024),
        inline: false,
      },
      {
        name: "Top hosts (this month)",
        value: hostLines.slice(0, 1024),
        inline: false,
      },
    ],
    footer: { text: "Rallied · Community+" },
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
  /** Community+ / trial — Starter uses soft ready copy. */
  reliabilityEnabled?: boolean;
}): Embed {
  const readyCount = opts.members.filter((m) => m.ready).length;
  const total = opts.members.length;
  const reliabilityOn = opts.reliabilityEnabled ?? false;
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
      description: reliabilityOn
        ? "Grace ended — waiting members marked as no-shows (this server)."
        : "Grace ended — waiting members marked as no-shows (soft check on Starter; no strikes).",
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
    description: reliabilityOn
      ? `Tap **Ready** before grace ends <t:${opts.graceEndsUnix}:R>. No-shows get a strike after grace (this server).`
      : `Tap **Ready** before grace ends <t:${opts.graceEndsUnix}:R>. Soft check on Starter — no strikes. Community adds Ghostless + auto-strike after grace.`,
    color: LIME,
    fields: [
      { name: "Roster", value: roster || "—", inline: false },
      {
        name: "Progress",
        value: reliabilityOn
          ? `${readyCount}/${total} ready · auto-strike after grace`
          : `${readyCount}/${total} ready · soft check (no strikes)`,
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
  /** Community+ / trial — Starter has no strikes. */
  reliabilityEnabled?: boolean;
}) {
  const custom = (action: string) =>
    `vibe:${action}:${opts.partyId}:${opts.rateeMemberId}`;
  const reliabilityOn = opts.reliabilityEnabled ?? false;

  return {
    content: `**Vibe Check** for ${opts.rateeMention} — how did they do? (this server)`,
    embeds: [
      {
        description: reliabilityOn
          ? "Tap a quick result, or pick a vibe score 1–5. After grace, **Ghosted** issues a strike (this server) when Ready Check did not run. Ready Check owns shows/ghosts once it starts. Dispute is for the flagged player."
          : "Tap a quick result, or pick a vibe score 1–5. Soft on Starter — **Ghosted** does not issue a strike or Ghostless stats. Community adds strikes + Ghostless.",
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
        ],
      },
      {
        type: 1,
        components: [
          {
            type: 3,
            custom_id: `vibe:score:${opts.partyId}:${opts.rateeMemberId}`,
            placeholder: "Rate vibe 1–5 (optional score)",
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

/** Public/thread CTA so the ratee (not the rater) can open a dispute. */
export function vibeGhostDisputeMessage(opts: {
  rateeMention: string;
  partyId: string;
  rateeMemberId: string;
}) {
  return {
    content: `${opts.rateeMention} — flagged **Ghosted** after grace (this server). Only you can dispute:`,
    components: [
      {
        type: 1,
        components: [
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
            label: "Board",
            custom_id: "lfg:desk:leaderboard",
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
 * Discord modals max 5 rows. Catalog: size + mic + rank + region + start.
 * Other: game + size + mic + notes + start (rank/region live in notes).
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

  if (isOther) {
    rows.push({
      type: 1,
      components: [
        {
          type: 4,
          custom_id: "notes",
          label: "Rank / region / notes (optional)",
          style: 2,
          required: false,
          max_length: 200,
          placeholder: "Diamond+ · NA · chill ranked",
        },
      ],
    });
  } else {
    rows.push({
      type: 1,
      components: [
        {
          type: 4,
          custom_id: "rank",
          label: "Rank (optional)",
          style: 1,
          required: false,
          max_length: 80,
          placeholder: "Diamond+, Gold–Plat, Any…",
        },
      ],
    });
    rows.push({
      type: 1,
      components: [
        {
          type: 4,
          custom_id: "region",
          label: "Region (optional)",
          style: 1,
          required: false,
          max_length: 40,
          placeholder: "NA, EU, West, Oce…",
        },
      ],
    });
  }

  rows.push({
    type: 1,
    components: [
      {
        type: 4,
        custom_id: "start",
        label: "Start time (optional)",
        style: 1,
        required: false,
        max_length: 32,
        placeholder: "in 30m · in 1h · YYYY-MM-DD HH:MM UTC",
      },
    ],
  });

  // Discord modal max = 5 action rows.
  return {
    type: InteractionResponseType.MODAL,
    data: {
      custom_id: customId,
      title,
      components: rows.slice(0, 5),
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

/** @deprecated Prefer structured mic + rank + region columns (008). */
export function composePartyNotes(micRaw: string, notesRaw: string): string {
  const mic = normalizeMic(micRaw);
  const notes = notesRaw.trim();
  if (mic && notes) return `Mic: ${mic} · ${notes}`;
  if (mic) return `Mic: ${mic}`;
  return notes;
}

/** Normalize region free text for storage / filter. */
export function normalizeRegion(raw: string): string {
  return raw.trim().slice(0, 40);
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
      "• **Starter** — matching under caps (2 open · 5 creates/24h). Soft Ready/Vibe — no strikes. Upgrade to Community for Ghostless.",
      "• **Create party** — pick a game → size, mic, rank, region, optional start → card + **temp voice** + squad thread.",
      "• **Join / Waitlist** — Join seats you; when full, **Waitlist** promotes when someone Leaves.",
      "• **Voice** — tap **Join VC** on the card (bot needs **Manage Channels**).",
      "• **Schedule** — optional start (`in 30m` / UTC time); reminder ~10 minutes before.",
      "• **Ready Check** — on fill (or host tap): Ready / Waiting + grace; no-shows struck on Community+.",
      "• **Standby** — ready-fail opens a seat → next waitlist promotes + ping (if any).",
      "• **Leave / Close** — Leave (or leave waitlist); hosts Confirm-close (voice deleted), then **Vibe Check**.",
      "• **Find** — browse / filter by game, mic, region.",
      "• **Board / `/leaderboard`** — monthly Most reliable + Top hosts (this server).",
      "• **`/ghostless`** — this-server show rate (not a global grade).",
      "Slash: `/lfg create` · `/lfg find` · `/vibe` · `/ghostless` · `/leaderboard`",
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
