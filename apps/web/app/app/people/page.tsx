import { PlayerCard } from "@/components/PlayerCard";
import {
  MOCK_GHOSTLESS,
  MOCK_MEMBERS,
  lockoutFor,
  strikesFor,
} from "@/lib/mock-data";

export default function PeoplePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide">People</h1>
        <p className="mt-1 text-sm text-muted">
          Compact cards for this server only — Ghostless and strikes never cross
          guilds.
        </p>
      </div>

      <div className="rounded-brand border border-white/10 bg-slate-elevated/40 px-3">
        {MOCK_MEMBERS.map((m) => (
          <PlayerCard
            key={m.id}
            member={m}
            ghostless={MOCK_GHOSTLESS[m.id] ?? null}
            strikes={strikesFor(m.id)}
            lockout={lockoutFor(m.id)}
            href={`/app/people/${m.id}`}
            compact
          />
        ))}
      </div>
    </div>
  );
}
