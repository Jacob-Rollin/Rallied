import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { trialEndsAtFromNow } from "@rallied/shared";
import { normalizeSupabaseUrl, type BotEnv } from "./env.js";
import { bootstrapNewServerPlan } from "./entitlements.js";
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
 *
 * New servers start on `plan=trial` with `trial_ends_at = now+14d`.
 * Paid plans are never reset. Pass `env` to apply dogfood / trial bootstrap.
 */
export async function ensureServerAndMember(
  sb: SupabaseClient,
  guildId: string,
  guildName: string | undefined,
  userId: string,
  displayName: string,
  avatarUrl: string | null,
  /** Optional Discord guild icon CDN URL (Pro public vanity). */
  iconUrl: string | null = null,
  env?: BotEnv,
) {
  const { data: existingServer } = await sb
    .from("servers")
    .select("*")
    .eq("discord_guild_id", guildId)
    .maybeSingle();

  let server = existingServer;

  if (!server) {
    const insertRow: Record<string, unknown> = {
      discord_guild_id: guildId,
      name: guildName ?? guildId,
      plan: "trial",
      trial_ends_at: trialEndsAtFromNow(),
    };
    if (iconUrl) insertRow.icon_url = iconUrl;

    const { data: created, error: sErr } = await sb
      .from("servers")
      .insert(insertRow)
      .select("*")
      .single();

    if (sErr || !created) {
      // Race: another interaction inserted first — fall back to upsert name only.
      const { data: raced, error: uErr } = await sb
        .from("servers")
        .upsert(
          {
            discord_guild_id: guildId,
            name: guildName ?? guildId,
            ...(iconUrl ? { icon_url: iconUrl } : {}),
          },
          { onConflict: "discord_guild_id" },
        )
        .select("*")
        .single();
      if (uErr || !raced) {
        throw errorFromUnknown(
          "server upsert failed",
          uErr ?? sErr ?? "no row returned",
        );
      }
      server = raced;
    } else {
      server = created;
    }
  } else {
    const patch: Record<string, unknown> = {};
    if (guildName && guildName !== server.name) {
      patch.name = guildName;
    }
    if (iconUrl && server.icon_url !== iconUrl) {
      patch.icon_url = iconUrl;
    }
    if (Object.keys(patch).length > 0) {
      patch.updated_at = new Date().toISOString();
      const { data: patched, error: iconErr } = await sb
        .from("servers")
        .update(patch)
        .eq("id", server.id)
        .select("*")
        .single();
      if (!iconErr && patched) {
        server = patched;
      }
    }
  }

  if (!server) {
    throw errorFromUnknown("server upsert failed", "no row returned");
  }

  if (env) {
    const planFields = await bootstrapNewServerPlan(sb, env, guildId, {
      id: server.id,
      plan: String(server.plan ?? "trial"),
      trial_ends_at: (server.trial_ends_at as string | null) ?? null,
      created_at: server.created_at as string | undefined,
    });
    Object.assign(server, planFields);
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
