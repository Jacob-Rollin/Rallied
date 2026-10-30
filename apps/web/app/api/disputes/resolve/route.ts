import { NextRequest, NextResponse } from "next/server";
import { reliabilityEnabled } from "@rallied/shared";
import { getSession } from "@/lib/auth/session";
import { getServiceSupabase } from "@/lib/supabase";

type Body = {
  discordGuildId?: string;
  disputeId?: string;
  /** upheld | overturned */
  outcome?: string;
  notes?: string | null;
};

/**
 * Session-gated dispute resolve (service role).
 * Mirrors Discord `/dispute resolve`: Community+ owners **or Rallied Mods**;
 * Overturn clears strike. No Stripe dependency.
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
  const disputeId = String(body.disputeId ?? "").trim();
  const outcome = String(body.outcome ?? "").trim();
  const notes =
    body.notes == null || String(body.notes).trim() === ""
      ? null
      : String(body.notes).trim();

  if (!discordGuildId || !disputeId) {
    return NextResponse.json(
      { error: "missing_fields", hint: "discordGuildId and disputeId required" },
      { status: 400 },
    );
  }
  if (outcome !== "upheld" && outcome !== "overturned") {
    return NextResponse.json(
      { error: "invalid_outcome", hint: "outcome must be upheld or overturned" },
      { status: 400 },
    );
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
      },
      { status: 404 },
    );
  }

  if (!reliabilityEnabled(server.plan as string)) {
    return NextResponse.json(
      {
        error: "community_required",
        hint: "Dispute resolve requires Community (or trial / Pro).",
      },
      { status: 403 },
    );
  }

  const discordUserId = session.user.id;
  const displayName =
    session.user.globalName || session.user.username || "Admin";
  const avatarUrl = session.user.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUserId}/${session.user.avatar}.png`
    : null;

  const { data: existingMember } = await sb
    .from("members")
    .select("id")
    .eq("server_id", server.id)
    .eq("discord_user_id", discordUserId)
    .maybeSingle();

  let resolverMemberId = existingMember?.id as string | undefined;
  if (!resolverMemberId) {
    const { data: inserted, error: mErr } = await sb
      .from("members")
      .insert({
        server_id: server.id,
        discord_user_id: discordUserId,
        display_name: displayName,
        avatar_url: avatarUrl,
      })
      .select("id")
      .single();
    if (mErr || !inserted) {
      return NextResponse.json(
        {
          error: "member_upsert_failed",
          detail: mErr?.message,
        },
        { status: 500 },
      );
    }
    resolverMemberId = inserted.id as string;
  }

  const { data: dispute, error: dErr } = await sb
    .from("disputes")
    .select("*")
    .eq("id", disputeId)
    .eq("server_id", server.id)
    .maybeSingle();

  if (dErr || !dispute) {
    return NextResponse.json({ error: "dispute_not_found" }, { status: 404 });
  }

  if (dispute.status !== "open") {
    return NextResponse.json(
      {
        error: "already_resolved",
        status: dispute.status,
        hint: "Dispute is no longer open.",
      },
      { status: 409 },
    );
  }

  const resolvedAt = new Date().toISOString();
  const { error: uErr } = await sb
    .from("disputes")
    .update({
      status: outcome,
      resolver_member_id: resolverMemberId,
      notes: notes ?? dispute.notes,
      resolved_at: resolvedAt,
    })
    .eq("id", disputeId)
    .eq("server_id", server.id);

  if (uErr) {
    return NextResponse.json({ error: uErr.message }, { status: 500 });
  }

  if (outcome === "overturned" && dispute.strike_id) {
    const { error: strikeErr } = await sb
      .from("strikes")
      .update({ active: false })
      .eq("id", dispute.strike_id)
      .eq("server_id", server.id);
    if (strikeErr) {
      return NextResponse.json(
        {
          error: "strike_clear_failed",
          detail: strikeErr.message,
          hint: "Dispute was marked overturned but strike clear failed.",
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    disputeId,
    outcome,
    server_id: server.id,
    resolved_at: resolvedAt,
  });
}
