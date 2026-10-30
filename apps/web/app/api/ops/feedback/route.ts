import { NextRequest, NextResponse } from "next/server";
import {
  FEEDBACK_STATUSES,
  isFeedbackKind,
  isFeedbackStatus,
  type FeedbackReport,
} from "@rallied/shared";
import { getSession } from "@/lib/auth/session";
import { isOpsAllowlisted } from "@/lib/ops-auth";
import { getServiceSupabase } from "@/lib/supabase";

async function requireOps() {
  const session = await getSession();
  if (!session.user || session.isMock) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  if (!isOpsAllowlisted(session.user.id)) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { session };
}

/** List / filter feedback for /ops inbox. */
export async function GET(req: NextRequest) {
  const gate = await requireOps();
  if ("error" in gate && gate.error) return gate.error;

  const sb = getServiceSupabase();
  if (!sb) {
    return NextResponse.json(
      { error: "supabase_unavailable" },
      { status: 503 },
    );
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status")?.trim() || "";
  const kind = searchParams.get("kind")?.trim() || "";
  const q = searchParams.get("q")?.trim() || "";
  const limitRaw = Number(searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.floor(limitRaw), 1), 100)
    : 50;

  let query = sb
    .from("feedback_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && isFeedbackStatus(status)) {
    query = query.eq("status", status);
  }
  if (kind && isFeedbackKind(kind)) {
    query = query.eq("kind", kind);
  }
  if (q) {
    // ilike on title; keep simple for v1 inbox
    query = query.ilike("title", `%${q.replace(/%/g, "\\%")}%`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: "query_failed", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    reports: (data ?? []) as FeedbackReport[],
    statuses: FEEDBACK_STATUSES,
  });
}

type PatchBody = {
  id?: string;
  status?: string;
  internal_note?: string | null;
};

/** Update status and/or internal note. */
export async function PATCH(req: NextRequest) {
  const gate = await requireOps();
  if ("error" in gate && gate.error) return gate.error;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.status !== undefined) {
    const status = String(body.status).trim();
    if (!isFeedbackStatus(status)) {
      return NextResponse.json(
        {
          error: "invalid_status",
          hint: "new | triaging | done | wontfix",
        },
        { status: 400 },
      );
    }
    updates.status = status;
  }

  if (body.internal_note !== undefined) {
    updates.internal_note =
      body.internal_note == null || String(body.internal_note).trim() === ""
        ? null
        : String(body.internal_note).trim().slice(0, 4000);
  }

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json(
      { error: "nothing_to_update", hint: "pass status and/or internal_note" },
      { status: 400 },
    );
  }

  const sb = getServiceSupabase();
  if (!sb) {
    return NextResponse.json(
      { error: "supabase_unavailable" },
      { status: 503 },
    );
  }

  const { data, error } = await sb
    .from("feedback_reports")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "update_failed", detail: error.message },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, report: data as FeedbackReport });
}
