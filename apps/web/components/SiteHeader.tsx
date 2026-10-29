"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { buildBotInviteUrl } from "@rallied/shared";
import { AddToDiscordButton } from "./AddToDiscordButton";

type Props = {
  /** Translucent over hero vs solid strip on inner pages. */
  variant?: "hero" | "solid";
};

const NAV = [
  { href: "/guide", label: "Guide" },
  { href: "/pricing", label: "Pricing" },
  { href: "/servers", label: "Servers" },
  { href: "/changelog", label: "Changelog" },
  { href: "/demo", label: "Demo" },
] as const;

export function SiteHeader({ variant = "solid" }: Props) {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "";
  const inviteHref = clientId ? buildBotInviteUrl(clientId) : "#add-bot";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

        {/* Desktop / tablet: full nav + CTAs */}
        <nav
          className="hidden items-center gap-4 text-sm text-white/70 md:flex"
          aria-label="Primary"
        >
          {NAV.map((item) => (
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
          <Link
            href="/login"
            className="whitespace-nowrap rounded-brand border border-white/20 px-3 py-2 text-sm font-medium text-white/90 transition hover:border-coral/50 hover:text-white"
          >
            Log in
          </Link>
          <AddToDiscordButton
            href={inviteHref}
            className="!whitespace-nowrap !px-4 !py-2 !text-sm"
          />
        </div>

        {/* Mobile: Log in text + menu trigger only */}
        <div className="flex items-center gap-1 md:hidden">
          <Link
            href="/login"
            className="whitespace-nowrap px-2.5 py-1.5 text-sm font-medium text-white/90 transition hover:text-white"
          >
            Log in
          </Link>
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
          <nav aria-label="Mobile" className="mx-auto flex max-w-5xl flex-col">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-brand px-3 py-2.5 text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-white/10 pt-3">
              <AddToDiscordButton
                href={inviteHref}
                className="w-full !whitespace-nowrap"
              />
            </div>
          </nav>
        </div>
      ) : null}
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
