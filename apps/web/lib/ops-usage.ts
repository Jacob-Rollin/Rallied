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

/** PostgREST / Postgres missing column or relation (PGRST204 / 42703 / 42P01). */
function isMissingSchemaError(message: string, name: string): boolean {
  const m = message.toLowerCase();
  const n = name.toLowerCase();
  if (!m.includes(n)) return false;
  return (
    m.includes("does not exist") ||
    m.includes("could not find") ||
    m.includes("schema cache") ||
    m.includes("undefined column") ||
    m.includes("undefined table")
  );
}

const SERVER_BASE_COLS = [
  "id",
  "discord_guild_id",
  "name",
  "plan",
] as const;

/** Ops-usage-only optional columns from migrations 012 / 014 / 016. */
const SERVER_OPTIONAL_COLS = [
  "forever_pro",
  "trial_consumed_at",
  "archived_at",
] as const;

type ServerOptionalCol = (typeof SERVER_OPTIONAL_COLS)[number];

function schemaHintFor(name: string): string {
  switch (name) {
    case "archived_at":
      return "Run migration 016 (servers.archived_at) for retention-aware server counts — treating all servers as non-archived until then.";
    case "trial_consumed_at":
      return "Run migration 014 (servers.trial_consumed_at) for guild trial drill fields.";
    case "forever_pro":
      return "Run migration 012 (servers.forever_pro) for forever_pro protection flags.";
    case "trial_consumers":
      return "Run migration 017 (trial_consumers) for trial consumer counts.";
    case "feedback_reports":
      return "Run migration 015 (feedback_reports) for feedback backlog counts.";
    default:
      return `Optional schema missing: ${name}`;
  }
}

type ServerRow = {
  id: string;
  discord_guild_id: string;
  name: string | null;
  plan: string | null;
  forever_pro?: boolean | null;
  trial_consumed_at?: string | null;
  archived_at?: string | null;
};

async function selectServersOptional(
  sb: SupabaseClient,
  opts: { guildId?: string },
): Promise<{
  rows: ServerRow[];
  missing: Set<ServerOptionalCol>;
  hints: string[];
  error: string | null;
}> {
  const optional: ServerOptionalCol[] = [...SERVER_OPTIONAL_COLS];
  const hints: string[] = [];
  const missing = new Set<ServerOptionalCol>();

  for (;;) {
    const cols = [...SERVER_BASE_COLS, ...optional].join(", ");
    const { data, error } = opts.guildId
      ? await sb
          .from("servers")
          .select(cols)
          .eq("discord_guild_id", opts.guildId)
          .maybeSingle()
      : await sb
          .from("servers")
          .select(cols)
          .order("name", { ascending: true })
          .limit(500);

    if (!error) {
      const rows = opts.guildId
        ? data
          ? [data as unknown as ServerRow]
          : []
        : ((data ?? []) as unknown as ServerRow[]);
      return { rows, missing, hints, error: null };
    }

    const hit = optional.find((c) => isMissingSchemaError(error.message, c));
    if (hit) {
      optional.splice(optional.indexOf(hit), 1);
      missing.add(hit);
      hints.push(schemaHintFor(hit));
      continue;
    }

    return {
      rows: [],
      missing,
      hints,
      error: `servers: ${error.message}`,
    };
  }
}

async function softCount(
  label: string,
  run: () => PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<{ count: number | null; hint: string | null }> {
  const { count, error } = await run();
  if (!error) return { count: count ?? 0, hint: null };
  if (
    isMissingSchemaError(error.message, label) ||
    /does not exist|could not find|schema cache/i.test(error.message)
  ) {
    return { count: null, hint: schemaHintFor(label) };
  }
  return { count: null, hint: `${label}: ${error.message}` };
}

async function loadProduct(sb: SupabaseClient): Promise<ProductUsage> {
  const serversByPlan = emptyPlanBuckets();
  let archivedServers = 0;
  let activeServers = 0;
  let foundingSeatsUsed = 0;
  const schemaHints: string[] = [];

  const selected = await selectServersOptional(sb, {});
  if (selected.error) {
    return {
      serversByPlan: emptyPlanBuckets(),
      archivedServers: 0,
      activeServers: 0,
      foundingSeatsUsed: 0,
      foundingSeatCap: PLANS.founding_pro.seatCap,
      openPartiesGlobal: null,
      feedbackNew: null,
      feedbackTriaging: null,
      trialConsumers: null,
      serverOptions: [],
      schemaHints: selected.hints,
      error: selected.error,
    };
  }

  schemaHints.push(...selected.hints);
  const hasArchivedAt = !selected.missing.has("archived_at");
  const list = selected.rows;

  for (const s of list) {
    // Missing archived_at (pre-016): treat all as non-archived — do not invent archives.
    const archived = hasArchivedAt ? Boolean(s.archived_at) : false;
    if (archived) {
      archivedServers += 1;
    } else {
      activeServers += 1;
      serversByPlan[asPlanBucket(s.plan)] += 1;
    }
    if (s.plan === "founding_pro") foundingSeatsUsed += 1;
  }

  const [
    openParties,
    feedbackNew,
    feedbackTriaging,
    trialConsumers,
  ] = await Promise.all([
    softCount("lfg_parties", () =>
      sb
        .from("lfg_parties")
        .select("*", { count: "exact", head: true })
        .in("status", ["open", "filled"])
        .is("deleted_at", null),
    ),
    softCount("feedback_reports", () =>
      sb
        .from("feedback_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "new"),
    ),
    softCount("feedback_reports", () =>
      sb
        .from("feedback_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "triaging"),
    ),
    softCount("trial_consumers", () =>
      sb.from("trial_consumers").select("*", { count: "exact", head: true }),
    ),
  ]);

  for (const part of [
    openParties,
    feedbackNew,
    feedbackTriaging,
    trialConsumers,
  ]) {
    if (part.hint && !schemaHints.includes(part.hint)) {
      schemaHints.push(part.hint);
    }
  }

  return {
    serversByPlan,
    archivedServers,
    activeServers,
    foundingSeatsUsed,
    foundingSeatCap: PLANS.founding_pro.seatCap,
    openPartiesGlobal: openParties.count,
    feedbackNew: feedbackNew.count,
    feedbackTriaging: feedbackTriaging.count,
    trialConsumers: trialConsumers.count,
    serverOptions: list.map((s) => ({
      id: s.id,
      discord_guild_id: s.discord_guild_id,
      name: s.name || s.discord_guild_id,
      plan: (s.plan as string) || "free",
      archived_at: hasArchivedAt ? (s.archived_at ?? null) : null,
    })),
    schemaHints,
    error: null,
  };
}

export async function loadServerDrill(
  sb: SupabaseClient,
  guildIdRaw: string,
): Promise<ServerDrill> {
  const discord_guild_id = guildIdRaw.trim() || OFFICIAL_RALLIED_GUILD_ID;
  const schemaHints: string[] = [];

  const selected = await selectServersOptional(sb, { guildId: discord_guild_id });
  if (selected.error) {
    return {
      discord_guild_id,
      id: null,
      name: null,
      plan: null,
      trial_consumed_at: null,
      archived_at: null,
      forever_pro: null,
      memberCount: null,
      openParties: null,
      createsLast24h: null,
      feedbackNew: null,
      feedbackTriaging: null,
      feedbackTotal: null,
      found: false,
      schemaHints: selected.hints,
      error: selected.error,
    };
  }

  schemaHints.push(...selected.hints);
  const server = selected.rows[0];
  const hasArchivedAt = !selected.missing.has("archived_at");
  const hasTrialConsumed = !selected.missing.has("trial_consumed_at");
  const hasForeverPro = !selected.missing.has("forever_pro");

  if (!server) {
    return {
      discord_guild_id,
      id: null,
      name: null,
      plan: null,
      trial_consumed_at: null,
      archived_at: null,
      forever_pro: null,
      memberCount: null,
      openParties: null,
      createsLast24h: null,
      feedbackNew: null,
      feedbackTriaging: null,
      feedbackTotal: null,
      found: false,
      schemaHints,
      error: null,
    };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [
    members,
    openParties,
    creates,
    fbNew,
    fbTri,
    fbAll,
  ] = await Promise.all([
    softCount("members", () =>
      sb
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("server_id", server.id),
    ),
    softCount("lfg_parties", () =>
      sb
        .from("lfg_parties")
        .select("*", { count: "exact", head: true })
        .eq("server_id", server.id)
        .in("status", ["open", "filled"])
        .is("deleted_at", null),
    ),
    softCount("lfg_parties", () =>
      sb
        .from("lfg_parties")
        .select("*", { count: "exact", head: true })
        .eq("server_id", server.id)
        .gte("created_at", since),
    ),
    softCount("feedback_reports", () =>
      sb
        .from("feedback_reports")
        .select("*", { count: "exact", head: true })
        .eq("discord_guild_id", discord_guild_id)
        .eq("status", "new"),
    ),
    softCount("feedback_reports", () =>
      sb
        .from("feedback_reports")
        .select("*", { count: "exact", head: true })
        .eq("discord_guild_id", discord_guild_id)
        .eq("status", "triaging"),
    ),
    softCount("feedback_reports", () =>
      sb
        .from("feedback_reports")
        .select("*", { count: "exact", head: true })
        .eq("discord_guild_id", discord_guild_id),
    ),
  ]);

  for (const part of [members, openParties, creates, fbNew, fbTri, fbAll]) {
    if (part.hint && !schemaHints.includes(part.hint)) {
      schemaHints.push(part.hint);
    }
  }

  return {
    discord_guild_id,
    id: server.id,
    name: server.name || null,
    plan: server.plan || null,
    trial_consumed_at: hasTrialConsumed
      ? (server.trial_consumed_at ?? null)
      : null,
    archived_at: hasArchivedAt ? (server.archived_at ?? null) : null,
    forever_pro: hasForeverPro ? Boolean(server.forever_pro) : null,
    memberCount: members.count,
    openParties: openParties.count,
    createsLast24h: creates.count,
    feedbackNew: fbNew.count,
    feedbackTriaging: fbTri.count,
    feedbackTotal: fbAll.count,
    found: true,
    schemaHints,
    error: null,
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
    // CF GraphQL cpuTimeP* is microseconds — store as ms for the UI.
    if (row.quantiles?.cpuTimeP50 != null) {
      w.cpuTimeP50Ms = row.quantiles.cpuTimeP50 / 1000;
    }
    if (row.quantiles?.cpuTimeP99 != null) {
      w.cpuTimeP99Ms = row.quantiles.cpuTimeP99 / 1000;
    }
  }

  return out;
}

async function loadCloudflare(): Promise<CfUsage> {
  const token = (getRuntimeEnv("CF_API_TOKEN") ?? "").trim();
  const accountId = (getRuntimeEnv("CF_ACCOUNT_ID") ?? "").trim();
  const workerNames = cfWorkerNames();
  const setupHint =
    "Connect Cloudflare — add CF_API_TOKEN + CF_ACCOUNT_ID on rallied (Account Analytics Read / Workers Analytics). Optional CF_WORKER_NAMES=rallied,rallied-bot. Redeploy after setting.";

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
    "Optional: add SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF for Management API sizes. Else run migration 018 (ops_relation_sizes) for SQL size estimates only — 016 is for archived_at / retention-aware server counts, not sizes. Redeploy rallied after secrets.";

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

  const productCacheKey = "product:v2";
  let product = cacheGet<ProductUsage>(productCacheKey);
  let cached = Boolean(product);
  let productError: string | null = null;
  if (!product) {
    try {
      product = await loadProduct(sb);
      // Cache successful / soft-schema payloads (not hard error empties).
      if (!product.error) {
        cacheSet(productCacheKey, product);
      }
      cached = false;
    } catch (e) {
      product = null;
      productError = e instanceof Error ? e.message : String(e);
      cached = false;
    }
  }

  const [drillResult, cloudflare, supabase] = await Promise.all([
    loadServerDrill(sb, guildId).then(
      (drill) => ({ drill, drillError: null as string | null }),
      (e: unknown) => ({
        drill: null as ServerDrill | null,
        drillError: e instanceof Error ? e.message : String(e),
      }),
    ),
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
    productError: productError ?? product?.error ?? null,
    drill: drillResult.drill,
    drillError: drillResult.drillError ?? drillResult.drill?.error ?? null,
    cloudflare,
    supabase,
    links: {
      cloudflareDashboard: cfDash,
      supabaseDashboard: sbDash,
      officialGuildId: OFFICIAL_RALLIED_GUILD_ID,
    },
  };
}
