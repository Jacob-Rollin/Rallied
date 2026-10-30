import { getRuntimeEnv } from "./runtime-env";

/**
 * Parse OPS_DISCORD_IDS (comma/space/newline-separated Discord user snowflakes).
 * Empty / unset → nobody is allowlisted (ops stays locked until Jacob pastes IDs).
 */
export function parseOpsDiscordIds(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  const ids = new Set<string>();
  for (const part of raw.split(/[\s,;]+/)) {
    const id = part.trim();
    if (/^\d{17,20}$/.test(id)) ids.add(id);
  }
  return ids;
}

export function getOpsDiscordIds(): Set<string> {
  return parseOpsDiscordIds(getRuntimeEnv("OPS_DISCORD_IDS"));
}

export function isOpsAllowlisted(discordUserId: string | null | undefined): boolean {
  if (!discordUserId) return false;
  return getOpsDiscordIds().has(discordUserId.trim());
}
