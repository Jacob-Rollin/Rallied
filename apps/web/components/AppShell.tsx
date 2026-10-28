"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { AdminGuild } from "@rallied/shared";
import { buildBotInviteUrl } from "@rallied/shared";
import { MOCK_SERVERS } from "@/lib/mock-data";
import { GUILD_COOKIE, GUILD_QUERY } from "@/lib/guild-context";

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

function readGuildCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${GUILD_COOKIE}=`));
  return match ? decodeURIComponent(match.split("=")[1] || "") : "";
}

function writeGuildCookie(guildId: string) {
  const maxAge = 60 * 60 * 24 * 30;
  document.cookie = `${GUILD_COOKIE}=${encodeURIComponent(guildId)}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [serverId, setServerId] = useState<string>("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: MeResponse) => {
        setMe(data);
        const fromQuery = searchParams.get(GUILD_QUERY);
        const fromCookie = readGuildCookie();
        const first =
          data.guilds?.find((g) => g.bot_present)?.id ||
          data.guilds?.[0]?.id ||
          MOCK_SERVERS[0].discord_guild_id;
        const next = fromQuery || fromCookie || first;
        setServerId(next);
        if (next) writeGuildCookie(next);
        if (fromQuery !== next) {
          const params = new URLSearchParams(searchParams.toString());
          params.set(GUILD_QUERY, next);
          router.replace(`${pathname}?${params.toString()}`);
        }
      })
      .catch(() => setMe({ authenticated: false }));
    // Only on mount / auth load — guild query changes handled by select
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectGuild(id: string) {
    setServerId(id);
    writeGuildCookie(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set(GUILD_QUERY, id);
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  }

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

  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "";
  const inviteUrl = clientId
    ? buildBotInviteUrl(clientId)
    : "https://discord.com/developers/applications";

  const mockFlag = searchParams.get("mock") === "1";

  function navHref(href: string) {
    const params = new URLSearchParams();
    if (server?.id) params.set(GUILD_QUERY, server.id);
    if (mockFlag) params.set("mock", "1");
    const q = params.toString();
    return q ? `${href}?${q}` : href;
  }

  return (
    <div className="min-h-screen">
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
            {withBot.length > 0 ? (
              <label className="flex items-center gap-2 text-sm text-muted">
                <span className="hidden sm:inline">Server</span>
                <select
                  className="rounded-brand border border-white/15 bg-slate-elevated px-2 py-1.5 text-white"
                  value={server?.id ?? ""}
                  onChange={(e) => selectGuild(e.target.value)}
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
                {mockFlag ? " · mock preview" : ""}
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
            Manage Server (or Administrator) on that guild. After the bot joins
            and runs a command, the guild appears in Supabase{" "}
            <code className="text-coral">servers</code> (
            <code className="text-coral">bot_present</code>).
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
                  href={navHref(item.href)}
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
