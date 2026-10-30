import { NextResponse } from "next/server";
import { mockAuthEnabled } from "@/lib/auth/config";
import {
  getBotPresenceAndPlans,
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

  // Refresh bot_present + plan from Discord bot token / Supabase servers
  // so inviting the bot shows up without forcing a re-login.
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
      }));
      session.guilds = guilds;
      await session.save();
      // Best-effort: repair servers.name when still a snowflake (or stale).
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
