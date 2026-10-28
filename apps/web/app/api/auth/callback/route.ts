import { NextRequest, NextResponse } from "next/server";
import {
  avatarUrl,
  exchangeCode,
  fetchOAuthGuilds,
  fetchOAuthUser,
  filterAdminGuilds,
} from "@/lib/auth/discord";
import { getSession } from "@/lib/auth/session";
import { getServiceRoleKey, getSupabaseUrl } from "@/lib/runtime-env";

function appOrigin(req: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  const origin = appOrigin(req);

  if (err) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(err)}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const session = await getSession();
  if (!session.oauthState || session.oauthState !== state) {
    return NextResponse.redirect(`${origin}/login?error=invalid_state`);
  }

  try {
    const token = await exchangeCode(code);
    const user = await fetchOAuthUser(token.access_token);
    const guilds = await fetchOAuthGuilds(token.access_token);
    const adminGuilds = await filterAdminGuilds(guilds);

    session.user = {
      id: user.id,
      username: user.username,
      globalName: user.global_name ?? null,
      avatar: avatarUrl(user),
    };
    session.guilds = adminGuilds;
    session.isMock = false;
    session.oauthState = undefined;
    await session.save();

    // Optional: upsert dashboard_users via service role when Supabase wired
    await upsertDashboardUser(user.id, user.username, user.global_name ?? null, avatarUrl(user));

    const withBot = adminGuilds.filter((g) => g.bot_present);
    if (withBot.length === 0) {
      return NextResponse.redirect(`${origin}/app?empty=1`);
    }
    return NextResponse.redirect(`${origin}/app`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "oauth_failed";
    console.error("oauth callback", msg);
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }
}

async function upsertDashboardUser(
  discordUserId: string,
  username: string,
  globalName: string | null,
  avatar: string | null,
) {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();
  if (!url || !key) return;

  try {
    await fetch(`${url}/rest/v1/dashboard_users`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        discord_user_id: discordUserId,
        username,
        global_name: globalName,
        avatar_url: avatar,
      }),
    });
  } catch {
    /* non-fatal */
  }
}
