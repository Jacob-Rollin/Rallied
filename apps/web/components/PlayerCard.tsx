import Link from "next/link";
import type { GhostlessStats, Lockout, Member, Strike } from "@rallied/shared";
import { GhostlessBadge } from "./GhostlessBadge";
import { StrikeBadge } from "./StrikeBadge";

type Props = {
  member: Member;
  ghostless: GhostlessStats | null;
  strikes: Strike[];
  lockout: Lockout | null;
  href?: string;
  /** Dense horizontal row closer to mock compact cards */
  compact?: boolean;
};

export function PlayerCard({
  member,
  ghostless,
  strikes,
  lockout,
  href,
  compact = true,
}: Props) {
  const shows = ghostless?.shows ?? 0;
  const ghosts = ghostless?.ghosts ?? 0;

  const body = (
    <article
      className={`animate-rise flex items-center justify-between gap-3 border-b border-white/5 last:border-0 ${
        compact ? "py-2.5" : "py-4"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex shrink-0 items-center justify-center rounded-brand bg-slate-elevated font-display text-coral ${
            compact ? "h-9 w-9 text-sm" : "h-11 w-11"
          }`}
          aria-hidden
        >
          {member.display_name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h3
            className={`truncate font-display tracking-wide ${
              compact ? "text-base" : "text-lg"
            }`}
          >
            {member.display_name}
          </h3>
          <p className="text-[11px] text-muted">
            This server · {shows} shows · {ghosts} ghosts
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
        <GhostlessBadge
          showRatePct={ghostless?.show_rate_pct ?? null}
          compact
        />
        <StrikeBadge count={strikes.length} />
        {lockout ? (
          <span className="rounded-brand border border-coral/40 px-2 py-0.5 text-[11px] text-coral">
            Lockout
          </span>
        ) : null}
      </div>
    </article>
  );

  if (href) {
    return (
      <Link href={href} className="block transition hover:bg-white/[0.02]">
        {body}
      </Link>
    );
  }
  return body;
}
