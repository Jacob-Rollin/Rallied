/** Discord OAuth + session config. Missing secrets → mock/dev path. */

export function discordOAuthConfigured(): boolean {
  return Boolean(
    process.env.DISCORD_CLIENT_ID &&
      process.env.DISCORD_CLIENT_SECRET &&
      process.env.DISCORD_REDIRECT_URI &&
      process.env.SESSION_SECRET &&
      process.env.SESSION_SECRET.length >= 32,
  );
}

/** Force mock admin session even without OAuth (local UI). */
export function mockAuthEnabled(): boolean {
  if (process.env.MOCK_AUTH === "1" || process.env.MOCK_AUTH === "true") {
    return true;
  }
  // Default: mock when OAuth not wired so `npm run dev` works
  return !discordOAuthConfigured();
}

export function getDiscordClientId(): string {
  return process.env.DISCORD_CLIENT_ID || process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "";
}

export function getSessionPassword(): string {
  return (
    process.env.SESSION_SECRET ||
    "rallied-dev-only-session-secret-min-32-chars!!"
  );
}

export function getRedirectUri(): string {
  return (
    process.env.DISCORD_REDIRECT_URI ||
    "http://localhost:3000/api/auth/callback"
  );
}

export const SESSION_COOKIE = "rallied_session";
