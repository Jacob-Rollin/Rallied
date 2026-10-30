import Link from "next/link";
import { isProPlan, type PlanId } from "@rallied/shared";
import type { UpcomingScheduledParty } from "@/lib/dashboard-data";

type Props = {
  parties: UpcomingScheduledParty[];
  plan: PlanId | null | undefined;
  settingsHref: string;
  source: "live" | "mock" | "empty";
};

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function UpcomingScheduled({
  parties,
  plan,
  settingsHref,
  source,
}: Props) {
  const pro = isProPlan(plan);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-xl tracking-wide">Upcoming scheduled</h2>
        <p className="mt-1 text-sm text-muted">
          Next parties with a set start time.
          {pro ? (
            <>
              {" "}
              Pro: subscribe via{" "}
              <Link
                href={settingsHref}
                className="text-coral hover:underline"
              >
                Settings → Calendar
              </Link>
              .
            </>
          ) : (
            <>
              {" "}
              Pro iCal subscribe lives in{" "}
              <Link
                href={settingsHref}
                className="text-coral hover:underline"
              >
                Settings
              </Link>
              .
            </>
          )}
        </p>
      </div>

      {parties.length === 0 ? (
        <p className="text-sm text-muted">
          {source === "empty"
            ? "No schedule data yet."
            : "Nothing scheduled ahead — hosts can set a start when creating a party."}
        </p>
      ) : (
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {parties.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
            >
              <div>
                <p className="font-medium text-white/95">{p.game}</p>
                <p className="text-xs text-muted">
                  Host {p.host_name} · {p.filled}/{p.slots} · {p.status}
                </p>
              </div>
              <p className="text-sm tabular-nums text-lime">
                {formatWhen(p.scheduled_start_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
