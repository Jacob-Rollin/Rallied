import { DiscordBotAvatar } from "./DiscordBotAvatar";

/** Shared Discord dark-mode chrome for marketing mocks — layout matches Discord mobile/desktop. */

export function DiscBtn({
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
          : "bg-[#4e5058] text-[#dbdee1]";
  return (
    <span
      className={`inline-flex min-h-[28px] items-center rounded-[3px] px-3 py-1 text-[12px] font-medium leading-none ${cls}`}
    >
      {label}
    </span>
  );
}

export function EmbedShell({
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
        : "bg-[#6b7280]";
  return (
    <div className="mt-0.5 flex max-w-md overflow-hidden rounded-[4px] bg-[#2b2d31]">
      <div className={`w-1 shrink-0 self-stretch ${bar}`} />
      <div className="min-w-0 flex-1 px-3 py-2">{children}</div>
    </div>
  );
}

export function EmbedTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] font-semibold leading-snug text-[#f2f3f5]">
      {children}
    </p>
  );
}

export function EmbedDesc({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 text-[13px] leading-snug text-[#dbdee1]">{children}</p>
  );
}

export function EmbedField({
  name,
  children,
  inline,
}: {
  name: string;
  children: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <div className={inline ? "min-w-0" : "col-span-full"}>
      <p className="text-[11px] font-bold text-[#dbdee1]">{name}</p>
      <div className="mt-0.5 text-[13px] leading-snug text-[#dbdee1]">
        {children}
      </div>
    </div>
  );
}

export function EmbedFields({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 grid grid-cols-3 gap-x-2 gap-y-2">{children}</div>
  );
}

export function EmbedFooter({
  text,
  time,
}: {
  text: string;
  time?: string;
}) {
  return (
    <p className="mt-2 text-[11px] leading-snug text-[#949ba4]">
      {text}
      {time ? (
        <>
          <span className="mx-1 opacity-60">•</span>
          {time}
        </>
      ) : null}
    </p>
  );
}

export function ButtonRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">{children}</div>
  );
}

/** Optional Discord thread row under a message. */
export function ThreadRow({ label }: { label: string }) {
  return (
    <div className="mt-2 flex items-center gap-2 text-[12px] text-[#00a8fc]">
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-[3px] bg-[#4e5058] text-[9px] text-[#dbdee1]"
        aria-hidden
      >
        #
      </span>
      <span className="font-medium">{label}</span>
      <span className="text-[#949ba4]">1 message ›</span>
    </div>
  );
}

/**
 * Discord message chrome: circular avatar left, teal username + blue APP badge,
 * timestamp, then embed / buttons / thread (not a boxed header strip).
 */
export function BotChrome({
  children,
  time = "Today at 7:42 PM",
  className,
}: {
  children: React.ReactNode;
  time?: string;
  className?: string;
}) {
  return (
    <div
      className={`feature-mock rounded-lg bg-[#313338] px-3 py-2.5 ${className ?? ""}`}
    >
      <div className="flex gap-3">
        <DiscordBotAvatar className="mt-0.5 h-10 w-10" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-none">
            <span className="text-[15px] font-medium text-[#3BA55D]">
              Rallied
            </span>
            <span className="inline-flex items-center rounded-[3px] bg-[#5865f2] px-1 py-px text-[9px] font-bold uppercase tracking-wide text-white">
              APP
            </span>
            <span className="text-[11px] text-[#949ba4]">{time}</span>
          </div>
          <div className="mt-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ChannelCue({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 font-mono text-[11px] text-white/45">
      <span className="text-white/60">#lfg-board</span> · {children}
    </p>
  );
}
