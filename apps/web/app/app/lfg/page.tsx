import { LfgPartyRow } from "@/components/LfgPartyRow";
import { MOCK_PARTIES } from "@/lib/mock-data";

export default function LfgPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide">LFG board</h1>
        <p className="mt-1 text-sm text-muted">
          Parties posted in this Discord server. Closed rows soft-delete; purge
          after 14 days in Supabase.
        </p>
      </div>

      <div className="rounded-brand border border-white/10 bg-slate-elevated/40 px-4">
        {MOCK_PARTIES.map((p) => (
          <LfgPartyRow
            key={p.id}
            game={p.game}
            rankText={p.rank_text}
            hostName={p.host_name}
            filled={p.filled}
            slots={p.slots}
            status={p.status}
            createdAt={p.created_at}
          />
        ))}
      </div>
    </div>
  );
}
