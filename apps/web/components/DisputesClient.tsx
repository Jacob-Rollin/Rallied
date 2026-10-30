"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reliabilityEnabled, type DisputeStatus } from "@rallied/shared";

export type DisputeRow = {
  id: string;
  opener_name: string;
  subject: string;
  notes: string | null;
  status: DisputeStatus;
};

type Props = {
  discordGuildId: string;
  plan: string;
  source: string;
  open: DisputeRow[];
  closed: DisputeRow[];
};

const STATUS_STYLE: Record<string, string> = {
  open: "border-lime/40 text-lime",
  upheld: "border-coral/40 text-coral",
  overturned: "border-muted/40 text-muted",
};

export function DisputesClient({
  discordGuildId,
  plan,
  source,
  open,
  closed,
}: Props) {
  const router = useRouter();
  const canWrite = source === "live" && reliabilityEnabled(plan);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function resolve(disputeId: string, outcome: "upheld" | "overturned") {
    if (!canWrite) return;
    setBusyId(disputeId);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/disputes/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discordGuildId,
          disputeId,
          outcome,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
        ok?: boolean;
        outcome?: string;
      };
      if (!res.ok) {
        setErr(
          json.error
            ? `${json.error}${json.hint ? ` — ${json.hint}` : ""}`
            : `Resolve failed (${res.status})`,
        );
        return;
      }
      setMsg(
        outcome === "overturned"
          ? "Overturned — strike cleared (this server)."
          : "Upheld — strike stays active.",
      );
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Resolve failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      {!reliabilityEnabled(plan) ? (
        <div className="rounded-brand border border-coral/30 bg-coral/5 px-4 py-3 text-sm text-white/85">
          Dispute resolve needs Community (or trial / Pro). Same gate as Discord{" "}
          <code className="text-coral">/dispute resolve</code>.
        </div>
      ) : source !== "live" ? (
        <div className="rounded-brand border border-white/15 bg-slate-elevated/40 px-4 py-3 text-sm text-muted">
          Live guild required to Overturn / Uphold from the web (demo is
          read-only).
        </div>
      ) : (
        <div className="rounded-brand border border-lime/25 bg-lime/5 px-4 py-3 text-sm text-white/85">
          Overturn clears the linked strike (this server). Uphold keeps it.
          Mirrors Discord{" "}
          <code className="text-coral">/dispute resolve</code> — no Stripe.
        </div>
      )}

      {(msg || err) && (
        <p className={`text-sm ${err ? "text-coral" : "text-lime"}`} role="status">
          {err ?? msg}
        </p>
      )}

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
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!canWrite || busyId === d.id}
                    onClick={() => void resolve(d.id, "overturned")}
                    className="rounded-brand border border-lime/40 px-3 py-1.5 text-xs text-lime transition hover:bg-lime/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busyId === d.id ? "…" : "Overturn"}
                  </button>
                  <button
                    type="button"
                    disabled={!canWrite || busyId === d.id}
                    onClick={() => void resolve(d.id, "upheld")}
                    className="rounded-brand border border-coral/40 px-3 py-1.5 text-xs text-coral transition hover:bg-coral/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busyId === d.id ? "…" : "Uphold"}
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
