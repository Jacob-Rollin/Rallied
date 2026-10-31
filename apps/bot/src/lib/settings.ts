import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_GRACE_MINUTES,
  DEFAULT_LOCKOUT_DAYS,
  DEFAULT_STRIKE_THRESHOLD,
} from "@rallied/shared";

export interface ServerSettingsRow {
  server_id: string;
  grace_minutes: number;
  ghostless_role_id: string | null;
  ghostless_role_threshold_pct: number;
  ghostless_role_min_sessions: number;
  digest_channel_id: string | null;
  strike_threshold: number;
  lockout_days: number;
  /** null = Join min Ghostless % gate off */
  join_min_ghostless_pct?: number | null;
  /** default true — Join rejects lockouts when reliability on */
  join_lockout_enforced?: boolean;
  slug?: string | null;
  public_page_enabled?: boolean;
  public_member_list?: boolean;
  list_in_directory?: boolean;
  discord_invite_url?: string | null;
  /** Max open/filled parties one host may hold (hygiene). Default 3. */
  max_open_parties_per_host?: number;
}

const DEFAULTS: Omit<ServerSettingsRow, "server_id"> = {
  grace_minutes: DEFAULT_GRACE_MINUTES,
  ghostless_role_id: null,
  ghostless_role_threshold_pct: 90,
  ghostless_role_min_sessions: 10,
  digest_channel_id: null,
  strike_threshold: DEFAULT_STRIKE_THRESHOLD,
  lockout_days: DEFAULT_LOCKOUT_DAYS,
  join_min_ghostless_pct: null,
  join_lockout_enforced: true,
  slug: null,
  public_page_enabled: true,
  public_member_list: false,
  list_in_directory: false,
  discord_invite_url: null,
  max_open_parties_per_host: 3,
};

export async function getServerSettings(
  sb: SupabaseClient,
  serverId: string,
): Promise<ServerSettingsRow> {
  const { data } = await sb
    .from("server_settings")
    .select("*")
    .eq("server_id", serverId)
    .maybeSingle();

  if (!data) {
    await sb.from("server_settings").upsert({ server_id: serverId });
    return { server_id: serverId, ...DEFAULTS };
  }
  return data as ServerSettingsRow;
}

/**
 * Grace window: if the party started / filled less than grace_minutes ago,
 * do not treat a late join as a ghost for strike purposes.
 * Callers pass `minutesLate`; returns true if still within grace.
 */
export function withinGraceWindow(
  minutesLate: number,
  graceMinutes: number,
): boolean {
  return minutesLate <= graceMinutes;
}
