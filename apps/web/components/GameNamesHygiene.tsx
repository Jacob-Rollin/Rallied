"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FieldInfo } from "@/components/FieldInfo";

type DistinctGame = {
  raw: string;
  parties: number;
  resolved: string;
  aliased: boolean;
};

type Props = {
  discordGuildId: string;
  canWrite: boolean;
  communityPlus: boolean;
  billingHref: string;
  /** Demo/mock: show sample rows without live API */
  demoMode?: boolean;
};

const DEMO_DISTINCT: DistinctGame[] = [
  {
    raw: "Call of Duty",
    parties: 4,
    resolved: "Call of Duty",
    aliased: false,
  },
  {
    raw: "Call of Dity",
    parties: 2,
    resolved: "Call of Duty",
    aliased: true,
  },
  { raw: "cod", parties: 3, resolved: "Call of Duty", aliased: true },
  { raw: "Valorant", parties: 5, resolved: "Valorant", aliased: false },
  { raw: "val", parties: 1, resolved: "val", aliased: false },
];

const DEMO_ALIASES: Record<string, string> = {
  "call of dity": "Call of Duty",
  cod: "Call of Duty",
};

export function GameNamesHygiene({
  discordGuildId,
  canWrite,
  communityPlus,
  billingHref,
  demoMode = false,
}: Props) {
  const [aliases, setAliases] = useState<Record<string, string>>(
    demoMode ? DEMO_ALIASES : {},
  );
  const [distinct, setDistinct] = useState<DistinctGame[]>(
    demoMode ? DEMO_DISTINCT : [],
  );
  const [loading, setLoading] = useState(!demoMode);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [canonical, setCanonical] = useState("");
  const [writeOk, setWriteOk] = useState(canWrite && communityPlus);

  const load = useCallback(async () => {
    if (demoMode) {
      setAliases(DEMO_ALIASES);
      setDistinct(DEMO_DISTINCT);
      setWriteOk(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/game-aliases?discordGuildId=${encodeURIComponent(discordGuildId)}`,
      );
      const data = (await res.json()) as {
        error?: string;
        hint?: string;
        aliases?: Record<string, string>;
        distinctGames?: DistinctGame[];
        canWrite?: boolean;
        communityPlus?: boolean;
      };
      if (!res.ok) {
        setErr(data.hint ?? data.error ?? "Failed to load game names.");
        setLoading(false);
        return;
      }
      setAliases(data.aliases ?? {});
      setDistinct(data.distinctGames ?? []);
      setWriteOk(Boolean(data.canWrite) && Boolean(data.communityPlus));
    } catch {
      setErr("Failed to load game names.");
    }
    setLoading(false);
  }, [demoMode, discordGuildId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canonicalOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: string[] = [];
    for (const d of distinct) {
      const label = d.resolved || d.raw;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      opts.push(label);
    }
    for (const v of Object.values(aliases)) {
      const key = v.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      opts.push(v);
    }
    return opts.sort((a, b) => a.localeCompare(b));
  }, [aliases, distinct]);

  const aliasEntries = useMemo(
    () =>
      Object.entries(aliases).sort((a, b) =>
        a[0].localeCompare(b[0]),
      ),
    [aliases],
  );

  function toggleRaw(raw: string) {
    setSelected((prev) =>
      prev.includes(raw) ? prev.filter((r) => r !== raw) : [...prev, raw],
    );
  }

  async function mergeSelected() {
    if (!writeOk || busy) return;
    const target = canonical.trim();
    if (!target || selected.length === 0) {
      setErr("Select spellings and a Merge into name.");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/game-aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discordGuildId,
          action: "merge",
          raws: selected,
          canonical: target,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        hint?: string;
        aliases?: Record<string, string>;
      };
      if (!res.ok) {
        setErr(data.hint ?? data.error ?? "Merge failed.");
        setBusy(false);
        return;
      }
      setAliases(data.aliases ?? {});
      setSelected([]);
      setMsg(`Merged into “${target}”. Top games update on next load.`);
      await load();
    } catch {
      setErr("Merge failed.");
    }
    setBusy(false);
  }

  async function removeAlias(aliasKey: string) {
    if (!writeOk || busy) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/game-aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discordGuildId,
          action: "remove",
          aliasKey,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        hint?: string;
        aliases?: Record<string, string>;
      };
      if (!res.ok) {
        setErr(data.hint ?? data.error ?? "Remove failed.");
        setBusy(false);
        return;
      }
      setAliases(data.aliases ?? {});
      setMsg("Alias removed.");
      await load();
    } catch {
      setErr("Remove failed.");
    }
    setBusy(false);
  }

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl tracking-wide">Game names</h2>
      <p className="max-w-xl text-sm text-muted">
        <FieldInfo label="Merge split spellings">
          Top games groups by spelling. Merge typos and short names (e.g.{" "}
          <code className="text-coral">Call of Dity</code>,{" "}
          <code className="text-coral">cod</code>) into one display name.
          Historical party rows stay unchanged — aliases apply at read time.
          Community+ owners only (not Rallied Mod).
        </FieldInfo>
      </p>

      {!communityPlus && !demoMode ? (
        <div className="rounded-brand border border-coral/35 bg-coral/10 px-4 py-3 text-sm text-white/85">
          <p className="font-medium text-coral">Community+ required</p>
          <p className="mt-1 text-white/65">
            Game name hygiene ships with Top games on Community (or trial /
            Pro).
          </p>
          <Link
            href={billingHref}
            className="mt-2 inline-block font-semibold text-coral hover:underline"
          >
            Upgrade →
          </Link>
        </div>
      ) : null}

      {demoMode ? (
        <p className="text-xs text-muted">
          Demo preview — merges are not saved.
        </p>
      ) : null}

      {loading ? (
        <p className="text-xs text-muted">Loading distinct game names…</p>
      ) : null}

      {communityPlus || demoMode ? (
        <div className="space-y-4">
          <div className="max-h-56 max-w-xl space-y-1 overflow-y-auto rounded-brand border border-white/10 bg-slate-elevated/40 p-2">
            {distinct.length === 0 && !loading ? (
              <p className="px-1 py-1 text-xs text-muted">
                No LFG game titles yet. Creates appear here after parties are
                posted.
              </p>
            ) : null}
            {distinct.map((d) => {
              const checked = selected.includes(d.raw);
              return (
                <label
                  key={d.raw}
                  className="flex cursor-pointer items-start gap-2 rounded px-1 py-1.5 text-sm hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!writeOk}
                    onChange={() => toggleRaw(d.raw)}
                    className="mt-0.5 h-4 w-4 accent-coral disabled:cursor-not-allowed"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-white/90">{d.raw}</span>
                    <span className="text-[11px] text-muted">
                      {d.parties} part{d.parties === 1 ? "y" : "ies"}
                      {d.aliased ? ` · → ${d.resolved}` : null}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 text-sm">
              <div className="text-muted">Merge into…</div>
              <input
                type="text"
                list="rallied-game-canonicals"
                value={canonical}
                disabled={!writeOk}
                onChange={(e) => setCanonical(e.target.value)}
                placeholder="Call of Duty"
                aria-label="Canonical game display name"
                className="mt-1 w-full rounded-brand border border-white/15 bg-slate-elevated px-3 py-2 text-white placeholder:text-muted/50 disabled:opacity-40"
              />
              <datalist id="rallied-game-canonicals">
                {canonicalOptions.map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
            </div>
            <button
              type="button"
              disabled={!writeOk || busy || selected.length === 0}
              onClick={() => void mergeSelected()}
              className="rounded-brand bg-coral px-4 py-2 text-sm font-semibold text-slate disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Working…" : "Merge"}
            </button>
          </div>

          {aliasEntries.length > 0 ? (
            <div className="max-w-xl space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted">
                Active aliases
              </p>
              <ul className="space-y-1.5">
                {aliasEntries.map(([key, display]) => (
                  <li
                    key={key}
                    className="flex items-center justify-between gap-2 rounded-brand border border-white/10 bg-slate-elevated/30 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      <span className="text-white/70">{key}</span>
                      <span className="text-muted"> → </span>
                      <span className="text-white/90">{display}</span>
                    </span>
                    <button
                      type="button"
                      disabled={!writeOk || busy}
                      onClick={() => void removeAlias(key)}
                      className="shrink-0 text-xs text-coral/90 hover:underline disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {msg ? <p className="text-xs text-lime">{msg}</p> : null}
      {err ? <p className="text-xs text-coral">{err}</p> : null}
      {communityPlus && canWrite === false && !demoMode ? (
        <p className="text-xs text-muted">
          Rallied Mods can view Top games but only owners merge aliases.
        </p>
      ) : null}
    </section>
  );
}
