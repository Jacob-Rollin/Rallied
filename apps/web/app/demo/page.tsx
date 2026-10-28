import Link from "next/link";
import { DemoDataBanner } from "@/components/DemoDataBanner";
import { DEMO_GUILD_ID, demoHref } from "@/lib/demo";
import { loadDashboard } from "@/lib/dashboard-data";

export default async function DemoOverviewPage() {
  const data = await loadDashboard(DEMO_GUILD_ID, true);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Overview</h1>
        <p className="mt-1 text-sm text-muted">
          {data.server?.name ?? "Demo server"} · what server owners see after
          adding Rallied
        </p>
      </div>

      <DemoDataBanner />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Open parties",
            value: data.openPartyCount,
            href: demoHref("/lfg"),
          },
          {
            label: "Members",
            value: data.memberCount,
            href: demoHref("/people"),
          },
          {
            label: "Active strikes",
            value: data.activeStrikeCount,
            href: demoHref("/people"),
          },
        ].map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="animate-rise rounded-brand border border-white/10 bg-slate-elevated/60 p-4 transition hover:border-coral/40"
          >
            <p className="text-xs uppercase tracking-wider text-muted">
              {kpi.label}
            </p>
            <p className="mt-2 font-display text-4xl text-white">{kpi.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-brand border border-white/10 bg-slate-elevated/40 p-4">
          <p className="text-xs uppercase tracking-wider text-muted">
            Soft this week
          </p>
          <ul className="mt-3 space-y-2 text-sm text-white/85">
            <li>
              Open disputes ·{" "}
              <span className="text-coral">
                {data.disputes.filter((d) => d.status === "open").length}
              </span>
            </li>
            <li>
              Ghostless-ready members ·{" "}
              <span className="text-lime">
                {
                  data.members.filter(
                    (m) => (m.ghostless?.show_rate_pct ?? 0) >= 90,
                  ).length
                }
              </span>
            </li>
            <li>
              Lockouts active ·{" "}
              <span className="text-white">
                {data.members.filter((m) => m.lockout).length}
              </span>
            </li>
          </ul>
        </div>
        <div className="rounded-brand border border-white/10 bg-slate-elevated/40 p-4">
          <p className="text-xs uppercase tracking-wider text-muted">
            Ops snapshot
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            Pinned LFG desk in Discord, or{" "}
            <code className="text-coral">/lfg create</code> /{" "}
            <code className="text-coral">/lfg find</code>. Vibe Check and
            Ghostless stay scoped to this server.
          </p>
        </div>
      </div>
    </div>
  );
}
