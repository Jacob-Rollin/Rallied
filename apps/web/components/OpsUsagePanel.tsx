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

/** CF quantiles are stored as ms after µs→ms conversion in ops-usage. */
function formatCpuMs(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return "—";
  if (ms < 0.01) return `${Math.round(ms * 1000)} µs`;
  if (ms < 1) return `${ms.toFixed(2)} ms`;
  if (ms < 10) return `${ms.toFixed(1)} ms`;
  return `${ms.toFixed(0)} ms`;
}

function usagePct(used: number, limit: number): number {
  if (!(limit > 0) || !Number.isFinite(used)) return 0;
  return Math.max(0, (used / limit) * 100);
}

type MeterTone = "lime" | "warn" | "hot";

function meterTone(pct: number): MeterTone {
  if (pct >= 95) return "hot";
  if (pct >= 80) return "warn";
  return "lime";
}

function meterFillClass(tone: MeterTone): string {
  if (tone === "hot") return "bg-coral";
  if (tone === "warn") return "bg-coral/70";
  return "bg-lime";
}

function meterTextClass(tone: MeterTone): string {
  if (tone === "hot") return "text-coral";
  if (tone === "warn") return "text-coral/90";
  return "text-lime";
}

function LimitMeter({
  label,
  used,
  limit,
  usedLabel,
  limitLabel,
  helper,
  unitHint,
}: {
  label: string;
  used: number | null;
  limit: number;
  usedLabel?: string;
  limitLabel?: string;
  helper?: string;
  unitHint?: string;
}) {
  const ready = used != null && Number.isFinite(used) && limit > 0;
  const pct = ready ? usagePct(used, limit) : 0;
  const tone = meterTone(pct);
  const usedText = usedLabel ?? (ready ? formatNum(used) : "—");
  const limitText = limitLabel ?? formatNum(limit);
  const pctText = ready ? `${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%` : "—";
  const width = ready ? Math.min(100, pct) : 0;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm text-white/90">{label}</p>
        <p
          className={`font-display text-sm tracking-wide tabular-nums ${
            ready ? meterTextClass(tone) : "text-muted"
          }`}
        >
          {usedText} / {limitText}
          {unitHint ? ` ${unitHint}` : ""}
          <span className="ml-1.5 text-xs font-normal text-muted">· {pctText}</span>
        </p>
      </div>
      <div
        className="mt-2 h-2.5 overflow-hidden rounded-brand bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={ready ? used : undefined}
        aria-label={label}
      >
        <div
          className={`h-full rounded-brand transition-[width] duration-500 ease-out ${meterFillClass(tone)}`}
          style={{ width: `${width}%` }}
        />
      </div>
      {helper ? <p className="mt-2 text-xs text-muted">{helper}</p> : null}
    </div>
  );
}

function StatusChip({
  ok,
  okLabel = "Connected",
  missLabel = "Missing secrets",
}: {
  ok: boolean;
  okLabel?: string;
  missLabel?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-brand border px-2 py-0.5 text-[11px] font-medium tracking-wide ${
        ok
          ? "border-lime/40 bg-lime/10 text-lime"
          : "border-white/20 bg-white/5 text-muted"
      }`}
    >
      {ok ? okLabel : missLabel}
    </span>
  );
}

function SectionHead({
  title,
  subtitle,
  chip,
  link,
}: {
  title: string;
  subtitle?: string;
  chip?: ReactNode;
  link?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg tracking-wide text-white">{title}</h2>
          {chip}
        </div>
        {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
      </div>
      {link}
    </div>
  );
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
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-white/10 py-2.5 last:border-b-0">
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

function PlanBadge({ plan }: { plan: string | null }) {
  const key = (plan ?? "other").toLowerCase();
  const label = PLAN_LABELS[key] ?? plan ?? "—";
  const founding = key === "founding_pro";
  const proish = key === "pro" || founding || key === "community";
  return (
    <span
      className={`inline-flex rounded-brand border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        founding
          ? "border-coral/60 text-coral"
          : proish
            ? "border-lime/50 text-lime"
            : "border-white/20 text-white/80"
      }`}
    >
      {label}
    </span>
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

  const cf24hTotal =
    cf?.windows && cf.workerNames.length
      ? cf.workerNames.reduce(
          (sum, name) => sum + (cf.windows!["24h"][name]?.requests ?? 0),
          0,
        )
      : null;

  const sbMb =
    sb?.databaseBytes != null
      ? sb.databaseBytes / (1024 * 1024)
      : sb?.databasePretty
        ? Number.parseFloat(sb.databasePretty)
        : null;
  const sbMbReady = sbMb != null && Number.isFinite(sbMb);

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
            Product counts plus Cloudflare / Supabase free-tier headroom for
            dogfood. Bars use usage ÷ reference — verify limits in each
            dashboard.
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

      {error && !data ? (
        <p className="mt-6 text-sm text-coral">Failed to load: {error}</p>
      ) : null}

      {/* A. Product */}
      <section className="mt-10">
        <SectionHead
          title="Product"
          subtitle={`Always from Supabase service role${data?.cached ? " · cached briefly" : ""}.`}
        />

        {data?.productError ? (
          <p className="mt-3 text-sm text-coral">{data.productError}</p>
        ) : null}
        {product?.schemaHints?.length ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-coral/90">
            {product.schemaHints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        ) : null}

        {!product && loading ? (
          <p className="mt-4 text-sm text-muted">Loading…</p>
        ) : product && !product.error ? (
          <div className="mt-4">
            <LimitMeter
              label="Founding seats"
              used={product.foundingSeatsUsed}
              limit={product.foundingSeatCap}
              helper="Path B Founding Pro seat cap — when full, new Founding checkouts stop."
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="border-t border-white/10 pt-3 sm:border-t-0 sm:border-l-0 sm:pt-0">
                <p className="text-[11px] uppercase tracking-wider text-muted">
                  Active servers
                </p>
                <p className="mt-1 font-display text-2xl tabular-nums text-white">
                  {formatNum(product.activeServers)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {formatNum(product.archivedServers)} archived
                </p>
              </div>
              <div className="border-t border-white/10 pt-3 sm:border-t-0 sm:border-l sm:border-white/10 sm:pl-4 sm:pt-0">
                <p className="text-[11px] uppercase tracking-wider text-muted">
                  Open parties
                </p>
                <p className="mt-1 font-display text-2xl tabular-nums text-white">
                  {formatNum(product.openPartiesGlobal)}
                </p>
                <p className="mt-1 text-xs text-muted">global · open|filled</p>
              </div>
              <div className="border-t border-white/10 pt-3 sm:border-t-0 sm:border-l sm:border-white/10 sm:pl-4 sm:pt-0">
                <p className="text-[11px] uppercase tracking-wider text-muted">
                  Feedback backlog
                </p>
                <p className="mt-1 font-display text-2xl tabular-nums text-white">
                  {formatNum(product.feedbackNew)}
                  <span className="text-base text-muted"> new</span>
                </p>
                <p className="mt-1 text-xs text-muted">
                  {formatNum(product.feedbackTriaging)} triaging
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-[11px] uppercase tracking-wider text-muted">
                Servers by plan
              </p>
              <div className="mt-1">
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
                  label="Trial consumers"
                  value={formatNum(product.trialConsumers)}
                  hint="trial_consumers rows"
                />
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* Single-server drill */}
      <section className="mt-12">
        <SectionHead
          title="Single server"
          subtitle={`Dogfood one guild — default Official ${OFFICIAL_RALLIED_GUILD_ID}.`}
        />

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

        {data?.drillError ? (
          <p className="mt-3 text-sm text-coral">{data.drillError}</p>
        ) : null}
        {drill?.schemaHints?.length ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-coral/90">
            {drill.schemaHints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        ) : null}

        {drill ? (
          <div className="mt-5">
            {!drill.found ? (
              <p className="text-sm text-coral">
                No servers row for{" "}
                <code className="text-white/80">{drill.discord_guild_id}</code>.
              </p>
            ) : (
              <div className="border border-white/10 bg-slate-elevated/40 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-xl tracking-wide text-white">
                    {drill.name || "Unnamed server"}
                  </h3>
                  <PlanBadge plan={drill.plan} />
                  {drill.forever_pro ? (
                    <span className="rounded-brand border border-lime/40 bg-lime/10 px-2 py-0.5 text-[11px] font-medium text-lime">
                      forever_pro
                    </span>
                  ) : null}
                  {drill.archived_at ? (
                    <span className="rounded-brand border border-coral/40 px-2 py-0.5 text-[11px] text-coral">
                      archived {new Date(drill.archived_at).toLocaleDateString()}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 font-mono text-[11px] text-muted">
                  {drill.discord_guild_id}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted">
                      Members
                    </p>
                    <p className="mt-1 font-display text-xl tabular-nums text-white">
                      {formatNum(drill.memberCount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted">
                      Open parties
                    </p>
                    <p className="mt-1 font-display text-xl tabular-nums text-white">
                      {formatNum(drill.openParties)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted">
                      Creates / 24h
                    </p>
                    <p className="mt-1 font-display text-xl tabular-nums text-white">
                      {formatNum(drill.createsLast24h)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted">
                      Feedback
                    </p>
                    <p className="mt-1 font-display text-xl tabular-nums text-white">
                      {formatNum(drill.feedbackNew)}
                      <span className="text-sm text-muted"> new</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatNum(drill.feedbackTriaging)} triaging ·{" "}
                      {formatNum(drill.feedbackTotal)} total
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs text-muted">
                  trial_consumed_at:{" "}
                  <span className="text-white/80">
                    {drill.trial_consumed_at
                      ? new Date(drill.trial_consumed_at).toLocaleString()
                      : "—"}
                  </span>
                </p>
              </div>
            )}
          </div>
        ) : null}
      </section>

      {/* B. Cloudflare */}
      <section className="mt-12">
        <SectionHead
          title="Cloudflare"
          subtitle={`Free plan reference: ${formatNum(CF_FREE_TIER_REF.requestsPerDay)} req/day account-wide · ${CF_FREE_TIER_REF.cpuMsPerInvocation} ms CPU/invocation — verify in dashboard.`}
          chip={
            cf ? (
              <StatusChip
                ok={cf.configured && !cf.error}
                missLabel={
                  cf.configured && cf.error ? "Fetch error" : "Missing secrets"
                }
              />
            ) : null
          }
          link={
            <a
              href={
                data?.links.cloudflareDashboard ?? CF_FREE_TIER_REF.dashboardUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-coral hover:underline"
            >
              CF dashboard ↗
            </a>
          }
        />

        {cf && !cf.configured ? (
          <div className="mt-4 border border-white/10 bg-slate-elevated/60 px-4 py-3 text-sm text-muted">
            <p className="text-white/90">Connect Cloudflare</p>
            <p className="mt-1">{cf.setupHint}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs">
              <li>
                CF dashboard → My Profile → API Tokens → Create Token → use
                template{" "}
                <strong className="font-normal text-white/80">
                  Account Analytics Read
                </strong>{" "}
                (or custom: Account → Account Analytics → Read; Workers →
                Analytics → Read).
              </li>
              <li>
                Account ID: Workers overview right sidebar, or any Worker → copy
                Account ID.
              </li>
              <li>
                Encrypt on <code className="text-white/70">rallied</code>:{" "}
                <code className="text-white/70">CF_API_TOKEN</code>,{" "}
                <code className="text-white/70">CF_ACCOUNT_ID</code>, optional{" "}
                <code className="text-white/70">CF_WORKER_NAMES</code>.
              </li>
              <li>Redeploy rallied.</li>
            </ol>
          </div>
        ) : null}

        {cf?.error ? (
          <p className="mt-3 text-sm text-coral">CF fetch error: {cf.error}</p>
        ) : null}

        {cf?.windows ? (
          <div className="mt-2">
            <LimitMeter
              label="Free-tier requests (24h, account-wide)"
              used={cf24hTotal}
              limit={CF_FREE_TIER_REF.requestsPerDay}
              usedLabel={formatNum(cf24hTotal)}
              helper="Near the daily cap? Upgrade Cloudflare Workers paid — Free is account-wide across all Workers."
            />
            <p className="mt-1 text-[11px] text-muted">
              Combined 24h requests from{" "}
              {cf.workerNames.map((n, i) => (
                <span key={n}>
                  {i > 0 ? " + " : ""}
                  <code className="text-white/70">{n}</code>
                </span>
              ))}
              .
            </p>

            <p className="mt-6 text-[11px] uppercase tracking-wider text-muted">
              Per-worker breakdown
            </p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/15 text-xs text-muted">
                    <th className="py-2 pr-3 font-normal">Worker</th>
                    <th className="py-2 pr-3 font-normal">24h req</th>
                    <th className="py-2 pr-3 font-normal">7d</th>
                    <th className="py-2 pr-3 font-normal">30d</th>
                    <th className="py-2 pr-3 font-normal">24h err</th>
                    <th className="py-2 font-normal">CPU p50 / p99</th>
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
                            ? `${formatCpuMs(a.cpuTimeP50Ms)} / ${formatCpuMs(a.cpuTimeP99Ms)}`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      {/* C. Supabase */}
      <section className="mt-12 pb-12">
        <SectionHead
          title="Supabase"
          subtitle={`Free plan reference: ~${SUPABASE_FREE_TIER_REF.databaseMb} MB database — verify in dashboard. Source: ${sb?.source ?? "—"}.`}
          chip={
            sb ? (
              <StatusChip
                ok={
                  sb.source === "management_api" ||
                  sb.source === "rpc" ||
                  (sb.databaseBytes != null && !sb.error)
                }
                okLabel={
                  sb.source === "management_api"
                    ? "Connected"
                    : sb.source === "rpc"
                      ? "RPC sizes"
                      : sb.source === "row_counts"
                        ? "Row counts only"
                        : "Connected"
                }
                missLabel="Missing secrets"
              />
            ) : null
          }
          link={
            <a
              href={
                data?.links.supabaseDashboard ??
                SUPABASE_FREE_TIER_REF.dashboardUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-coral hover:underline"
            >
              Supabase dashboard ↗
            </a>
          }
        />

        {sb?.setupHint &&
        sb.source !== "management_api" &&
        sb.source !== "rpc" ? (
          <div className="mt-4 border border-white/10 bg-slate-elevated/60 px-4 py-3 text-sm text-muted">
            <p className="text-white/90">Optional Management API</p>
            <p className="mt-1">{sb.setupHint}</p>
          </div>
        ) : null}

        {sb?.error ? (
          <p className="mt-3 text-sm text-coral">
            Supabase size note: {sb.error}
          </p>
        ) : null}

        {sb ? (
          <div className="mt-2">
            <LimitMeter
              label="Database size (Free ref)"
              used={sbMbReady ? sbMb : null}
              limit={SUPABASE_FREE_TIER_REF.databaseMb}
              usedLabel={
                sb.databasePretty ??
                (sbMbReady ? `${sbMb.toFixed(1)} MB` : "—")
              }
              limitLabel={`${SUPABASE_FREE_TIER_REF.databaseMb} MB`}
              helper="Approaching ~500 MB? Upgrade the Supabase project plan before Free DB size throttles you."
            />

            {sb.tables.length > 0 ? (
              <>
                <p className="mt-6 text-[11px] uppercase tracking-wider text-muted">
                  Larger tables
                </p>
                <div className="mt-1">
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
              </>
            ) : null}
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
