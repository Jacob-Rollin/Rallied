/**
 * Turn thrown values (Error, PostgREST `{message,code,details,hint}`, strings)
 * into a short string safe for Discord ephemeral replies and logs.
 */
export function formatError(err: unknown): string {
  if (err instanceof Error) {
    return err.message || err.name || "unknown error";
  }
  if (typeof err === "string") {
    return err.trim() || "unknown error";
  }
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof o.message === "string" && o.message.trim()) {
      parts.push(o.message.trim());
    }
    if (typeof o.code === "string" && o.code.trim()) {
      parts.push(`code=${o.code.trim()}`);
    }
    if (typeof o.details === "string" && o.details.trim()) {
      parts.push(o.details.trim());
    }
    if (typeof o.hint === "string" && o.hint.trim()) {
      parts.push(`hint: ${o.hint.trim()}`);
    }
    if (parts.length > 0) return parts.join(" | ");
    try {
      const json = JSON.stringify(err);
      if (json && json !== "{}") return json;
    } catch {
      // ignore circular / non-serializable
    }
  }
  return "unknown error";
}

/** Always throw a real Error so catch sites can rely on instanceof / formatError. */
export function errorFromUnknown(label: string, err: unknown): Error {
  const detail = formatError(err);
  if (detail === "unknown error") {
    return new Error(label);
  }
  return new Error(`${label}: ${detail}`);
}
