import { DiscordBotAvatar } from "./DiscordBotAvatar";
import { GhostlessMark } from "./GhostlessMark";

/** Static CSS/React mocks for landing feature previews — not interactive. */

export function LfgPartyEmbedMock() {
  return (
    <div
      className="feature-mock mt-5 overflow-hidden rounded-brand border border-white/12 bg-[#1e1f22]"
      aria-hidden
    >
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
        <DiscordBotAvatar className="h-8 w-8" />
        <span className="text-xs font-semibold text-white/90">Rallied</span>
        <span className="rounded bg-white/10 px-1 py-px text-[9px] uppercase tracking-wide text-white/50">
          Bot
        </span>
        <span className="text-[10px] text-white/35">Today at 7:42 PM</span>
      </div>
      <div className="flex">
        <div className="w-1 shrink-0 bg-coral" />
        <div className="min-w-0 flex-1 px-3 py-2.5">
          <p className="text-sm font-semibold text-white">LFG · Valorant</p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/55">
            Tap Join, then coordinate in the squad thread.
          </p>
          <div className="mt-2.5 grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <p className="font-semibold text-white/45">Notes</p>
              <p className="text-white/80">Diamond+</p>
            </div>
            <div>
              <p className="font-semibold text-white/45">Slots</p>
              <p className="tabular-nums text-white/80">2/5</p>
            </div>
            <div>
              <p className="font-semibold text-white/45">Ghostless</p>
              <p className="text-lime">94%</p>
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-[11px] font-semibold text-white/45">Squad</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-white/75">
              @Nova (host)
              <br />
              @Kai
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded bg-[#248046] px-2.5 py-1 text-[11px] font-medium text-white">
              Join
            </span>
            <span className="rounded bg-[#4e5058] px-2.5 py-1 text-[11px] font-medium text-white/90">
              Leave
            </span>
            <span className="rounded bg-[#da373c] px-2.5 py-1 text-[11px] font-medium text-white">
              Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReadyCheckMock() {
  return (
    <div
      className="feature-mock mt-5 overflow-hidden rounded-brand border border-white/12 bg-slate-elevated/80"
      aria-hidden
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <p className="text-xs font-semibold tracking-wide text-white/90">
          Ready check
        </p>
        <p className="rounded-brand border border-coral/40 px-2 py-0.5 text-[10px] font-medium tabular-nums text-coral">
          Grace 0:42
        </p>
      </div>
      <ul className="space-y-1.5 px-3 py-2.5">
        {[
          { name: "Nova", state: "ready" as const },
          { name: "Kai", state: "ready" as const },
          { name: "Rin", state: "waiting" as const },
          { name: "Ash", state: "ready" as const },
        ].map((row) => (
          <li
            key={row.name}
            className="flex items-center justify-between gap-2 text-[11px]"
          >
            <span className="flex items-center gap-2 text-white/85">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-black/35 font-display text-[9px] text-coral">
                {row.name.slice(0, 1)}
              </span>
              {row.name}
            </span>
            {row.state === "ready" ? (
              <span className="inline-flex items-center gap-1 text-lime">
                <CheckMark className="h-3 w-3" />
                Ready
              </span>
            ) : (
              <span className="text-white/45">Waiting…</span>
            )}
          </li>
        ))}
      </ul>
      <div className="border-t border-white/10 px-3 py-2">
        <div className="h-1 overflow-hidden rounded bg-white/10">
          <div className="h-full w-[62%] rounded bg-coral/80" />
        </div>
        <p className="mt-1.5 text-[10px] text-white/45">
          3/4 ready · auto-strike after grace
        </p>
      </div>
    </div>
  );
}

/** Ghostless badge card — used in Ghostless explainer only (not Vibe Check). */
export function GhostlessBadgeMock() {
  return (
    <div
      className="feature-mock mt-5 overflow-hidden rounded-brand border border-white/12 bg-slate-elevated/80"
      aria-hidden
    >
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-brand bg-black/40 font-display text-sm text-coral">
          N
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base tracking-wide text-white">
            Nova
          </p>
          <p className="text-[11px] text-white/55">
            This server · 28 shows · 1 ghost
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-brand border border-lime/60 bg-lime/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-lime">
          <GhostlessMark size="sm" />
          Ghostless
        </span>
      </div>
      <div className="flex items-center justify-between border-t border-white/10 px-3 py-2 text-[11px]">
        <span className="text-white/55">Show rate</span>
        <span className="font-semibold tabular-nums text-lime">96%</span>
      </div>
    </div>
  );
}

/** @deprecated Prefer GhostlessBadgeMock — kept as alias for older imports. */
export const VibeCheckCardMock = GhostlessBadgeMock;

/** Compact post-session Vibe Check (Showed up / Ghosted / Dispute) — matches bot. */
export function VibeCheckActionsMock() {
  return (
    <div
      className="feature-mock mt-5 overflow-hidden rounded-brand border border-white/12 bg-[#2b2d31]"
      aria-hidden
    >
      <p className="px-3 py-2.5 text-[12px] leading-snug text-white/85">
        <strong className="text-white">Vibe Check</strong> for @Kai — how did
        they do? (this server)
      </p>
      <div className="border-t border-white/8 px-3 py-2">
        <p className="text-[11px] text-white/55">
          Tap a quick result, or pick a vibe score 1–5. Grace window applies
          before ghost strikes.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="rounded bg-[#248046] px-2.5 py-1 text-[11px] font-medium text-white">
            Showed up
          </span>
          <span className="rounded bg-[#da373c] px-2.5 py-1 text-[11px] font-medium text-white">
            Ghosted
          </span>
          <span className="rounded bg-[#4e5058] px-2.5 py-1 text-[11px] font-medium text-white/90">
            Dispute
          </span>
        </div>
        <div className="mt-2 rounded border border-white/15 bg-[#1e1f22] px-2.5 py-2 text-[11px] text-white/45">
          Rate vibe 1–5 (counts as showed up)
        </div>
      </div>
    </div>
  );
}

function CheckMark({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path
        d="M3.4 8.2 6.6 11.3 12.6 4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TierCheck({ accent = "lime" }: { accent?: "lime" | "coral" }) {
  return (
    <span
      className={`mt-0.5 inline-flex shrink-0 ${
        accent === "coral" ? "text-coral" : "text-lime"
      }`}
      aria-hidden
    >
      <CheckMark />
    </span>
  );
}
