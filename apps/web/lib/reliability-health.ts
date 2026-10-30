/**
 * Reliability health metrics for Overview (Community lite / Pro fuller).
 * Prefer server_events when present; otherwise honest nulls / fallbacks — never fake.
 */

export type ReliabilityHealth = {
  /** Ready-check no-show seats / roster seats in window (0–100). */
  noShowRatePct: number | null;
  /** Prior window no-show rate when enough event data exists. */
  priorNoShowRatePct: number | null;
  /** Distinct vibe raters / seated members across ready-checked parties (0–100). */
  vibeResponseRatePct: number | null;
  priorVibeResponseRatePct: number | null;
  openDisputes: number;
  priorOpenDisputes: number | null;
  /** Waitlist promotes this calendar week (UTC Mon 00:00). */
  standbyPromotionsThisWeek: number | null;
  /** True when server_events table/query returned usable rows for the window. */
  hasEventHistory: boolean;
  /** Human-readable soft empty hints (not errors). */
  emptyHints: {
    noShow: string | null;
    vibe: string | null;
    standby: string | null;
  };
};

export type ReadyCheckEventMeta = {
  noShows?: number;
  rosterSize?: number;
};

export type ReliabilityInputs = {
  openDisputes: number;
  /** Ready-check resolved events in current 7d. */
  readyEvents: { meta: ReadyCheckEventMeta; created_at: string }[];
  /** Ready-check resolved events in prior 7d. */
  priorReadyEvents: { meta: ReadyCheckEventMeta; created_at: string }[];
  /** Waitlist promote count this week (null = table missing / query failed). */
  standbyPromotionsThisWeek: number | null;
  /** Distinct raters / seated for vibe response (current). */
  vibeResponse: { raters: number; seated: number } | null;
  /** Prior window vibe response. */
  priorVibeResponse: { raters: number; seated: number } | null;
  /** Fallback: ready-check no-show strike count when no events. */
  noShowStrikeCount7d?: number;
  readyChecksResolved7d?: number;
};

function rateFromReadyEvents(
  events: { meta: ReadyCheckEventMeta }[],
): number | null {
  let noShows = 0;
  let roster = 0;
  for (const e of events) {
    const r = Number(e.meta.rosterSize ?? 0);
    const n = Number(e.meta.noShows ?? 0);
    if (!Number.isFinite(r) || r <= 0) continue;
    roster += r;
    noShows += Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  if (roster <= 0) return null;
  return Math.round((noShows / roster) * 1000) / 10;
}

function vibePct(v: { raters: number; seated: number } | null): number | null {
  if (!v || v.seated <= 0) return null;
  return Math.round((Math.min(v.raters, v.seated) / v.seated) * 1000) / 10;
}

/** Re-export — canonical helper lives in `@rallied/shared`. */
export { weekStartUtc } from "@rallied/shared";

export function buildReliabilityHealth(
  input: ReliabilityInputs,
): ReliabilityHealth {
  const hasEventHistory =
    input.readyEvents.length > 0 ||
    input.priorReadyEvents.length > 0 ||
    (input.standbyPromotionsThisWeek != null &&
      input.standbyPromotionsThisWeek > 0);

  let noShowRatePct = rateFromReadyEvents(input.readyEvents);
  const priorNoShowRatePct = rateFromReadyEvents(input.priorReadyEvents);

  let noShowHint: string | null = null;
  if (noShowRatePct == null) {
    const resolved = input.readyChecksResolved7d ?? 0;
    const strikes = input.noShowStrikeCount7d ?? 0;
    if (resolved === 0 && strikes === 0) {
      noShowHint = "No ready checks resolved in the last 7 days.";
    } else if (resolved > 0 && !hasEventHistory) {
      noShowHint =
        "Rate available after new ready checks (event log). Recent resolved: " +
        String(resolved) +
        (strikes > 0 ? ` · ${strikes} no-show strike${strikes === 1 ? "" : "s"}` : "");
    } else {
      noShowHint = "Not enough roster data yet.";
    }
  }

  const vibeResponseRatePct = vibePct(input.vibeResponse);
  const priorVibeResponseRatePct = vibePct(input.priorVibeResponse);
  let vibeHint: string | null = null;
  if (vibeResponseRatePct == null) {
    vibeHint = "No vibe responses on ready-checked parties in the last 7 days.";
  }

  let standbyHint: string | null = null;
  if (input.standbyPromotionsThisWeek == null) {
    standbyHint =
      "Standby log not available yet — run migration 011, then waitlist promotes from ready-fail will count.";
  } else if (input.standbyPromotionsThisWeek === 0) {
    standbyHint =
      "No waitlist promotions from ready-fail this week (older promotes weren’t logged).";
  }

  return {
    noShowRatePct,
    priorNoShowRatePct,
    vibeResponseRatePct,
    priorVibeResponseRatePct,
    openDisputes: input.openDisputes,
    priorOpenDisputes: null,
    standbyPromotionsThisWeek: input.standbyPromotionsThisWeek,
    hasEventHistory,
    emptyHints: {
      noShow: noShowHint,
      vibe: vibeHint,
      standby: standbyHint,
    },
  };
}

export const MOCK_RELIABILITY_HEALTH: ReliabilityHealth = {
  noShowRatePct: 8.5,
  priorNoShowRatePct: 11.2,
  vibeResponseRatePct: 72,
  priorVibeResponseRatePct: 64,
  openDisputes: 1,
  priorOpenDisputes: 2,
  standbyPromotionsThisWeek: 4,
  hasEventHistory: true,
  emptyHints: {
    noShow: null,
    vibe: null,
    standby: null,
  },
};
