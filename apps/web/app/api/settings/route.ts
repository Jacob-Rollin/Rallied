import { NextRequest, NextResponse } from "next/server";
import { isProPlan } from "@rallied/shared";
import { getSession } from "@/lib/auth/session";
import { getServiceSupabase } from "@/lib/supabase";

type Body = {
  discordGuildId?: string;
  slug?: string | null;
  public_page_enabled?: boolean;
  public_member_list?: boolean;
  hide_powered_by?: boolean;
  public_accent?: string | null;
  grace_minutes?: number;
  strike_threshold?: number;
  ghostless_role_id?: string | null;
  digest_channel_id?: string | null;
  lockout_days?: number;
  ghostless_role_threshold_pct?: number;
  ghostless_role_min_sessions?: number;
};

function cleanSlug(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const cleaned = String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 48);
  return cleaned.length ? cleaned : null;
}

function cleanAccent(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  const v = String(raw).trim();
  if (/^#?[0-9a-fA-F]{6}$/.test(v)) {
    return v.startsWith("#") ? v : `#${v}`;
  }
  // Allow empty clear; reject garbage
  return null;
}

function clampInt(
  n: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(v)));
}

/**
 * Session-gated settings upsert (service role).
 * Community: slug + public toggles + reliability fields.
 * Pro / founding_pro only: hide_powered_by + public_accent.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user || session.isMock) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const discordGuildId = String(body.discordGuildId ?? "").trim();
  if (!discordGuildId) {
    return NextResponse.json({ error: "missing_guild" }, { status: 400 });
  }

  const allowed = (session.guilds ?? []).some((g) => g.id === discordGuildId);
  if (!allowed) {
    return NextResponse.json({ error: "guild_forbidden" }, { status: 403 });
  }

  const sb = getServiceSupabase();
  if (!sb) {
    return NextResponse.json(
      {
        error: "supabase_unavailable",
        hint: "Set SUPABASE_SERVICE_ROLE_KEY on the web Worker.",
      },
      { status: 503 },
    );
  }

  const { data: server, error: sErr } = await sb
    .from("servers")
    .select("id, plan")
    .eq("discord_guild_id", discordGuildId)
    .maybeSingle();

  if (sErr || !server) {
    return NextResponse.json(
      {
        error: "server_not_found",
        detail: sErr?.message,
        hint: "Bot creates the servers row on first interaction in that guild.",
      },
      { status: 404 },
    );
  }

  const pro = isProPlan(server.plan as string);
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.public_page_enabled === "boolean") {
    patch.public_page_enabled = body.public_page_enabled;
  }
  if (typeof body.public_member_list === "boolean") {
    patch.public_member_list = body.public_member_list;
  }
  if (body.slug !== undefined) {
    patch.slug = cleanSlug(body.slug);
  }
  if (body.grace_minutes !== undefined) {
    patch.grace_minutes = clampInt(body.grace_minutes, 0, 60, 5);
  }
  if (body.strike_threshold !== undefined) {
    patch.strike_threshold = clampInt(body.strike_threshold, 1, 20, 3);
  }
  if (body.lockout_days !== undefined) {
    patch.lockout_days = clampInt(body.lockout_days, 1, 365, 7);
  }
  if (body.ghostless_role_threshold_pct !== undefined) {
    patch.ghostless_role_threshold_pct = clampInt(
      body.ghostless_role_threshold_pct,
      1,
      100,
      90,
    );
  }
  if (body.ghostless_role_min_sessions !== undefined) {
    patch.ghostless_role_min_sessions = clampInt(
      body.ghostless_role_min_sessions,
      1,
      500,
      10,
    );
  }
  if (body.ghostless_role_id !== undefined) {
    const id = body.ghostless_role_id;
    patch.ghostless_role_id =
      id == null || String(id).trim() === "" ? null : String(id).trim();
  }
  if (body.digest_channel_id !== undefined) {
    const id = body.digest_channel_id;
    patch.digest_channel_id =
      id == null || String(id).trim() === "" ? null : String(id).trim();
  }

  let vanityRejected = false;
  if (body.hide_powered_by !== undefined || body.public_accent !== undefined) {
    if (!pro) {
      vanityRejected = true;
    } else {
      if (typeof body.hide_powered_by === "boolean") {
        patch.hide_powered_by = body.hide_powered_by;
      }
      if (body.public_accent !== undefined) {
        patch.public_accent = cleanAccent(body.public_accent);
      }
    }
  }

  if (Object.keys(patch).length <= 1) {
    return NextResponse.json(
      {
        error: vanityRejected ? "pro_required_for_vanity" : "nothing_to_update",
        hint: vanityRejected
          ? "hide_powered_by / public_accent require plan pro or founding_pro"
          : undefined,
      },
      { status: vanityRejected ? 403 : 400 },
    );
  }

  const { data: existing } = await sb
    .from("server_settings")
    .select("server_id")
    .eq("server_id", server.id)
    .maybeSingle();

  if (existing) {
    const { error } = await sb
      .from("server_settings")
      .update(patch)
      .eq("server_id", server.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await sb.from("server_settings").insert({
      server_id: server.id,
      ...patch,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    server_id: server.id,
    plan: server.plan,
    vanityRejected,
    ...patch,
  });
}
