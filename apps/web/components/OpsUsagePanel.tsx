"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  CF_FREE_TIER_REF,
  OFFICIAL_RALLIED_GUILD_ID,
  SUPABASE_FREE_TIER_REF,
} from "@rallied/shared";
import type { OpsUsagePayload } from "@/lib/ops-usage-types";

const PLAN_LABELS: Record<string, string> = {
  free: "Starter (free)",
  trial: "Trial",
  community: "Community",
  pro: "Pro",
  founding_pro: "Founding Pro",
  lapsed: "Lapsed",
  demo: "Demo",
  other: "Other",
};

function formatNum(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString();
}

function MetricRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-white/10 py-2.5">
      <div>
        <div className="text-sm text-white/90">{label}</div>
        {hint ? <div className="text-xs text-muted">{hint}</div> : null}
      </div>
      <div className="font-display text-sm tracking-wide text-white tabular-nums">
        {value}
      </div>
    </div>
  );
}

export function OpsUsagePanel() {
  const [guildInput, setGuildInput] = useState(OFFICIAL_RALLIED_GUILD_ID);
  const [guild, setGuild] = useState(OFFICIAL_RALLIED_GUILD_ID);
  const [data, setData] = useState<OpsUsagePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (guildId: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ guild: guildId });
      const res = await fetch(`/api/ops/usage?${qs.toString()}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          detail?: string;
          error?: string;
        } | null;
        throw new Error(body?.detail || body?.error || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as OpsUsagePayload;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(guild);
  }, [guild, load]);

  const product = data?.product;
  const drill = data?.drill;
  const cf = data?.cloudflare;
  const sb = data?.supabase;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-xs tracking-[0.14em] text-coral">
            RALLIED OPS
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-wide text-white">
            Usage
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Product counts plus Cloudflare / Supabase free-tier signals for
            dogfood. External dashboards for deep dive.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(guild)}
          className="rounded-brand border border-white/20 px-3 py-1.5 text-xs text-muted transition hover:border-coral/50 hover:text-coral"
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <OpsSubnav active="usage" />

      {error ? (
        <p className="mt-6 text-sm text-coral">Failed to load: {error}</p>
      ) : null}

      {/* A. Product */}
      <section className="mt-8">
        <h2 className="font-display text-lg tracking-wide text-white">
          Product
        </h2>
        <p className="mt-1 text-xs text-muted">
          Always from Supabase service role
          {data?.cached ? " · cached briefly" : ""}.
        </p>

        {!product && loading ? (
          <p className="mt-4 text-sm text-muted">Loading…</p>
        ) : product ? (
          <div className="mt-3">
            <MetricRow
              label="Active servers"
              value={formatNum(product.activeServers)}
              hint={`${formatNum(product.archivedServers)} archived`}
            />
            {(
              [
                "free",
                "trial",
                "community",
                "pro",
                "founding_pro",
                "lapsed",
                "demo",
                "other",
              ] as const
            ).map((key) =>
              product.serversByPlan[key] > 0 ||
              key === "free" ||
              key === "founding_pro" ||
              key === "trial" ? (
                <MetricRow
                  key={key}
                  label={PLAN_LABELS[key] ?? key}
                  value={formatNum(product.serversByPlan[key])}
                />
              ) : null,
            )}
            <MetricRow
              label="Founding seats"
              value={`${formatNum(product.foundingSeatsUsed)} / ${product.foundingSeatCap}`}
              hint="PLANS.founding_pro.seatCap"
            />
            <MetricRow
              label="Open parties (global)"
              value={formatNum(product.openPartiesGlobal)}
              hint="status open|filled, not deleted"
            />
            <MetricRow
              label="Feedback backlog"
              value={`${formatNum(product.feedbackNew)} new · ${formatNum(product.feedbackTriaging)} triaging`}
            />
            <MetricRow
              label="Trial consumers"
              value={formatNum(product.trialConsumers)}
              hint="trial_consumers rows"
            />
          </div>
        ) : null}
      </section>

      {/* Single-server drill */}
      <section className="mt-10">
        <h2 className="font-display text-lg tracking-wide text-white">
          Single server
        </h2>
        <p className="mt-1 text-xs text-muted">
          Dogfood one guild — default Official{" "}
          <code className="text-white/70">{OFFICIAL_RALLIED_GUILD_ID}</code>.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="text-xs text-muted">
            Pick server
            <select
              className="mt-1 block w-full min-w-[16rem] rounded-brand border border-white/15 bg-slate-elevated px-2 py-1.5 text-sm text-white sm:w-auto"
              value={
                product?.serverOptions.some((s) => s.discord_guild_id === guild)
                  ? guild
                  : ""
              }
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                setGuildInput(v);
                setGuild(v);
              }}
            >
              <option value="">—</option>
              {(product?.serverOptions ?? []).map((s) => (
                <option key={s.id} value={s.discord_guild_id}>
                  {s.name}
                  {s.archived_at ? " (archived)" : ""} · {s.plan}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 flex-1 text-xs text-muted">
            Or paste discord_guild_id
            <input
              className="mt-1 block w-full rounded-brand border border-white/15 bg-slate-elevated px-2 py-1.5 font-mono text-sm text-white"
              value={guildInput}
              onChange={(e) => setGuildInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setGuild(guildInput.trim() || OFFICIAL_RALLIED_GUILD_ID);
                }
              }}
              placeholder={OFFICIAL_RALLIED_GUILD_ID}
            />
          </label>
          <button
            type="button"
            className="rounded-brand bg-coral px-4 py-2 text-sm font-semibold text-slate"
            onClick={() =>
              setGuild(guildInput.trim() || OFFICIAL_RALLIED_GUILD_ID)
            }
          >
            Load
          </button>
          <button
            type="button"
            className="rounded-brand border border-white/20 px-3 py-2 text-xs text-muted hover:text-coral"
            onClick={() => {
              setGuildInput(OFFICIAL_RALLIED_GUILD_ID);
              setGuild(OFFICIAL_RALLIED_GUILD_ID);
            }}
          >
            Official
          </button>
        </div>

        {drill ? (
          <div className="mt-4">
            {!drill.found ? (
              <p className="text-sm text-coral">
                No servers row for{" "}
                <code className="text-white/80">{drill.discord_guild_id}</code>.
              </p>
            ) : (
              <>
                <MetricRow
                  label="Name / plan"
                  value={`${drill.name || "—"} · ${drill.plan || "—"}`}
                  hint={
                    drill.forever_pro
                      ? "forever_pro protected"
                      : drill.archived_at
                        ? `archived ${new Date(drill.archived_at).toLocaleDateString()}`
                        : undefined
                  }
                />
                <MetricRow
                  label="Members"
                  value={formatNum(drill.memberCount)}
                />
                <MetricRow
                  label="Open parties"
                  value={formatNum(drill.openParties)}
                />
                <MetricRow
                  label="Creates / 24h"
                  value={formatNum(drill.createsLast24h)}
                  hint="lfg_parties.created_at window"
                />
                <MetricRow
                  label="trial_consumed_at"
                  value={
                    drill.trial_consumed_at
                      ? new Date(drill.trial_consumed_at).toLocaleString()
                      : "—"
                  }
                />
                <MetricRow
                  label="Feedback (this guild)"
                  value={`${formatNum(drill.feedbackNew)} new · ${formatNum(drill.feedbackTriaging)} triaging · ${formatNum(drill.feedbackTotal)} total`}
                />
              </>
            )}
          </div>
        ) : null}
      </section>

      {/* B. Cloudflare */}
      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg tracking-wide text-white">
            Cloudflare Workers
          </h2>
          <a
            href={data?.links.cloudflareDashboard ?? CF_FREE_TIER_REF.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-coral hover:underline"
          >
            CF dashboard ↗
          </a>
        </div>
        <p className="mt-1 text-xs text-muted">
          Free plan reference:{" "}
          <span className="text-white/80">
            {formatNum(CF_FREE_TIER_REF.requestsPerDay)} req/day
          </span>{" "}
          account-wide · {CF_FREE_TIER_REF.cpuMsPerInvocation} ms CPU/invocation
          — verify in dashboard; limits change.
        </p>

        {cf && !cf.configured ? (
          <div className="mt-4 border border-white/10 bg-slate-elevated/60 px-4 py-3 text-sm text-muted">
            <p className="text-white/90">Connect Cloudflare</p>
            <p className="mt-1">{cf.setupHint}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs">
              <li>
                CF dashboard → My Profile → API Tokens → Create Token → use
                template <strong className="font-normal text-white/80">Account Analytics Read</strong>{" "}
                (or custom: Account → Account Analytics → Read; Workers →
                Analytics → Read).
              </li>
              <li>
                Account ID: Workers overview right sidebar, or any Worker →
                copy Account ID.
              </li>
              <li>
                Encrypt on <code className="text-white/70">rallied-web</code>:{" "}
                <code className="text-white/70">CF_API_TOKEN</code>,{" "}
                <code className="text-white/70">CF_ACCOUNT_ID</code>, optional{" "}
                <code className="text-white/70">CF_WORKER_NAMES</code>.
              </li>
              <li>Redeploy rallied-web.</li>
            </ol>
          </div>
        ) : null}

        {cf?.error ? (
          <p className="mt-3 text-sm text-coral">CF fetch error: {cf.error}</p>
        ) : null}

        {cf?.windows ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-white/15 text-xs text-muted">
                  <th className="py-2 pr-3 font-normal">Worker</th>
                  <th className="py-2 pr-3 font-normal">24h req</th>
                  <th className="py-2 pr-3 font-normal">7d</th>
                  <th className="py-2 pr-3 font-normal">30d</th>
                  <th className="py-2 pr-3 font-normal">24h err</th>
                  <th className="py-2 font-normal">CPU p50/p99</th>
                </tr>
              </thead>
              <tbody>
                {cf.workerNames.map((name) => {
                  const a = cf.windows!["24h"][name];
                  const b = cf.windows!["7d"][name];
                  const c = cf.windows!["30d"][name];
                  return (
                    <tr key={name} className="border-b border-white/10">
                      <td className="py-2.5 pr-3 font-mono text-xs text-white/90">
                        {name}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">
                        {formatNum(a?.requests)}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">
                        {formatNum(b?.requests)}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">
                        {formatNum(c?.requests)}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">
                        {formatNum(a?.errors)}
                      </td>
                      <td className="py-2.5 tabular-nums text-xs text-muted">
                        {a?.cpuTimeP50Ms != null
                          ? `${a.cpuTimeP50Ms.toFixed(2)} / ${a.cpuTimeP99Ms?.toFixed(2) ?? "—"} ms`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">
              Usage only — no invented “% of quota”. Compare 24h req to Free
              reference {formatNum(CF_FREE_TIER_REF.requestsPerDay)}/day.
            </p>
          </div>
        ) : null}
      </section>

      {/* C. Supabase */}
      <section className="mt-10 pb-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg tracking-wide text-white">
            Supabase
          </h2>
          <a
            href={data?.links.supabaseDashboard ?? SUPABASE_FREE_TIER_REF.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-coral hover:underline"
          >
            Supabase dashboard ↗
          </a>
        </div>
        <p className="mt-1 text-xs text-muted">
          Free plan reference:{" "}
          <span className="text-white/80">
            ~{SUPABASE_FREE_TIER_REF.databaseMb} MB database
          </span>{" "}
          — verify in dashboard; limits change. Source:{" "}
          {sb?.source ?? "—"}.
        </p>

        {sb?.setupHint && sb.source !== "management_api" && sb.source !== "rpc" ? (
          <div className="mt-4 border border-white/10 bg-slate-elevated/60 px-4 py-3 text-sm text-muted">
            <p className="text-white/90">Optional Management API</p>
            <p className="mt-1">{sb.setupHint}</p>
          </div>
        ) : null}

        {sb?.error ? (
          <p className="mt-3 text-sm text-coral">Supabase size note: {sb.error}</p>
        ) : null}

        {sb ? (
          <div className="mt-4">
            <MetricRow
              label="Database size estimate"
              value={
                sb.databasePretty ??
                (sb.databaseBytes != null
                  ? `${(sb.databaseBytes / (1024 * 1024)).toFixed(1)} MB`
                  : "—")
              }
              hint={`Free ref ~${SUPABASE_FREE_TIER_REF.databaseMb} MB`}
            />
            {sb.tables.map((t) => (
              <MetricRow
                key={t.table}
                label={t.table}
                value={
                  t.sizePretty
                    ? `${t.sizePretty}${t.rowCount != null ? ` · ${formatNum(t.rowCount)} rows` : ""}`
                    : t.rowCount != null
                      ? `${formatNum(t.rowCount)} rows`
                      : "—"
                }
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function OpsSubnav({ active }: { active: "feedback" | "usage" }) {
  const item = (href: string, key: "feedback" | "usage", label: string) => {
    const on = active === key;
    return (
      <Link
        href={href}
        className={
          on
            ? "border-b-2 border-coral pb-2 text-sm text-white"
            : "border-b-2 border-transparent pb-2 text-sm text-muted hover:text-coral"
        }
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="mt-6 flex gap-6 border-b border-white/10">
      {item("/ops", "feedback", "Feedback")}
      {item("/ops/usage", "usage", "Usage")}
    </nav>
  );
}
