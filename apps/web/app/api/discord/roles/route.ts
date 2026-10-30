import { NextRequest, NextResponse } from "next/server";
import { fetchGuildRoles } from "@/lib/auth/discord";
import { requireOwnerGuild } from "@/lib/auth/guild-access";
import { getSession } from "@/lib/auth/session";

/**
 * Owner-only: list Discord roles for the guild (bot token).
 * Used by Settings → Rallied Mod roles multi-select.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user || session.isMock) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const guildId = String(req.nextUrl.searchParams.get("guildId") ?? "").trim();
  if (!guildId) {
    return NextResponse.json({ error: "missing_guild" }, { status: 400 });
  }

  if (!requireOwnerGuild(session, guildId)) {
    return NextResponse.json(
      {
        error: "owner_required",
        hint: "Only server owners can configure Rallied Mod roles.",
      },
      { status: 403 },
    );
  }

  const roles = await fetchGuildRoles(guildId);
  if (roles == null) {
    return NextResponse.json(
      {
        error: "roles_unavailable",
        hint: "Set DISCORD_BOT_TOKEN on the web Worker and ensure the bot is in this guild.",
        roles: [],
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    roles: roles.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      managed: r.managed,
    })),
  });
}
