/** Minimal Discord interaction shapes we handle. */

export const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
} as const;

export const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  /** Deferred ACK for message components (no thinking message). */
  DEFERRED_UPDATE_MESSAGE: 6,
} as const;

/** Discord MessageFlags.EPHEMERAL */
export const EPHEMERAL_FLAG = 64;

export type InteractionMessageData = {
  content?: string;
  embeds?: unknown[];
  components?: unknown[];
  flags?: number;
  allowed_mentions?: unknown;
  [key: string]: unknown;
};

export type InteractionResponse = {
  type: number;
  data?: InteractionMessageData;
};

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

export interface ApplicationCommandInteractionData {
  id: string;
  name: string;
  type: number;
  options?: CommandOption[];
  resolved?: Record<string, unknown>;
  /** Present on MESSAGE_COMPONENT interactions */
  custom_id?: string;
  component_type?: number;
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
}

export function ephemeral(content: string) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: 64 },
  };
}

export function publicMessage(content: string) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content },
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
