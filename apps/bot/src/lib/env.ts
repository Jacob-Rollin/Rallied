import { normalizeSupabaseUrl } from "@rallied/shared";

export { normalizeSupabaseUrl };

export interface BotEnv {
  DISCORD_PUBLIC_KEY: string;
  DISCORD_BOT_TOKEN: string;
  DISCORD_APP_ID: string;
  /** Optional alias; Worker/script may use this when DISCORD_APP_ID unset. */
  DISCORD_CLIENT_ID?: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  DISCORD_DEV_GUILD_ID?: string;
  /** One-shot secret for GET/POST /register-commands (phone-friendly). Rotate after use. */
  REGISTER_COMMANDS_SECRET?: string;
  /** Public web origin for /pricing upgrade links (e.g. https://rallied.gg). */
  PUBLIC_WEB_URL?: string;
  /**
   * Comma/space-separated Discord guild ids treated as founding_pro (skip Starter caps).
   * Include Official Rallied: 1564716956198899824
   */
  DOGFOOD_GUILD_IDS?: string;
  /**
   * Optional staff inbox channel for new feedback embeds.
   * Fail open when unset — DB insert still succeeds.
   */
  OPS_FEEDBACK_CHANNEL_ID?: string;
}

export function readNodeEnv(): BotEnv {
  // Allow boot without secrets for typecheck / dry runs; handlers fail soft.
  return {
    DISCORD_PUBLIC_KEY: process.env.DISCORD_PUBLIC_KEY ?? "",
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN ?? "",
    DISCORD_APP_ID: process.env.DISCORD_APP_ID ?? "",
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    SUPABASE_URL: normalizeSupabaseUrl(process.env.SUPABASE_URL ?? ""),
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    DISCORD_DEV_GUILD_ID: process.env.DISCORD_DEV_GUILD_ID,
    REGISTER_COMMANDS_SECRET: process.env.REGISTER_COMMANDS_SECRET,
    PUBLIC_WEB_URL: process.env.PUBLIC_WEB_URL,
    DOGFOOD_GUILD_IDS: process.env.DOGFOOD_GUILD_IDS,
    OPS_FEEDBACK_CHANNEL_ID: process.env.OPS_FEEDBACK_CHANNEL_ID,
  };
}

export function discordAppId(env: BotEnv): string {
  return env.DISCORD_APP_ID || env.DISCORD_CLIENT_ID || "";
}

export function hasSupabase(env: BotEnv): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}
