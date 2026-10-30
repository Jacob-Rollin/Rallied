/**
 * Safe post-login redirect paths (no open redirects).
 * Allows /app… and /ops… only.
 */
export function safePostLoginNext(
  raw: string | null | undefined,
): string | undefined {
  if (!raw) return undefined;
  const path = raw.trim();
  if (path.startsWith("//") || path.includes("://")) return undefined;
  if (path.startsWith("/app") || path.startsWith("/ops")) return path;
  return undefined;
}
