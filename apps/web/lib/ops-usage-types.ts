import type {
  CF_FREE_TIER_REF,
  SUPABASE_FREE_TIER_REF,
} from "@rallied/shared";

export type PlanBucket =
  | "free"
  | "trial"
  | "community"
  | "pro"
  | "founding_pro"
  | "lapsed"
  | "demo"
  | "other";

export type ProductUsage = {
  serversByPlan: Record<PlanBucket, number>;
  archivedServers: number;
  activeServers: number;
  foundingSeatsUsed: number;
  foundingSeatCap: number;
  openPartiesGlobal: number;
  feedbackNew: number;
  feedbackTriaging: number;
  trialConsumers: number;
  serverOptions: Array<{
    id: string;
    discord_guild_id: string;
    name: string;
    plan: string;
    archived_at: string | null;
  }>;
};

export type ServerDrill = {
  discord_guild_id: string;
  id: string | null;
  name: string | null;
  plan: string | null;
  trial_consumed_at: string | null;
  archived_at: string | null;
  forever_pro: boolean | null;
  memberCount: number;
  openParties: number;
  createsLast24h: number;
  feedbackNew: number;
  feedbackTriaging: number;
  feedbackTotal: number;
  found: boolean;
};

export type CfWorkerWindow = {
  requests: number;
  errors: number;
  subrequests: number;
  cpuTimeP50Ms: number | null;
  cpuTimeP99Ms: number | null;
};

export type CfUsage = {
  configured: boolean;
  setupHint: string | null;
  accountId: string | null;
  workerNames: string[];
  windows: {
    "24h": Record<string, CfWorkerWindow>;
    "7d": Record<string, CfWorkerWindow>;
    "30d": Record<string, CfWorkerWindow>;
  } | null;
  freeTierRef: typeof CF_FREE_TIER_REF;
  error: string | null;
  fetchedAt: string | null;
};

export type SupabaseTableSize = {
  table: string;
  totalBytes: number | null;
  sizePretty: string | null;
  rowCount: number | null;
};

export type SupabaseUsage = {
  configuredManagement: boolean;
  setupHint: string | null;
  projectRef: string | null;
  databaseBytes: number | null;
  databasePretty: string | null;
  source: "management_api" | "rpc" | "row_counts" | "none";
  tables: SupabaseTableSize[];
  freeTierRef: typeof SUPABASE_FREE_TIER_REF;
  error: string | null;
  fetchedAt: string | null;
};

export type OpsUsagePayload = {
  ok: true;
  cached: boolean;
  cacheTtlSeconds: number;
  product: ProductUsage;
  drill: ServerDrill | null;
  cloudflare: CfUsage;
  supabase: SupabaseUsage;
  links: {
    cloudflareDashboard: string;
    supabaseDashboard: string;
    officialGuildId: string;
  };
};
