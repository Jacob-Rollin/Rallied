import Link from "next/link";
import type { Metadata } from "next";
import { BRAND } from "@rallied/shared";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";
import { listDirectoryServers } from "../../lib/public-data";

export const metadata: Metadata = {
  title: `Servers — ${BRAND.name}`,
  description:
    "Opt-in directory of Rallied communities. Listing is per-server — view a public page or join Discord. No cross-server player grades or LFG Network.",
};

export default async function ServersDirectoryPage() {
  const servers = await listDirectoryServers();

  return (
    <div className="min-h-screen">
      <SiteHeader variant="solid" />

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:pt-12">
        <p className="font-display text-xs tracking-[0.16em] text-coral">
          DIRECTORY
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-wide sm:text-5xl">
          Servers
        </h1>
        <p className="mt-3 max-w-xl text-white/75">
          Opt-in only — admins choose to list. View a public Rallied page or
          join Discord. Ghostless and vibes stay{" "}
          <strong className="font-semibold text-white/90">per server</strong>{" "}
          (not cross-server grades or a player passport).
        </p>

        {servers.length === 0 ? (
          <p className="mt-12 max-w-lg text-sm text-white/55">
            No servers listed yet. Admins turn on{" "}
            <strong className="font-semibold text-white/80">
              List in directory
            </strong>{" "}
            under Settings (Community / trial / Pro), keep the public page on,
            and add a Discord invite URL — then Save.
          </p>
        ) : (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {servers.map((s) => (
              <li
                key={s.pathKey}
                className="flex flex-col gap-4 rounded-brand border border-white/12 bg-slate-elevated/30 p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-brand border border-white/10 bg-slate">
                    {s.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.iconUrl}
                        alt=""
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center font-display text-lg text-coral">
                        {s.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg tracking-wide text-white">
                      {s.name}
                    </p>
                    {s.hasPublicGhostless ? (
                      <p className="mt-0.5 text-xs text-lime/80">
                        Public Ghostless page
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Link
                    href={`/s/${s.pathKey}`}
                    className="rounded-brand border border-white/20 px-3 py-1.5 text-sm font-semibold text-white/90 transition hover:border-coral/50 hover:text-white"
                  >
                    View
                  </Link>
                  {s.inviteUrl ? (
                    <a
                      href={s.inviteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-brand bg-coral px-3 py-1.5 text-sm font-semibold text-slate transition hover:brightness-110"
                    >
                      Join
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 text-sm text-white/45">
          Want your server here?{" "}
          <Link href="/guide#admin" className="text-coral hover:underline">
            Admin Settings
          </Link>{" "}
          ·{" "}
          <Link href="/pricing" className="text-coral hover:underline">
            Pricing
          </Link>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
