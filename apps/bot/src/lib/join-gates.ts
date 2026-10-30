import { reliabilityEnabled } from "@rallied/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServerSettingsRow } from "./settings.js";

function ratePct(shows: number, ghosts: number): number | null {
  const total = shows + ghosts;
  if (total === 0) return null;
  return Math.round((shows / total) * 1000) / 10;
}

export type JoinGateBlock =
  | { blocked: true; reason: "lockout"; until: string; detail: string }
  | { blocked: true; reason: "min_ghostless"; rate: number; min: number }
  | { blocked: false };

/**
 * Community+ Join gates. Starter / reliability-off → always allow (gates ignored).
 * Soft-fail: DB errors return not blocked so Join still works.
 */
export async function evaluateJoinGates(opts: {
  sb: SupabaseClient;
  serverId: string;
  memberId: string;
  plan: string | null | undefined;
  settings: ServerSettingsRow;
}): Promise<JoinGateBlock> {
  if (!reliabilityEnabled(opts.plan)) {
    return { blocked: false };
  }

  const lockoutOn = opts.settings.join_lockout_enforced !== false;
  if (lockoutOn) {
    try {
      const { data: lockouts } = await opts.sb
        .from("lockouts")
        .select("until, reason")
        .eq("server_id", opts.serverId)
        .eq("member_id", opts.memberId)
        .gt("until", new Date().toISOString())
        .limit(1);
      if (lockouts && lockouts.length > 0) {
        return {
          blocked: true,
          reason: "lockout",
          until: String(lockouts[0].until),
          detail: String(lockouts[0].reason ?? "LFG lockout"),
        };
      }
    } catch (err) {
      console.error("evaluateJoinGates lockout", err);
    }
  }

  const minPct = opts.settings.join_min_ghostless_pct;
  if (minPct != null && Number.isFinite(minPct) && minPct > 0) {
    try {
      const { data: stats } = await opts.sb
        .from("ghostless_stats")
        .select("shows, ghosts")
        .eq("server_id", opts.serverId)
        .eq("member_id", opts.memberId)
        .maybeSingle();
      const shows = Number(stats?.shows ?? 0);
      const ghosts = Number(stats?.ghosts ?? 0);
      // No history yet → allow (can't gate newcomers).
      if (shows + ghosts > 0) {
        const rate = ratePct(shows, ghosts);
        if (rate != null && rate < Number(minPct)) {
          return {
            blocked: true,
            reason: "min_ghostless",
            rate,
            min: Number(minPct),
          };
        }
      }
    } catch (err) {
      console.error("evaluateJoinGates min_ghostless", err);
    }
  }

  return { blocked: false };
}

export function joinGateEphemeralMessage(block: JoinGateBlock): string | null {
  if (!block.blocked) return null;
  if (block.reason === "lockout") {
    return `You're lockout'd from LFG until ${block.until}. Reason: ${block.detail}`;
  }
  return `Join requires at least **${block.min}%** Ghostless (your rate: **${block.rate}%**). Play more clean shows or ask a mod.`;
}
