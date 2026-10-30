import { NextResponse } from "next/server";
import { mockAuthEnabled } from "@/lib/auth/config";
import {
  ensureGuildDisplayNames,
  getBotPresenceAndPlans,
  refreshSessionGuildAccess,
  syncServerMetadataFromOAuth,
} from "@/lib/auth/discord";
import { getSession, mockSessionPayload } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();

  if (!session.user && mockAuthEnabled()) {
    const mock = mockSessionPayload();
    return NextResponse.json({
      authenticated: true,
      mock: true,
      user: mock.user,
      guilds: mock.guilds,
    });
  }

  if (!session.user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  let guilds = session.guilds ?? [];

  // Refresh bot_present + plan + mod access so invite / role / plan changes
  // show up without forcing a full re-login (new mod guilds still need OAuth).
  if (!session.isMock && guilds.length > 0) {
    try {
      const { botGuildIds, plans } = await getBotPresenceAndPlans(
        guilds.map((g) => g.id),
      );
      guilds = guilds.map((g) => ({
        ...g,
        bot_present:
          botGuildIds === null ? g.bot_present : botGuildIds.has(g.id),
        plan: plans.get(g.id) ?? g.plan,
        access: g.access === "mod" ? "mod" : "owner",
      }));
      guilds = await refreshSessionGuildAccess(guilds, session.user.id);
      // Fill missing / placeholder guild names from Discord API when needed.
      guilds = await ensureGuildDisplayNames(guilds);
      session.guilds = guilds;
      await session.save();
      // Best-effort: overwrite servers.name when still snowflake / placeholder.
      void syncServerMetadataFromOAuth(guilds);
    } catch (err) {
      console.warn("guild refresh failed", err);
    }
  }

  return NextResponse.json({
    authenticated: true,
    mock: Boolean(session.isMock),
    user: session.user,
    guilds,
  });
}
