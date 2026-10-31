import Link from "next/link";
import { GhostlessMark } from "@/components/GhostlessMark";
import { MonthlyLeaderboard } from "@/components/MonthlyLeaderboard";
import { PublicGhostlessCard } from "@/components/PublicGhostlessCard";
import {
  discordPartyDeepLink,
  publicCardPath,
  type PublicServerBundle,
} from "@/lib/public-data";
import {
  isUsableServerName,
  resolveServerDisplayName,
} from "@/lib/server-display-name";

const RALLIED_SQUARE = "/brand/rallied-square-dark.jpg";

type Props = {
  bundle: PublicServerBundle;
  /** Overrides for demo Pro vanity unlock (mock only). */
  vanity?: {
    showPoweredBy: boolean;
    accent: string | null;
  };
};

export function PublicServerView({ bundle, vanity }: Props) {
  const {
    server,
    pathKey,
    openParties,
    weekly,
    spotlight,
    settings,
    monthlyLeaderboard,
  } = bundle;
  const showPoweredBy = vanity?.showPoweredBy ?? bundle.showPoweredBy;
  const accent = vanity?.accent !== undefined ? vanity.accent : bundle.accent;
  const serverLabel = resolveServerDisplayName({
    dbName: server.name,
    guildId: server.discord_guild_id,
  });
  const hasRealName = isUsableServerName(
    serverLabel || server.name,
    server.discord_guild_id,
  );
  // Discord's own guild icon — Community+ public pages + /servers directory.
  // Not Pro vanity (accent / hide Powered by stay plan-gated).
  const headerIcon = server.icon_url ? server.icon_url : RALLIED_SQUARE;
  const headerIconAlt = server.icon_url ? `${serverLabel} icon` : "";

  const accentStyle = accent
    ? ({ ["--public-accent" as string]: accent } as React.CSSProperties)
    : undefined;

  return (
    <div className="min-h-screen" style={accentStyle}>
      <header
        className="border-b border-white/10 bg-slate/80"
        style={accent ? { borderBottomColor: `${accent}55` } : undefined}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="font-display text-2xl tracking-wide sm:text-3xl">
              {serverLabel}
            </h1>
            <p className="mt-1 text-xs text-muted">
              {showPoweredBy ? (
                <>
                  Powered by{" "}
                  <Link href="/" className="text-coral hover:underline">
                    Rallied
                  </Link>
                  {" · "}
                </>
              ) : (
                <span className="text-lime/80">Founding / Pro · </span>
              )}
              this Discord server only
              {!hasRealName ? (
                <span className="ml-1 font-mono text-white/35">
                  · {server.discord_guild_id}
                </span>
              ) : null}
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={headerIcon}
            alt={headerIconAlt}
            className="h-10 w-10 rounded-brand object-cover opacity-90"
            style={accent ? { boxShadow: `0 0 0 2px ${accent}` } : undefined}
          />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-4 py-10">
        <section>
          <h2 className="font-display text-xl tracking-wide">This week</h2>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {[
              { label: "Parties", value: weekly.parties },
              {
                label: "Ghostless %",
                value:
                  weekly.ghostlessPct == null
                    ? "—"
                    : `${weekly.ghostlessPct}%`,
              },
              { label: "Vibes", value: weekly.vibeCount },
            ].map((stat) => (
              <div
                key={stat.label}
                className="animate-rise rounded-brand border border-white/10 bg-slate-elevated/50 p-3"
                style={accent ? { borderColor: `${accent}40` } : undefined}
              >
                <p className="text-[11px] uppercase tracking-wider text-muted">
                  {stat.label}
                </p>
                <p
                  className="mt-1 font-display text-2xl text-white"
                  style={accent ? { color: accent } : undefined}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl tracking-wide">Open LFG</h2>
          <p className="mt-1 text-sm text-muted">
            Join opens Discord — parties live in the server.
          </p>
          {openParties.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No open parties right now.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {openParties.map((p) => (
                <li
                  key={p.id}
                  className="animate-rise flex flex-wrap items-center justify-between gap-3 rounded-brand border border-white/10 bg-slate-elevated/40 px-4 py-3"
                >
                  <div>
                    <p className="font-display text-lg tracking-wide">
                      {p.game}
                    </p>
                    <p className="text-sm text-muted">
                      {p.rank_text || "Any"} · {p.filled}/{p.slots} · Host{" "}
                      {p.host_name}
                    </p>
                  </div>
                  <a
                    href={discordPartyDeepLink(
                      server.discord_guild_id,
                      p.discord_channel_id,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-brand bg-coral px-3 py-1.5 text-sm font-semibold text-slate transition hover:brightness-110"
                    style={
                      accent
                        ? { backgroundColor: accent, color: "#0F1419" }
                        : undefined
                    }
                  >
                    Open in Discord
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {monthlyLeaderboard ? (
          <MonthlyLeaderboard
            compact
            monthLabel={monthlyLeaderboard.monthLabel}
            mostReliable={monthlyLeaderboard.mostReliable}
            topHosts={monthlyLeaderboard.topHosts}
          />
        ) : null}

        <section>
          <h2 className="flex items-center gap-2 font-display text-xl tracking-wide text-lime">
            <GhostlessMark size="lg" />
            <span className="text-white">Ghostless spotlight</span>
          </h2>
          <p className="mt-1 text-sm text-muted">
            Top reliable players in this server.
            {settings.public_member_list
              ? " Expanded list enabled."
              : " Compact (Ghostless-only)."}{" "}
            Strike history is never shown here.
          </p>
          {spotlight.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No Ghostless players yet — play a few parties.
            </p>
          ) : (
            <div className="mt-4 rounded-brand border border-white/10 bg-slate-elevated/40 px-3">
              {spotlight.map(({ member, ghostless }) => (
                <PublicGhostlessCard
                  key={member.id}
                  member={member}
                  ghostless={ghostless}
                  href={publicCardPath(pathKey, member.discord_user_id)}
                />
              ))}
            </div>
          )}
        </section>

        {pathKey === "demo-esports" ||
        pathKey === "night-queue" ||
        pathKey === "founding-beta" ? (
          <p className="text-center text-sm text-muted">
            <Link href="/demo" className="text-coral hover:underline">
              View admin demo
            </Link>
            {" · "}
            server-owner dashboard with mock data
          </p>
        ) : null}

        <p className="text-center text-xs text-muted">
          Per-server cred. No global shame board.
          {showPoweredBy ? (
            <>
              {" "}
              <Link href="/" className="text-coral hover:underline">
                rallied.gg
              </Link>
            </>
          ) : null}
        </p>
      </main>
    </div>
  );
}
