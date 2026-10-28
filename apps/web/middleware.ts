import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import {
  discordOAuthConfigured,
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

/**
 * Gate /app/* — require session cookie.
 * When OAuth env missing / MOCK_AUTH, seed mock admin.
 * Bad/stale session cookies must not 500 the whole dashboard.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/app")) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const opts = sessionOptions();

  let session: Awaited<ReturnType<typeof getIronSession<SessionData>>>;
  try {
    session = await getIronSession<SessionData>(req, res, opts);
  } catch (err) {
    console.error("session unseal failed — clearing cookie", err);
    res.cookies.set({
      name: opts.cookieName,
      value: "",
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
    session = await getIronSession<SessionData>(
      requestWithoutSessionCookie(req),
      res,
      opts,
    );
  }

  const mockAuth = mockAuthEnabled() || !discordOAuthConfigured();

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
