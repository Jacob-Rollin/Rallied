type Props = {
  game: string;
  rankText: string;
  hostName: string;
  filled: number;
  slots: number;
  status: "open" | "filled" | "closed";
  createdAt: string;
};

const STATUS_STYLES: Record<Props["status"], string> = {
  open: "text-lime border-lime/40",
  filled: "text-coral border-coral/40",
  closed: "text-muted border-muted/30",
};

export function LfgPartyRow({
  game,
  rankText,
  hostName,
  filled,
  slots,
  status,
  createdAt,
}: Props) {
  return (
    <div className="animate-rise grid grid-cols-[1fr_auto] items-center gap-3 border-b border-white/5 py-3 last:border-0 sm:grid-cols-[1.4fr_1fr_auto_auto]">
      <div>
        <p className="font-display text-lg tracking-wide text-white">{game}</p>
        <p className="text-sm text-muted">{rankText || "Any rank"}</p>
      </div>
      <p className="hidden text-sm text-muted sm:block">Host {hostName}</p>
      <p className="text-sm tabular-nums text-white/80">
        {filled}/{slots}
      </p>
      <div className="flex flex-col items-end gap-1">
        <span
          className={`rounded-brand border px-2 py-0.5 text-xs uppercase tracking-wider ${STATUS_STYLES[status]}`}
        >
          {status}
        </span>
        <time className="text-[11px] text-muted" dateTime={createdAt}>
          {new Date(createdAt).toLocaleString()}
        </time>
      </div>
    </div>
  );
}
