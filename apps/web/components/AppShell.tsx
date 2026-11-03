"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { AdminGuild } from "@rallied/shared";
import { MOCK_SERVERS } from "@/lib/mock-data";
import {
  DASHBOARD_RANGE_QUERY,
  GUILD_COOKIE,
  GUILD_QUERY,
  isDemoGuildId,
} from "@/lib/guild-params";
import { getPublicBotInviteHref } from "@/lib/bot-invite";
import { resolveServerDisplayName } from "@/lib/server-display-name";
import { MobileMenuNav } from "@/components/MobileMenuNav";
import { ReportFeedbackModal } from "@/components/ReportFeedbackModal";
import { SetupNeededPanel } from "@/components/SetupNeededPanel";

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

function guildSwitcherSuffix(g: AdminGuild): string {
  if (g.setup_ready) return "";
  if (g.bot_present) return " — Needs setup";
  return " — Needs setup";
}

export function AppShell({
  children,
  inviteHref,
}: {
  children: React.ReactNode;
  /** Server-resolved OAuth invite — required so menus match landing. */
  inviteHref?: string;
}) {
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
  const onSetupPath =
    pathname === "/app/setup" || pathname.startsWith("/app/setup/");
  const installedFlag = searchParams.get("installed") === "1";

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

        const firstReady =
          data.guilds?.find((g) => g.setup_ready)?.id ||
          data.guilds?.find((g) => g.bot_present)?.id ||
          data.guilds?.[0]?.id ||
          "";

        // Authenticated live session: never fall back to MOCK_SERVERS ids.
        const first =
          data.authenticated && !allowDemo
            ? firstReady
            : firstReady || MOCK_SERVERS[0].discord_guild_id;

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
          const chosen = data.guilds?.find((g) => g.id === next);
          if (chosen?.setup_ready) {
            params.delete("empty");
            params.delete("installed");
          } else if (chosen?.bot_present) {
            params.delete("empty");
          }
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
    const chosen = me?.guilds?.find((g) => g.id === id);
    const params = new URLSearchParams(searchParams.toString());
    params.set(GUILD_QUERY, id);
    params.delete("empty");
    params.delete("installed");

    if (chosen?.setup_ready) {
      router.push(`${pathname === "/app/setup" ? "/app" : pathname}?${params.toString()}`);
      router.refresh();
      return;
    }

    // Bot in guild but no servers row — setup interstitial, not empty Billing.
    if (chosen?.bot_present) {
      router.push(`/app/setup?${params.toString()}`);
      router.refresh();
      return;
    }

    // Manage Guild without bot: invite / needs-setup checklist.
    if (me?.authenticated && !me.mock) {
      params.set("empty", "1");
    }
    router.push(`/app/setup?${params.toString()}`);
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
            setup_ready: true,
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
  const withReady = guilds.filter((g) => g.setup_ready);
  const noBotsYet =
    !loading &&
    (searchParams.get("empty") === "1" ||
      (liveAuthed && withBot.length === 0 && guilds.length === 0));

  const selectedNeedsSetup =
    liveAuthed &&
    Boolean(server?.id) &&
    !server?.setup_ready &&
    !onSetupPath;

  // Full dashboard only when the selected guild has a servers row.
  const showDashboard =
    !loading &&
    !noBotsYet &&
    !onSetupPath &&
    !selectedNeedsSetup &&
    (Boolean(server?.setup_ready) || !liveAuthed);

  const inviteUrl = inviteHref || getPublicBotInviteHref();

  function navHref(href: string) {
    const params = new URLSearchParams();
    if (server?.id) params.set(GUILD_QUERY, server.id);
    if (mockFlag) params.set("mock", "1");
    // Keep Overview/Analytics `?range=` across tab switches so filters “stick”.
    const range = searchParams.get(DASHBOARD_RANGE_QUERY);
    if (range) params.set(DASHBOARD_RANGE_QUERY, range);
    const q = params.toString();
    return q ? `${href}?${q}` : href;
  }

  // Mods who deep-link to Settings/Billing get bounced to Overview.
  useEffect(() => {
    if (access !== "mod" || !server?.id || !showDashboard) return;
    if (
      pathname.startsWith("/app/settings") ||
      pathname.startsWith("/app/billing")
    ) {
      const params = new URLSearchParams();
      params.set(GUILD_QUERY, server.id);
      if (mockFlag) params.set("mock", "1");
      router.replace(`/app?${params.toString()}`);
    }
  }, [access, pathname, router, server?.id, mockFlag, showDashboard]);

  // Soft redirect: ?installed=1 on /app → setup path with guild.
  useEffect(() => {
    if (!installedFlag || onSetupPath || loading) return;
    if (server?.setup_ready) return;
    const params = new URLSearchParams();
    if (server?.id) params.set(GUILD_QUERY, server.id);
    params.set("installed", "1");
    router.replace(`/app/setup?${params.toString()}`);
  }, [installedFlag, onSetupPath, loading, server?.id, server?.setup_ready, router]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:gap-3 sm:py-3">
          <Link
            href={
              server?.setup_ready
                ? navHref("/app")
                : server?.id
                  ? `/app/setup?${GUILD_QUERY}=${encodeURIComponent(server.id)}`
                  : "/app/setup"
            }
            className="flex-none"
            aria-label="Rallied dashboard"
          >
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
                      {guildSwitcherSuffix(s)}
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

            {/* Desktop: Ops first (allowlisted), then Report, Log out */}
            <div className="hidden items-center gap-3 sm:flex">
              {!loading && me?.ops ? (
                <Link
                  href="/ops"
                  className="text-xs text-muted hover:text-coral"
                >
                  Ops
                </Link>
              ) : null}
              {!loading && me?.authenticated ? (
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

            {/* Mobile hamburger — same sheet as SiteHeader */}
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
              authed={!loading && Boolean(me?.authenticated)}
              showOps={!loading && Boolean(me?.ops)}
              inviteHref={inviteUrl}
              botInstalledOnActiveGuild={Boolean(server?.bot_present)}
              onNavigate={() => setMenuOpen(false)}
              onReport={
                !loading && me?.authenticated
                  ? () => {
                      setReportOpen(true);
                    }
                  : undefined
              }
            />
          </div>
        ) : null}
      </header>

      {loading ? (
        <div className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-muted">
          Loading your servers…
        </div>
      ) : onSetupPath ? (
        <main className="min-w-0">{children}</main>
      ) : noBotsYet ? (
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="font-display text-3xl tracking-wide">
            Add Rallied to get started
          </h1>
          <p className="mt-3 text-sm text-muted">
            Add Rallied → run <code className="text-coral">/setup</code> in your
            LFG channel → dashboard unlocks. Owners need Manage Server (or
            Administrator). On Community+, owners can grant{" "}
            <strong className="font-semibold text-white">Rallied Mod</strong>{" "}
            roles in Settings for Overview / LFG / People / Disputes / Analytics
            (not Billing).
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
                    {g.setup_ready
                      ? "Ready"
                      : g.bot_present
                        ? "Needs /setup"
                        : "Needs invite"}
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
      ) : selectedNeedsSetup || (installedFlag && !server?.setup_ready) ? (
        <SetupNeededPanel
          guildId={server?.id}
          guildName={
            server
              ? resolveServerDisplayName({
                  oauthName: server.name,
                  guildId: server.id,
                })
              : null
          }
          guilds={guilds}
          inviteHref={inviteUrl}
          installed={installedFlag || Boolean(server?.bot_present)}
          authenticated={Boolean(me?.authenticated)}
        />
      ) : showDashboard ? (
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
              {withReady.length > 0 && withReady.length < guilds.length ? (
                <>
                  <br />
                  <span className="text-white/50">
                    {withReady.length} of {guilds.length} servers ready
                  </span>
                </>
              ) : null}
            </p>
          </nav>
          <main className="min-w-0">{children}</main>
        </div>
      ) : (
        <SetupNeededPanel
          guildId={server?.id}
          guildName={
            server
              ? resolveServerDisplayName({
                  oauthName: server.name,
                  guildId: server.id,
                })
              : null
          }
          guilds={guilds}
          inviteHref={inviteUrl}
          installed={Boolean(server?.bot_present)}
          authenticated={Boolean(me?.authenticated)}
        />
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
