/**
 * MVP schedule parsing for LFG create (modal / slash).
 * Accepts: blank, "in 30m", "in 1h", "in 2 hours", ISO, or "YYYY-MM-DD HH:MM" (UTC).
 */

const RELATIVE =
  /^in\s+(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)$/i;

const YMD_HM = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/;

export function parseScheduleStart(
  raw: string,
  now = new Date(),
): { ok: true; at: Date | null } | { ok: false; error: string } {
  const text = raw.trim();
  if (!text) return { ok: true, at: null };

  const rel = RELATIVE.exec(text);
  if (rel) {
    const n = Number(rel[1]);
    if (!Number.isFinite(n) || n <= 0) {
      return {
        ok: false,
        error: "Start time must be a positive duration (e.g. in 30m).",
      };
    }
    const unit = rel[2].toLowerCase();
    const ms = unit.startsWith("h") ? n * 3_600_000 : n * 60_000;
    if (ms > 7 * 24 * 3_600_000) {
      return { ok: false, error: "Start time must be within 7 days." };
    }
    return { ok: true, at: new Date(now.getTime() + ms) };
  }

  const ymd = YMD_HM.exec(text);
  if (ymd) {
    const iso = `${ymd[1]}-${ymd[2]}-${ymd[3]}T${ymd[4].padStart(2, "0")}:${ymd[5]}:${ymd[6] ?? "00"}Z`;
    const at = new Date(iso);
    return validateFuture(at, now);
  }

  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) {
    return {
      ok: false,
      error:
        "Could not parse start time. Try `in 30m`, `in 1h`, or `YYYY-MM-DD HH:MM` (UTC).",
    };
  }
  return validateFuture(new Date(parsed), now);
}

function validateFuture(
  at: Date,
  now: Date,
): { ok: true; at: Date } | { ok: false; error: string } {
  if (Number.isNaN(at.getTime())) {
    return { ok: false, error: "Could not parse start time." };
  }
  if (at.getTime() < now.getTime() - 60_000) {
    return { ok: false, error: "Start time is in the past." };
  }
  if (at.getTime() > now.getTime() + 7 * 24 * 3_600_000) {
    return { ok: false, error: "Start time must be within 7 days." };
  }
  return { ok: true, at };
}

/** Discord relative timestamp markdown. */
export function discordTimestamp(iso: string): string {
  const unix = Math.floor(new Date(iso).getTime() / 1000);
  return `<t:${unix}:R> (<t:${unix}:f>)`;
}
