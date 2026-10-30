import type { SessionOptions } from "iron-session";
import type { AdminGuild } from "@rallied/shared";
import { getSessionPassword, SESSION_COOKIE } from "./config";

export interface SessionData {
  user?: {
    id: string;
    username: string;
    globalName: string | null;
    avatar: string | null;
  };
  guilds?: AdminGuild[];
  oauthState?: string;
  /** Safe post-OAuth path (/app… or /ops…). */
  oauthNext?: string;
  isMock?: boolean;
}

export function sessionOptions(): SessionOptions {
  return {
    password: getSessionPassword(),
    cookieName: SESSION_COOKIE,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    },
  };
}

export function mockSessionPayload(): SessionData {
  return {
    isMock: true,
    user: {
      id: "mock-admin",
      username: "mock_admin",
      globalName: "Mock Admin",
      avatar: null,
    },
    guilds: [
      {
        id: "demo-guild-1",
        name: "Demo Esports Lounge",
        icon: null,
        bot_present: true,
        plan: "community",
        access: "owner",
      },
      {
        id: "demo-guild-2",
        name: "Night Queue HQ",
        icon: null,
        bot_present: true,
        plan: "trial",
        access: "owner",
      },
      {
        id: "demo-guild-founding",
        name: "Founding Beta Squad",
        icon: null,
        bot_present: true,
        plan: "founding_pro",
        access: "owner",
      },
      {
        id: "demo-guild-mod",
        name: "Mod Preview Lounge",
        icon: null,
        bot_present: true,
        plan: "community",
        access: "mod",
      },
    ],
  };
}
