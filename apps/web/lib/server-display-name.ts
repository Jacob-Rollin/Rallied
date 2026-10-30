/**
 * Human label for a Discord server.
 * Prefer Supabase `servers.name`, then OAuth guild name from session.
 * Snowflake / empty DB values are not treated as real names.
 */

/** Discord snowflake ids are 17–20 digit strings. */
export function looksLikeDiscordSnowflake(value: string): boolean {
  return /^\d{17,20}$/.test(value.trim());
}

/** True when `name` is a usable human label for this guild (not empty / not the id). */
export function isUsableServerName(
  name: string | null | undefined,
  guildId: string,
): boolean {
  const n = (name ?? "").trim();
  if (!n) return false;
  if (n === guildId.trim()) return false;
  if (looksLikeDiscordSnowflake(n)) return false;
  return true;
}

export function resolveServerDisplayName(opts: {
  dbName?: string | null;
  oauthName?: string | null;
  guildId: string;
  /** Used only when neither DB nor OAuth has a real name. */
  fallback?: string;
}): string {
  const guildId = opts.guildId.trim();
  if (isUsableServerName(opts.dbName, guildId)) return String(opts.dbName).trim();
  if (isUsableServerName(opts.oauthName, guildId))
    return String(opts.oauthName).trim();
  return (opts.fallback ?? "Selected server").trim() || "Selected server";
}
