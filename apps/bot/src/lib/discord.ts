/** Minimal Discord interaction shapes we handle. */

export const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5,
} as const;

export const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  /** Deferred ACK for message components (no thinking message). */
  DEFERRED_UPDATE_MESSAGE: 6,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
  /** Immediate modal popup — cannot be deferred. */
  MODAL: 9,
} as const;

/** Discord MessageFlags.EPHEMERAL */
export const EPHEMERAL_FLAG = 64;

export type AutocompleteChoice = { name: string; value: string };

export type InteractionMessageData = {
  content?: string;
  embeds?: unknown[];
  components?: unknown[];
  flags?: number;
  allowed_mentions?: unknown;
  /** Autocomplete response only */
  choices?: AutocompleteChoice[];
  [key: string]: unknown;
};

/** Bot-only delivery hints — stripped before Discord API calls. */
export type InteractionResponseMeta = {
  /** After public party post: save message ids + start squad thread. */
  persistPartyMessage?: { partyId: string };
  /** After /setup or /lfg desk: ephemeral pin tip. */
  pinHint?: boolean;
  /** After fill/close: ephemeral Vibe Check nudge. */
  vibeNudge?: { partyId: string; game: string };
};

export type InteractionResponse = {
  type: number;
  data?: InteractionMessageData;
  meta?: InteractionResponseMeta;
};

export interface InteractionMessageRef {
  id: string;
  channel_id?: string;
}

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
}

export interface DiscordMember {
  user?: DiscordUser;
  nick?: string | null;
  permissions?: string;
}

export interface CommandOption {
  name: string;
  type: number;
  value?: string | number | boolean;
  options?: CommandOption[];
  focused?: boolean;
}

/** Text input inside a modal action row (MODAL_SUBMIT). */
export interface ModalTextInput {
  type: number;
  custom_id: string;
  value?: string;
}

export interface ModalActionRow {
  type: number;
  components?: ModalTextInput[];
}

export interface ApplicationCommandInteractionData {
  id: string;
  name: string;
  type: number;
  options?: CommandOption[];
  resolved?: Record<string, unknown>;
  /** Present on MESSAGE_COMPONENT / MODAL_SUBMIT */
  custom_id?: string;
  component_type?: number;
  /** String/user/role select menu values */
  values?: string[];
  /** Modal submit rows (type 1 → type 4 text inputs) */
  components?: ModalActionRow[];
}

export interface Interaction {
  id: string;
  type: number;
  token: string;
  guild_id?: string;
  channel_id?: string;
  member?: DiscordMember;
  user?: DiscordUser;
  data?: ApplicationCommandInteractionData;
  /** Present on MESSAGE_COMPONENT — the message the button/select lives on. */
  message?: InteractionMessageRef;
}

export function ephemeral(content: string) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: 64 },
  };
}

export function publicMessage(content: string, opts?: { clearComponents?: boolean }) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content,
      ...(opts?.clearComponents
        ? { embeds: [] as unknown[], components: [] as unknown[] }
        : {}),
    },
  };
}

export function getOption(
  options: CommandOption[] | undefined,
  name: string,
): CommandOption | undefined {
  return options?.find((o) => o.name === name);
}

export function getSubcommand(data?: ApplicationCommandInteractionData) {
  const sub = data?.options?.[0];
  if (!sub) return { name: undefined as string | undefined, options: [] as CommandOption[] };
  return { name: sub.name, options: sub.options ?? [] };
}

export function actorUser(interaction: Interaction): DiscordUser | null {
  return interaction.member?.user ?? interaction.user ?? null;
}

export function displayName(interaction: Interaction): string {
  const user = actorUser(interaction);
  return (
    interaction.member?.nick ||
    user?.global_name ||
    user?.username ||
    "unknown"
  );
}

/** Discord permission bit: ADMINISTRATE = 0x8, MANAGE_GUILD = 0x20 */
export function isMod(interaction: Interaction): boolean {
  const perms = BigInt(interaction.member?.permissions ?? "0");
  const ADMINISTRATOR = 1n << 3n;
  const MANAGE_GUILD = 1n << 5n;
  const MODERATE_MEMBERS = 1n << 40n;
  return (perms & (ADMINISTRATOR | MANAGE_GUILD | MODERATE_MEMBERS)) !== 0n;
}

export function avatarUrl(user: DiscordUser): string | null {
  if (!user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
}

/** Read a modal text-input value by custom_id. */
export function getModalField(
  interaction: Interaction,
  customId: string,
): string {
  const rows = interaction.data?.components ?? [];
  for (const row of rows) {
    for (const field of row.components ?? []) {
      if (field.custom_id === customId) {
        return String(field.value ?? "").trim();
      }
    }
  }
  return "";
}
