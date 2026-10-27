import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  session.destroy();
  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
