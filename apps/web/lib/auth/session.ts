import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { mockAuthEnabled } from "./config";
import {
  mockSessionPayload,
  sessionOptions,
  type SessionData,
} from "./session-options";

export type { SessionData };
export { mockSessionPayload, sessionOptions };

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}

export async function requireSessionUser() {
  const session = await getSession();
  if (!session.user) return null;
  return session;
}

export function ensureMockSessionIfNeeded(
  session: SessionData & { save: () => Promise<void> },
) {
  if (session.user) return false;
  if (!mockAuthEnabled()) return false;
  const mock = mockSessionPayload();
  session.user = mock.user;
  session.guilds = mock.guilds;
  session.isMock = true;
  return true;
}
