/**
 * Shared Discord server display-name rules (bot + web).
 * Never treat empty / snowflake / generic placeholders as a real guild title,
 * and never persist those values to `servers.name`.
 */

/** Generic labels that must never win over a real guild name or be written to DB. */
const PLACEHOLDER_NAMES = new Set([
  "discord server",
  "selected server",
  "server",
  "unnamed server",
  "unknown server",
  "my server",
  "new server",
]);

/** Discord snowflake ids are 17–20 digit strings. */
export function looksLikeDiscordSnowflake(value: string): boolean {
  return /^\d{17,20}$/.test(value.trim());
}

/** True when `name` is a canned placeholder, not a real guild title. */
export function isPlaceholderServerName(
  name: string | null | undefined,
): boolean {
  const n = (name ?? "").trim().toLowerCase();
  if (!n) return true;
  return PLACEHOLDER_NAMES.has(n);
}

/**
 * True when `name` is a usable human label for this guild
 * (not empty / id / placeholder).
 */
export function isUsableServerName(
  name: string | null | undefined,
  guildId: string,
): boolean {
  const n = (name ?? "").trim();
  if (!n) return false;
  if (n === guildId.trim()) return false;
  if (looksLikeDiscordSnowflake(n)) return false;
  if (isPlaceholderServerName(n)) return false;
  return true;
}

/**
 * Resolve the primary display name for a guild.
 * Priority: OAuth session name → usable DB name → optional fallback (if usable).
 * Never returns placeholder labels like "Discord server" or "Selected server".
 */
export function resolveServerDisplayName(opts: {
  dbName?: string | null;
  oauthName?: string | null;
  guildId: string;
  /** Used only when neither OAuth nor DB has a real name. Must itself be usable. */
  fallback?: string;
}): string {
  const guildId = opts.guildId.trim();
  if (isUsableServerName(opts.oauthName, guildId)) {
    return String(opts.oauthName).trim();
  }
  if (isUsableServerName(opts.dbName, guildId)) {
    return String(opts.dbName).trim();
  }
  const fb = (opts.fallback ?? "").trim();
  if (isUsableServerName(fb, guildId)) return fb;
  return "";
}
