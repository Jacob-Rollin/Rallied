import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./config";
import {
  mockSessionPayload,
  sessionOptions,
  type SessionData,
} from "./session-options";

export type { SessionData };
export { mockSessionPayload, sessionOptions };

/**
 * Cookie store that hides a bad sealed session so iron-session can open
 * a fresh empty session in the same request (Next still exposes the inbound cookie).
 */
function jarWithoutSessionCookie(
  jar: Awaited<ReturnType<typeof cookies>>,
): Awaited<ReturnType<typeof cookies>> {
  return {
    get: (name: string) =>
      name === SESSION_COOKIE ? undefined : jar.get(name),
    getAll: (...args: Parameters<typeof jar.getAll>) =>
      jar.getAll(...args).filter((c) => c.name !== SESSION_COOKIE),
    set: (...args: Parameters<typeof jar.set>) => jar.set(...args),
    delete: (...args: Parameters<typeof jar.delete>) => jar.delete(...args),
    has: (name: string) => (name === SESSION_COOKIE ? false : jar.has(name)),
  } as Awaited<ReturnType<typeof cookies>>;
}

export async function getSession() {
  const jar = await cookies();
  const opts = sessionOptions();
  try {
    return await getIronSession<SessionData>(jar, opts);
  } catch (err) {
    console.error("getSession unseal failed — resetting", err);
    try {
      jar.delete(SESSION_COOKIE);
    } catch {
      /* ignore */
    }
    return getIronSession<SessionData>(jarWithoutSessionCookie(jar), opts);
  }
}

export async function requireSessionUser() {
  const session = await getSession();
  if (!session.user) return null;
  return session;
}
