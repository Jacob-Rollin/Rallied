import { buildBotInviteUrl } from "@rallied/shared";
import { getDiscordClientId } from "@/lib/auth/config";

/**
 * Soft fallback when client id is missing — never the Discord Developer Portal.
 * Marketing / shells use this instead of discord.com/developers/applications.
 */
export const BOT_INVITE_FALLBACK_HREF = "#add-bot";

/**
 * Client-safe invite href from the public env (same source as landing SSR when
 * NEXT_PUBLIC_DISCORD_CLIENT_ID is inlined at build time).
 */
export function getPublicBotInviteHref(
  clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "",
): string {
  const id = clientId.trim();
  return id ? buildBotInviteUrl(id) : BOT_INVITE_FALLBACK_HREF;
}

/**
 * Server / request-context invite href. Prefers DISCORD_CLIENT_ID (Worker
 * runtime) then NEXT_PUBLIC_DISCORD_CLIENT_ID so signed-in menus match landing
 * even when the public build-time var was not baked into the client bundle.
 */
export function resolveBotInviteHref(): string {
  const id = getDiscordClientId().trim();
  return id ? buildBotInviteUrl(id) : BOT_INVITE_FALLBACK_HREF;
}
