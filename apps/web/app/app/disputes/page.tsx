import { DataSourceBanner } from "@/components/DataSourceBanner";
import { loadDashboard } from "@/lib/dashboard-data";
import { resolveSelectedGuild } from "@/lib/guild-context";

const STATUS_STYLE: Record<string, string> = {
  open: "border-lime/40 text-lime",
  upheld: "border-coral/40 text-coral",
  overturned: "border-muted/40 text-muted",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DisputesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { guildId, useMock } = await resolveSelectedGuild({ searchParams: sp });
  const data = await loadDashboard(guildId, useMock);
  const open = data.disputes.filter((d) => d.status === "open");
  const closed = data.disputes.filter((d) => d.status !== "open");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Disputes</h1>
        <p className="mt-1 text-sm text-muted">
          Appeals for strikes / ghost flags in this server. The flagged player
          opens via <code className="text-coral">/dispute open</code> or the
          ratee Dispute button in Discord.
        </p>
      </div>

      <div className="rounded-brand border border-coral/30 bg-coral/5 px-4 py-3 text-sm text-white/85">
        Resolve in Discord with{" "}
        <code className="text-coral">/dispute resolve</code> (Overturn / Uphold
        on the web are not wired yet).
      </div>

      <DataSourceBanner source={data.source} notice={data.notice} />

      <section className="space-y-3">
        <h2 className="font-display text-xl tracking-wide">Open queue</h2>
        {open.length === 0 ? (
          <p className="text-sm text-muted">No open disputes.</p>
        ) : (
          <ul className="space-y-3">
            {open.map((d) => (
              <li
                key={d.id}
                className="animate-rise rounded-brand border border-white/10 bg-slate-elevated/50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg tracking-wide">
                      {d.opener_name}
                    </p>
                    <p className="text-sm text-white/85">{d.subject}</p>
                    {d.notes ? (
                      <p className="mt-1 text-sm text-muted">{d.notes}</p>
                    ) : null}
                  </div>
                  <span
                    className={`rounded-brand border px-2 py-0.5 text-xs uppercase tracking-wider ${STATUS_STYLE[d.status]}`}
                  >
                    {d.status}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-brand border border-lime/30 px-3 py-1.5 text-xs text-lime/60"
                    title="Resolve actions wire later"
                  >
                    Overturn (soon)
                  </button>
                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-brand border border-coral/30 px-3 py-1.5 text-xs text-coral/60"
                  >
                    Uphold (soon)
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl tracking-wide">Resolved</h2>
        {closed.length === 0 ? (
          <p className="text-sm text-muted">No resolved disputes yet.</p>
        ) : (
          <ul className="space-y-2">
            {closed.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 border-b border-white/5 py-2 text-sm last:border-0"
              >
                <span>
                  {d.opener_name} · {d.subject}
                </span>
                <span
                  className={`rounded-brand border px-2 py-0.5 text-xs uppercase ${STATUS_STYLE[d.status]}`}
                >
                  {d.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
