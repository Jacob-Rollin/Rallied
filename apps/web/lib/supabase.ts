import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getRuntimeEnv,
  getServiceRoleKey,
  getSupabaseUrl,
} from "./runtime-env";

let anonClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

function supabaseUrl(): string | undefined {
  return getSupabaseUrl();
}

export function hasSupabaseEnv(): boolean {
  return Boolean(
    supabaseUrl() && getRuntimeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}

/** True when server can bypass RLS (required for dashboard admin reads). */
export function hasServiceRole(): boolean {
  return Boolean(supabaseUrl() && getServiceRoleKey());
}

/** Browser / server anon client. RLS denies most tables — prefer getServiceSupabase on server. */
export function getSupabase(): SupabaseClient | null {
  const url = supabaseUrl();
  const key = getRuntimeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
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
  const key = getServiceRoleKey();
  if (!url || !key) return null;
  if (serviceClient) return serviceClient;
  serviceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serviceClient;
}
