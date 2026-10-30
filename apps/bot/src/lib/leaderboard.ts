import {
  monthLabelUtc,
  monthStartUtc,
  rankMostReliable,
  rankTopHosts,
  type LeaderboardHostEntry,
  type LeaderboardReliableEntry,
} from "@rallied/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ServerLeaderboard = {
  monthLabel: string;
  mostReliable: LeaderboardReliableEntry[];
  topHosts: LeaderboardHostEntry[];
};

/** Per-server monthly board: Ghostless % + parties hosted this UTC month. */
export async function loadServerLeaderboard(
  sb: SupabaseClient,
  serverId: string,
  opts?: { limit?: number; minSessions?: number; now?: Date },
): Promise<ServerLeaderboard> {
  const now = opts?.now ?? new Date();
  const limit = opts?.limit ?? 5;
  const minSessions = opts?.minSessions ?? 3;
  const since = monthStartUtc(now).toISOString();

  const { data: statsRows } = await sb
    .from("ghostless_stats")
    .select(
      "member_id, shows, ghosts, member:members!inner(id, display_name, discord_user_id)",
    )
    .eq("server_id", serverId);

  const mostReliable = rankMostReliable(
    (statsRows ?? []).map((row) => {
      const m = row.member as unknown as {
        id: string;
        display_name: string;
        discord_user_id: string;
      };
      return {
        memberId: String(row.member_id),
        displayName: m.display_name || m.discord_user_id,
        discordUserId: m.discord_user_id,
        shows: Number(row.shows ?? 0),
        ghosts: Number(row.ghosts ?? 0),
        showRatePct: null,
      };
    }),
    { minSessions, limit },
  );

  // Include soft-closed parties — Close/expire sets deleted_at for Find UI,
  // not to erase monthly host credit. Never filter deleted_at here.
  const { data: parties } = await sb
    .from("lfg_parties")
    .select("host_member_id")
    .eq("server_id", serverId)
    .gte("created_at", since);

  const countByHost = new Map<string, number>();
  for (const row of parties ?? []) {
    const hostId = String(row.host_member_id);
    countByHost.set(hostId, (countByHost.get(hostId) ?? 0) + 1);
  }

  const hostIds = [...countByHost.keys()];
  const nameById = new Map<
    string,
    { displayName: string; discordUserId: string }
  >();
  if (hostIds.length > 0) {
    const { data: members } = await sb
      .from("members")
      .select("id, display_name, discord_user_id")
      .in("id", hostIds);
    for (const m of members ?? []) {
      nameById.set(String(m.id), {
        displayName: String(m.display_name || m.discord_user_id),
        discordUserId: String(m.discord_user_id),
      });
    }
  }

  const topHosts = rankTopHosts(
    [...countByHost.entries()].map(([memberId, partiesHosted]) => {
      const info = nameById.get(memberId);
      return {
        memberId,
        displayName: info?.displayName ?? memberId.slice(0, 8),
        discordUserId: info?.discordUserId,
        partiesHosted,
      };
    }),
    { limit },
  );

  return {
    monthLabel: monthLabelUtc(now),
    mostReliable,
    topHosts,
  };
}
