import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import {
  discordOAuthConfigured,
  explicitMockAuth,
  mockAuthEnabled,
  SESSION_COOKIE,
} from "@/lib/auth/config";
import {
  mockSessionPayload,
  sessionOptions,
  type SessionData,
} from "@/lib/auth/session-options";

/** Drop the session cookie from the request so a retry does not re-unseal junk. */
function requestWithoutSessionCookie(req: NextRequest): NextRequest {
  const headers = new Headers(req.headers);
  const raw = headers.get("cookie");
  if (raw) {
    const next = raw
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part && !part.startsWith(`${SESSION_COOKIE}=`))
      .join("; ");
    if (next) headers.set("cookie", next);
    else headers.delete("cookie");
  }
  return new NextRequest(req.url, { headers, method: req.method });
}

function clearSessionCookie(res: NextResponse, cookieName: string) {
  res.cookies.set({
    name: cookieName,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
}

/**
 * Gate /app/* and /ops/* — require session cookie.
 * Mock admin only for /app when MOCK_AUTH=1 (or local + OAuth missing).
 * /ops never auto-seeds mock — allowlist check happens in the page.
 * Stale mock cookies must not block real Discord login once OAuth is wired.
 * Bad/stale session cookies must not 500 the whole dashboard.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApp = pathname.startsWith("/app");
  const isOps = pathname.startsWith("/ops");
  if (!isApp && !isOps) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const opts = sessionOptions();

  let session: Awaited<ReturnType<typeof getIronSession<SessionData>>>;
  try {
    session = await getIronSession<SessionData>(req, res, opts);
  } catch (err) {
    console.error("session unseal failed — clearing cookie", err);
    clearSessionCookie(res, opts.cookieName);
    session = await getIronSession<SessionData>(
      requestWithoutSessionCookie(req),
      res,
      opts,
    );
  }

  const oauth = discordOAuthConfigured();
  const allowMock = mockAuthEnabled();

  // Stale demo session from when secrets looked missing — force Discord login.
  if (session.user && session.isMock && oauth && !explicitMockAuth()) {
    session.destroy();
    await session.save();
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname);
    login.searchParams.set("error", "session_expired");
    return NextResponse.redirect(login);
  }

  if (!session.user) {
    // Mock auto-login is /app only — ops requires a real Discord identity.
    if (isApp && allowMock) {
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
  matcher: ["/app/:path*", "/ops", "/ops/:path*"],
};
