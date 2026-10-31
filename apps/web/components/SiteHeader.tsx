"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { buildBotInviteUrl } from "@rallied/shared";
import { AddToDiscordButton } from "./AddToDiscordButton";
import { MobileMenuNav, SITE_NAV } from "./MobileMenuNav";
import { ReportFeedbackModal } from "./ReportFeedbackModal";

type Props = {
  /** Translucent over hero vs solid strip on inner pages. */
  variant?: "hero" | "solid";
};

type MeResponse = {
  authenticated: boolean;
  ops?: boolean;
  user?: { username?: string; globalName?: string | null };
  guilds?: { id: string; bot_present?: boolean }[];
};

export function SiteHeader({ variant = "solid" }: Props) {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "";
  const inviteHref = clientId ? buildBotInviteUrl(clientId) : "#add-bot";
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [showOps, setShowOps] = useState(false);
  const [hasBotGuild, setHasBotGuild] = useState(false);
  const menuId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: MeResponse | null) => {
        const loggedIn = Boolean(data?.authenticated);
        setAuthed(loggedIn);
        setShowOps(Boolean(loggedIn && data?.ops));
        setHasBotGuild(
          Boolean(
            loggedIn && data?.guilds?.some((g) => Boolean(g.bot_present)),
          ),
        );
      })
      .catch(() => {
        setAuthed(false);
        setShowOps(false);
        setHasBotGuild(false);
      });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    function onPointer(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
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

  return (
    <header
      className={`sticky top-0 z-30 w-full border-b ${
        variant === "hero"
          ? "border-white/10 bg-slate/75 backdrop-blur-md"
          : "border-white/10 bg-slate/90 backdrop-blur-md"
      }`}
    >
      <div className="relative mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:py-3">
        <Link href="/" className="shrink-0" onClick={() => setMenuOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/rallied-wm-transparent-dark.png"
            alt="Rallied"
            className="h-9 w-auto bg-transparent sm:h-10"
          />
        </Link>

        {/* Desktop / tablet: full nav + CTAs — unchanged */}
        <nav
          className="hidden items-center gap-4 text-sm text-white/70 md:flex"
          aria-label="Primary"
        >
          {SITE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 md:flex">
          {authed ? (
            <>
              <Link
                href="/app"
                className="whitespace-nowrap text-sm text-white/70 transition hover:text-coral"
              >
                Dashboard
              </Link>
              {showOps ? (
                <Link
                  href="/ops"
                  className="whitespace-nowrap text-sm text-white/55 transition hover:text-coral"
                >
                  Ops
                </Link>
              ) : null}
              <a
                href="/api/auth/logout"
                className="whitespace-nowrap text-sm text-white/55 transition hover:text-coral"
              >
                Log out
              </a>
            </>
          ) : (
            <Link
              href="/login"
              className="whitespace-nowrap rounded-brand border border-white/20 px-3 py-2 text-sm font-medium text-white/90 transition hover:border-coral/50 hover:text-white"
            >
              Log in
            </Link>
          )}
          <AddToDiscordButton
            href={inviteHref}
            className="!whitespace-nowrap !px-4 !py-2 !text-sm"
          />
        </div>

        {/*
          Mobile: logo + Log in (logged-out) or logo-only + hamburger (signed-in).
          Dashboard lives in the sheet — no duplicate next to the logo.
        */}
        <div className="flex items-center gap-1 md:hidden">
          {!authed ? (
            <Link
              href="/login"
              className="whitespace-nowrap px-2.5 py-1.5 text-sm font-medium text-white/90 transition hover:text-white"
            >
              Log in
            </Link>
          ) : null}
          <button
            ref={buttonRef}
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-brand border border-white/20 text-white/90 transition hover:border-coral/50 hover:text-white"
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
          ref={panelRef}
          id={menuId}
          className="border-t border-white/10 bg-slate/95 px-4 py-3 backdrop-blur-md md:hidden"
        >
          <MobileMenuNav
            authed={authed}
            showOps={showOps}
            inviteHref={inviteHref}
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

      <ReportFeedbackModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </header>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden fill="none">
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
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden fill="none">
      <path
        d="M5 5l10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
