import Link from "next/link";
import { notFound } from "next/navigation";
import { GhostlessBadge } from "@/components/GhostlessBadge";
import { StrikeBadge } from "@/components/StrikeBadge";
import {
  MOCK_GHOSTLESS,
  getMember,
  lockoutFor,
  strikesFor,
} from "@/lib/mock-data";

type Props = { params: Promise<{ id: string }> };

export default async function PersonPage({ params }: Props) {
  const { id } = await params;
  const member = getMember(id);
  if (!member) notFound();

  const ghostless = MOCK_GHOSTLESS[member.id] ?? null;
  const strikes = strikesFor(member.id);
  const lockout = lockoutFor(member.id);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/app/people" className="text-sm text-muted hover:text-coral">
          ← People
        </Link>
        <h1 className="mt-2 font-display text-4xl tracking-wide">
          {member.display_name}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Player card · this Discord server only
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <GhostlessBadge showRatePct={ghostless?.show_rate_pct ?? null} />
        <StrikeBadge count={strikes.length} />
        {lockout ? (
          <span className="animate-strike rounded-brand border border-coral/50 bg-coral/10 px-2 py-0.5 text-xs text-coral">
            Lockout until {new Date(lockout.until).toLocaleDateString()}
          </span>
        ) : null}
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Shows", value: ghostless?.shows ?? 0 },
          { label: "Ghosts", value: ghostless?.ghosts ?? 0 },
          {
            label: "Avg vibe",
            value: ghostless?.vibe_avg ?? "—",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-brand border border-white/10 bg-slate-elevated/50 p-4"
          >
            <p className="text-xs uppercase tracking-wider text-muted">
              {stat.label}
            </p>
            <p className="mt-2 font-display text-3xl">{stat.value}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="font-display text-xl tracking-wide">Strikes</h2>
        {strikes.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Clean record in this server.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {strikes.map((s) => (
              <li
                key={s.id}
                className="rounded-brand border border-coral/20 bg-coral/5 px-3 py-2 text-sm"
              >
                <p className="text-white">{s.reason}</p>
                <p className="text-xs text-muted">
                  {new Date(s.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {lockout ? (
        <section>
          <h2 className="font-display text-xl tracking-wide">Lockout</h2>
          <p className="mt-2 text-sm text-muted">{lockout.reason}</p>
        </section>
      ) : null}
    </div>
  );
}
