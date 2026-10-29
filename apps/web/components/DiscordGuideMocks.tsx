import { GhostlessMark } from "./GhostlessMark";

/** Reusable Discord-style chrome for the /guide page — labels match apps/bot embeds. */

function BotChrome({
  children,
  time = "Today at 7:42 PM",
}: {
  children: React.ReactNode;
  time?: string;
}) {
  return (
    <div className="feature-mock overflow-hidden rounded-brand border border-white/12 bg-[#1e1f22]">
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-coral/90 font-display text-[9px] leading-none text-slate">
          R
        </span>
        <span className="text-xs font-semibold text-white/90">Rallied</span>
        <span className="rounded bg-white/10 px-1 py-px text-[9px] uppercase tracking-wide text-white/50">
          Bot
        </span>
        <span className="text-[10px] text-white/35">{time}</span>
      </div>
      {children}
    </div>
  );
}

function EmbedShell({
  accent,
  children,
}: {
  accent: "coral" | "lime" | "gray";
  children: React.ReactNode;
}) {
  const bar =
    accent === "coral"
      ? "bg-coral"
      : accent === "lime"
        ? "bg-lime"
        : "bg-white/35";
  return (
    <div className="flex">
      <div className={`w-1 shrink-0 ${bar}`} />
      <div className="min-w-0 flex-1 px-3 py-2.5">{children}</div>
    </div>
  );
}

function DiscBtn({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "blurple" | "gray" | "red";
}) {
  const cls =
    tone === "green"
      ? "bg-[#248046] text-white"
      : tone === "blurple"
        ? "bg-[#5865f2] text-white"
        : tone === "red"
          ? "bg-[#da373c] text-white"
          : "bg-[#4e5058] text-white/90";
  return (
    <span
      className={`rounded px-2.5 py-1 text-[11px] font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

function ChannelCue({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 font-mono text-[11px] text-white/45">
      <span className="text-white/60">#lfg-board</span> · {children}
    </p>
  );
}

/** 1 — Pinned LFG desk (Create / Find / My parties / How it works). */
export function LfgDeskMock() {
  return (
    <div>
      <ChannelCue>
        After <span className="text-white/70">/setup</span> or{" "}
        <span className="text-white/70">/lfg desk</span> · pin the message
      </ChannelCue>
      <BotChrome>
        <EmbedShell accent="coral">
          <p className="text-sm font-semibold text-white">
            Rallied LFG — find or start a squad
          </p>
          <p className="mt-1 text-[11px] leading-snug text-white/55">
            Tap a button below — no slash commands needed. Parties stay{" "}
            <strong className="font-semibold text-white/70">in this server</strong>{" "}
            only.
          </p>
          <p className="mt-3 text-[10px] text-white/35">
            Rallied · pin this message in your LFG channel
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <DiscBtn label="Create party" tone="green" />
            <DiscBtn label="Find party" tone="blurple" />
            <DiscBtn label="My parties" tone="gray" />
            <DiscBtn label="How it works" tone="gray" />
          </div>
        </EmbedShell>
      </BotChrome>
    </div>
  );
}

/** 2 — Create: game select → modal (size, mic, notes text fields). */
export function CreatePartyFlowMock() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <p className="mb-2 text-[11px] font-medium text-white/50">
          Step 1 · ephemeral game select
        </p>
        <div className="feature-mock overflow-hidden rounded-brand border border-white/12 bg-[#2b2d31]">
          <p className="border-b border-white/8 px-3 py-2 text-[11px] leading-snug text-white/80">
            <strong className="text-white">Create party</strong> — pick a game
            (keeps titles tidy for Find + analytics). Next popup: size, mic,
            notes.
          </p>
          <div className="px-3 py-3">
            <div className="rounded border border-white/15 bg-[#1e1f22] px-3 py-2 text-[11px] text-white/55">
              Select a game…
            </div>
            <ul className="mt-2 space-y-1 text-[11px] text-white/75">
              <li className="rounded bg-white/5 px-2 py-1.5">Valorant</li>
              <li className="rounded px-2 py-1.5 text-white/55">League of Legends</li>
              <li className="rounded px-2 py-1.5 text-white/55">
                Other (type game next)
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-medium text-white/50">
          Step 2 · modal (text fields only — Discord can&apos;t nest dropdowns)
        </p>
        <div className="feature-mock overflow-hidden rounded-brand border border-white/12 bg-[#313338]">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
            <p className="text-sm font-semibold text-white">Create · Valorant</p>
            <span className="text-white/40" aria-hidden>
              ✕
            </span>
          </div>
          <div className="space-y-3 px-3 py-3">
            {[
              {
                label: "Party size (2-20)",
                value: "5",
                ph: "5",
              },
              {
                label: "Mic (optional)",
                value: "",
                ph: "required / optional / any",
              },
              {
                label: "Notes / rank (optional)",
                value: "",
                ph: "Rank, region, vibe…",
              },
            ].map((field) => (
              <label key={field.label} className="block">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-white/45">
                  {field.label}
                </span>
                <span className="mt-1 block rounded border border-white/15 bg-[#1e1f22] px-2.5 py-2 text-[11px] text-white/80">
                  {field.value || (
                    <span className="text-white/35">{field.ph}</span>
                  )}
                </span>
              </label>
            ))}
            <div className="flex justify-end gap-2 pt-1">
              <span className="rounded px-3 py-1.5 text-[11px] text-white/55">
                Cancel
              </span>
              <span className="rounded bg-[#5865f2] px-3 py-1.5 text-[11px] font-medium text-white">
                Submit
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type PartyStatus = "open" | "filled" | "closed";

/** 3 / 4 — Live party card with open → filled → closed states. */
export function PartyCardMock({
  status = "open",
  filled = 3,
  slots = 5,
}: {
  status?: PartyStatus;
  filled?: number;
  slots?: number;
}) {
  const titlePrefix =
    status === "filled" ? "Filled" : status === "closed" ? "Closed" : "LFG";
  const accent =
    status === "closed" ? "gray" : status === "filled" ? "lime" : "coral";
  const description =
    status === "open"
      ? "Tap Join, then coordinate in the squad thread."
      : status === "filled"
        ? "Party full — Leave frees a slot; Close when you're done."
        : "Party closed. Use Vibe Check to rate teammates.";

  return (
    <BotChrome>
      <EmbedShell accent={accent}>
        <p className="text-sm font-semibold text-white">
          {titlePrefix} · Valorant
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-white/55">
          {description}
        </p>
        <div className="mt-2.5 grid grid-cols-3 gap-2 text-[11px]">
          <div>
            <p className="font-semibold text-white/45">Notes</p>
            <p className="text-white/80">Mic: Required · Diamond+</p>
          </div>
          <div>
            <p className="font-semibold text-white/45">Slots</p>
            <p className="tabular-nums text-white/80">
              {filled}/{slots}
            </p>
          </div>
          <div>
            <p className="font-semibold text-white/45">Ghostless</p>
            <p className="text-lime">☑ Ghostless 94%</p>
          </div>
        </div>
        <div className="mt-2.5">
          <p className="text-[11px] font-semibold text-white/45">Squad</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-white/75">
            @Nova (host)
            <br />
            @Kai
            {filled >= 3 ? (
              <>
                <br />
                @Rin
              </>
            ) : null}
            {filled >= 4 ? (
              <>
                <br />
                @Ash
              </>
            ) : null}
            {filled >= 5 ? (
              <>
                <br />
                @Lex
              </>
            ) : null}
          </p>
        </div>
        <div className="mt-2.5">
          <p className="text-[11px] font-semibold text-white/45">Squad chat</p>
          <p className="mt-0.5 text-[11px] text-white/70">
            #Squad · Valorant — hop in to share codes / VC
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {status === "open" ? <DiscBtn label="Join" tone="green" /> : null}
          {status === "open" || status === "filled" ? (
            <>
              <DiscBtn label="Leave" tone="gray" />
              <DiscBtn label="Close" tone="red" />
            </>
          ) : null}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {status === "open" || status === "filled" ? (
            <DiscBtn label="Ready Check" tone="blurple" />
          ) : null}
          <DiscBtn label="Vibe Check" tone="gray" />
        </div>
        <p className="mt-3 text-[10px] text-white/35">
          Rallied · this server only · a1b2c3d4
        </p>
      </EmbedShell>
    </BotChrome>
  );
}

/** Seats updating 3/5 → 4/5 after Join. */
export function PartySeatsTransitionMock() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <p className="mb-2 text-[11px] font-medium text-white/50">
          After Join · seats refresh live
        </p>
        <PartyCardMock status="open" filled={3} slots={5} />
      </div>
      <div>
        <p className="mb-2 text-[11px] font-medium text-lime/80">
          Next join → 4/5
        </p>
        <PartyCardMock status="open" filled={4} slots={5} />
      </div>
    </div>
  );
}

/** 4 — Ready check + grace; filled / closed cards. */
export function ReadyCheckGuideMock({
  resolved = false,
}: {
  resolved?: boolean;
}) {
  const members = [
    { name: "Nova", ready: true, host: true },
    { name: "Kai", ready: true, host: false },
    { name: "Rin", ready: resolved ? false : false, host: false },
    { name: "Ash", ready: true, host: false },
    { name: "Lex", ready: resolved ? false : true, host: false },
  ];
  const readyCount = members.filter((m) => m.ready).length;

  return (
    <BotChrome time="Today at 7:48 PM">
      <EmbedShell accent={resolved ? "gray" : "lime"}>
        <p className="text-sm font-semibold text-white">
          Ready check · Valorant
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-white/55">
          {resolved
            ? "Grace ended — waiting members marked as no-shows (this server)."
            : "Tap Ready before grace ends in 0:42. No-shows get a strike after grace (this server)."}
        </p>
        <div className="mt-2.5">
          <p className="text-[11px] font-semibold text-white/45">Roster</p>
          <ul className="mt-1 space-y-1 text-[11px]">
            {members.map((m) => (
              <li key={m.name} className="text-white/80">
                {m.ready ? "✅ Ready" : "⏳ Waiting…"} — @{m.name}
                {m.host ? " (host)" : ""}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-2.5 text-[11px]">
          <p className="font-semibold text-white/45">Progress</p>
          <p className="mt-0.5 text-white/75">
            {readyCount}/{members.length} ready
            {resolved ? "" : " · auto-strike after grace"}
          </p>
        </div>
        {!resolved ? (
          <div className="mt-2.5 text-[11px]">
            <p className="font-semibold text-white/45">Grace</p>
            <p className="mt-0.5 tabular-nums text-coral">in 0:42 (7:53 PM)</p>
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {!resolved ? <DiscBtn label="Ready" tone="green" /> : null}
          <DiscBtn label="Vibe Check" tone="gray" />
        </div>
      </EmbedShell>
    </BotChrome>
  );
}

export function FilledClosedPairMock() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <p className="mb-2 text-[11px] font-medium text-lime/80">
          Filled · Join hidden · Ready Check available
        </p>
        <PartyCardMock status="filled" filled={5} slots={5} />
      </div>
      <div>
        <p className="mb-2 text-[11px] font-medium text-white/50">
          Closed · Confirm close · Vibe remains
        </p>
        <PartyCardMock status="closed" filled={5} slots={5} />
      </div>
    </div>
  );
}

/** 5 — Post-session Vibe Check. */
export function VibeCheckGuideMock() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <p className="mb-2 text-[11px] font-medium text-white/50">
          Nudge after fill / close
        </p>
        <div className="feature-mock overflow-hidden rounded-brand border border-white/12 bg-[#2b2d31]">
          <p className="px-3 py-3 text-[12px] leading-snug text-white/85">
            <strong className="text-white">Valorant</strong> session wrapping
            up — rate your teammates?
          </p>
          <div className="border-t border-white/8 px-3 py-2.5">
            <DiscBtn label="Vibe Check" tone="blurple" />
          </div>
        </div>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-medium text-white/50">
          Rate a teammate (this server)
        </p>
        <div className="feature-mock overflow-hidden rounded-brand border border-white/12 bg-[#2b2d31]">
          <p className="px-3 py-2.5 text-[12px] leading-snug text-white/85">
            <strong className="text-white">Vibe Check</strong> for @Kai — how
            did they do? (this server)
          </p>
          <div className="border-t border-white/8 px-3 py-2">
            <p className="text-[11px] text-white/55">
              Tap a quick result, or pick a vibe score 1–5. Grace window applies
              before ghost strikes.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <DiscBtn label="Showed up" tone="green" />
              <DiscBtn label="Ghosted" tone="red" />
              <DiscBtn label="Dispute" tone="gray" />
            </div>
            <div className="mt-2 rounded border border-white/15 bg-[#1e1f22] px-2.5 py-2 text-[11px] text-white/45">
              Rate vibe 1–5 (counts as showed up)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 6 — Ghostless badge meaning (local reliability). */
export function GhostlessGuideMock() {
  return (
    <div>
      <ChannelCue>
        Slash <span className="text-white/70">/ghostless @user</span>
      </ChannelCue>
      <BotChrome>
        <EmbedShell accent="lime">
          <p className="text-sm font-semibold text-white">Nova</p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/70">
            @Nova
            <br />
            This server · 28 shows · 1 ghost
            <br />
            <span className="inline-flex items-center gap-1 text-lime">
              <GhostlessMark size="sm" />
              <strong>Ghostless</strong> — earned on this server
            </span>
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <p className="font-semibold text-white/45">Show rate</p>
              <p className="tabular-nums text-lime">96%</p>
            </div>
            <div>
              <p className="font-semibold text-white/45">Avg vibe</p>
              <p className="tabular-nums text-white/80">4.2/5</p>
            </div>
            <div>
              <p className="font-semibold text-white/45">Active strikes</p>
              <p className="tabular-nums text-white/80">0</p>
            </div>
          </div>
          <p className="mt-3 text-[10px] text-white/35">
            Rallied Ghostless · this server only
          </p>
        </EmbedShell>
      </BotChrome>
    </div>
  );
}
