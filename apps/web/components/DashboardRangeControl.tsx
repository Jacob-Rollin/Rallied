"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DASHBOARD_RANGE_OPTIONS,
  type DashboardRangeKey,
} from "@rallied/shared";
import { GUILD_QUERY, withDashboardQuery } from "@/lib/guild-params";

type Props = {
  /** Pathname only, e.g. `/app` or `/demo/analytics`. */
  pathname: string;
  current: DashboardRangeKey;
  guildId?: string;
  /** Extra query keys to keep (e.g. mock=1). */
  extra?: Record<string, string>;
  className?: string;
};

/**
 * Compact range control — URL-driven (`?range=`), no heavy card chrome.
 * Segmented links; soft-nav + refresh so Overview/Analytics RSC re-fetch.
 */
export function DashboardRangeControl({
  pathname,
  current,
  guildId = "",
  extra,
  className = "",
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const guildFromUrl = searchParams.get(GUILD_QUERY) || "";
  const resolvedGuild = guildId || guildFromUrl;

  return (
    <div className={`min-w-0 ${className}`}>
      <p className="sr-only">Time range (UTC)</p>
      <div
        role="group"
        aria-label="Dashboard time range"
        className="-mx-1 flex gap-0.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {DASHBOARD_RANGE_OPTIONS.map((opt) => {
          const active = opt.key === current;
          const href = withDashboardQuery(pathname, {
            guildId: resolvedGuild,
            range: opt.key,
            extra,
          });
          return (
            <Link
              key={opt.key}
              href={href}
              scroll={false}
              aria-current={active ? "true" : undefined}
              onClick={(e) => {
                // Force RSC refresh — soft nav alone sometimes left stale boards.
                if (active) {
                  e.preventDefault();
                  return;
                }
                e.preventDefault();
                router.push(href, { scroll: false });
                router.refresh();
              }}
              className={`shrink-0 border-b-2 px-2.5 py-1.5 text-xs font-semibold tracking-wide transition sm:text-[13px] ${
                active
                  ? "border-coral text-white"
                  : "border-transparent text-muted hover:border-white/20 hover:text-white/85"
              }`}
            >
              {opt.label}
            </Link>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-white/35">
        UTC · filters the board only — history is kept while the bot is
        installed
      </p>
    </div>
  );
}
