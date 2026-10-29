import { GhostlessMark } from "./GhostlessMark";
import {
  BotChrome,
  ButtonRow,
  DiscBtn,
  EmbedDesc,
  EmbedField,
  EmbedFields,
  EmbedFooter,
  EmbedShell,
  EmbedTitle,
  ThreadRow,
} from "./DiscordMockChrome";

/** Static CSS/React mocks for landing feature previews — Discord-fidelity chrome. */

export function LfgPartyEmbedMock() {
  return (
    <div className="mt-5" aria-hidden>
      <BotChrome>
        <EmbedShell accent="coral">
          <EmbedTitle>LFG · Valorant</EmbedTitle>
          <EmbedDesc>
            Tap Join, then hop into voice / the squad thread.
          </EmbedDesc>
          <EmbedFields>
            <EmbedField name="Rank" inline>
              Diamond+
            </EmbedField>
            <EmbedField name="Mic" inline>
              Required
            </EmbedField>
            <EmbedField name="Region" inline>
              NA
            </EmbedField>
            <EmbedField name="Slots" inline>
              <span className="tabular-nums">2/5</span>
            </EmbedField>
            <EmbedField name="Ghostless" inline>
              <span className="text-lime">☑ 94%</span>
            </EmbedField>
            <EmbedField name="Starts" inline>
              <span className="tabular-nums">in 30m</span>
            </EmbedField>
            <EmbedField name="Squad">
              @Nova (host)
              <br />
              @Kai
            </EmbedField>
            <EmbedField name="Voice">
              #LFG · Valorant — tap Join VC
            </EmbedField>
            <EmbedField name="Squad chat">
              #Squad · Valorant — hop in to share codes
            </EmbedField>
          </EmbedFields>
          <EmbedFooter
            text="Rallied · this server only · a1b2c3d4"
            time="7:42 PM"
          />
        </EmbedShell>
        <ButtonRow>
          <DiscBtn label="Join" tone="green" />
          <DiscBtn label="Leave" tone="gray" />
          <DiscBtn label="Close" tone="red" />
        </ButtonRow>
        <ButtonRow>
          <DiscBtn label="Ready Check" tone="blurple" />
          <DiscBtn label="Vibe Check" tone="gray" />
          <DiscBtn label="Join VC" tone="green" />
        </ButtonRow>
        <ThreadRow label="Squad · Valorant" />
      </BotChrome>
    </div>
  );
}

export function ReadyCheckMock() {
  return (
    <div className="mt-5" aria-hidden>
      <BotChrome time="Today at 7:48 PM">
        <EmbedShell accent="lime">
          <EmbedTitle>Ready check · Valorant</EmbedTitle>
          <EmbedDesc>
            Tap Ready before grace ends in 0:42. No-shows get a strike after
            grace (this server).
          </EmbedDesc>
          <EmbedFields>
            <EmbedField name="Roster">
              <ul className="space-y-0.5">
                <li>✅ Ready — @Nova (host)</li>
                <li>✅ Ready — @Kai</li>
                <li>⏳ Waiting… — @Rin</li>
                <li>✅ Ready — @Ash</li>
              </ul>
            </EmbedField>
            <EmbedField name="Progress">
              3/4 ready · auto-strike after grace
            </EmbedField>
            <EmbedField name="Grace" inline>
              <span className="tabular-nums text-coral">in 0:42 (7:53 PM)</span>
            </EmbedField>
          </EmbedFields>
          <EmbedFooter text="Rallied · a1b2c3d4" time="7:48 PM" />
        </EmbedShell>
        <ButtonRow>
          <DiscBtn label="Ready" tone="green" />
          <DiscBtn label="Vibe Check" tone="gray" />
        </ButtonRow>
      </BotChrome>
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

/** Compact post-session Vibe Check (Showed up / Ghosted) — matches bot. */
export function VibeCheckActionsMock() {
  return (
    <div className="mt-5" aria-hidden>
      <BotChrome>
        <p className="text-[14px] leading-snug text-[#dbdee1]">
          <strong className="text-[#f2f3f5]">Vibe Check</strong> for @Kai — how
          did they do? (this server)
        </p>
        <EmbedShell accent="lime">
          <EmbedDesc>
            Tap a quick result, or pick a vibe score 1–5. After grace, Ghosted
            issues a strike. Dispute is for the flagged player.
          </EmbedDesc>
        </EmbedShell>
        <ButtonRow>
          <DiscBtn label="Showed up" tone="green" />
          <DiscBtn label="Ghosted" tone="red" />
        </ButtonRow>
        <div className="mt-1.5 rounded border border-[#1e1f22] bg-[#1e1f22] px-2.5 py-2 text-[12px] text-[#949ba4]">
          Rate vibe 1–5 (optional score)
        </div>
      </BotChrome>
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
