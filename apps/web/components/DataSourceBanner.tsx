import type { DashboardSource } from "@/lib/dashboard-data";

export function DataSourceBanner({
  source,
  notice,
}: {
  source: DashboardSource;
  notice: string | null;
}) {
  if (!notice && source === "live") return null;

  const tone =
    source === "live"
      ? "border-lime/30 text-lime/90"
      : source === "mock"
        ? "border-white/15 text-muted"
        : "border-coral/30 text-coral/90";

  const label =
    source === "live" ? "Live" : source === "mock" ? "Demo / mock" : "Empty";

  return (
    <p
      className={`rounded-brand border px-3 py-2 text-xs ${tone}`}
      role="status"
    >
      <span className="font-semibold uppercase tracking-wider">{label}</span>
      {notice ? ` — ${notice}` : null}
      {source === "mock" ? (
        <>
          {" "}
          Preview mock UI anytime with{" "}
          <code className="text-coral">?mock=1</code>. Real guilds use live
          Supabase by default.
        </>
      ) : null}
    </p>
  );
}
