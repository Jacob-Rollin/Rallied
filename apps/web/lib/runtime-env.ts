import { getCloudflareContext } from "@opennextjs/cloudflare";
import { normalizeSupabaseUrl } from "@rallied/shared";

/**
 * Read a Worker Runtime var/secret for OpenNext on Cloudflare.
 * Prefers getCloudflareContext().env (dashboard Secrets/vars) so a short or
 * stale build-time process.env value cannot shadow the real Runtime Secret.
 * Falls back to process.env for local `next dev` / tests.
 */
export function getRuntimeEnv(name: string): string | undefined {
  try {
    const env = getCloudflareContext().env as Record<string, unknown>;
    const value = env?.[name];
    if (typeof value === "string" && value.length > 0) return value;
  } catch {
    // Outside Workers request context (next dev, build, tests).
  }

  const fromProcess = process.env[name];
  if (typeof fromProcess === "string" && fromProcess.length > 0) {
    return fromProcess;
  }

  return undefined;
}

/**
 * Project base URL for createClient and manual `/rest/v1` fetches.
 * Strips trailing slashes and a pasted `/rest/v1` (PGRST125).
 */
export function getSupabaseUrl(): string | undefined {
  const raw =
    getRuntimeEnv("NEXT_PUBLIC_SUPABASE_URL") || getRuntimeEnv("SUPABASE_URL");
  if (!raw) return undefined;
  const normalized = normalizeSupabaseUrl(raw);
  return normalized || undefined;
}

export function getServiceRoleKey(): string | undefined {
  return getRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY");
}
