import {
  CF_FREE_TIER_REF,
  DEFAULT_CF_WORKER_NAMES,
  OFFICIAL_RALLIED_GUILD_ID,
  OPS_SIZE_TABLES,
  PLANS,
  SUPABASE_FREE_TIER_REF,
} from "@rallied/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CfUsage,
  CfWorkerWindow,
  OpsUsagePayload,
  PlanBucket,
  ProductUsage,
  ServerDrill,
  SupabaseTableSize,
  SupabaseUsage,
} from "./ops-usage-types";
import { getRuntimeEnv } from "./runtime-env";
import { getServiceSupabase } from "./supabase";

export type {
  CfUsage,
  CfWorkerWindow,
  OpsUsagePayload,
  PlanBucket,
  ProductUsage,
  ServerDrill,
  SupabaseTableSize,
  SupabaseUsage,
} from "./ops-usage-types";

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 min — short so refresh isn’t abusive

type CacheEntry = { expiresAt: number; value: unknown };
const cache = new Map<string, CacheEntry>();

function cacheGet<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.value as T;
}

function cacheSet(key: string, value: unknown): void {
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
}

function emptyPlanBuckets(): Record<PlanBucket, number> {
  return {
    free: 0,
    trial: 0,
    community: 0,
    pro: 0,
    founding_pro: 0,
    lapsed: 0,
    demo: 0,
    other: 0,
  };
}

function asPlanBucket(plan: string | null | undefined): PlanBucket {
  switch (plan) {
    case "free":
    case "trial":
    case "community":
    case "pro":
    case "founding_pro":
    case "lapsed":
    case "demo":
      return plan;
    default:
      return "other";
  }
}

function emptyWindow(): CfWorkerWindow {
  return {
    requests: 0,
    errors: 0,
    subrequests: 0,
    cpuTimeP50Ms: null,
    cpuTimeP99Ms: null,
  };
}

function cfWorkerNames(): string[] {
  const raw = (getRuntimeEnv("CF_WORKER_NAMES") ?? "").trim();
  if (!raw) return [...DEFAULT_CF_WORKER_NAMES];
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function loadProduct(sb: SupabaseClient): Promise<ProductUsage> {
  const serversByPlan = emptyPlanBuckets();
  let archivedServers = 0;
  let activeServers = 0;
  let foundingSeatsUsed = 0;

  const { data: servers, error: serversErr } = await sb
    .from("servers")
    .select(
      "id, discord_guild_id, name, plan, archived_at, forever_pro, trial_consumed_at",
    )
    .order("name", { ascending: true })
    .limit(500);

  if (serversErr) {
    throw new Error(`servers: ${serversErr.message}`);
  }

  const list = servers ?? [];
  for (const s of list) {
    const archived = Boolean(s.archived_at);
    if (archived) {
      archivedServers += 1;
    } else {
      activeServers += 1;
      serversByPlan[asPlanBucket(s.plan)] += 1;
    }
    if (s.plan === "founding_pro") foundingSeatsUsed += 1;
  }

  const [
    openPartiesRes,
    feedbackNewRes,
    feedbackTriagingRes,
    trialConsumersRes,
  ] = await Promise.all([
    sb
      .from("lfg_parties")
      .select("*", { count: "exact", head: true })
      .in("status", ["open", "filled"])
      .is("deleted_at", null),
    sb
      .from("feedback_reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),
    sb
      .from("feedback_reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "triaging"),
    sb.from("trial_consumers").select("*", { count: "exact", head: true }),
  ]);

  return {
    serversByPlan,
    archivedServers,
    activeServers,
    foundingSeatsUsed,
    foundingSeatCap: PLANS.founding_pro.seatCap,
    openPartiesGlobal: openPartiesRes.count ?? 0,
    feedbackNew: feedbackNewRes.count ?? 0,
    feedbackTriaging: feedbackTriagingRes.count ?? 0,
    trialConsumers: trialConsumersRes.count ?? 0,
    serverOptions: list.map((s) => ({
      id: s.id as string,
      discord_guild_id: s.discord_guild_id as string,
      name: (s.name as string) || s.discord_guild_id,
      plan: s.plan as string,
      archived_at: (s.archived_at as string | null) ?? null,
    })),
  };
}

export async function loadServerDrill(
  sb: SupabaseClient,
  guildIdRaw: string,
): Promise<ServerDrill> {
  const discord_guild_id = guildIdRaw.trim() || OFFICIAL_RALLIED_GUILD_ID;

  const { data: server } = await sb
    .from("servers")
    .select(
      "id, discord_guild_id, name, plan, trial_consumed_at, archived_at, forever_pro",
    )
    .eq("discord_guild_id", discord_guild_id)
    .maybeSingle();

  if (!server) {
    return {
      discord_guild_id,
      id: null,
      name: null,
      plan: null,
      trial_consumed_at: null,
      archived_at: null,
      forever_pro: null,
      memberCount: 0,
      openParties: 0,
      createsLast24h: 0,
      feedbackNew: 0,
      feedbackTriaging: 0,
      feedbackTotal: 0,
      found: false,
    };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [
    membersRes,
    openRes,
    createsRes,
    fbNewRes,
    fbTriRes,
    fbAllRes,
  ] = await Promise.all([
    sb
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("server_id", server.id),
    sb
      .from("lfg_parties")
      .select("*", { count: "exact", head: true })
      .eq("server_id", server.id)
      .in("status", ["open", "filled"])
      .is("deleted_at", null),
    sb
      .from("lfg_parties")
      .select("*", { count: "exact", head: true })
      .eq("server_id", server.id)
      .gte("created_at", since),
    sb
      .from("feedback_reports")
      .select("*", { count: "exact", head: true })
      .eq("discord_guild_id", discord_guild_id)
      .eq("status", "new"),
    sb
      .from("feedback_reports")
      .select("*", { count: "exact", head: true })
      .eq("discord_guild_id", discord_guild_id)
      .eq("status", "triaging"),
    sb
      .from("feedback_reports")
      .select("*", { count: "exact", head: true })
      .eq("discord_guild_id", discord_guild_id),
  ]);

  return {
    discord_guild_id,
    id: server.id as string,
    name: (server.name as string) || null,
    plan: (server.plan as string) || null,
    trial_consumed_at: (server.trial_consumed_at as string | null) ?? null,
    archived_at: (server.archived_at as string | null) ?? null,
    forever_pro: Boolean(server.forever_pro),
    memberCount: membersRes.count ?? 0,
    openParties: openRes.count ?? 0,
    createsLast24h: createsRes.count ?? 0,
    feedbackNew: fbNewRes.count ?? 0,
    feedbackTriaging: fbTriRes.count ?? 0,
    feedbackTotal: fbAllRes.count ?? 0,
    found: true,
  };
}

type GqlAdaptiveRow = {
  sum?: { requests?: number; errors?: number; subrequests?: number };
  quantiles?: { cpuTimeP50?: number; cpuTimeP99?: number };
  dimensions?: { scriptName?: string };
};

async function fetchCfWindow(
  accountId: string,
  token: string,
  scriptNames: string[],
  hours: number,
): Promise<Record<string, CfWorkerWindow>> {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  const query = `
    query WorkersUsage($accountTag: string!, $datetimeStart: string!, $datetimeEnd: string!, $scriptNames: [string!]!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          workersInvocationsAdaptive(
            limit: 10000
            filter: {
              datetime_geq: $datetimeStart
              datetime_leq: $datetimeEnd
              scriptName_in: $scriptNames
            }
          ) {
            sum { requests errors subrequests }
            quantiles { cpuTimeP50 cpuTimeP99 }
            dimensions { scriptName }
          }
        }
      }
    }
  `;

  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query,
      variables: {
        accountTag: accountId,
        datetimeStart: start.toISOString(),
        datetimeEnd: end.toISOString(),
        scriptNames,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CF GraphQL HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    errors?: Array<{ message?: string }>;
    data?: {
      viewer?: {
        accounts?: Array<{
          workersInvocationsAdaptive?: GqlAdaptiveRow[];
        }>;
      };
    };
  };

  if (json.errors?.length) {
    throw new Error(
      json.errors.map((e) => e.message ?? "graphql_error").join("; "),
    );
  }

  const rows =
    json.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive ?? [];
  const out: Record<string, CfWorkerWindow> = {};
  for (const name of scriptNames) out[name] = emptyWindow();

  for (const row of rows) {
    const name = row.dimensions?.scriptName;
    if (!name) continue;
    if (!out[name]) out[name] = emptyWindow();
    const w = out[name];
    w.requests += row.sum?.requests ?? 0;
    w.errors += row.sum?.errors ?? 0;
    w.subrequests += row.sum?.subrequests ?? 0;
    // Keep last quantile sample (adaptive rows); good enough for ops glance.
    if (row.quantiles?.cpuTimeP50 != null) {
      w.cpuTimeP50Ms = row.quantiles.cpuTimeP50;
    }
    if (row.quantiles?.cpuTimeP99 != null) {
      w.cpuTimeP99Ms = row.quantiles.cpuTimeP99;
    }
  }

  return out;
}

async function loadCloudflare(): Promise<CfUsage> {
  const token = (getRuntimeEnv("CF_API_TOKEN") ?? "").trim();
  const accountId = (getRuntimeEnv("CF_ACCOUNT_ID") ?? "").trim();
  const workerNames = cfWorkerNames();
  const setupHint =
    "Connect Cloudflare — add CF_API_TOKEN + CF_ACCOUNT_ID on rallied-web (Account Analytics Read / Workers Analytics). Optional CF_WORKER_NAMES=rallied-web,rallied-bot. Redeploy after setting.";

  if (!token || !accountId) {
    return {
      configured: false,
      setupHint,
      accountId: accountId || null,
      workerNames,
      windows: null,
      freeTierRef: CF_FREE_TIER_REF,
      error: null,
      fetchedAt: null,
    };
  }

  const cacheKey = `cf:${accountId}:${workerNames.join(",")}`;
  const cached = cacheGet<CfUsage>(cacheKey);
  if (cached) return { ...cached };

  try {
    const [w24, w7, w30] = await Promise.all([
      fetchCfWindow(accountId, token, workerNames, 24),
      fetchCfWindow(accountId, token, workerNames, 24 * 7),
      fetchCfWindow(accountId, token, workerNames, 24 * 30),
    ]);
    const value: CfUsage = {
      configured: true,
      setupHint: null,
      accountId,
      workerNames,
      windows: { "24h": w24, "7d": w7, "30d": w30 },
      freeTierRef: CF_FREE_TIER_REF,
      error: null,
      fetchedAt: new Date().toISOString(),
    };
    cacheSet(cacheKey, value);
    return value;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      configured: true,
      setupHint,
      accountId,
      workerNames,
      windows: null,
      freeTierRef: CF_FREE_TIER_REF,
      error: msg,
      fetchedAt: new Date().toISOString(),
    };
  }
}

function bytesPretty(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

async function managementQuery(
  projectRef: string,
  token: string,
  sql: string,
): Promise<unknown> {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase Management ${res.status}: ${text.slice(0, 240)}`);
  }
  return res.json();
}

async function loadSupabaseSizes(sb: SupabaseClient): Promise<SupabaseUsage> {
  const token = (getRuntimeEnv("SUPABASE_ACCESS_TOKEN") ?? "").trim();
  const projectRef = (getRuntimeEnv("SUPABASE_PROJECT_REF") ?? "").trim();
  const setupHint =
    "Optional: add SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF for Management API sizes. Else run migration 018 (ops_relation_sizes) for SQL estimates. Redeploy rallied-web after secrets.";

  const tablesBase: SupabaseTableSize[] = OPS_SIZE_TABLES.map((table) => ({
    table,
    totalBytes: null,
    sizePretty: null,
    rowCount: null,
  }));

  // Always try row counts (service role).
  await Promise.all(
    tablesBase.map(async (t) => {
      const { count } = await sb
        .from(t.table)
        .select("*", { count: "exact", head: true });
      t.rowCount = count ?? 0;
    }),
  );

  const cacheKey = `sb:${projectRef || "local"}`;
  const cached = cacheGet<SupabaseUsage>(cacheKey);
  if (cached) {
    // Refresh row counts onto cached sizes
    return {
      ...cached,
      tables: tablesBase.map((t) => {
        const prev = cached.tables.find((x) => x.table === t.table);
        return {
          ...t,
          totalBytes: prev?.totalBytes ?? null,
          sizePretty: prev?.sizePretty ?? null,
        };
      }),
    };
  }

  // Prefer Management API
  if (token && projectRef) {
    try {
      const tableList = OPS_SIZE_TABLES.map((t) => `'${t}'`).join(",");
      const sizeSql = `
        select
          t.relname::text as table_name,
          pg_total_relation_size(t.oid)::bigint as total_bytes,
          pg_size_pretty(pg_total_relation_size(t.oid)) as size_pretty
        from pg_class t
        join pg_namespace n on n.oid = t.relnamespace
        where n.nspname = 'public'
          and t.relkind = 'r'
          and t.relname in (${tableList});
      `;
      const dbSql = `select pg_database_size(current_database())::bigint as total_bytes, pg_size_pretty(pg_database_size(current_database())) as size_pretty;`;

      const [tableRows, dbRows] = await Promise.all([
        managementQuery(projectRef, token, sizeSql),
        managementQuery(projectRef, token, dbSql),
      ]);

      const tableArr = Array.isArray(tableRows)
        ? (tableRows as Array<{
            table_name?: string;
            total_bytes?: number;
            size_pretty?: string;
          }>)
        : [];
      const dbArr = Array.isArray(dbRows)
        ? (dbRows as Array<{ total_bytes?: number; size_pretty?: string }>)
        : [];

      const tables = tablesBase.map((t) => {
        const hit = tableArr.find((r) => r.table_name === t.table);
        return {
          ...t,
          totalBytes:
            hit?.total_bytes != null ? Number(hit.total_bytes) : null,
          sizePretty: hit?.size_pretty ?? null,
        };
      });

      const value: SupabaseUsage = {
        configuredManagement: true,
        setupHint: null,
        projectRef,
        databaseBytes:
          dbArr[0]?.total_bytes != null ? Number(dbArr[0].total_bytes) : null,
        databasePretty: dbArr[0]?.size_pretty ?? null,
        source: "management_api",
        tables,
        freeTierRef: SUPABASE_FREE_TIER_REF,
        error: null,
        fetchedAt: new Date().toISOString(),
      };
      cacheSet(cacheKey, value);
      return value;
    } catch (e) {
      // Fall through to RPC
      const mgmtErr = e instanceof Error ? e.message : String(e);
      const rpc = await tryRpcSizes(sb, tablesBase, projectRef || null);
      if (rpc) {
        return { ...rpc, error: `Management API failed (${mgmtErr}); used RPC.` };
      }
      return {
        configuredManagement: true,
        setupHint,
        projectRef,
        databaseBytes: null,
        databasePretty: null,
        source: "row_counts",
        tables: tablesBase,
        freeTierRef: SUPABASE_FREE_TIER_REF,
        error: mgmtErr,
        fetchedAt: new Date().toISOString(),
      };
    }
  }

  const rpc = await tryRpcSizes(sb, tablesBase, projectRef || null);
  if (rpc) {
    cacheSet(cacheKey, rpc);
    return rpc;
  }

  return {
    configuredManagement: false,
    setupHint,
    projectRef: projectRef || null,
    databaseBytes: null,
    databasePretty: null,
    source: "row_counts",
    tables: tablesBase,
    freeTierRef: SUPABASE_FREE_TIER_REF,
    error: null,
    fetchedAt: new Date().toISOString(),
  };
}

async function tryRpcSizes(
  sb: SupabaseClient,
  tablesBase: SupabaseTableSize[],
  projectRef: string | null,
): Promise<SupabaseUsage | null> {
  const { data: dbData, error: dbErr } = await sb.rpc("ops_database_size");
  if (dbErr) return null;

  const { data: tableData, error: tableErr } = await sb.rpc(
    "ops_relation_sizes",
    { table_names: [...OPS_SIZE_TABLES] },
  );
  if (tableErr) return null;

  const dbRow = Array.isArray(dbData) ? dbData[0] : dbData;
  const tableArr = (tableData ?? []) as Array<{
    table_name?: string;
    total_bytes?: number;
    size_pretty?: string;
  }>;

  const tables = tablesBase.map((t) => {
    const hit = tableArr.find((r) => r.table_name === t.table);
    return {
      ...t,
      totalBytes: hit?.total_bytes != null ? Number(hit.total_bytes) : null,
      sizePretty: hit?.size_pretty ?? null,
    };
  });

  const totalBytes =
    dbRow && typeof dbRow === "object" && "total_bytes" in dbRow
      ? Number((dbRow as { total_bytes: number }).total_bytes)
      : null;
  const sizePretty =
    dbRow && typeof dbRow === "object" && "size_pretty" in dbRow
      ? String((dbRow as { size_pretty: string }).size_pretty)
      : totalBytes != null
        ? bytesPretty(totalBytes)
        : null;

  return {
    configuredManagement: false,
    setupHint: null,
    projectRef,
    databaseBytes: totalBytes,
    databasePretty: sizePretty,
    source: "rpc",
    tables,
    freeTierRef: SUPABASE_FREE_TIER_REF,
    error: null,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getOpsUsage(opts: {
  guildId?: string | null;
}): Promise<OpsUsagePayload> {
  const sb = getServiceSupabase();
  if (!sb) {
    throw new Error("supabase_unavailable");
  }

  const guildId =
    (opts.guildId ?? "").trim() || OFFICIAL_RALLIED_GUILD_ID;

  const productCacheKey = "product:v1";
  let product = cacheGet<ProductUsage>(productCacheKey);
  let cached = Boolean(product);
  if (!product) {
    product = await loadProduct(sb);
    cacheSet(productCacheKey, product);
    cached = false;
  }

  const [drill, cloudflare, supabase] = await Promise.all([
    loadServerDrill(sb, guildId),
    loadCloudflare(),
    loadSupabaseSizes(sb),
  ]);

  const cfDash =
    cloudflare.accountId != null
      ? `${CF_FREE_TIER_REF.dashboardUrl}/${cloudflare.accountId}`
      : CF_FREE_TIER_REF.dashboardUrl;
  const sbDash = supabase.projectRef
    ? `${SUPABASE_FREE_TIER_REF.dashboardUrl}/project/${supabase.projectRef}`
    : SUPABASE_FREE_TIER_REF.dashboardUrl;

  return {
    ok: true,
    cached,
    cacheTtlSeconds: Math.round(CACHE_TTL_MS / 1000),
    product,
    drill,
    cloudflare,
    supabase,
    links: {
      cloudflareDashboard: cfDash,
      supabaseDashboard: sbDash,
      officialGuildId: OFFICIAL_RALLIED_GUILD_ID,
    },
  };
}
