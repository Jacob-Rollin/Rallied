"use client";

import Link from "next/link";
import type { GhostlessStats, Member } from "@rallied/shared";
import { CopyLinkWithOrigin } from "@/components/CopyLinkWithOrigin";
import { DemoPublicVanityUnlock } from "@/components/DemoPublicVanityUnlock";
import { GhostlessBadge } from "@/components/GhostlessBadge";
import type { PublicServerBundle } from "@/lib/public-data";

function PlayerCardBody({
  bundle,
  member,
  ghostless,
  inGoodStanding,
  showPoweredBy,
  accent,
}: {
  bundle: PublicServerBundle;
  member: Member;
  ghostless: GhostlessStats | null;
  inGoodStanding: boolean;
  showPoweredBy: boolean;
  accent: string | null;
}) {
  const sharePath = `/s/${bundle.pathKey}/u/${member.discord_user_id}`;
  const accentStyle = accent ? { borderColor: `${accent}55` } : undefined;

  return (
    <>
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
          <Link
            href={`/s/${bundle.pathKey}`}
            className="text-sm text-muted hover:text-coral"
          >
            ← {bundle.server.name}
          </Link>
          {showPoweredBy ? (
            <p className="text-[11px] text-muted">
              Powered by{" "}
              <Link href="/" className="text-coral">
                Rallied
              </Link>
            </p>
          ) : (
            <p className="text-[11px] text-lime/80">Founding / Pro</p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-12">
        <div
          className="animate-rise rounded-brand border border-white/10 bg-slate-elevated/50 p-6"
          style={accentStyle}
        >
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-brand bg-slate font-display text-2xl text-coral"
              aria-hidden
              style={accent ? { color: accent } : undefined}
            >
              {member.display_name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl tracking-wide">
                {member.display_name}
              </h1>
              <p className="mt-1 text-sm text-muted">
                This server only · {bundle.server.name}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <GhostlessBadge
                  showRatePct={ghostless?.show_rate_pct ?? null}
                />
                {inGoodStanding ? (
                  <span className="rounded-brand border border-lime/30 px-2 py-0.5 text-xs text-lime/90">
                    In good standing
                  </span>
                ) : (
                  <span className="rounded-brand border border-muted/30 px-2 py-0.5 text-xs text-muted">
                    Restricted on LFG
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 border-t border-white/10 pt-6">
            {[
              { label: "Shows", value: ghostless?.shows ?? 0 },
              { label: "Ghosts", value: ghostless?.ghosts ?? 0 },
              {
                label: "Avg vibe",
                value: ghostless?.vibe_avg ?? "—",
              },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-[11px] uppercase tracking-wider text-muted">
                  {stat.label}
                </p>
                <p className="mt-1 font-display text-2xl">{stat.value}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-muted">
            Strike history is private to server mods — not shown on this card.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <CopyLinkWithOrigin path={sharePath} />
            <Link
              href={`/s/${bundle.pathKey}`}
              className="text-sm text-muted hover:text-white"
            >
              Server page
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

export function DemoPublicPlayerCard(props: {
  bundle: PublicServerBundle;
  member: Member;
  ghostless: GhostlessStats | null;
  inGoodStanding: boolean;
}) {
  return (
    <DemoPublicVanityUnlock serverName={props.bundle.server.name}>
      {({ showPoweredBy, accent }) => (
        <PlayerCardBody
          {...props}
          showPoweredBy={showPoweredBy}
          accent={accent}
        />
      )}
    </DemoPublicVanityUnlock>
  );
}

export function LivePublicPlayerCard(props: {
  bundle: PublicServerBundle;
  member: Member;
  ghostless: GhostlessStats | null;
  inGoodStanding: boolean;
}) {
  return (
    <PlayerCardBody
      {...props}
      showPoweredBy={props.bundle.showPoweredBy}
      accent={props.bundle.accent}
    />
  );
}
