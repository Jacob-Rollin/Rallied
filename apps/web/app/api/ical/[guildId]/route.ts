import { NextRequest, NextResponse } from "next/server";
import { isProPlan } from "@rallied/shared";
import { buildIcalFeed, type IcalParty } from "@/lib/ical";
import { getServiceSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const CACHE = "public, max-age=900, s-maxage=900";

type Params = { params: Promise<{ guildId: string }> };

/**
 * Public Pro/Founding iCal feed for upcoming scheduled parties.
 * Token from server_settings.ical_token — no Google OAuth, no third-party SaaS.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { guildId: rawGuild } = await params;
  const guildId = String(rawGuild ?? "").trim();
  const token = String(req.nextUrl.searchParams.get("token") ?? "").trim();

  if (!guildId || !token) {
    return new NextResponse("missing guild or token", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const sb = getServiceSupabase();
  if (!sb) {
    return new NextResponse("calendar unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const { data: server, error: sErr } = await sb
    .from("servers")
    .select("id, name, plan, discord_guild_id")
    .eq("discord_guild_id", guildId)
    .maybeSingle();

  if (sErr || !server) {
    return new NextResponse("not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (!isProPlan(server.plan as string)) {
    return new NextResponse("pro_required", {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const { data: settings, error: setErr } = await sb
    .from("server_settings")
    .select("ical_token")
    .eq("server_id", server.id)
    .maybeSingle();

  if (setErr || !settings?.ical_token || settings.ical_token !== token) {
    return new NextResponse("forbidden", {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 60 * 86400_000);

  const { data: rows, error: pErr } = await sb
    .from("lfg_parties")
    .select(
      "id, game, rank_text, region, mic, slots, status, scheduled_start_at",
    )
    .eq("server_id", server.id)
    .not("scheduled_start_at", "is", null)
    .gte("scheduled_start_at", now.toISOString())
    .lte("scheduled_start_at", horizon.toISOString())
    .in("status", ["open", "filled"])
    .order("scheduled_start_at", { ascending: true })
    .limit(100);

  if (pErr) {
    return new NextResponse("query_failed", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const parties: IcalParty[] = ((rows ?? []) as Record<string, unknown>[]).map(
    (r) => ({
      id: String(r.id),
      game: String(r.game ?? "Party"),
      rank_text: (r.rank_text as string | null) ?? null,
      region: (r.region as string | null) ?? null,
      mic: (r.mic as string | null) ?? null,
      slots: Number(r.slots ?? 0),
      scheduled_start_at: String(r.scheduled_start_at),
      status: String(r.status ?? "open"),
    }),
  );

  const body = buildIcalFeed({
    guildId: String(server.discord_guild_id),
    serverName: String(server.name ?? "Server"),
    parties,
    now,
  });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": CACHE,
      "Content-Disposition": `inline; filename="rallied-${guildId}.ics"`,
    },
  });
}
