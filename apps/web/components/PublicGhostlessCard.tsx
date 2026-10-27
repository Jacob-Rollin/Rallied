import Link from "next/link";
import type { GhostlessStats, Member } from "@rallied/shared";
import { GhostlessBadge } from "./GhostlessBadge";

type Props = {
  member: Member;
  ghostless: GhostlessStats | null;
  href?: string;
  /** Soft standing — never strike counts */
  inGoodStanding?: boolean;
  showStanding?: boolean;
};

/** Compact public card — Ghostless only; no strike history. */
export function PublicGhostlessCard({
  member,
  ghostless,
  href,
  inGoodStanding,
  showStanding = false,
}: Props) {
  const shows = ghostless?.shows ?? 0;
  const ghosts = ghostless?.ghosts ?? 0;

  const body = (
    <article className="animate-rise flex items-center justify-between gap-3 border-b border-white/5 py-2.5 last:border-0">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-brand bg-slate-elevated font-display text-sm text-coral"
          aria-hidden
        >
          {member.display_name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-display text-base tracking-wide">
            {member.display_name}
          </h3>
          <p className="text-[11px] text-muted">
            This server · {shows} shows · {ghosts} ghosts
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
        <GhostlessBadge showRatePct={ghostless?.show_rate_pct ?? null} compact />
        {showStanding && inGoodStanding ? (
          <span className="rounded-brand border border-lime/30 px-2 py-0.5 text-[11px] text-lime/90">
            In good standing
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
