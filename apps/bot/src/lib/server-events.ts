import type { SupabaseClient } from "@supabase/supabase-js";

export const SERVER_EVENT = {
  WAITLIST_PROMOTE: "waitlist_promote",
  READY_CHECK_RESOLVED: "ready_check_resolved",
} as const;

export type ServerEventType =
  (typeof SERVER_EVENT)[keyof typeof SERVER_EVENT];

/**
 * Soft-fail insert into server_events. Never throws — metrics must not break LFG.
 */
export async function logServerEvent(
  sb: SupabaseClient,
  opts: {
    serverId: string;
    eventType: ServerEventType | string;
    partyId?: string | null;
    memberId?: string | null;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const { error } = await sb.from("server_events").insert({
      server_id: opts.serverId,
      event_type: opts.eventType,
      party_id: opts.partyId ?? null,
      member_id: opts.memberId ?? null,
      meta: opts.meta ?? {},
    });
    if (error) {
      console.error("server_events insert soft-fail", error.message);
    }
  } catch (err) {
    console.error("server_events insert soft-fail", err);
  }
}
