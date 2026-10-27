import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BotEnv } from "./env.js";

export function createServiceClient(env: BotEnv): SupabaseClient | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Upsert server + member for this guild interaction. */
export async function ensureServerAndMember(
  sb: SupabaseClient,
  guildId: string,
  guildName: string | undefined,
  userId: string,
  displayName: string,
  avatarUrl: string | null,
) {
  const { data: server, error: sErr } = await sb
    .from("servers")
    .upsert(
      { discord_guild_id: guildId, name: guildName ?? guildId },
      { onConflict: "discord_guild_id" },
    )
    .select("*")
    .single();

  if (sErr || !server) throw sErr ?? new Error("server upsert failed");

  const { data: member, error: mErr } = await sb
    .from("members")
    .upsert(
      {
        server_id: server.id,
        discord_user_id: userId,
        display_name: displayName,
        avatar_url: avatarUrl,
      },
      { onConflict: "server_id,discord_user_id" },
    )
    .select("*")
    .single();

  if (mErr || !member) throw mErr ?? new Error("member upsert failed");

  return { server, member };
}
