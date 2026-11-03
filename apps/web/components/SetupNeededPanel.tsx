"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminGuild } from "@rallied/shared";
import { GUILD_COOKIE, GUILD_QUERY } from "@/lib/guild-params";
import { resolveServerDisplayName } from "@/lib/server-display-name";
import { useBotInviteHref } from "@/components/BotInviteProvider";

type MeResponse = {
  authenticated: boolean;
  mock?: boolean;
  guilds?: AdminGuild[];
};

function writeGuildCookie(guildId: string) {
  const maxAge = 60 * 60 * 24 * 30;
  document.cookie = `${GUILD_COOKIE}=${encodeURIComponent(guildId)}; path=/; max-age=${maxAge}; samesite=lax`;
}

function guildLabel(g: Pick<AdminGuild, "id" | "name">) {
  return resolveServerDisplayName({ oauthName: g.name, guildId: g.id });
}

/**
 * Post-invite / missing-servers-row interstitial.
 * Polls /api/auth/me until the target guild has setup_ready, then unlocks Overview.
 */
export function SetupNeededPanel({
  guildId,
  guildName,
  guilds = [],
  inviteHref,
  installed = false,
  authenticated = true,
}: {
  guildId?: string | null;
  guildName?: string | null;
  /** Manage-Guild list for picker when Discord omitted guild_id. */
  guilds?: AdminGuild[];
  inviteHref?: string;
  /** Soft flag from ?installed=1 after Authorize. */
  installed?: boolean;
  authenticated?: boolean;
}) {
  const router = useRouter();
  const fallbackInvite = useBotInviteHref();
  const invite = inviteHref || fallbackInvite;
  const [polling, setPolling] = useState(true);
  const [status, setStatus] = useState<"waiting" | "ready" | "error">("waiting");
  const [ticks, setTicks] = useState(0);
  const unlocked = useRef(false);

  const needsSetup = guilds.filter((g) => !g.setup_ready);
  const active =
    (guildId && guilds.find((g) => g.id === guildId)) ||
    needsSetup.find((g) => g.bot_present) ||
    needsSetup[0] ||
    null;
  const focusId = guildId || active?.id || "";
  const focusName =
    guildName ||
    (active ? guildLabel(active) : null) ||
    (focusId ? `Server ${focusId}` : null);

  const unlock = useCallback(
    (id: string) => {
      if (unlocked.current) return;
      unlocked.current = true;
      setStatus("ready");
      setPolling(false);
      writeGuildCookie(id);
      router.replace(`/app?${GUILD_QUERY}=${encodeURIComponent(id)}`);
      router.refresh();
    },
    [router],
  );

  useEffect(() => {
    if (!authenticated || !polling) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setStatus("error");
          return;
        }
        const data = (await res.json()) as MeResponse;
        if (cancelled) return;
        const list = data.guilds ?? [];
        const target = focusId
          ? list.find((g) => g.id === focusId)
          : list.find((g) => g.setup_ready);
        if (target?.setup_ready) {
          unlock(target.id);
          return;
        }
        // Any ready guild after install — prefer that over waiting forever.
        if (installed && !focusId) {
          const ready = list.find((g) => g.setup_ready);
          if (ready) {
            unlock(ready.id);
            return;
          }
        }
        setTicks((n) => n + 1);
      } catch {
        if (!cancelled) setStatus("error");
      } finally {
        if (!cancelled && !unlocked.current) {
          timer = setTimeout(tick, 4000);
        }
      }
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [authenticated, polling, focusId, installed, unlock]);

  function selectNeedsSetup(id: string) {
    writeGuildCookie(id);
    const params = new URLSearchParams();
    params.set(GUILD_QUERY, id);
    if (installed) params.set("installed", "1");
    router.replace(`/app/setup?${params.toString()}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-xs uppercase tracking-wider text-lime/90">
        {installed ? "Bot authorized" : "Finish setup"}
      </p>
      <h1 className="mt-2 font-display text-3xl tracking-wide text-white">
        Almost there — run{" "}
        <code className="text-coral">/setup</code> in Discord
      </h1>
      <p className="mt-4 text-sm text-muted">
        Add Rallied → run <code className="text-coral">/setup</code> (or{" "}
        <code className="text-coral">/lfg desk</code>) in your LFG channel →
        this dashboard unlocks for that server.
        {focusName ? (
          <>
            {" "}
            Waiting on{" "}
            <span className="text-white/85">{focusName}</span>
            {focusId ? (
              <span className="ml-1 font-mono text-xs text-white/35">
                {focusId}
              </span>
            ) : null}
            .
          </>
        ) : null}
      </p>

      {!authenticated ? (
        <p className="mt-6 text-sm text-white/75">
          <Link href="/login" className="font-semibold text-coral hover:underline">
            Log in with Discord
          </Link>{" "}
          after you run <code className="text-coral">/setup</code> so we can
          unlock Overview.
        </p>
      ) : null}

      {status === "ready" ? (
        <p className="mt-6 text-sm text-lime">Setup detected — opening Overview…</p>
      ) : authenticated ? (
        <p className="mt-6 text-xs text-muted" aria-live="polite">
          {polling
            ? `Checking for setup${ticks > 0 ? `… (${ticks})` : "…"}`
            : null}
          {status === "error" ? " Couldn’t refresh — try again below." : null}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            setPolling(true);
            setStatus("waiting");
            unlocked.current = false;
            router.refresh();
          }}
          className="rounded-brand border border-white/20 px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-coral/50"
        >
          Refresh
        </button>
        {focusId && !guilds.find((g) => g.id === focusId)?.bot_present ? (
          <a
            href={invite}
            className="rounded-brand bg-coral px-4 py-2 text-sm font-semibold text-slate"
          >
            Add to Discord
          </a>
        ) : (
          <a
            href={invite}
            className="rounded-brand border border-white/20 px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-coral/50"
          >
            Invite to another server
          </a>
        )}
      </div>

      {needsSetup.length > 0 ? (
        <div className="mt-10 text-left">
          <h2 className="font-display text-lg tracking-wide text-white">
            Servers that need setup
          </h2>
          <p className="mt-1 text-xs text-muted">
            Manage Server guilds without a Rallied dashboard yet — pick one or
            invite the bot.
          </p>
          <ul className="mt-4 space-y-2">
            {needsSetup.map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-brand border border-white/10 bg-slate-elevated/40 px-3 py-2 text-sm"
              >
                <button
                  type="button"
                  onClick={() => selectNeedsSetup(g.id)}
                  className="min-w-0 flex-1 text-left text-white/85 hover:text-coral"
                >
                  {guildLabel(g)}
                  <span className="ml-2 text-xs text-muted">
                    {g.bot_present
                      ? "Bot is in — run /setup"
                      : "Needs invite"}
                  </span>
                </button>
                {!g.bot_present ? (
                  <a
                    href={invite}
                    className="shrink-0 text-xs font-semibold text-coral hover:underline"
                  >
                    Invite
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-10 text-xs text-muted">
        Already set up?{" "}
        <Link href="/app" className="text-lime hover:underline">
          Back to dashboard
        </Link>
        {" · "}
        <Link href="/guide" className="text-lime hover:underline">
          Guide
        </Link>
      </p>
    </div>
  );
}
