"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FEEDBACK_KINDS, type FeedbackKind } from "@rallied/shared";

type Props = {
  open: boolean;
  onClose: () => void;
  discordGuildId?: string;
  guildName?: string;
};

/** iOS Safari zooms inputs under 16px; keep 16px on small screens. */
const fieldClass =
  "mt-1 w-full rounded-brand border border-white/15 bg-slate px-3 py-2 text-base text-white placeholder:text-muted/60 sm:text-sm";

function blurActiveField() {
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
}

export function ReportFeedbackModal({
  open,
  onClose,
  discordGuildId,
  guildName,
}: Props) {
  const titleId = useId();
  const firstFieldRef = useRef<HTMLSelectElement>(null);
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function dismiss() {
    blurActiveField();
    onClose();
  }

  useEffect(() => {
    if (!open) {
      blurActiveField();
      return;
    }
    setKind("bug");
    setTitle("");
    setDetails("");
    setErr(null);
    setOk(null);
    setBusy(false);
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) {
        blurActiveField();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          surface: "web",
          title: title.trim(),
          details: details.trim(),
          discordGuildId: discordGuildId || null,
          guildName: guildName || null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
        ok?: boolean;
        id?: string;
      };
      if (!res.ok) {
        setErr(
          json.error
            ? `${json.error}${json.hint ? ` — ${json.hint}` : ""}`
            : `Submit failed (${res.status})`,
        );
        return;
      }
      setOk("Thanks — report sent to the Rallied team.");
      setTitle("");
      setDetails("");
      window.setTimeout(() => dismiss(), 900);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="presentation"
      onClick={() => {
        if (!busy) dismiss();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md border border-white/15 bg-slate-elevated shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-white/10 px-4 py-3 sm:px-5">
          <h2
            id={titleId}
            className="font-display text-xl tracking-wide text-white"
          >
            Report
          </h2>
          <p className="mt-1 text-xs text-muted">
            Bug or suggestion for the Rallied team
            {guildName ? (
              <>
                {" "}
                · context:{" "}
                <span className="text-white/70">{guildName}</span>
              </>
            ) : null}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 px-4 py-4 sm:px-5">
          <label className="block text-sm">
            <span className="text-muted">Type</span>
            <select
              ref={firstFieldRef}
              className={fieldClass}
              value={kind}
              onChange={(e) => setKind(e.target.value as FeedbackKind)}
              disabled={busy}
            >
              {FEEDBACK_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k === "bug" ? "Bug" : "Suggestion"}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-muted">Title</span>
            <input
              className={fieldClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
              disabled={busy}
              placeholder="Short summary"
            />
          </label>

          <label className="block text-sm">
            <span className="text-muted">Details</span>
            <textarea
              className={`${fieldClass} min-h-[120px]`}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={4000}
              required
              disabled={busy}
              placeholder="What happened, steps to reproduce, or your idea"
            />
          </label>

          {err ? (
            <p className="text-sm text-coral" role="alert">
              {err}
            </p>
          ) : null}
          {ok ? (
            <p className="text-sm text-lime" role="status">
              {ok}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={dismiss}
              disabled={busy}
              className="rounded-brand border border-white/20 px-4 py-2 text-sm text-white/80 hover:border-white/40 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !title.trim() || !details.trim()}
              className="rounded-brand bg-coral px-4 py-2 text-sm font-semibold text-slate disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
