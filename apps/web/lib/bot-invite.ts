import { buildBotInviteUrl, type BotInviteUrlOptions } from "@rallied/shared";
import { getDiscordClientId } from "@/lib/auth/config";
import { getRuntimeEnv } from "@/lib/runtime-env";

/**
 * Soft fallback when client id is missing — never the Discord Developer Portal.
 * Marketing / shells use this instead of discord.com/developers/applications.
 */
export const BOT_INVITE_FALLBACK_HREF = "#add-bot";

/** Post–Add-to-Discord landing (Discord OAuth2 redirect). */
export const BOT_INVITE_SETUP_PATH = "/app/setup";

const DEFAULT_APP_ORIGIN = "https://rallied.gg";

/**
 * Canonical redirect URI Jacob must register in Discord Developer Portal →
 * OAuth2 → Redirects (production):
 *   https://rallied.gg/app/setup
 *
 * Local: http://localhost:3000/app/setup (optional; add if testing Advanced Auth).
 */
export function botInviteRedirectUriFromOrigin(origin?: string | null): string {
  const raw = (origin?.trim() || DEFAULT_APP_ORIGIN).replace(/\/$/, "");
  return `${raw || DEFAULT_APP_ORIGIN}${BOT_INVITE_SETUP_PATH}`;
}

/** Client-safe: NEXT_PUBLIC_APP_URL only (no Cloudflare context). */
export function publicBotInviteRedirectUri(): string {
  return botInviteRedirectUriFromOrigin(
    process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_ORIGIN,
  );
}

/** Server: prefer Worker NEXT_PUBLIC_APP_URL, then process env. */
export function resolveBotInviteRedirectUri(): string {
  return botInviteRedirectUriFromOrigin(
    getRuntimeEnv("NEXT_PUBLIC_APP_URL") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      DEFAULT_APP_ORIGIN,
  );
}

/** @deprecated Prefer resolveBotInviteRedirectUri / publicBotInviteRedirectUri */
export function botInviteRedirectUri(baseUrl?: string): string {
  if (baseUrl?.trim()) return botInviteRedirectUriFromOrigin(baseUrl);
  return resolveBotInviteRedirectUri();
}

/**
 * Client-safe invite href from the public env (same source as landing SSR when
 * NEXT_PUBLIC_DISCORD_CLIENT_ID is inlined at build time).
 */
export function getPublicBotInviteHref(
  clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "",
  extra?: BotInviteUrlOptions,
): string {
  const id = clientId.trim();
  if (!id) return BOT_INVITE_FALLBACK_HREF;
  return buildBotInviteUrl(id, {
    redirectUri: publicBotInviteRedirectUri(),
    ...extra,
  });
}

/**
 * Server / request-context invite href. Prefers DISCORD_CLIENT_ID (Worker
 * runtime) then NEXT_PUBLIC_DISCORD_CLIENT_ID so signed-in menus match landing
 * even when the public build-time var was not baked into the client bundle.
 * Always includes Advanced Bot Auth redirect back to `/app/setup`.
 */
export function resolveBotInviteHref(extra?: BotInviteUrlOptions): string {
  const id = getDiscordClientId().trim();
  if (!id) return BOT_INVITE_FALLBACK_HREF;
  return buildBotInviteUrl(id, {
    redirectUri: resolveBotInviteRedirectUri(),
    ...extra,
  });
}
