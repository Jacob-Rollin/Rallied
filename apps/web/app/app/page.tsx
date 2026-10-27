import Link from "next/link";
import { MOCK_PARTIES, MOCK_MEMBERS, MOCK_STRIKES } from "@/lib/mock-data";
import { hasSupabaseEnv } from "@/lib/supabase";

export default function OverviewPage() {
  const open = MOCK_PARTIES.filter((p) => p.status === "open").length;
  const strikes = MOCK_STRIKES.filter((s) => s.active).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Overview</h1>
        <p className="mt-1 text-sm text-muted">
          {hasSupabaseEnv()
            ? "Connected to Supabase (anon). Tighten RLS before production."
            : "Mock data — set NEXT_PUBLIC_SUPABASE_* to load live rows."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Open parties", value: open, href: "/app/lfg" },
          { label: "Members", value: MOCK_MEMBERS.length, href: "/app/people" },
          { label: "Active strikes", value: strikes, href: "/app/people" },
        ].map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="animate-rise rounded-brand border border-white/10 bg-slate-elevated/60 p-4 transition hover:border-coral/40"
          >
            <p className="text-xs uppercase tracking-wider text-muted">{kpi.label}</p>
            <p className="mt-2 font-display text-4xl text-white">{kpi.value}</p>
          </Link>
        ))}
      </div>

      <p className="text-sm text-muted">
        Phase 1 dashboard: LFG board, people (Ghostless + strikes this server),
        settings + billing placeholder. Disputes and analytics come later.
      </p>
    </div>
  );
}
