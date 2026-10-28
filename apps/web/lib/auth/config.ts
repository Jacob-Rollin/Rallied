/** Discord OAuth + session config. Missing secrets → mock/dev path. */

import { getRuntimeEnv } from "@/lib/runtime-env";

export function discordOAuthConfigured(): boolean {
  const secret = getRuntimeEnv("SESSION_SECRET") || "";
  return Boolean(
    (getRuntimeEnv("DISCORD_CLIENT_ID") ||
      getRuntimeEnv("NEXT_PUBLIC_DISCORD_CLIENT_ID")) &&
      getRuntimeEnv("DISCORD_CLIENT_SECRET") &&
      getRuntimeEnv("DISCORD_REDIRECT_URI") &&
      secret.length >= 32,
  );
}

/** Force mock admin session even without OAuth (local UI). */
export function mockAuthEnabled(): boolean {
  const mock = getRuntimeEnv("MOCK_AUTH");
  if (mock === "1" || mock === "true") {
    return true;
  }
  // Default: mock when OAuth not wired so `npm run dev` works
  return !discordOAuthConfigured();
}

export function getDiscordClientId(): string {
  return (
    getRuntimeEnv("DISCORD_CLIENT_ID") ||
    getRuntimeEnv("NEXT_PUBLIC_DISCORD_CLIENT_ID") ||
    ""
  );
}

export function getSessionPassword(): string {
  const secret = getRuntimeEnv("SESSION_SECRET");
  if (secret && secret.length >= 32) return secret;
  // Local/dev only — production must set SESSION_SECRET as a Runtime Secret.
  return "rallied-dev-only-session-secret-min-32-chars!!";
}

export function getRedirectUri(): string {
  return (
    getRuntimeEnv("DISCORD_REDIRECT_URI") ||
    "http://localhost:3000/api/auth/callback"
  );
}

export const SESSION_COOKIE = "rallied_session";
