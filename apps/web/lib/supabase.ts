import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let anonClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
}

export function hasSupabaseEnv(): boolean {
  return Boolean(supabaseUrl() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** True when server can bypass RLS (required for dashboard admin reads). */
export function hasServiceRole(): boolean {
  return Boolean(supabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Browser / server anon client. RLS denies most tables — prefer getServiceSupabase on server. */
export function getSupabase(): SupabaseClient | null {
  const url = supabaseUrl();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (anonClient) return anonClient;
  anonClient = createClient(url, key);
  return anonClient;
}

/**
 * Server-only service role client (bypasses RLS).
 * Never import this into client components; never expose the key as NEXT_PUBLIC_*.
 */
export function getServiceSupabase(): SupabaseClient | null {
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (serviceClient) return serviceClient;
  serviceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serviceClient;
}
