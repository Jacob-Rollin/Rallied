import { DataSourceBanner } from "@/components/DataSourceBanner";
import { PlayerCard } from "@/components/PlayerCard";
import { loadDashboard } from "@/lib/dashboard-data";
import { resolveSelectedGuild, withGuildQuery } from "@/lib/guild-context";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PeoplePage({ searchParams }: Props) {
  const sp = await searchParams;
  const { guildId, useMock } = await resolveSelectedGuild({ searchParams: sp });
  const data = await loadDashboard(guildId, useMock);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide">People</h1>
        <p className="mt-1 text-sm text-muted">
          Compact cards for this server only — Ghostless and strikes never cross
          guilds.
        </p>
      </div>

      <DataSourceBanner source={data.source} notice={data.notice} />

      {data.members.length === 0 ? (
        <p className="rounded-brand border border-white/10 bg-slate-elevated/40 px-4 py-8 text-center text-sm text-muted">
          No members yet — they appear after interacting with the bot in this
          guild.
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
              href={withGuildQuery(`/app/people/${member.id}`, guildId)}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}
