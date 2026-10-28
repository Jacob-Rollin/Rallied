import { DemoDataBanner } from "@/components/DemoDataBanner";
import { PlayerCard } from "@/components/PlayerCard";
import { DEMO_GUILD_ID, demoHref } from "@/lib/demo";
import { loadDashboard } from "@/lib/dashboard-data";

export default async function DemoPeoplePage() {
  const data = await loadDashboard(DEMO_GUILD_ID, true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide">People</h1>
        <p className="mt-1 text-sm text-muted">
          Compact cards for this server only — Ghostless and strikes never cross
          guilds.
        </p>
      </div>

      <DemoDataBanner />

      {data.members.length === 0 ? (
        <p className="rounded-brand border border-white/10 bg-slate-elevated/40 px-4 py-8 text-center text-sm text-muted">
          No members yet.
        </p>
      ) : (
        <div className="rounded-brand border border-white/10 bg-slate-elevated/40 px-3">
          {data.members.map(({ member, ghostless, strikes, lockout }) => (
            <PlayerCard
              key={member.id}
              member={member}
              ghostless={ghostless}
              strikes={strikes}
              lockout={lockout}
              href={demoHref(`/people/${member.id}`)}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}
