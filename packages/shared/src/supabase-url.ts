/**
 * Project URL only (`https://xxx.supabase.co`). Strips a pasted `/rest/v1`
 * so supabase-js (and manual `/rest/v1` fetches) do not double the path
 * (PostgREST PGRST125: "Invalid path specified in request URL").
 */
export function normalizeSupabaseUrl(url: string): string {
  let normalized = url.trim().replace(/\/+$/, "");
  normalized = normalized.replace(/\/rest\/v1$/i, "");
  return normalized.replace(/\/+$/, "");
}
