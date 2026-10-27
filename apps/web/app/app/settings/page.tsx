"use client";

import Link from "next/link";
import { useState } from "react";
import {
  COMMUNITY_PRICE_USD,
  PLANS,
  PRO_PRICE_USD,
  isProPlan,
} from "@rallied/shared";
import {
  MOCK_FOUNDING_SETTINGS,
  MOCK_SERVERS,
  MOCK_SETTINGS,
} from "@/lib/mock-data";

export default function SettingsPage() {
  const [planPreview, setPlanPreview] = useState<"community" | "founding_pro">(
    "founding_pro",
  );
  const server =
    planPreview === "founding_pro" ? MOCK_SERVERS[2] : MOCK_SERVERS[0];
  const baseSettings =
    planPreview === "founding_pro" ? MOCK_FOUNDING_SETTINGS : MOCK_SETTINGS;
  const pro = isProPlan(server.plan);

  const [grace, setGrace] = useState(baseSettings.grace_minutes);
  const [threshold, setThreshold] = useState(baseSettings.strike_threshold);
  const [roleId, setRoleId] = useState(baseSettings.ghostless_role_id ?? "");
  const [digestChannel, setDigestChannel] = useState(
    baseSettings.digest_channel_id ?? "",
  );
  const [slug, setSlug] = useState(baseSettings.slug ?? "");
  const [publicPage, setPublicPage] = useState(baseSettings.public_page_enabled);
  const [publicMembers, setPublicMembers] = useState(
    baseSettings.public_member_list,
  );
  const [hidePoweredBy, setHidePoweredBy] = useState(
    baseSettings.hide_powered_by,
  );
  const [accent, setAccent] = useState(baseSettings.public_accent ?? "");

  const previewPath = `/s/${slug || server.discord_guild_id}`;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-wide">Settings</h1>
          <p className="mt-1 text-sm text-muted">
            Grace, public page, Pro vanity. Saves are UI stubs until Supabase.
          </p>
        </div>
        <label className="text-xs text-muted">
          Preview plan{" "}
          <select
            className="ml-1 rounded-brand border border-white/15 bg-slate-elevated px-2 py-1 text-white"
            value={planPreview}
            onChange={(e) => {
              const v = e.target.value as "community" | "founding_pro";
              setPlanPreview(v);
              const s =
                v === "founding_pro" ? MOCK_FOUNDING_SETTINGS : MOCK_SETTINGS;
              setHidePoweredBy(s.hide_powered_by);
              setAccent(s.public_accent ?? "");
              setSlug(s.slug ?? "");
              setPublicMembers(s.public_member_list);
            }}
          >
            <option value="founding_pro">Founding Pro</option>
            <option value="community">Community</option>
          </select>
        </label>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl tracking-wide">Server</h2>
        <div className="rounded-brand border border-white/10 bg-slate-elevated/40 p-4 text-sm">
          <p>
            <span className="text-muted">Name</span> · {server.name}
          </p>
          <p className="mt-1">
            <span className="text-muted">Plan</span> · {server.plan}
            {server.price_lock_cents != null
              ? ` · $${(server.price_lock_cents / 100).toFixed(2)}/mo lock`
              : ""}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl tracking-wide">Public page</h2>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={publicPage}
            onChange={(e) => setPublicPage(e.target.checked)}
            className="h-4 w-4 accent-coral"
          />
          <span>Public page enabled</span>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={publicMembers}
            onChange={(e) => setPublicMembers(e.target.checked)}
            className="h-4 w-4 accent-lime"
          />
          <span>Public Ghostless spotlight / list</span>
        </label>
        <label className="block max-w-md text-sm">
          <span className="text-muted">Vanity slug</span>
          <input
            type="text"
            value={slug}
            onChange={(e) =>
              setSlug(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, "")
                  .slice(0, 48),
              )
            }
            className="mt-1 w-full rounded-brand border border-white/15 bg-slate-elevated px-3 py-2 text-white"
          />
          <span className="mt-1 block text-xs text-muted">
            <Link href={previewPath} className="text-coral hover:underline">
              {previewPath}
            </Link>
          </span>
        </label>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl tracking-wide">Pro vanity</h2>
        {!pro ? (
          <div className="rounded-brand border border-coral/30 bg-coral/5 p-4 text-sm">
            <p className="text-muted">
              Hide “Powered by” and custom accent require Pro ($
              {PRO_PRICE_USD}/mo) or Founding Pro.
            </p>
            <Link
              href="/app/billing"
              className="mt-3 inline-block text-coral hover:underline"
            >
              Upgrade to Pro →
            </Link>
          </div>
        ) : null}
        <label
          className={`flex items-center gap-3 text-sm ${!pro ? "opacity-40" : ""}`}
        >
          <input
            type="checkbox"
            checked={hidePoweredBy}
            disabled={!pro}
            onChange={(e) => setHidePoweredBy(e.target.checked)}
            className="h-4 w-4 accent-lime"
          />
          <span>Hide “Powered by Rallied” on public page</span>
        </label>
        <label
          className={`block max-w-md text-sm ${!pro ? "opacity-40" : ""}`}
        >
          <span className="text-muted">Public accent (hex)</span>
          <input
            type="text"
            placeholder="#B8F000"
            value={accent}
            disabled={!pro}
            onChange={(e) => setAccent(e.target.value)}
            className="mt-1 w-full rounded-brand border border-white/15 bg-slate-elevated px-3 py-2 text-white disabled:cursor-not-allowed"
          />
        </label>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl tracking-wide">Reliability rules</h2>
        <label className="block max-w-sm text-sm">
          <span className="text-muted">Grace window (minutes)</span>
          <input
            type="number"
            min={0}
            max={60}
            value={grace}
            onChange={(e) => setGrace(Number(e.target.value))}
            className="mt-1 w-full rounded-brand border border-white/15 bg-slate-elevated px-3 py-2 text-white"
          />
        </label>
        <label className="block max-w-sm text-sm">
          <span className="text-muted">Strike threshold → lockout</span>
          <input
            type="number"
            min={1}
            max={20}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="mt-1 w-full rounded-brand border border-white/15 bg-slate-elevated px-3 py-2 text-white"
          />
        </label>
        <label className="block max-w-md text-sm">
          <span className="text-muted">Ghostless Discord role ID</span>
          <input
            type="text"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="mt-1 w-full rounded-brand border border-white/15 bg-slate-elevated px-3 py-2 text-white"
          />
        </label>
        <label className="block max-w-md text-sm">
          <span className="text-muted">Weekly digest channel ID</span>
          <input
            type="text"
            value={digestChannel}
            onChange={(e) => setDigestChannel(e.target.value)}
            className="mt-1 w-full rounded-brand border border-white/15 bg-slate-elevated px-3 py-2 text-white"
          />
        </label>
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-brand border border-white/15 px-4 py-2 text-sm text-muted"
        >
          Save (wire Supabase later)
        </button>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl tracking-wide">Billing snapshot</h2>
        <p className="text-sm text-muted">
          Community ${COMMUNITY_PRICE_USD} · Pro ${PRO_PRICE_USD} · Founding Pro $
          {PLANS.founding_pro.priceMonthly} locked.{" "}
          <Link href="/app/billing" className="text-coral hover:underline">
            Open billing
          </Link>
        </p>
      </section>
    </div>
  );
}
