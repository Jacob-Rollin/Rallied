import { NextResponse } from "next/server";
import {
  discordOAuthConfigured,
  mockAuthEnabled,
  oauthConfigProblems,
} from "@/lib/auth/config";
import { buildAuthorizeUrl } from "@/lib/auth/discord";
import { safePostLoginNext } from "@/lib/auth/safe-next";
import { getSession, mockSessionPayload } from "@/lib/auth/session";

/** Web Crypto — works under Node and Workers (nodejs_compat). */
function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function appOrigin(req: Request): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "";
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return new URL(req.url).origin;
}

/** Start Discord OAuth — or seed mock only when MOCK_AUTH / local-dev allows it. */
export async function GET(req: Request) {
  const session = await getSession();
  const origin = appOrigin(req);
  const reqUrl = new URL(req.url);
  const nextPath = safePostLoginNext(reqUrl.searchParams.get("next"));

  if (!discordOAuthConfigured()) {
    if (mockAuthEnabled()) {
      const mock = mockSessionPayload();
      session.user = mock.user;
      session.guilds = mock.guilds;
      session.isMock = true;
      await session.save();
      return NextResponse.redirect(new URL(nextPath || "/app", origin));
    }
    const problems = oauthConfigProblems().join("|");
    const login = new URL("/login", origin);
    login.searchParams.set(
      "error",
      problems
        ? `oauth_not_configured:${problems}`
        : "oauth_not_configured",
    );
    if (nextPath) login.searchParams.set("next", nextPath);
    return NextResponse.redirect(login);
  }

  // Drop stale mock demo session before starting real OAuth.
  if (session.isMock || session.user?.id === "mock-admin") {
    session.destroy();
    await session.save();
  }

  const fresh = await getSession();
  const state = randomHex(16);
  fresh.oauthState = state;
  fresh.oauthNext = nextPath;
  fresh.isMock = false;
  await fresh.save();

  return NextResponse.redirect(buildAuthorizeUrl(state));
}
