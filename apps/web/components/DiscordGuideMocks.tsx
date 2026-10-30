import { GhostlessMark } from "./GhostlessMark";
import {
  BotChrome,
  ButtonRow,
  ChannelCue,
  DiscBtn,
  EmbedDesc,
  EmbedField,
  EmbedFields,
  EmbedFooter,
  EmbedShell,
  EmbedTitle,
  ThreadRow,
} from "./DiscordMockChrome";

/** Reusable Discord-style chrome for the /guide page — labels match apps/bot embeds. */

/** 1 — Pinned LFG desk (Create / Find / My parties / Board / How it works). */
export function LfgDeskMock() {
  return (
    <div>
      <ChannelCue>
        After <span className="text-white/70">/setup</span> or{" "}
        <span className="text-white/70">/lfg desk</span> · pin the message
      </ChannelCue>
      <BotChrome>
        <EmbedShell accent="coral">
          <EmbedTitle>Rallied LFG — find or start a squad</EmbedTitle>
          <EmbedDesc>
            Tap a button below — no slash commands needed. Parties stay{" "}
            <strong className="font-semibold text-[#f2f3f5]">
              in this server
            </strong>{" "}
            only.
          </EmbedDesc>
          <EmbedFooter text="Rallied · pin this message in your LFG channel" />
        </EmbedShell>
        <ButtonRow>
          <DiscBtn label="Create party" tone="green" />
          <DiscBtn label="Find party" tone="blurple" />
          <DiscBtn label="My parties" tone="gray" />
          <DiscBtn label="Board" tone="gray" />
          <DiscBtn label="How it works" tone="gray" />
        </ButtonRow>
      </BotChrome>
    </div>
  );
}

/** 2 — Create: game select → modal (size, mic, rank, region, optional start). */
export function CreatePartyFlowMock() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <p className="mb-2 text-[11px] font-medium text-white/50">
          Step 1 · ephemeral game select
        </p>
        <div className="feature-mock overflow-hidden rounded-lg bg-[#2b2d31]">
          <p className="border-b border-white/8 px-3 py-2 text-[12px] leading-snug text-[#dbdee1]">
            <strong className="text-[#f2f3f5]">Create party</strong> — pick a
            game (keeps titles tidy for Find + analytics). Next popup: size,
            mic, rank, region, optional start.
          </p>
          <div className="px-3 py-3">
            <div className="rounded border border-[#1e1f22] bg-[#1e1f22] px-3 py-2 text-[12px] text-[#949ba4]">
              Select a game…
            </div>
            <ul className="mt-2 space-y-1 text-[12px] text-[#dbdee1]">
              <li className="rounded bg-white/5 px-2 py-1.5">Valorant</li>
              <li className="rounded px-2 py-1.5 text-[#949ba4]">
                League of Legends
              </li>
              <li className="rounded px-2 py-1.5 text-[#949ba4]">
                Other (type game next)
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-medium text-white/50">
          Step 2 · modal (5 text fields — Discord can&apos;t nest dropdowns)
        </p>
        <div className="feature-mock overflow-hidden rounded-lg bg-[#313338]">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
            <p className="text-sm font-semibold text-[#f2f3f5]">
              Create · Valorant
            </p>
            <span className="text-[#949ba4]" aria-hidden>
              ✕
            </span>
          </div>
          <div className="space-y-2.5 px-3 py-3">
            {[
              {
                label: "Party size (2-20)",
                value: "5",
                ph: "5",
              },
              {
                label: "Mic (optional)",
                value: "required",
                ph: "required / optional / any",
              },
              {
                label: "Rank (optional)",
                value: "Diamond+",
                ph: "Diamond+, Gold–Plat, Any…",
              },
              {
                label: "Region (optional)",
                value: "NA",
                ph: "NA, EU, West, Oce…",
              },
              {
                label: "Start time (optional)",
                value: "in 30m",
                ph: "in 30m · in 1h · YYYY-MM-DD HH:MM UTC",
              },
            ].map((field) => (
              <label key={field.label} className="block">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#b5bac1]">
                  {field.label}
                </span>
                <span className="mt-1 block rounded border border-[#1e1f22] bg-[#1e1f22] px-2.5 py-1.5 text-[12px] text-[#dbdee1]">
                  {field.value || (
                    <span className="text-[#949ba4]">{field.ph}</span>
                  )}
                </span>
              </label>
            ))}
            <div className="flex justify-end gap-2 pt-1">
              <span className="rounded px-3 py-1.5 text-[12px] text-[#dbdee1]">
                Cancel
              </span>
              <span className="rounded bg-[#5865f2] px-3 py-1.5 text-[12px] font-medium text-white">
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

/** 3 / 4 — Live party card with open → filled → closed states (parity fields). */
export function PartyCardMock({
  status = "open",
  filled = 3,
  slots = 5,
  game = "Valorant",
  waitlist = 0,
  showSchedule = true,
}: {
  status?: PartyStatus;
  filled?: number;
  slots?: number;
  game?: string;
  waitlist?: number;
  showSchedule?: boolean;
}) {
  const titlePrefix =
    status === "filled" ? "Filled" : status === "closed" ? "Closed" : "LFG";
  const accent =
    status === "closed" ? "gray" : status === "filled" ? "lime" : "coral";
  const description =
    status === "open"
      ? "Tap Join, then hop into voice / the squad thread."
      : status === "filled"
        ? "Party full — Waitlist for the next seat; Leave frees a slot."
        : "Party closed. Use Vibe Check to rate teammates.";

  const roster = [
    "@Nova (host)",
    "@Kai",
    filled >= 3 ? "@Rin" : null,
    filled >= 4 ? "@Ash" : null,
    filled >= 5 ? "@Lex" : null,
  ].filter(Boolean);

  const slotsLabel =
    waitlist > 0
      ? `${filled}/${slots} · ${waitlist} wait`
      : `${filled}/${slots}`;

  return (
    <BotChrome>
      <EmbedShell accent={accent}>
        <EmbedTitle>
          {titlePrefix} · {game}
        </EmbedTitle>
        <EmbedDesc>{description}</EmbedDesc>
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
            <span className="tabular-nums">{slotsLabel}</span>
          </EmbedField>
          <EmbedField name="Ghostless" inline>
            <span className="text-lime">☑ Ghostless 94%</span>
          </EmbedField>
          {showSchedule ? (
            <EmbedField name="Starts" inline>
              <span className="tabular-nums">Today 8:15 PM · in 33m</span>
            </EmbedField>
          ) : null}
          <EmbedField name="Squad">
            {roster.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </EmbedField>
          {waitlist > 0 ? (
            <EmbedField name="Waitlist">@Mira, @Jay</EmbedField>
          ) : null}
          {status !== "closed" ? (
            <EmbedField name="Voice">
              #LFG · Valorant — tap <strong className="font-semibold">Join VC</strong>{" "}
              or the channel
            </EmbedField>
          ) : null}
          <EmbedField name="Squad chat">
            #Squad · {game} — hop in to share codes
          </EmbedField>
        </EmbedFields>
        <EmbedFooter text="Rallied · this server only · a1b2c3d4" time="7:42 PM" />
      </EmbedShell>
      {status === "open" || status === "filled" ? (
        <ButtonRow>
          {status === "open" ? <DiscBtn label="Join" tone="green" /> : null}
          {status === "filled" ? (
            <DiscBtn label="Waitlist" tone="blurple" />
          ) : null}
          <DiscBtn label="Leave" tone="gray" />
          <DiscBtn label="Close" tone="red" />
        </ButtonRow>
      ) : null}
      <ButtonRow>
        {status === "open" || status === "filled" ? (
          <DiscBtn label="Ready Check" tone="blurple" />
        ) : null}
        <DiscBtn label="Vibe Check" tone="gray" />
        {status !== "closed" ? <DiscBtn label="Join VC" tone="green" /> : null}
      </ButtonRow>
      {status !== "closed" ? (
        <ThreadRow label={`Squad · ${game}`} />
      ) : null}
    </BotChrome>
  );
}

/** Seats updating 3/5 → 4/5 after Join. */
export function PartySeatsTransitionMock() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <p className="mb-2 text-[11px] font-medium text-white/50">
          After Join · seats + temp voice
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
    { name: "Rin", ready: false, host: false },
    { name: "Ash", ready: true, host: false },
    { name: "Lex", ready: resolved ? false : true, host: false },
  ];
  const readyCount = members.filter((m) => m.ready).length;

  return (
    <BotChrome time="Today at 7:48 PM">
      <EmbedShell accent={resolved ? "gray" : "lime"}>
        <EmbedTitle>Ready check · Valorant</EmbedTitle>
        <EmbedDesc>
          {resolved
            ? "Grace ended — waiting members marked as no-shows (this server)."
            : "Tap Ready before grace ends in 0:42. No-shows get a strike after grace on Community+ (this server)."}
        </EmbedDesc>
        <EmbedFields>
          <EmbedField name="Roster">
            <ul className="space-y-0.5">
              {members.map((m) => (
                <li key={m.name}>
                  {m.ready ? "✅ Ready" : "⏳ Waiting…"} — @{m.name}
                  {m.host ? " (host)" : ""}
                </li>
              ))}
            </ul>
          </EmbedField>
          <EmbedField name="Progress">
            {readyCount}/{members.length} ready
            {resolved ? "" : " · auto-strike after grace"}
          </EmbedField>
          {!resolved ? (
            <EmbedField name="Grace" inline>
              <span className="tabular-nums text-coral">in 0:42 (7:53 PM)</span>
            </EmbedField>
          ) : null}
        </EmbedFields>
        <EmbedFooter text="Rallied · a1b2c3d4" time="7:48 PM" />
      </EmbedShell>
      <ButtonRow>
        {!resolved ? <DiscBtn label="Ready" tone="green" /> : null}
        <DiscBtn label="Vibe Check" tone="gray" />
      </ButtonRow>
    </BotChrome>
  );
}

export function FilledClosedPairMock() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <p className="mb-2 text-[11px] font-medium text-lime/80">
          Filled · Waitlist · Ready Check available
        </p>
        <PartyCardMock status="filled" filled={5} slots={5} waitlist={2} />
      </div>
      <div>
        <p className="mb-2 text-[11px] font-medium text-white/50">
          Closed · Confirm close · Vibe remains
        </p>
        <PartyCardMock
          status="closed"
          filled={5}
          slots={5}
          game="Call of Duty"
          showSchedule={false}
        />
      </div>
    </div>
  );
}

/** Find filters (game + mic / region via slash). */
export function FindPartyGuideMock() {
  return (
    <div>
      <ChannelCue>
        Desk <span className="text-white/70">Find</span> · or{" "}
        <span className="text-white/70">/lfg find</span> with mic / region
      </ChannelCue>
      <BotChrome>
        <p className="text-[14px] leading-snug text-[#dbdee1]">
          <strong className="text-[#f2f3f5]">Open parties</strong> — Valorant ·
          filter mic=Required, region=NA
        </p>
        <div className="mt-2 space-y-2">
          {[
            "LFG · Valorant — Diamond+ · Required · NA · 3/5",
            "LFG · Valorant — Plat+ · Required · NA · 1/5 · starts in 25m",
          ].map((line) => (
            <div
              key={line}
              className="rounded border border-[#1e1f22] bg-[#1e1f22] px-2.5 py-2 text-[12px] text-[#dbdee1]"
            >
              {line}
            </div>
          ))}
        </div>
        <ButtonRow>
          <DiscBtn label="Join first" tone="green" />
          <DiscBtn label="Create party" tone="blurple" />
        </ButtonRow>
      </BotChrome>
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
        <BotChrome>
          <p className="text-[14px] leading-snug text-[#dbdee1]">
            <strong className="text-[#f2f3f5]">Valorant</strong> session
            wrapping up — rate your teammates?
          </p>
          <ButtonRow>
            <DiscBtn label="Vibe Check" tone="blurple" />
          </ButtonRow>
        </BotChrome>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-medium text-white/50">
          Rate a teammate (this server)
        </p>
        <BotChrome>
          <p className="text-[14px] leading-snug text-[#dbdee1]">
            <strong className="text-[#f2f3f5]">Vibe Check</strong> for @Kai —
            how did they do? (this server)
          </p>
          <EmbedShell accent="lime">
            <EmbedDesc>
              Tap a quick result, or pick a vibe score 1–5. After grace, Ghosted
              issues a strike on Community+. Dispute is for the flagged player.
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
          <EmbedTitle>Nova</EmbedTitle>
          <EmbedDesc>
            @Nova
            <br />
            This server · 28 shows · 1 ghost
            <br />
            <span className="inline-flex items-center gap-1 text-lime">
              <GhostlessMark size="sm" />
              <strong>Ghostless</strong> — earned on this server
            </span>
          </EmbedDesc>
          <EmbedFields>
            <EmbedField name="Show rate" inline>
              <span className="tabular-nums text-lime">96%</span>
            </EmbedField>
            <EmbedField name="Avg vibe" inline>
              <span className="tabular-nums">4.2/5</span>
            </EmbedField>
            <EmbedField name="Active strikes" inline>
              <span className="tabular-nums">0</span>
            </EmbedField>
          </EmbedFields>
          <EmbedFooter text="Rallied Ghostless · this server only" />
        </EmbedShell>
      </BotChrome>
    </div>
  );
}
