"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FEEDBACK_KINDS,
  FEEDBACK_STATUSES,
  type FeedbackReport,
  type FeedbackStatus,
} from "@rallied/shared";
import { OpsSubnav } from "@/components/OpsUsagePanel";

const STATUS_STYLE: Record<FeedbackStatus, string> = {
  new: "text-lime",
  triaging: "text-coral",
  done: "text-muted",
  wontfix: "text-white/40",
};

type Props = { reports: FeedbackReport[] };

export function OpsFeedbackInbox({ reports }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "";
  const kind = searchParams.get("kind") ?? "";
  const q = searchParams.get("q") ?? "";

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.push(qs ? `/ops?${qs}` : "/ops");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-xs tracking-[0.14em] text-coral">
            RALLIED OPS
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-wide text-white">
            Feedback inbox
          </h1>
          <p className="mt-2 text-sm text-muted">
            Bugs and suggestions from Discord + web. Status: new → triaging →
            done / wontfix.
          </p>
        </div>
      </header>

      <OpsSubnav active="feedback" />

      <div className="mt-6 flex flex-wrap gap-3 border-b border-white/10 pb-4">
        <label className="text-xs text-muted">
          Status
          <select
            className="ml-2 rounded-brand border border-white/15 bg-slate-elevated px-2 py-1.5 text-sm text-white"
            value={status}
            onChange={(e) => setFilter("status", e.target.value)}
          >
            <option value="">All</option>
            {FEEDBACK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Kind
          <select
            className="ml-2 rounded-brand border border-white/15 bg-slate-elevated px-2 py-1.5 text-sm text-white"
            value={kind}
            onChange={(e) => setFilter("kind", e.target.value)}
          >
            <option value="">All</option>
            {FEEDBACK_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 text-xs text-muted sm:min-w-[200px]">
          Title
          <input
            className="ml-2 w-[calc(100%-3rem)] rounded-brand border border-white/15 bg-slate-elevated px-2 py-1.5 text-sm text-white"
            defaultValue={q}
            placeholder="Search…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setFilter("q", (e.target as HTMLInputElement).value.trim());
              }
            }}
          />
        </label>
      </div>

      <ul className="mt-2 divide-y divide-white/10">
        {reports.length === 0 ? (
          <li className="py-12 text-center text-sm text-muted">
            No reports match.
          </li>
        ) : (
          reports.map((r) => (
            <li key={r.id}>
              <Link
                href={`/ops/${r.id}`}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3 transition hover:bg-white/[0.03]"
              >
                <span
                  className={`w-20 shrink-0 text-xs uppercase tracking-wide ${STATUS_STYLE[r.status]}`}
                >
                  {r.status}
                </span>
                <span className="min-w-0 flex-1 text-sm text-white">
                  <span className="text-muted">
                    {r.kind === "bug" ? "Bug" : "Suggestion"}
                  </span>
                  {" · "}
                  {r.title}
                </span>
                <span className="text-xs text-muted">
                  {new Date(r.created_at).toLocaleDateString()}
                  {r.guild_name ? ` · ${r.guild_name}` : ""}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
