"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { PRO_PRICE_USD, buildBotInviteUrl } from "@rallied/shared";

/**
 * Demo-only Pro vanity unlock on public mock pages (e.g. /s/demo-esports).
 * Live guild pages must not mount this — plan gates vanity via showPoweredBy.
 */
export function DemoPublicVanityUnlock({
  serverName,
  children,
}: {
  serverName: string;
  children: (opts: {
    showPoweredBy: boolean;
    accent: string | null;
    unlocked: boolean;
  }) => ReactNode;
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [hidePoweredBy, setHidePoweredBy] = useState(true);
  const [accent, setAccent] = useState("#B8F000");

  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "";
  const inviteHref = clientId
    ? buildBotInviteUrl(clientId)
    : "https://discord.com/developers/applications";

  const showPoweredBy = unlocked ? !hidePoweredBy : true;
  const effectiveAccent = unlocked ? accent : null;

  return (
    <div className="min-h-screen">
      <div className="border-b border-white/10 bg-slate/90 px-4 py-3">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            Demo public page · {serverName}
            {unlocked ? (
              <span className="ml-2 rounded-brand border border-lime/40 bg-lime/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-lime">
                Demo · Pro preview
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {!unlocked ? (
              <button
                type="button"
                onClick={() => setUnlocked(true)}
                className="rounded-brand bg-coral px-3 py-1.5 text-xs font-semibold text-slate transition hover:brightness-110"
              >
                Upgrade to Pro
              </button>
            ) : (
              <>
                <label className="flex items-center gap-1.5 text-[11px] text-muted">
                  <input
                    type="checkbox"
                    checked={hidePoweredBy}
                    onChange={(e) => setHidePoweredBy(e.target.checked)}
                    className="h-3 w-3 accent-lime"
                  />
                  Hide Powered by
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-muted">
                  Accent
                  <input
                    type="text"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="w-[5.5rem] rounded border border-white/15 bg-slate-elevated px-1.5 py-0.5 text-[11px] text-white"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setUnlocked(false)}
                  className="rounded-brand border border-white/20 px-2.5 py-1 text-[11px] text-white/85"
                >
                  Lock
                </button>
              </>
            )}
            <Link
              href="/demo/settings"
              className="text-[11px] text-coral hover:underline"
            >
              Demo settings
            </Link>
            {unlocked ? (
              <a
                href={inviteHref}
                className="text-[11px] text-muted hover:text-coral"
              >
                Add to Discord
              </a>
            ) : (
              <span className="text-[11px] text-muted">
                Preview vanity (${PRO_PRICE_USD}/mo on live)
              </span>
            )}
          </div>
        </div>
      </div>
      {children({
        showPoweredBy,
        accent: effectiveAccent,
        unlocked,
      })}
    </div>
  );
}
