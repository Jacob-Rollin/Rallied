import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl, type BotEnv } from "./env.js";
import { errorFromUnknown } from "./errors.js";

/** Placeholder used when looking up another member without a real display name. */
export const MEMBER_NAME_PLACEHOLDER = "member";

export function createServiceClient(env: BotEnv): SupabaseClient | null {
  const url = normalizeSupabaseUrl(env.SUPABASE_URL ?? "");
  if (!url || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Upsert server + member for this guild interaction.
 * Does not clobber an existing display_name/avatar when `displayName` is the
 * `"member"` placeholder (lookups of other users).
 */
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

  // PostgREST errors are plain objects — never throw them raw (catch sites
  // used to collapse non-Error throws into Discord "unknown error").
  if (sErr || !server) {
    throw errorFromUnknown("server upsert failed", sErr ?? "no row returned");
  }

  const { data: existing, error: findErr } = await sb
    .from("members")
    .select("*")
    .eq("server_id", server.id)
    .eq("discord_user_id", userId)
    .maybeSingle();

  if (findErr) {
    throw errorFromUnknown("member lookup failed", findErr);
  }

  const isPlaceholder =
    !displayName || displayName === MEMBER_NAME_PLACEHOLDER;

  if (existing) {
    if (isPlaceholder && !avatarUrl) {
      return { server, member: existing };
    }

    const patch: Record<string, unknown> = {};
    if (!isPlaceholder && displayName !== existing.display_name) {
      patch.display_name = displayName;
    }
    if (avatarUrl && avatarUrl !== existing.avatar_url) {
      patch.avatar_url = avatarUrl;
    }

    if (Object.keys(patch).length === 0) {
      return { server, member: existing };
    }

    const { data: updated, error: uErr } = await sb
      .from("members")
      .update(patch)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (uErr || !updated) {
      throw errorFromUnknown("member update failed", uErr ?? "no row returned");
    }
    return { server, member: updated };
  }

  const { data: member, error: mErr } = await sb
    .from("members")
    .insert({
      server_id: server.id,
      discord_user_id: userId,
      display_name: isPlaceholder ? userId : displayName,
      avatar_url: avatarUrl,
    })
    .select("*")
    .single();

  if (mErr || !member) {
    throw errorFromUnknown("member insert failed", mErr ?? "no row returned");
  }

  return { server, member };
}
