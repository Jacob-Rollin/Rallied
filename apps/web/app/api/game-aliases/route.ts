import { NextRequest, NextResponse } from "next/server";
import {
  listDistinctGames,
  mergeGameAliases,
  parseGameAliases,
  reliabilityEnabled,
  removeGameAlias,
  rankTopGames,
} from "@rallied/shared";
import { requireOwnerGuild, requireGuildOnSession } from "@/lib/auth/guild-access";
import { getSession } from "@/lib/auth/session";
import { getServiceSupabase } from "@/lib/supabase";

/**
 * Per-server game name aliases (Top games hygiene).
 * GET: owner or mod can read (Settings section).
 * POST merge/remove: owner-only (same gate as Settings writes).
 */

async function loadServer(discordGuildId: string) {
  const sb = getServiceSupabase();
  if (!sb) return { sb: null, server: null as null | { id: string; plan: string } };
  const { data: server, error } = await sb
    .from("servers")
    .select("id, plan")
    .eq("discord_guild_id", discordGuildId)
    .maybeSingle();
  if (error || !server) return { sb, server: null };
  return { sb, server: server as { id: string; plan: string } };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user || session.isMock) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const discordGuildId = String(
    req.nextUrl.searchParams.get("discordGuildId") ?? "",
  ).trim();
  if (!discordGuildId) {
    return NextResponse.json({ error: "missing_guild" }, { status: 400 });
  }

  if (!requireGuildOnSession(session, discordGuildId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { sb, server } = await loadServer(discordGuildId);
  if (!sb) {
    return NextResponse.json(
      { error: "supabase_unavailable" },
      { status: 503 },
    );
  }
  if (!server) {
    return NextResponse.json({ error: "server_not_found" }, { status: 404 });
  }

  const { data: settingsRow } = await sb
    .from("server_settings")
    .select("game_aliases")
    .eq("server_id", server.id)
    .maybeSingle();

  const aliases = parseGameAliases(settingsRow?.game_aliases);

  const { data: parties } = await sb
    .from("lfg_parties")
    .select("game")
    .eq("server_id", server.id);

  const games = ((parties ?? []) as { game?: string | null }[]).map(
    (p) => p.game,
  );
  const distinct = listDistinctGames(games, aliases);
  const topResolved = rankTopGames(games, { limit: 20, aliases });

  return NextResponse.json({
    aliases,
    distinctGames: distinct,
    topResolved,
    canWrite: Boolean(requireOwnerGuild(session, discordGuildId)),
    communityPlus: reliabilityEnabled(server.plan),
  });
}

type Body = {
  discordGuildId?: string;
  action?: "merge" | "remove";
  /** Raw spellings (or keys) to fold into canonical */
  raws?: string[];
  canonical?: string;
  /** Alias key to remove */
  aliasKey?: string;
};

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

  if (!requireOwnerGuild(session, discordGuildId)) {
    return NextResponse.json(
      {
        error: "owner_required",
        hint: "Only server owners (Manage Server) can merge game names.",
      },
      { status: 403 },
    );
  }

  const { sb, server } = await loadServer(discordGuildId);
  if (!sb) {
    return NextResponse.json(
      { error: "supabase_unavailable" },
      { status: 503 },
    );
  }
  if (!server) {
    return NextResponse.json({ error: "server_not_found" }, { status: 404 });
  }

  if (!reliabilityEnabled(server.plan)) {
    return NextResponse.json(
      {
        error: "community_required",
        hint: "Game name aliases require Community (or trial / Pro).",
      },
      { status: 403 },
    );
  }

  const { data: settingsRow } = await sb
    .from("server_settings")
    .select("game_aliases")
    .eq("server_id", server.id)
    .maybeSingle();

  const current = parseGameAliases(settingsRow?.game_aliases);
  const action = body.action;

  let next = current;
  if (action === "merge") {
    const raws = Array.isArray(body.raws)
      ? body.raws.map((r) => String(r ?? ""))
      : [];
    const canonical = String(body.canonical ?? "").trim();
    if (!canonical) {
      return NextResponse.json(
        { error: "missing_canonical", hint: "Pick or type a display name." },
        { status: 400 },
      );
    }
    if (raws.length === 0) {
      return NextResponse.json(
        { error: "missing_raws", hint: "Select at least one spelling to merge." },
        { status: 400 },
      );
    }
    next = mergeGameAliases(current, raws, canonical);
  } else if (action === "remove") {
    const aliasKey = String(body.aliasKey ?? "").trim();
    if (!aliasKey) {
      return NextResponse.json({ error: "missing_alias_key" }, { status: 400 });
    }
    next = removeGameAlias(current, aliasKey);
  } else {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const patch = {
    game_aliases: next,
    updated_at: new Date().toISOString(),
  };

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
      return NextResponse.json(
        { error: "save_failed", detail: error.message },
        { status: 500 },
      );
    }
  } else {
    const { error } = await sb.from("server_settings").insert({
      server_id: server.id,
      ...patch,
    });
    if (error) {
      return NextResponse.json(
        { error: "save_failed", detail: error.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true, aliases: next });
}
