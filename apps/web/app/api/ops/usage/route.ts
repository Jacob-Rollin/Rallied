import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isOpsAllowlisted } from "@/lib/ops-auth";
import { getOpsUsage } from "@/lib/ops-usage";
import { hasServiceRole } from "@/lib/supabase";

async function requireOps() {
  const session = await getSession();
  if (!session.user || session.isMock) {
    return {
      error: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  if (!isOpsAllowlisted(session.user.id)) {
    return {
      error: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }
  return { session };
}

/** Product + CF + Supabase free-tier signals for /ops/usage. */
export async function GET(req: NextRequest) {
  const gate = await requireOps();
  if ("error" in gate && gate.error) return gate.error;

  if (!hasServiceRole()) {
    return NextResponse.json(
      {
        error: "supabase_unavailable",
        hint: "Set SUPABASE_SERVICE_ROLE_KEY on the web Worker.",
      },
      { status: 503 },
    );
  }

  const guildId = req.nextUrl.searchParams.get("guild")?.trim() || null;

  try {
    const payload = await getOpsUsage({ guildId });
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "usage_failed", detail: msg },
      { status: 500 },
    );
  }
}
