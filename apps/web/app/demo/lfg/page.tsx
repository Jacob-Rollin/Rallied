import { DemoDataBanner } from "@/components/DemoDataBanner";
import { LfgPartyRow } from "@/components/LfgPartyRow";
import { DEMO_GUILD_ID } from "@/lib/demo";
import { loadDashboard } from "@/lib/dashboard-data";

export default async function DemoLfgPage() {
  const data = await loadDashboard(DEMO_GUILD_ID, true);
  const open = data.parties.filter((p) => p.status === "open");
  const rest = data.parties.filter((p) => p.status !== "open");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide">LFG board</h1>
        <p className="mt-1 text-sm text-muted">
          Parties posted in this Discord server. Closed rows soft-delete; purge
          after 14 days in Supabase.
        </p>
      </div>

      <DemoDataBanner />

      {data.parties.length === 0 ? (
        <p className="rounded-brand border border-white/10 bg-slate-elevated/40 px-4 py-8 text-center text-sm text-muted">
          No open parties
        </p>
      ) : (
        <div className="rounded-brand border border-white/10 bg-slate-elevated/40 px-4">
          {[...open, ...rest].map((p) => (
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
      )}
    </div>
  );
}
