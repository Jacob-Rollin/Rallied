export interface BotEnv {
  DISCORD_PUBLIC_KEY: string;
  DISCORD_BOT_TOKEN: string;
  DISCORD_APP_ID: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  DISCORD_DEV_GUILD_ID?: string;
}

export function readNodeEnv(): BotEnv {
  // Allow boot without secrets for typecheck / dry runs; handlers fail soft.
  return {
    DISCORD_PUBLIC_KEY: process.env.DISCORD_PUBLIC_KEY ?? "",
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN ?? "",
    DISCORD_APP_ID: process.env.DISCORD_APP_ID ?? "",
    SUPABASE_URL: process.env.SUPABASE_URL ?? "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    DISCORD_DEV_GUILD_ID: process.env.DISCORD_DEV_GUILD_ID,
  };
}

export function hasSupabase(env: BotEnv): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}
