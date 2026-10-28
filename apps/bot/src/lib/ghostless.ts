import { GHOSTLESS } from "@rallied/shared";
import type { ServerSettingsRow } from "./settings.js";

export type GhostlessBadge = "Ghostless" | "Reliable" | "Watch" | "New";

/** Show-rate % to one decimal, or null when no sessions yet. */
export function showRatePct(shows: number, ghosts: number): number | null {
  const total = shows + ghosts;
  if (total === 0) return null;
  return Math.round((shows / total) * 1000) / 10;
}

/**
 * Badge from server settings (threshold % + min sessions).
 * Ghostless only when rate ≥ threshold AND enough sessions — not “zero ghosts forever”.
 */
export function ghostlessBadge(
  shows: number,
  ghosts: number,
  settings?: Pick<
    ServerSettingsRow,
    "ghostless_role_threshold_pct" | "ghostless_role_min_sessions"
  >,
): GhostlessBadge {
  const rate = showRatePct(shows, ghosts);
  if (rate == null) return "New";

  const threshold = Number(settings?.ghostless_role_threshold_pct ?? 90);
  const minSessions = Number(settings?.ghostless_role_min_sessions ?? 10);
  const total = shows + ghosts;

  if (total >= minSessions && rate >= threshold) return "Ghostless";
  if (rate >= Math.min(75, threshold - 5)) return "Reliable";
  return "Watch";
}

/** Compact party-card field: "☑ Ghostless 94%" / "New in this server". */
export function ghostlessCardLabel(
  shows: number,
  ghosts: number,
  settings?: Pick<
    ServerSettingsRow,
    "ghostless_role_threshold_pct" | "ghostless_role_min_sessions"
  >,
): string {
  const rate = showRatePct(shows, ghosts);
  if (rate == null) return "New in this server";
  const badge = ghostlessBadge(shows, ghosts, settings);
  // Check-inside-box mark matches landing GhostlessCue (not ▢ + ✓).
  if (badge === "Ghostless") return `${GHOSTLESS.mark} ${GHOSTLESS.name} ${rate}%`;
  if (badge === "Reliable") return `Reliable ${rate}%`;
  return `Watch ${rate}%`;
}

/** Landing-mock style subtitle: "This server · 28 shows · 1 ghost". */
export function ghostlessSubtitle(shows: number, ghosts: number): string {
  const showWord = shows === 1 ? "show" : "shows";
  const ghostWord = ghosts === 1 ? "ghost" : "ghosts";
  return `This server · ${shows} ${showWord} · ${ghosts} ${ghostWord}`;
}
