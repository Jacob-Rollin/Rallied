import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import {
  mockSessionPayload,
  sessionOptions,
  type SessionData,
} from "@/lib/auth/session-options";

/**
 * Gate /app/* — require session cookie.
 * When OAuth env missing / MOCK_AUTH, seed mock admin.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/app")) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req, res, sessionOptions());

  const oauthConfigured = Boolean(
    process.env.DISCORD_CLIENT_ID &&
      process.env.DISCORD_CLIENT_SECRET &&
      process.env.DISCORD_REDIRECT_URI &&
      process.env.SESSION_SECRET &&
      process.env.SESSION_SECRET.length >= 32,
  );
  const mockAuth =
    process.env.MOCK_AUTH === "1" ||
    process.env.MOCK_AUTH === "true" ||
    !oauthConfigured;

  if (!session.user) {
    if (mockAuth) {
      const mock = mockSessionPayload();
      session.user = mock.user;
      session.guilds = mock.guilds;
      session.isMock = true;
      await session.save();
      return res;
    }
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return res;
}

export const config = {
  matcher: ["/app/:path*"],
};
