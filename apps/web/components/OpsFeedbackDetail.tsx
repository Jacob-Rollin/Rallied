"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  FEEDBACK_STATUSES,
  type FeedbackReport,
  type FeedbackStatus,
} from "@rallied/shared";

const STATUS_STYLE: Record<FeedbackStatus, string> = {
  new: "border-lime/40 text-lime",
  triaging: "border-coral/40 text-coral",
  done: "border-muted/40 text-muted",
  wontfix: "border-white/20 text-white/50",
};

type Props = { report: FeedbackReport };

export function OpsFeedbackDetail({ report: initial }: Props) {
  const router = useRouter();
  const [report, setReport] = useState(initial);
  const [status, setStatus] = useState<FeedbackStatus>(initial.status);
  const [note, setNote] = useState(initial.internal_note ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/ops/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: report.id,
          status,
          internal_note: note,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
        report?: FeedbackReport;
      };
      if (!res.ok) {
        setErr(
          json.error
            ? `${json.error}${json.hint ? ` — ${json.hint}` : ""}`
            : `Save failed (${res.status})`,
        );
        return;
      }
      if (json.report) {
        setReport(json.report);
        setStatus(json.report.status);
        setNote(json.report.internal_note ?? "");
      }
      setMsg("Saved.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/ops"
        className="text-sm text-muted hover:text-coral"
      >
        ← Inbox
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-xs tracking-[0.14em] text-coral">
            {report.kind === "bug" ? "BUG" : "SUGGESTION"} · {report.surface}
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-wide text-white">
            {report.title}
          </h1>
          <p className="mt-2 text-xs text-muted">
            {new Date(report.created_at).toLocaleString()} ·{" "}
            {report.reporter_display_name || "unknown"} (
            <code className="text-white/60">{report.reporter_discord_user_id}</code>
            )
            {report.guild_name || report.discord_guild_id
              ? ` · ${report.guild_name || report.discord_guild_id}`
              : ""}
          </p>
        </div>
        <span
          className={`rounded-brand border px-2 py-1 text-xs uppercase tracking-wide ${STATUS_STYLE[report.status]}`}
        >
          {report.status}
        </span>
      </div>

      <div className="mt-6 border-t border-white/10 pt-6">
        <h2 className="text-sm font-semibold text-white/90">Details</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/75">
          {report.details || "—"}
        </p>
      </div>

      <div className="mt-8 space-y-4 border-t border-white/10 pt-6">
        <label className="block text-sm">
          <span className="text-muted">Status</span>
          <select
            className="mt-1 w-full max-w-xs rounded-brand border border-white/15 bg-slate-elevated px-3 py-2 text-white"
            value={status}
            onChange={(e) => setStatus(e.target.value as FeedbackStatus)}
            disabled={busy}
          >
            {FEEDBACK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-muted">Internal note (ops only)</span>
          <textarea
            className="mt-1 min-h-[100px] w-full rounded-brand border border-white/15 bg-slate-elevated px-3 py-2 text-white"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={4000}
            disabled={busy}
            placeholder="Triage notes…"
          />
        </label>

        {err ? (
          <p className="text-sm text-coral" role="alert">
            {err}
          </p>
        ) : null}
        {msg ? (
          <p className="text-sm text-lime" role="status">
            {msg}
          </p>
        ) : null}

        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-brand bg-coral px-4 py-2 text-sm font-semibold text-slate disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>

      <p className="mt-8 text-xs text-muted">
        id <code className="text-white/50">{report.id}</code>
      </p>
    </div>
  );
}
