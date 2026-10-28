"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildBotInviteUrl } from "@rallied/shared";
import {
  DEMO_NAV,
  DEMO_PUBLIC_PATH,
  DEMO_SERVER_NAME,
} from "@/lib/demo";

export function DemoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "";
  const inviteUrl = clientId
    ? buildBotInviteUrl(clientId)
    : "https://discord.com/developers/applications";

  return (
    <div className="min-h-screen">
      <div
        className="border-b border-lime/35 bg-lime/10"
        role="status"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-lime">
              Demo
            </p>
            <p className="mt-0.5 text-sm text-white/85">
              Mock admin board — not your Discord. Explore Overview, LFG,
              People, Disputes, and Analytics as a server owner would.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={inviteUrl}
              className="rounded-brand bg-coral px-3 py-1.5 text-xs font-semibold text-slate transition hover:brightness-110"
            >
              Add to Discord
            </a>
            <a
              href="/api/auth/discord"
              className="rounded-brand border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/90 transition hover:border-coral/50"
            >
              Log in
            </a>
            <Link
              href={DEMO_PUBLIC_PATH}
              className="rounded-brand border border-white/15 px-3 py-1.5 text-xs text-muted transition hover:text-lime"
            >
              Public server page
            </Link>
            <Link
              href="/"
              className="px-2 py-1.5 text-xs text-muted transition hover:text-white"
            >
              Exit demo
            </Link>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/rallied-wm-transparent-dark.png"
              alt="Rallied"
              className="h-10 w-auto bg-transparent sm:h-11"
            />
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-brand border border-white/15 bg-slate-elevated px-2.5 py-1.5 text-sm text-white/90">
              {DEMO_SERVER_NAME}
            </span>
            <span className="hidden text-xs text-muted sm:inline">
              Demo admin · mock
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[200px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
          {DEMO_NAV.map((item) => {
            const active =
              item.href === "/demo"
                ? pathname === "/demo"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-brand px-3 py-2 text-sm transition ${
                  active
                    ? "bg-coral/15 text-coral"
                    : "text-muted hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <p className="mt-4 hidden text-xs text-muted lg:block">
            Viewing <span className="text-white/80">{DEMO_SERVER_NAME}</span>
            <br />
            Plan: community
          </p>
        </nav>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
