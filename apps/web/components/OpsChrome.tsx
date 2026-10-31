"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { buildBotInviteUrl } from "@rallied/shared";
import { MobileMenuNav } from "@/components/MobileMenuNav";
import { ReportFeedbackModal } from "@/components/ReportFeedbackModal";

type MeResponse = {
  authenticated: boolean;
  ops?: boolean;
  guilds?: { id: string; bot_present?: boolean }[];
};

/**
 * Ops top bar — same chrome pattern as /app AppShell.
 * Logo → /app; coral OPS mark; desktop Dashboard + Report + Log out;
 * mobile hamburger uses the shared signed-in sheet (Account + site + legal).
 */
export function OpsChrome() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const menuId = useId();
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "";
  const inviteUrl = clientId
    ? buildBotInviteUrl(clientId)
    : "https://discord.com/developers/applications";

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: MeResponse | null) => {
        setMe(data ?? { authenticated: false });
      })
      .catch(() => setMe({ authenticated: false }));
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    function onPointer(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (
        menuPanelRef.current?.contains(target) ||
        menuButtonRef.current?.contains(target)
      ) {
        return;
      }
      setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [menuOpen]);

  const authed = Boolean(me?.authenticated);
  const showOps = Boolean(authed && me?.ops);
  const hasBotGuild = Boolean(
    authed && me?.guilds?.some((g) => Boolean(g.bot_present)),
  );

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-2.5 sm:gap-3 sm:py-3">
          <Link href="/app" className="flex flex-none items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/rallied-wm-transparent-dark.png"
              alt="Rallied"
              width={120}
              height={36}
              className="block h-9 w-[7.5rem] flex-none bg-transparent object-contain object-left sm:h-10 sm:w-[8.25rem]"
              style={{ flexShrink: 0 }}
            />
            <span className="font-display text-xs tracking-[0.14em] text-coral">
              OPS
            </span>
          </Link>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-3">
            {/* Desktop only — mobile uses the shared sheet (one Log out per viewport) */}
            <Link
              href="/app"
              className="hidden text-xs text-muted hover:text-coral sm:inline"
            >
              Dashboard
            </Link>

            <div className="hidden items-center gap-3 sm:flex">
              {authed ? (
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="text-xs text-muted hover:text-coral"
                >
                  Report
                </button>
              ) : null}
              <a
                href="/api/auth/logout"
                className="text-xs text-muted hover:text-coral"
              >
                Log out
              </a>
            </div>

            {/* Mobile: logo-only bar + hamburger (no duplicate Dashboard) */}
            <button
              ref={menuButtonRef}
              type="button"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-brand border border-white/20 text-white/85 transition hover:border-coral/50 hover:text-white sm:hidden"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div
            ref={menuPanelRef}
            id={menuId}
            className="border-t border-white/10 bg-slate/95 px-4 py-3 backdrop-blur-md sm:hidden"
          >
            <MobileMenuNav
              authed={authed}
              showOps={showOps}
              inviteHref={inviteUrl}
              botInstalledOnActiveGuild={hasBotGuild}
              onNavigate={() => setMenuOpen(false)}
              onReport={
                authed
                  ? () => {
                      setReportOpen(true);
                    }
                  : undefined
              }
            />
          </div>
        ) : null}
      </header>

      <ReportFeedbackModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden fill="none">
      <path
        d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden fill="none">
      <path
        d="M5 5l10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
