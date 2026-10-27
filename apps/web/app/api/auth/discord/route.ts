import { NextResponse } from "next/server";
import { discordOAuthConfigured, mockAuthEnabled } from "@/lib/auth/config";
import { buildAuthorizeUrl } from "@/lib/auth/discord";
import { getSession, mockSessionPayload } from "@/lib/auth/session";

/** Web Crypto — works under Node and Workers (nodejs_compat). */
function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Start Discord OAuth — or seed mock session when secrets missing / MOCK_AUTH=1. */
export async function GET() {
  const session = await getSession();

  if (!discordOAuthConfigured()) {
    if (mockAuthEnabled()) {
      const mock = mockSessionPayload();
      session.user = mock.user;
      session.guilds = mock.guilds;
      session.isMock = true;
      await session.save();
      return NextResponse.redirect(new URL("/app", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
    }
    return NextResponse.json(
      {
        error: "Discord OAuth not configured",
        hint: "Set DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI, SESSION_SECRET (32+ chars), or MOCK_AUTH=1",
      },
      { status: 503 },
    );
  }

  const state = randomHex(16);
  session.oauthState = state;
  await session.save();

  return NextResponse.redirect(buildAuthorizeUrl(state));
}
