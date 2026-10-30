/**
 * Guild data retention — survive `/setup` and bot reinstall.
 *
 * Product rule: never wipe history on setup/leave. Soft-archive only after
 * SERVER_INACTIVE_PURGE_DAYS (default 90) with no bot/party activity.
 * forever_pro / Official are never touched unless includeForeverPro is set.
 *
 * Cron is gated by RETENTION_PURGE_ENABLED (default off). Dry-run lists
 * candidates; applying soft-archives via servers.archived_at (016).
 */
import {
  isForeverProProtected,
  OFFICIAL_RALLIED_GUILD_ID,
  SERVER_INACTIVE_PURGE_DAYS,
} from "@rallied/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BotEnv } from "./env.js";

export { SERVER_INACTIVE_PURGE_DAYS };

export type InactiveServerCandidate = {
  id: string;
  discord_guild_id: string;
  name: string;
  plan: string;
  forever_pro: boolean;
  lastActivityAt: string;
};

export function retentionPurgeEnabled(env: BotEnv): boolean {
  const raw = (env.RETENTION_PURGE_ENABLED ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function retentionIncludeForeverPro(env: BotEnv): boolean {
  const raw = (env.RETENTION_INCLUDE_FOREVER_PRO ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

function cutoffIso(now: Date, days = SERVER_INACTIVE_PURGE_DAYS): string {
  return new Date(now.getTime() - days * 86400_000).toISOString();
}

/**
 * Find servers with no recent party creates and no recent server_events,
 * and servers.updated_at older than the inactivity window.
 * Excludes already-archived rows. forever_pro / Official excluded unless flagged.
 */
export async function findInactiveServers(
  sb: SupabaseClient,
  opts?: {
    now?: Date;
    days?: number;
    includeForeverPro?: boolean;
    limit?: number;
  },
): Promise<InactiveServerCandidate[]> {
  const now = opts?.now ?? new Date();
  const days = opts?.days ?? SERVER_INACTIVE_PURGE_DAYS;
  const cutoff = cutoffIso(now, days);
  const limit = opts?.limit ?? 25;
  const includeForeverPro = opts?.includeForeverPro ?? false;

  const { data: servers, error } = await sb
    .from("servers")
    .select(
      "id, discord_guild_id, name, plan, forever_pro, updated_at, created_at, archived_at",
    )
    .is("archived_at", null)
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(200);

  if (error) {
    // Column may be missing pre-016 — soft skip.
    if (/archived_at/i.test(error.message)) {
      console.warn(
        "retention: servers.archived_at missing — apply migration 016",
      );
      return [];
    }
    console.error("retention findInactiveServers", error.message);
    return [];
  }

  const candidates: InactiveServerCandidate[] = [];

  for (const row of servers ?? []) {
    if (candidates.length >= limit) break;

    const guildId = String(row.discord_guild_id);
    const protectedRow = isForeverProProtected({
      discord_guild_id: guildId,
      plan: String(row.plan ?? ""),
      forever_pro: Boolean(row.forever_pro),
    });
    if (protectedRow && !includeForeverPro) continue;
    if (guildId === OFFICIAL_RALLIED_GUILD_ID && !includeForeverPro) continue;

    const serverId = String(row.id);

    const [{ data: latestParty }, { data: latestEvent }] = await Promise.all([
      sb
        .from("lfg_parties")
        .select("created_at")
        .eq("server_id", serverId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      sb
        .from("server_events")
        .select("created_at")
        .eq("server_id", serverId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const stamps = [
      String(row.updated_at ?? row.created_at),
      latestParty?.created_at ? String(latestParty.created_at) : null,
      latestEvent?.created_at ? String(latestEvent.created_at) : null,
    ].filter(Boolean) as string[];

    const lastActivityAt = stamps.reduce((a, b) => (a > b ? a : b));
    if (lastActivityAt >= cutoff) continue;

    candidates.push({
      id: serverId,
      discord_guild_id: guildId,
      name: String(row.name ?? ""),
      plan: String(row.plan ?? "free"),
      forever_pro: Boolean(row.forever_pro),
      lastActivityAt,
    });
  }

  return candidates;
}

/**
 * Soft-archive inactive servers (sets archived_at). Never hard-deletes.
 * When dryRun is true (default), only lists candidates.
 */
export async function softArchiveInactiveServers(
  sb: SupabaseClient,
  opts?: {
    now?: Date;
    days?: number;
    includeForeverPro?: boolean;
    dryRun?: boolean;
    limit?: number;
  },
): Promise<{
  dryRun: boolean;
  candidates: InactiveServerCandidate[];
  archived: number;
}> {
  const dryRun = opts?.dryRun !== false;
  const candidates = await findInactiveServers(sb, opts);

  if (dryRun || candidates.length === 0) {
    return { dryRun, candidates, archived: 0 };
  }

  const nowIso = (opts?.now ?? new Date()).toISOString();
  let archived = 0;
  for (const c of candidates) {
    const { error } = await sb
      .from("servers")
      .update({ archived_at: nowIso, updated_at: nowIso })
      .eq("id", c.id)
      .is("archived_at", null);
    if (error) {
      console.error("retention soft-archive", c.id, error.message);
      continue;
    }
    archived += 1;
  }

  return { dryRun: false, candidates, archived };
}

/** Cron entry: no-op unless RETENTION_PURGE_ENABLED. Always dry-run unless APPLY. */
export async function runRetentionPass(
  sb: SupabaseClient,
  env: BotEnv,
): Promise<{ skipped: boolean; dryRun: boolean; candidates: number; archived: number }> {
  if (!retentionPurgeEnabled(env)) {
    return { skipped: true, dryRun: true, candidates: 0, archived: 0 };
  }

  const apply =
    (env.RETENTION_PURGE_APPLY ?? "").trim().toLowerCase() === "1" ||
    (env.RETENTION_PURGE_APPLY ?? "").trim().toLowerCase() === "true";

  const result = await softArchiveInactiveServers(sb, {
    includeForeverPro: retentionIncludeForeverPro(env),
    dryRun: !apply,
  });

  console.log("retention pass", {
    dryRun: result.dryRun,
    candidates: result.candidates.length,
    archived: result.archived,
    sample: result.candidates.slice(0, 5).map((c) => ({
      guild: c.discord_guild_id,
      last: c.lastActivityAt,
    })),
  });

  return {
    skipped: false,
    dryRun: result.dryRun,
    candidates: result.candidates.length,
    archived: result.archived,
  };
}
