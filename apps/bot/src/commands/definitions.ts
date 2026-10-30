/** Slash command payloads for Discord REST register (Phase 1 + 1.5). */

/** STRING option with APPLICATION_COMMAND_AUTOCOMPLETE. */
const gameOption = (opts: {
  name?: string;
  description: string;
  required: boolean;
}) => ({
  type: 3,
  name: opts.name ?? "game",
  description: opts.description,
  required: opts.required,
  autocomplete: true,
});

export const commandDefinitions = [
  {
    name: "lfg",
    description: "Looking-for-group parties (this server)",
    options: [
      {
        type: 1,
        name: "create",
        description: "Create an LFG party (rich embed)",
        options: [
          gameOption({
            description: "Game — type a few letters and pick from the list",
            required: true,
          }),
          { type: 3, name: "rank", description: "Rank / MMR text", required: false },
          {
            type: 3,
            name: "mic",
            description: "Mic: required / optional / any",
            required: false,
          },
          {
            type: 3,
            name: "region",
            description: "Region (NA, EU, West…)",
            required: false,
          },
          {
            type: 3,
            name: "start",
            description: "Optional start: in 30m, in 1h, or YYYY-MM-DD HH:MM UTC",
            required: false,
          },
          {
            type: 4,
            name: "slots",
            description: "Total slots including you (2–20)",
            required: false,
            min_value: 2,
            max_value: 20,
          },
        ],
      },
      {
        type: 1,
        name: "find",
        description: "List open LFG parties in this server",
        options: [
          gameOption({
            description: "Filter by game (optional) — type to autocomplete",
            required: false,
          }),
          {
            type: 3,
            name: "mic",
            description: "Filter by mic (required / optional / any)",
            required: false,
          },
          {
            type: 3,
            name: "region",
            description: "Filter by region text",
            required: false,
          },
          {
            type: 3,
            name: "rank",
            description: "Filter by rank text",
            required: false,
          },
        ],
      },
      {
        type: 1,
        name: "close",
        description: "Close your open LFG party",
      },
      {
        type: 1,
        name: "desk",
        description: "Mod: post the LFG desk panel in this channel",
      },
    ],
    // Members need create/find/close; /lfg desk stays mod-gated at runtime.
  },
  {
    name: "setup",
    description: "Mod: post the Rallied LFG desk panel in this channel",
    default_member_permissions: "32",
  },
  {
    name: "vibe",
    description: "Vibe Check a teammate — omit showed_up to post buttons",
    options: [
      {
        type: 6,
        name: "user",
        description: "Teammate to rate (this server)",
        required: true,
      },
      {
        type: 5,
        name: "showed_up",
        description: "Did they show up? (omit to send button UI)",
        required: false,
      },
      {
        type: 4,
        name: "score",
        description: "Vibe 1–5",
        required: false,
        min_value: 1,
        max_value: 5,
      },
      {
        type: 5,
        name: "ghosted",
        description: "Did they ghost?",
        required: false,
      },
      {
        type: 3,
        name: "note",
        description: "Optional note (mods may see)",
        required: false,
      },
      {
        type: 3,
        name: "party_id",
        description: "Party UUID if you have it",
        required: false,
      },
    ],
  },
  {
    name: "strikes",
    description: "Mod: list / add / remove strikes (this server only)",
    default_member_permissions: "32",
    options: [
      {
        type: 1,
        name: "list",
        description: "List active strikes for a member",
        options: [
          { type: 6, name: "user", description: "Member", required: true },
        ],
      },
      {
        type: 1,
        name: "add",
        description: "Add a strike",
        options: [
          { type: 6, name: "user", description: "Member", required: true },
          { type: 3, name: "reason", description: "Reason", required: true },
        ],
      },
      {
        type: 1,
        name: "remove",
        description: "Deactivate a strike by id",
        options: [
          { type: 6, name: "user", description: "Member", required: true },
          { type: 3, name: "strike_id", description: "Strike UUID", required: true },
        ],
      },
    ],
  },
  {
    name: "ghostless",
    description: "Ghostless player card for you or a user in THIS server",
    options: [
      {
        type: 6,
        name: "user",
        description: "Member (defaults to you)",
        required: false,
      },
    ],
  },
  {
    name: "leaderboard",
    description:
      "This server’s monthly Most reliable + Top hosts (Community+)",
  },
  {
    name: "dispute",
    description: "Open or resolve a no-show / strike dispute (this server)",
    options: [
      {
        type: 1,
        name: "open",
        description: "Open a dispute on your latest strike",
        options: [
          { type: 3, name: "strike_id", description: "Strike UUID (optional)", required: false },
          { type: 3, name: "note", description: "Your side of the story", required: false },
        ],
      },
      {
        type: 1,
        name: "resolve",
        description: "Mod: uphold or overturn a dispute",
        options: [
          { type: 3, name: "id", description: "Dispute UUID", required: true },
          {
            type: 3,
            name: "outcome",
            description: "upheld or overturned",
            required: true,
            choices: [
              { name: "upheld", value: "upheld" },
              { name: "overturned", value: "overturned" },
            ],
          },
          { type: 3, name: "notes", description: "Mod notes", required: false },
        ],
      },
    ],
  },
  {
    name: "feedback",
    description: "Report a bug or suggestion to the Rallied team",
    options: [
      {
        type: 3,
        name: "type",
        description: "Bug or suggestion",
        required: true,
        choices: [
          { name: "bug", value: "bug" },
          { name: "suggestion", value: "suggestion" },
        ],
      },
      {
        type: 3,
        name: "title",
        description: "Short title (what broke / what you want)",
        required: true,
        max_length: 120,
      },
      {
        type: 3,
        name: "details",
        description: "What happened, steps, or idea (be specific)",
        required: true,
        max_length: 1800,
      },
    ],
  },
] as const;
