import {
  COMMUNITY_PRICE_USD,
  canCreateParty,
  effectivePlan,
  parseDogfoodGuildIds,
  billingPageUrl,
  reliabilityEnabled,
  trialEndsAtFromNow,
  upgradeCopy,
  type CapBlockReason,
  type EffectivePlan,
  type ServerEntitlementInput,
} from "@rallied/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EPHEMERAL_FLAG,
  InteractionResponseType,
  type InteractionResponse,
} from "./discord.js";
import type { BotEnv } from "./env.js";
import { CORAL } from "./embeds.js";
import { getServerSettings } from "./settings.js";

export function dogfoodGuildIds(env: BotEnv): Set<string> {
  return parseDogfoodGuildIds(env.DOGFOOD_GUILD_IDS);
}

export function webBaseUrl(env: BotEnv): string {
  return (
    env.PUBLIC_WEB_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://rallied.gg"
  );
}

export function resolveEffectivePlan(
  server: ServerEntitlementInput & { discord_guild_id?: string | null },
  env: BotEnv,
  guildId?: string,
): EffectivePlan {
  return effectivePlan(
    {
      plan: server.plan,
      trial_ends_at: server.trial_ends_at,
      discord_guild_id: guildId ?? server.discord_guild_id ?? null,
    },
    { dogfoodGuildIds: dogfoodGuildIds(env) },
  );
}

/** Persist expired legacy/app trials → free. Marks trial_consumed_at. */
export async function lapseExpiredTrial(
  sb: SupabaseClient,
  server: {
    id: string;
    plan: string;
    trial_ends_at: string | null;
    trial_consumed_at?: string | null;
  },
  now = new Date(),
): Promise<{ plan: string; trial_ends_at: string | null }> {
  if (server.plan !== "trial" || !server.trial_ends_at) {
    return { plan: server.plan, trial_ends_at: server.trial_ends_at };
  }
  if (new Date(server.trial_ends_at).getTime() > now.getTime()) {
    return { plan: server.plan, trial_ends_at: server.trial_ends_at };
  }
  const nowIso = now.toISOString();
  const patch: Record<string, unknown> = {
    plan: "free",
    updated_at: nowIso,
  };
  if (!server.trial_consumed_at) {
    patch.trial_consumed_at = nowIso;
  }
  const { data } = await sb
    .from("servers")
    .update(patch)
    .eq("id", server.id)
    .eq("plan", "trial")
    .select("plan, trial_ends_at")
    .maybeSingle();
  return {
    plan: (data?.plan as string) ?? "free",
    trial_ends_at:
      (data?.trial_ends_at as string | null) ?? server.trial_ends_at,
  };
}

/** Sweep expired trials (cron). Never clears trial_consumed_at. */
export async function lapseAllExpiredTrials(
  sb: SupabaseClient,
): Promise<number> {
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("servers")
    .update({
      plan: "free",
      trial_consumed_at: now,
      updated_at: now,
    })
    .eq("plan", "trial")
    .lt("trial_ends_at", now)
    .not("trial_ends_at", "is", null)
    .select("id");
  // Note: setting trial_consumed_at on already-consumed rows is fine (same-ish timestamp).
  // Rows with trial_consumed_at already set keep the column; PostgREST overwrites — acceptable.
  if (error) {
    console.error("lapseAllExpiredTrials", error.message);
    return 0;
  }
  return data?.length ?? 0;
}

/**
 * Dogfood → founding_pro. Never re-grants Community trial after trial_consumed_at.
 * Legacy plan=trial rows keep their clock until lapse; new installs are plan=free.
 */
export async function bootstrapNewServerPlan(
  sb: SupabaseClient,
  env: BotEnv,
  guildId: string,
  server: {
    id: string;
    plan: string;
    trial_ends_at: string | null;
    trial_consumed_at?: string | null;
    created_at?: string;
  },
): Promise<{ plan: string; trial_ends_at: string | null }> {
  if (isDogfoodGuildId(env, guildId)) {
    if (server.plan !== "founding_pro") {
      const { data } = await sb
        .from("servers")
        .update({
          plan: "founding_pro",
          price_lock_cents: 899,
          priority_support: true,
          forever_pro: true,
          trial_ends_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", server.id)
        .select("plan, trial_ends_at")
        .maybeSingle();
      return {
        plan: (data?.plan as string) ?? "founding_pro",
        trial_ends_at: (data?.trial_ends_at as string | null) ?? null,
      };
    }
    return { plan: server.plan, trial_ends_at: server.trial_ends_at };
  }

  const paid = ["community", "pro", "founding_pro", "demo"].includes(
    server.plan,
  );
  if (paid) {
    return { plan: server.plan, trial_ends_at: server.trial_ends_at };
  }

  // Legacy incomplete trial rows only — do not mint new install trials.
  if (server.plan === "trial" && !server.trial_ends_at) {
    const ends = trialEndsAtFromNow();
    const nowIso = new Date().toISOString();
    const patch: Record<string, unknown> = {
      trial_ends_at: ends,
      updated_at: nowIso,
    };
    if (!server.trial_consumed_at) {
      patch.trial_consumed_at = nowIso;
    }
    const { data } = await sb
      .from("servers")
      .update(patch)
      .eq("id", server.id)
      .eq("plan", "trial")
      .is("trial_ends_at", null)
      .select("plan, trial_ends_at")
      .maybeSingle();
    return {
      plan: (data?.plan as string) ?? "trial",
      trial_ends_at: (data?.trial_ends_at as string | null) ?? ends,
    };
  }

  return lapseExpiredTrial(sb, {
    id: server.id,
    plan: server.plan,
    trial_ends_at: server.trial_ends_at,
    trial_consumed_at: server.trial_consumed_at ?? null,
  });
}

function isDogfoodGuildId(env: BotEnv, guildId: string): boolean {
  return dogfoodGuildIds(env).has(guildId);
}

export function upgradeEphemeral(opts: {
  env: BotEnv;
  reason: CapBlockReason | "reliability" | "public";
  resetHint?: string;
  guildId?: string | null;
}): InteractionResponse {
  const copy = upgradeCopy(opts.reason);
  const url = billingPageUrl(webBaseUrl(opts.env), opts.guildId);
  const description = opts.resetHint
    ? `${copy.body}\n\n${opts.resetHint}`
    : copy.body;

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      flags: EPHEMERAL_FLAG,
      embeds: [
        {
          title: copy.title,
          description,
          color: CORAL,
          footer: { text: "Rallied · Path B" },
        },
      ],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: `Upgrade to Community — $${COMMUNITY_PRICE_USD}/mo`,
              url,
            },
          ],
        },
      ],
    },
  };
}

/** Soft ready-check note when reliability is off. */
export function freeReadyCheckNote(): string {
  return "No-shows aren’t struck on Starter (this server). Upgrade to Community to enforce Ghostless + strikes.";
}

export async function checkCreateCaps(opts: {
  sb: SupabaseClient;
  env: BotEnv;
  serverId: string;
  plan: string;
  /** members.id of the creating host — required for per-host open cap. */
  hostMemberId: string;
  guildId?: string | null;
}): Promise<InteractionResponse | null> {
  const settings = await getServerSettings(opts.sb, opts.serverId);

  const openCapCheck = await opts.sb
    .from("lfg_parties")
    .select("*", { count: "exact", head: true })
    .eq("server_id", opts.serverId)
    .in("status", ["open", "filled"])
    .is("deleted_at", null);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const createsCheck = await opts.sb
    .from("lfg_parties")
    .select("*", { count: "exact", head: true })
    .eq("server_id", opts.serverId)
    .gte("created_at", since);

  // Count open/filled parties this member hosts (membership role=host via host_member_id).
  const hostedCheck = await opts.sb
    .from("lfg_parties")
    .select("*", { count: "exact", head: true })
    .eq("server_id", opts.serverId)
    .eq("host_member_id", opts.hostMemberId)
    .in("status", ["open", "filled"])
    .is("deleted_at", null);

  const hostedOpenCount = hostedCheck.count ?? 0;
  const gate = canCreateParty({
    plan: opts.plan,
    openPartyCount: openCapCheck.count ?? 0,
    createsLast24h: createsCheck.count ?? 0,
    hostedOpenCount,
    maxOpenPartiesPerHost: settings.max_open_parties_per_host,
  });

  if (gate.ok) return null;

  // Per-host hygiene — not a paid plan gate. Clear Discord error, no upgrade CTA.
  if (gate.reason === "per_host_open") {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        flags: EPHEMERAL_FLAG,
        content: `Close or fill one of your open parties first (${hostedOpenCount}/${gate.limit}).`,
      },
    };
  }

  let resetHint: string | undefined;
  if (gate.reason === "creates_24h") {
    const { data: oldest } = await opts.sb
      .from("lfg_parties")
      .select("created_at")
      .eq("server_id", opts.serverId)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (oldest?.created_at) {
      const resetAt = new Date(
        new Date(oldest.created_at).getTime() + 24 * 60 * 60 * 1000,
      );
      const unix = Math.floor(resetAt.getTime() / 1000);
      resetHint = `Next create slot opens <t:${unix}:R>.`;
    }
  }

  return upgradeEphemeral({
    env: opts.env,
    reason: gate.reason,
    resetHint,
    guildId: opts.guildId,
  });
}

export { reliabilityEnabled };
