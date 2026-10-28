/** Discord OAuth + session config. Missing secrets → mock/dev path. */

import { getRuntimeEnv } from "@/lib/runtime-env";

const OAUTH_KEYS = [
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "DISCORD_REDIRECT_URI",
  "SESSION_SECRET",
] as const;

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

/**
 * Human-readable OAuth/session config problems (never secret values).
 * Distinguishes unset vs SESSION_SECRET shorter than iron-session's 32-char min.
 */
export function oauthConfigProblems(): string[] {
  const problems: string[] = [];
  if (
    !(
      getRuntimeEnv("DISCORD_CLIENT_ID") ||
      getRuntimeEnv("NEXT_PUBLIC_DISCORD_CLIENT_ID")
    )
  ) {
    problems.push("DISCORD_CLIENT_ID not set");
  }
  if (!getRuntimeEnv("DISCORD_CLIENT_SECRET")) {
    problems.push("DISCORD_CLIENT_SECRET not set");
  }
  if (!getRuntimeEnv("DISCORD_REDIRECT_URI")) {
    problems.push("DISCORD_REDIRECT_URI not set");
  }
  const secret = getRuntimeEnv("SESSION_SECRET") || "";
  if (!secret) {
    problems.push("SESSION_SECRET not set on this Worker");
  } else if (secret.length < 32) {
    problems.push(
      `SESSION_SECRET too short (${secret.length} chars — need 32+)`,
    );
  }
  return problems;
}

/** @deprecated use oauthConfigProblems */
export function oauthMissingKeys(): string[] {
  return oauthConfigProblems();
}

/** Explicit MOCK_AUTH=1 — never infer this from missing secrets in production. */
export function explicitMockAuth(): boolean {
  const mock = getRuntimeEnv("MOCK_AUTH");
  return mock === "1" || mock === "true";
}

/**
 * Mock admin session for local UI.
 * Production only mocks when MOCK_AUTH=1 is set on the Worker.
 * Local/dev also mocks when OAuth secrets are not wired.
 */
export function mockAuthEnabled(): boolean {
  if (explicitMockAuth()) return true;
  if (process.env.NODE_ENV !== "production" && !discordOAuthConfigured()) {
    return true;
  }
  return false;
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

export { OAUTH_KEYS };
