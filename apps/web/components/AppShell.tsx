"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { AdminGuild } from "@rallied/shared";
import { buildBotInviteUrl } from "@rallied/shared";
import { MOCK_SERVERS } from "@/lib/mock-data";
import {
  GUILD_COOKIE,
  GUILD_QUERY,
  isDemoGuildId,
} from "@/lib/guild-params";
import { resolveServerDisplayName } from "@/lib/server-display-name";
import { ReportFeedbackModal } from "@/components/ReportFeedbackModal";

const NAV_ALL = [
  { href: "/app", label: "Overview", access: "any" as const },
  { href: "/app/lfg", label: "LFG", access: "any" as const },
  { href: "/app/people", label: "People", access: "any" as const },
  { href: "/app/disputes", label: "Disputes", access: "any" as const },
  { href: "/app/analytics", label: "Analytics", access: "any" as const },
  { href: "/app/billing", label: "Billing", access: "owner" as const },
  { href: "/app/settings", label: "Settings", access: "owner" as const },
];

type MeResponse = {
  authenticated: boolean;
  mock?: boolean;
  /** Allowlisted via OPS_DISCORD_IDS — same helper as /ops pages. */
  ops?: boolean;
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

function clearGuildCookie() {
  document.cookie = `${GUILD_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [serverId, setServerId] = useState<string>("");
  const [reportOpen, setReportOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const mockFlag = searchParams.get("mock") === "1";

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

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: MeResponse) => {
        setMe(data);
        const allowDemo = Boolean(data.mock) || mockFlag;
        const fromQuery = searchParams.get(GUILD_QUERY) || "";
        let fromCookie = readGuildCookie();

        if (
          data.authenticated &&
          !allowDemo &&
          fromCookie &&
          isDemoGuildId(fromCookie)
        ) {
          clearGuildCookie();
          fromCookie = "";
        }

        const queryOk =
          fromQuery &&
          (allowDemo || !isDemoGuildId(fromQuery) || Boolean(data.mock));

        const firstLive =
          data.guilds?.find((g) => g.bot_present)?.id ||
          data.guilds?.[0]?.id ||
          "";

        // Authenticated live session: never fall back to MOCK_SERVERS ids.
        const first =
          data.authenticated && !allowDemo
            ? firstLive
            : firstLive || MOCK_SERVERS[0].discord_guild_id;

        const next = (queryOk ? fromQuery : "") || fromCookie || first;
        setServerId(next);
        if (next && !isDemoGuildId(next)) {
          writeGuildCookie(next);
        } else if (next && allowDemo) {
          writeGuildCookie(next);
        }
        if (next && fromQuery !== next) {
          const params = new URLSearchParams(searchParams.toString());
          params.set(GUILD_QUERY, next);
          // Drop empty=1 once we have a guild with bot
          const chosen = data.guilds?.find((g) => g.id === next);
          if (chosen?.bot_present) params.delete("empty");
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
    const chosen = me?.guilds?.find((g) => g.id === id);
    if (chosen?.bot_present) params.delete("empty");
    else if (me?.authenticated && !me.mock) params.set("empty", "1");
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  }

  const loading = me === null;
  const liveAuthed = Boolean(me?.authenticated && !me.mock && !mockFlag);

  // Never fall back to MOCK_SERVERS when authenticated under real OAuth,
  // and never flash mocks while /api/auth/me is still loading.
  const guilds: AdminGuild[] = loading
    ? []
    : me.guilds && me.guilds.length > 0
      ? me.guilds
      : liveAuthed
        ? []
        : MOCK_SERVERS.map((s) => ({
            id: s.discord_guild_id,
            name: s.name,
            icon: null,
            bot_present: true,
            plan: s.plan,
            access:
              s.discord_guild_id === "demo-guild-mod"
                ? ("mod" as const)
                : ("owner" as const),
          }));

  const server = guilds.find((g) => g.id === serverId) ?? guilds[0];
  const access = server?.access === "mod" ? "mod" : "owner";
  const nav = NAV_ALL.filter(
    (item) => item.access === "any" || access === "owner",
  );
  const withBot = guilds.filter((g) => g.bot_present);
  const empty =
    !loading &&
    (searchParams.get("empty") === "1" ||
      (liveAuthed && withBot.length === 0));

  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "";
  const inviteUrl = clientId
    ? buildBotInviteUrl(clientId)
    : "https://discord.com/developers/applications";

  function navHref(href: string) {
    const params = new URLSearchParams();
    if (server?.id) params.set(GUILD_QUERY, server.id);
    if (mockFlag) params.set("mock", "1");
    const q = params.toString();
    return q ? `${href}?${q}` : href;
  }

  // Mods who deep-link to Settings/Billing get bounced to Overview.
  useEffect(() => {
    if (access !== "mod" || !server?.id) return;
    if (
      pathname.startsWith("/app/settings") ||
      pathname.startsWith("/app/billing")
    ) {
      const params = new URLSearchParams();
      params.set(GUILD_QUERY, server.id);
      if (mockFlag) params.set("mock", "1");
      router.replace(`/app?${params.toString()}`);
    }
  }, [access, pathname, router, server?.id, mockFlag]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:gap-3 sm:py-3">
          <Link href="/" className="flex-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/rallied-wm-transparent-dark.png"
              alt="Rallied"
              width={120}
              height={36}
              className="block h-9 w-[7.5rem] flex-none bg-transparent object-contain object-left sm:h-10 sm:w-[8.25rem]"
              style={{ flexShrink: 0 }}
            />
          </Link>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-3">
            {guilds.length > 0 ? (
              <label className="flex min-w-0 max-w-[9.5rem] items-center gap-1.5 text-muted sm:max-w-xs md:max-w-sm">
                <span className="hidden shrink-0 text-sm sm:inline">Server</span>
                <select
                  className="h-7 min-w-0 w-full max-w-full truncate rounded-brand border border-white/15 bg-slate-elevated px-1.5 text-[11px] leading-none text-white sm:h-auto sm:px-2 sm:py-1.5 sm:text-sm"
                  value={server?.id ?? ""}
                  onChange={(e) => selectGuild(e.target.value)}
                  aria-label="Server"
                >
                  {guilds.map((s) => (
                    <option key={s.id} value={s.id}>
                      {resolveServerDisplayName({
                        oauthName: s.name,
                        guildId: s.id,
                      })}
                      {!s.bot_present ? " (add bot)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {me?.user ? (
              <span className="hidden text-xs text-muted md:inline">
                {me.user.globalName || me.user.username}
                {me.mock ? " · mock" : ""}
                {mockFlag ? " · mock preview" : ""}
              </span>
            ) : null}

            {/* Desktop: inline account actions */}
            <div className="hidden items-center gap-3 sm:flex">
              {!loading && me?.authenticated ? (
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="text-xs text-muted hover:text-coral"
                >
                  Report
                </button>
              ) : null}
              {!loading && me?.ops ? (
                <Link
                  href="/ops"
                  className="text-xs text-muted hover:text-coral"
                >
                  Ops
                </Link>
              ) : null}
              <a
                href="/api/auth/logout"
                className="text-xs text-muted hover:text-coral"
              >
                Log out
              </a>
            </div>

            {/* Mobile: hamburger → Report / Ops / Log out */}
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
                  {!loading && me?.authenticated ? (
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
                  {!loading && me?.ops ? (
                    <Link
                      href="/ops"
                      role="menuitem"
                      className="block px-3 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-coral"
                      onClick={() => setMenuOpen(false)}
                    >
                      Ops
                    </Link>
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

      {loading ? (
        <div className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-muted">
          Loading your servers…
        </div>
      ) : empty ? (
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="font-display text-3xl tracking-wide">No servers yet</h1>
          <p className="mt-3 text-sm text-muted">
            Add Rallied to a Discord server you manage, then refresh. Owners need
            Manage Server (or Administrator). On Community+, owners can also
            grant <strong className="font-semibold text-white">Rallied Mod</strong>{" "}
            Discord roles in Settings so mods open Overview / LFG / People /
            Disputes / Analytics (not Billing). After the bot joins and runs a
            command, the guild appears with{" "}
            <code className="text-coral">bot_present</code>.
          </p>
          {guilds.length > 0 ? (
            <ul className="mt-6 space-y-2 text-left text-sm text-white/75">
              {guilds.map((g) => (
                <li
                  key={g.id}
                  className="rounded-brand border border-white/10 bg-slate-elevated/40 px-3 py-2"
                >
                  {resolveServerDisplayName({
                    oauthName: g.name,
                    guildId: g.id,
                  })}
                  <span className="ml-2 text-xs text-muted">
                    {g.bot_present ? "bot ready" : "bot not detected"}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <a
            href={inviteUrl}
            className="mt-8 inline-block rounded-brand bg-coral px-5 py-2.5 font-semibold text-slate"
          >
            Add to Discord
          </a>
          <p className="mt-4 text-xs text-muted">
            Optional sandbox:{" "}
            <Link href="/demo" className="text-lime hover:underline">
              Explore demo
            </Link>
          </p>
        </div>
      ) : (
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[200px_1fr]">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
            {nav.map((item) => {
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
            {/* Report lives in header on mobile; keep sidebar entry on lg only */}
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className={`hidden rounded-brand px-3 py-2 text-left text-sm transition lg:block ${
                reportOpen
                  ? "bg-coral/15 text-coral"
                  : "text-muted hover:bg-white/5 hover:text-white"
              }`}
            >
              Report
            </button>
            <p className="mt-4 hidden text-xs text-muted lg:block">
              Viewing{" "}
              <span className="text-white/80">
                {server
                  ? resolveServerDisplayName({
                      oauthName: server.name,
                      guildId: server.id,
                    })
                  : "—"}
              </span>
              <br />
              Plan: {server?.plan ?? "—"}
              <br />
              Access: {access === "mod" ? "Rallied Mod" : "Owner"}
            </p>
          </nav>
          <main className="min-w-0">{children}</main>
        </div>
      )}

      <ReportFeedbackModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        discordGuildId={server?.id}
        guildName={
          server
            ? resolveServerDisplayName({
                oauthName: server.name,
                guildId: server.id,
              })
            : undefined
        }
      />
    </div>
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
