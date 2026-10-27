import Link from "next/link";
import { getSession, mockSessionPayload } from "@/lib/auth/session";
import { mockAuthEnabled } from "@/lib/auth/config";
import { listMockPublicServers, publicCardPath } from "@/lib/public-data";
import { MOCK_MEMBERS } from "@/lib/mock-data";

/**
 * Light “your cards” — Discord session guilds × public server pages.
 * Mock-friendly; no profile editing.
 */
export default async function MePage() {
  const session = await getSession();
  let user = session.user;
  let guilds = session.guilds ?? [];

  if (!user && mockAuthEnabled()) {
    const mock = mockSessionPayload();
    user = mock.user;
    guilds = mock.guilds ?? [];
  }

  const publicServers = listMockPublicServers();

  // Map mock: for demo, attach first mock member's discord id as "you" when mock
  const yourDiscordId =
    user?.id === "mock-admin" ? MOCK_MEMBERS[0].discord_user_id : user?.id;

  const cards =
    yourDiscordId &&
    publicServers.map((s) => ({
      serverName: s.name,
      pathKey: s.pathKey,
      href: publicCardPath(s.pathKey, yourDiscordId),
    }));

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-12">
      <Link href="/" className="text-sm text-muted hover:text-coral">
        ← Rallied
      </Link>
      <h1 className="mt-4 font-display text-3xl tracking-wide">Your cards</h1>
      <p className="mt-2 text-sm text-muted">
        Shareable Ghostless cards for servers you play in. Per-server only —
        strikes stay private.
      </p>

      {!user ? (
        <div className="mt-8 space-y-3">
          <p className="text-sm text-muted">Log in with Discord to see your links.</p>
          <a
            href="/api/auth/discord"
            className="inline-block rounded-brand bg-[#5865F2] px-4 py-2 text-sm font-semibold text-white"
          >
            Log in with Discord
          </a>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <p className="text-sm text-muted">
            Signed in as{" "}
            <span className="text-white">
              {user.globalName || user.username}
            </span>
            {session.isMock || user.id === "mock-admin" ? " · mock" : ""}
          </p>

          <section>
            <h2 className="font-display text-lg tracking-wide">Card links</h2>
            {!cards || cards.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                No public server pages yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {cards.map((c) => (
                  <li key={c.href}>
                    <Link
                      href={c.href}
                      className="block rounded-brand border border-white/10 bg-slate-elevated/40 px-3 py-2 text-sm transition hover:border-coral/40"
                    >
                      <span className="font-display tracking-wide">
                        {c.serverName}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {c.href}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {guilds.length > 0 ? (
            <section>
              <h2 className="font-display text-lg tracking-wide">
                Guilds (session)
              </h2>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {guilds.map((g) => (
                  <li key={g.id}>
                    {g.name}
                    {g.bot_present ? "" : " · add bot"}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
