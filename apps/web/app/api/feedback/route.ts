import { NextRequest, NextResponse } from "next/server";
import {
  isFeedbackKind,
  isFeedbackSurface,
  type FeedbackKind,
  type FeedbackSurface,
} from "@rallied/shared";
import { getSession } from "@/lib/auth/session";
import { mirrorFeedbackToOpsChannel } from "@/lib/feedback-mirror";
import { getServiceSupabase } from "@/lib/supabase";

type Body = {
  kind?: string;
  surface?: string;
  title?: string;
  details?: string;
  discordGuildId?: string | null;
  guildName?: string | null;
};

/**
 * Session-gated feedback submit (service role).
 * Owners, Rallied Mods, and any logged-in admin with /app access can report.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.isMock) {
    return NextResponse.json(
      {
        error: "mock_session",
        hint: "Log in with Discord to submit real feedback.",
      },
      { status: 403 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const kindRaw = String(body.kind ?? "").trim();
  const surfaceRaw = String(body.surface ?? "web").trim();
  const title = String(body.title ?? "").trim();
  const details = String(body.details ?? "").trim();
  const discordGuildId = body.discordGuildId
    ? String(body.discordGuildId).trim()
    : null;
  const guildName = body.guildName ? String(body.guildName).trim() : null;

  if (!isFeedbackKind(kindRaw)) {
    return NextResponse.json(
      { error: "invalid_kind", hint: "kind must be bug or suggestion" },
      { status: 400 },
    );
  }
  if (!isFeedbackSurface(surfaceRaw)) {
    return NextResponse.json(
      {
        error: "invalid_surface",
        hint: "surface must be bot, web, or discord",
      },
      { status: 400 },
    );
  }
  if (!title || title.length > 120) {
    return NextResponse.json(
      { error: "invalid_title", hint: "title required, max 120 chars" },
      { status: 400 },
    );
  }
  if (!details || details.length > 4000) {
    return NextResponse.json(
      { error: "invalid_details", hint: "details required, max 4000 chars" },
      { status: 400 },
    );
  }

  // Optional guild context must be one the session can access.
  if (discordGuildId) {
    const allowed = (session.guilds ?? []).some((g) => g.id === discordGuildId);
    if (!allowed) {
      return NextResponse.json({ error: "guild_forbidden" }, { status: 403 });
    }
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

  const kind: FeedbackKind = kindRaw;
  const surface: FeedbackSurface = surfaceRaw;
  const reporterName =
    session.user.globalName || session.user.username || "Admin";

  const resolvedGuildName =
    guildName ||
    (discordGuildId
      ? (session.guilds ?? []).find((g) => g.id === discordGuildId)?.name ?? null
      : null);

  const { data, error } = await sb
    .from("feedback_reports")
    .insert({
      kind,
      surface,
      status: "new",
      title,
      details,
      reporter_discord_user_id: session.user.id,
      reporter_display_name: reporterName,
      discord_guild_id: discordGuildId,
      guild_name: resolvedGuildName,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    return NextResponse.json(
      { error: "insert_failed", detail: error?.message },
      { status: 500 },
    );
  }

  const reportId = data.id as string;

  await mirrorFeedbackToOpsChannel({
    id: reportId,
    kind,
    surface,
    title,
    details,
    reporterDisplayName: reporterName,
    reporterDiscordUserId: session.user.id,
    guildName: resolvedGuildName,
    discordGuildId,
  });

  return NextResponse.json({ ok: true, id: reportId });
}
