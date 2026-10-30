import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isUsableServerName } from "@rallied/shared";
import { fetchGuildMeta } from "./discord.js";
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
 * Resolve a usable guild name + icon.
 * Prefer the caller-provided name/icon; otherwise GET /guilds/{id} with the bot token.
 * Never returns placeholder / snowflake names.
 */
async function resolveGuildIdentity(
  guildId: string,
  guildName: string | undefined,
  iconUrl: string | null,
  env?: BotEnv,
): Promise<{ name: string | null; iconUrl: string | null }> {
  let name = isUsableServerName(guildName, guildId)
    ? String(guildName).trim()
    : null;
  let icon = iconUrl;

  const token =
    env?.DISCORD_BOT_TOKEN ||
    (typeof process !== "undefined" ? process.env.DISCORD_BOT_TOKEN : "") ||
    "";
  if (token && (!name || !icon)) {
    const meta = await fetchGuildMeta(token, guildId);
    if (meta) {
      if (!name && isUsableServerName(meta.name, guildId)) {
        name = String(meta.name).trim();
      }
      if (!icon && meta.iconUrl) icon = meta.iconUrl;
    }
  }

  return { name, iconUrl: icon };
}

/**
 * Upsert server + member for this guild interaction.
 * Does not clobber an existing display_name/avatar when `displayName` is the
 * `"member"` placeholder (lookups of other users).
 *
 * Server `name` / `icon_url`: never write snowflake / "Discord server" /
 * "Selected server" placeholders. When the provided name is missing/invalid,
 * fetch the real guild via the bot token (if `env` is passed) and persist it.
 *
 * New servers start on `plan=free` (Starter). Community trial is Stripe Checkout
 * only (card required; one per guild + per Discord user). Never delete this
 * row on bot leave or `/setup` — reinstall must reuse history (same policy as
 * trial_consumed_at / trial_consumers). Paid plans are never reset. Child rows (parties, members,
 * ghostless_stats, server_events) stay attached to this servers.id.
 * Pass `env` for dogfood / legacy trial bootstrap.
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
  const identity = await resolveGuildIdentity(
    guildId,
    guildName,
    iconUrl,
    env,
  );
  // Empty string is allowed by schema; never persist guild id / placeholders.
  const persistName = identity.name ?? "";

  const { data: existingServer } = await sb
    .from("servers")
    .select("*")
    .eq("discord_guild_id", guildId)
    .maybeSingle();

  let server = existingServer;

  if (!server) {
    const insertRow: Record<string, unknown> = {
      discord_guild_id: guildId,
      name: persistName,
      plan: "free",
      trial_ends_at: null,
    };
    if (identity.iconUrl) insertRow.icon_url = identity.iconUrl;

    const { data: created, error: sErr } = await sb
      .from("servers")
      .insert(insertRow)
      .select("*")
      .single();

    if (sErr || !created) {
      // Race: another interaction inserted first — upsert usable name/icon only.
      const raceRow: Record<string, unknown> = {
        discord_guild_id: guildId,
        name: persistName,
      };
      if (identity.iconUrl) raceRow.icon_url = identity.iconUrl;
      const { data: raced, error: uErr } = await sb
        .from("servers")
        .upsert(raceRow, { onConflict: "discord_guild_id" })
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
    const currentName = String(server.name ?? "");
    const currentInvalid = !isUsableServerName(currentName, guildId);
    if (
      identity.name &&
      (currentInvalid || identity.name !== currentName)
    ) {
      patch.name = identity.name;
    }
    if (identity.iconUrl && server.icon_url !== identity.iconUrl) {
      patch.icon_url = identity.iconUrl;
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
      plan: String(server.plan ?? "free"),
      trial_ends_at: (server.trial_ends_at as string | null) ?? null,
      trial_consumed_at: (server.trial_consumed_at as string | null) ?? null,
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
