import {
  COMMUNITY_PRICE_USD,
  canCreateParty,
  effectivePlan,
  parseDogfoodGuildIds,
  pricingPageUrl,
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

/** Persist expired trials → free. Returns updated plan fields. */
export async function lapseExpiredTrial(
  sb: SupabaseClient,
  server: {
    id: string;
    plan: string;
    trial_ends_at: string | null;
  },
  now = new Date(),
): Promise<{ plan: string; trial_ends_at: string | null }> {
  if (server.plan !== "trial" || !server.trial_ends_at) {
    return { plan: server.plan, trial_ends_at: server.trial_ends_at };
  }
  if (new Date(server.trial_ends_at).getTime() > now.getTime()) {
    return { plan: server.plan, trial_ends_at: server.trial_ends_at };
  }
  const { data } = await sb
    .from("servers")
    .update({ plan: "free", updated_at: now.toISOString() })
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

/** Sweep expired trials (cron). */
export async function lapseAllExpiredTrials(
  sb: SupabaseClient,
): Promise<number> {
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("servers")
    .update({ plan: "free", updated_at: now })
    .eq("plan", "trial")
    .lt("trial_ends_at", now)
    .not("trial_ends_at", "is", null)
    .select("id");
  if (error) {
    console.error("lapseAllExpiredTrials", error.message);
    return 0;
  }
  return data?.length ?? 0;
}

/**
 * First-time server row: plan=trial + trial_ends_at (+14d).
 * Never resets paid / founding / community.
 * Dogfood guilds get founding_pro without a trial clock.
 */
export async function bootstrapNewServerPlan(
  sb: SupabaseClient,
  env: BotEnv,
  guildId: string,
  server: {
    id: string;
    plan: string;
    trial_ends_at: string | null;
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

  if (server.plan === "trial" && !server.trial_ends_at) {
    const ends = trialEndsAtFromNow();
    const { data } = await sb
      .from("servers")
      .update({ trial_ends_at: ends, updated_at: new Date().toISOString() })
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
  });
}

function isDogfoodGuildId(env: BotEnv, guildId: string): boolean {
  return dogfoodGuildIds(env).has(guildId);
}

export function upgradeEphemeral(opts: {
  env: BotEnv;
  reason: CapBlockReason | "reliability" | "public";
  resetHint?: string;
}): InteractionResponse {
  const copy = upgradeCopy(opts.reason);
  const url = pricingPageUrl(webBaseUrl(opts.env));
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
  return "No-shows aren’t struck on Free. Upgrade to Community to enforce Ghostless + strikes.";
}

export async function checkCreateCaps(opts: {
  sb: SupabaseClient;
  env: BotEnv;
  serverId: string;
  plan: string;
}): Promise<InteractionResponse | null> {
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

  const gate = canCreateParty({
    plan: opts.plan,
    openPartyCount: openCapCheck.count ?? 0,
    createsLast24h: createsCheck.count ?? 0,
  });

  if (gate.ok) return null;

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
  });
}

export { reliabilityEnabled };
