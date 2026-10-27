import { NextResponse } from "next/server";
import { mockAuthEnabled } from "@/lib/auth/config";
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

  return NextResponse.json({
    authenticated: true,
    mock: Boolean(session.isMock),
    user: session.user,
    guilds: session.guilds ?? [],
  });
}
