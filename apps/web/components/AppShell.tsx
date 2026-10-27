"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { AdminGuild } from "@rallied/shared";
import { buildBotInviteUrl } from "@rallied/shared";
import { MOCK_SERVERS } from "@/lib/mock-data";

const NAV = [
  { href: "/app", label: "Overview" },
  { href: "/app/lfg", label: "LFG" },
  { href: "/app/people", label: "People" },
  { href: "/app/disputes", label: "Disputes" },
  { href: "/app/analytics", label: "Analytics" },
  { href: "/app/billing", label: "Billing" },
  { href: "/app/settings", label: "Settings" },
];

type MeResponse = {
  authenticated: boolean;
  mock?: boolean;
  user?: { id: string; username: string; globalName: string | null };
  guilds?: AdminGuild[];
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [serverId, setServerId] = useState<string>("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: MeResponse) => {
        setMe(data);
        const first =
          data.guilds?.find((g) => g.bot_present)?.id ||
          data.guilds?.[0]?.id ||
          MOCK_SERVERS[0].discord_guild_id;
        setServerId(first);
      })
      .catch(() => setMe({ authenticated: false }));
  }, []);

  const guilds: AdminGuild[] =
    me?.guilds && me.guilds.length > 0
      ? me.guilds
      : MOCK_SERVERS.map((s) => ({
          id: s.discord_guild_id,
          name: s.name,
          icon: null,
          bot_present: true,
          plan: s.plan,
        }));

  const server = guilds.find((g) => g.id === serverId) ?? guilds[0];
  const withBot = guilds.filter((g) => g.bot_present);
  const empty =
    searchParams.get("empty") === "1" ||
    (me?.authenticated && withBot.length === 0 && !me.mock);

  const clientId =
    process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "";
  const inviteUrl = clientId
    ? buildBotInviteUrl(clientId)
    : "https://discord.com/developers/applications";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/rallied-wm-dark.jpg"
              alt="Rallied"
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex items-center gap-3">
            {withBot.length > 0 ? (
              <label className="flex items-center gap-2 text-sm text-muted">
                <span className="hidden sm:inline">Server</span>
                <select
                  className="rounded-brand border border-white/15 bg-slate-elevated px-2 py-1.5 text-white"
                  value={server?.id ?? ""}
                  onChange={(e) => setServerId(e.target.value)}
                >
                  {guilds.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {!s.bot_present ? " (add bot)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {me?.user ? (
              <span className="hidden text-xs text-muted sm:inline">
                {me.user.globalName || me.user.username}
                {me.mock ? " · mock" : ""}
              </span>
            ) : null}
            <a
              href="/api/auth/logout"
              className="text-xs text-muted hover:text-coral"
            >
              Log out
            </a>
          </div>
        </div>
      </header>

      {empty ? (
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="font-display text-3xl tracking-wide">No servers yet</h1>
          <p className="mt-3 text-sm text-muted">
            Add Rallied to a Discord server you manage, then refresh. You need
            Manage Server (or Administrator) on that guild.
          </p>
          <a
            href={inviteUrl}
            className="mt-8 inline-block rounded-brand bg-coral px-5 py-2.5 font-semibold text-slate"
          >
            Add to Discord
          </a>
        </div>
      ) : (
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[200px_1fr]">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
            {NAV.map((item) => {
              const active =
                item.href === "/app"
                  ? pathname === "/app"
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
              Viewing <span className="text-white/80">{server?.name}</span>
              <br />
              Plan: {server?.plan ?? "—"}
            </p>
          </nav>
          <main className="min-w-0">{children}</main>
        </div>
      )}
    </div>
  );
}
