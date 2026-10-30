/** Build a text/calendar body for upcoming scheduled LFG parties. */

export type IcalParty = {
  id: string;
  game: string;
  rank_text?: string | null;
  region?: string | null;
  mic?: string | null;
  slots: number;
  scheduled_start_at: string;
  status: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** UTC stamp for DTSTAMP / DTSTART (YYYYMMDDTHHMMSSZ). */
export function icalUtcStamp(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (!Number.isFinite(d.getTime())) return "";
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold long lines per RFC 5545 (§3.1). */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join("\r\n");
}

export function randomIcalToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildIcalFeed(opts: {
  guildId: string;
  serverName: string;
  parties: IcalParty[];
  now?: Date;
}): string {
  const now = opts.now ?? new Date();
  const stamp = icalUtcStamp(now);
  const calName = escapeText(`${opts.serverName} — Rallied parties`);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rallied//LFG Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldLine(`X-WR-CALNAME:${calName}`),
  ];

  for (const party of opts.parties) {
    const start = icalUtcStamp(party.scheduled_start_at);
    if (!start) continue;
    const endDate = new Date(party.scheduled_start_at);
    endDate.setUTCHours(endDate.getUTCHours() + 2);
    const end = icalUtcStamp(endDate);
    const summary = escapeText(
      `${party.game}${party.rank_text ? ` · ${party.rank_text}` : ""}`,
    );
    const descParts = [
      `Rallied LFG party (${party.status})`,
      party.region ? `Region: ${party.region}` : null,
      party.mic ? `Mic: ${party.mic}` : null,
      `Slots: ${party.slots}`,
      "This server only — not a third-party calendar product.",
    ].filter(Boolean) as string[];
    const description = escapeText(descParts.join("\n"));
    const uid = `party-${party.id}@rallied.gg`;

    lines.push("BEGIN:VEVENT");
    lines.push(foldLine(`UID:${uid}`));
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART:${start}`);
    lines.push(`DTEND:${end}`);
    lines.push(foldLine(`SUMMARY:${summary}`));
    lines.push(foldLine(`DESCRIPTION:${description}`));
    lines.push(
      foldLine(
        `URL:https://discord.com/channels/${opts.guildId}`,
      ),
    );
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
