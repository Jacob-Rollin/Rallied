"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ReportFeedbackModal } from "@/components/ReportFeedbackModal";

type MeResponse = {
  authenticated: boolean;
  ops?: boolean;
};

/**
 * Ops top bar — same chrome pattern as /app AppShell (no Overview/LFG tabs).
 * Logo → /app; coral OPS mark; Dashboard return; Report + Log out (hamburger on mobile).
 */
export function OpsChrome() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const menuId = useId();
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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

            <div className="relative sm:hidden">
              <button
                ref={menuButtonRef}
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-brand border border-white/20 text-white/85 transition hover:border-coral/50 hover:text-white"
                aria-expanded={menuOpen}
                aria-controls={menuId}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <CloseIcon /> : <MenuIcon />}
              </button>
              {menuOpen ? (
                <div
                  ref={menuPanelRef}
                  id={menuId}
                  className="absolute right-0 top-full z-30 mt-1.5 min-w-[9.5rem] border border-white/15 bg-slate-elevated py-1 shadow-lg"
                  role="menu"
                >
                  <Link
                    href="/app"
                    role="menuitem"
                    className="block px-3 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-coral"
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  {authed ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-3 py-2 text-left text-sm text-white/80 hover:bg-white/5 hover:text-coral"
                      onClick={() => {
                        setMenuOpen(false);
                        setReportOpen(true);
                      }}
                    >
                      Report
                    </button>
                  ) : null}
                  <a
                    href="/api/auth/logout"
                    role="menuitem"
                    className="block px-3 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-coral"
                  >
                    Log out
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>
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
