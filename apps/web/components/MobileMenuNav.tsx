"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AddToDiscordButton } from "./AddToDiscordButton";

/** Marketing links shared by SiteHeader + signed-in app/ops mobile sheets. */
export const SITE_NAV = [
  { href: "/guide", label: "Guide" },
  { href: "/pricing", label: "Pricing" },
  { href: "/servers", label: "Servers" },
  { href: "/changelog", label: "Changelog" },
  { href: "/demo", label: "Demo" },
] as const;

/** Legal links — mobile menu secondary only (footer carries them on desktop). */
export const LEGAL_NAV = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

type Props = {
  /** Signed-in sheet: account → marketing → legal → CTA. Logged-out: marketing → legal → CTA. */
  authed: boolean;
  /** OPS_DISCORD_IDS allowlist — Ops only in Account block when true. */
  showOps?: boolean;
  inviteHref: string;
  onNavigate: () => void;
  /** When set (signed-in), show Report in the account section. */
  onReport?: () => void;
  /**
   * Active guild already has the bot — demote primary invite CTA so we don't
   * push re-add for Official / the selected server.
   */
  botInstalledOnActiveGuild?: boolean;
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/app") {
    return pathname === "/app" || pathname.startsWith("/app/");
  }
  if (href === "/ops") {
    return pathname === "/ops" || pathname.startsWith("/ops/");
  }
  if (href === "/demo") {
    return pathname === "/demo" || pathname.startsWith("/demo/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function linkClass(active: boolean, muted = false): string {
  if (active) {
    return "rounded-brand px-3 py-2.5 text-sm font-medium text-coral underline decoration-coral/70 underline-offset-4";
  }
  return muted
    ? "rounded-brand px-3 py-2.5 text-sm text-white/55 transition hover:bg-white/5 hover:text-white"
    : "rounded-brand px-3 py-2.5 text-sm text-white/80 transition hover:bg-white/5 hover:text-white";
}

function accountLinkClass(active: boolean, muted = false): string {
  if (active) {
    return "rounded-brand px-3 py-2.5 text-sm font-medium text-coral underline decoration-coral/70 underline-offset-4";
  }
  return muted
    ? "rounded-brand px-3 py-2.5 text-sm text-white/55 transition hover:bg-white/5 hover:text-coral"
    : "rounded-brand px-3 py-2.5 text-sm text-white/80 transition hover:bg-white/5 hover:text-coral";
}

/**
 * Shared mobile hamburger sheet body for marketing + /app + /ops.
 * Signed-in: Account (Dashboard · Ops? · Report · Log out) | Guide…Demo | Privacy · Terms | CTA.
 * Logged-out order unchanged: Guide…Demo | Privacy · Terms | CTA.
 */
export function MobileMenuNav({
  authed,
  showOps = false,
  inviteHref,
  onNavigate,
  onReport,
  botInstalledOnActiveGuild = false,
}: Props) {
  const pathname = usePathname() || "/";
  const inviteLabel =
    authed && botInstalledOnActiveGuild
      ? "Invite to another server"
      : "Add to Discord";

  return (
    <nav aria-label="Mobile" className="mx-auto flex max-w-5xl flex-col">
      {authed ? (
        <>
          <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
            Account
          </p>
          <Link
            href="/app"
            className={accountLinkClass(isActivePath(pathname, "/app"))}
            onClick={onNavigate}
            aria-current={isActivePath(pathname, "/app") ? "page" : undefined}
          >
            Dashboard
          </Link>
          {showOps ? (
            <Link
              href="/ops"
              className={accountLinkClass(isActivePath(pathname, "/ops"), true)}
              onClick={onNavigate}
              aria-current={isActivePath(pathname, "/ops") ? "page" : undefined}
            >
              Ops
            </Link>
          ) : null}
          {onReport ? (
            <button
              type="button"
              className={`w-full text-left ${accountLinkClass(false, true)}`}
              onClick={() => {
                onNavigate();
                onReport();
              }}
            >
              Report
            </button>
          ) : null}
          <a href="/api/auth/logout" className={accountLinkClass(false, true)}>
            Log out
          </a>
          <div
            className="my-1 border-t border-white/10"
            role="presentation"
          />
        </>
      ) : null}

      {SITE_NAV.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={linkClass(active)}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}

      <div className="my-1 border-t border-white/10" role="presentation" />

      {LEGAL_NAV.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={linkClass(active, true)}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}

      <div className="mt-2 border-t border-white/10 pt-3">
        <AddToDiscordButton
          href={inviteHref}
          className="w-full !whitespace-nowrap"
          variant={
            authed && botInstalledOnActiveGuild ? "outline" : "coral"
          }
        >
          {inviteLabel}
        </AddToDiscordButton>
      </div>
    </nav>
  );
}
