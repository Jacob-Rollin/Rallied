type Props = {
  count: number;
};

export function StrikeBadge({ count }: Props) {
  if (count <= 0) {
    return (
      <span className="text-xs text-muted">No strikes</span>
    );
  }

  return (
    <span className="animate-strike inline-flex items-center gap-1 rounded-brand border border-coral/50 bg-coral/10 px-2 py-0.5 text-xs font-semibold text-coral">
      {count} strike{count === 1 ? "" : "s"}
    </span>
  );
}
