"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  COMMUNITY_PRICE_USD,
  PLANS,
  PRO_PRICE_USD,
  buildBotInviteUrl,
  isProPlan,
  isStarterPlan,
  modDashboardEnabled,
  reliabilityEnabled,
  type PlanId,
  type ServerSettings,
} from "@rallied/shared";
import { FieldInfo } from "@/components/FieldInfo";

type DiscordRoleOption = {
  id: string;
  name: string;
  color: number;
  managed: boolean;
};

type Props = {
  serverName: string;
  discordGuildId: string;
  plan: PlanId;
  priceLockCents: number | null;
  settings: ServerSettings | null;
  billingHref: string;
  source: string;
  /**
   * Demo/mock only: Upgrade to Pro unlocks vanity controls locally (no Stripe).
   * Live `/app` must omit this — real `servers.plan` gates vanity.
   */
  demoProUnlock?: boolean;
};

const DEFAULTS: Omit<
  ServerSettings,
  "server_id" | "created_at" | "updated_at"
> = {
  grace_minutes: 5,
  ghostless_role_id: null,
  ghostless_role_threshold_pct: 90,
  ghostless_role_min_sessions: 10,
  digest_channel_id: null,
  mod_role_ids: [],
  strike_threshold: 3,
  lockout_days: 7,
  join_min_ghostless_pct: null,
  join_lockout_enforced: true,
  slug: null,
  public_page_enabled: true,
  public_member_list: false,
  list_in_directory: false,
  discord_invite_url: null,
  hide_powered_by: false,
  public_accent: null,
  ical_token: null,
};

const DEMO_ROLE_OPTIONS: DiscordRoleOption[] = [
  { id: "demo-role-mod", name: "Rallied Mod", color: 0xb8f000, managed: false },
  { id: "demo-role-admin", name: "Admin", color: 0xe85d4c, managed: false },
  { id: "demo-role-member", name: "Member", color: 0x5865f2, managed: false },
];

export function SettingsClient({
  serverName,
  discordGuildId,
  plan,
  priceLockCents,
  settings,
  billingHref,
  source,
  demoProUnlock = false,
}: Props) {
  const router = useRouter();
  const base = settings ?? {
    ...DEFAULTS,
    server_id: "",
    created_at: "",
    updated_at: "",
  };
  const planIsPro = isProPlan(plan);
  const [demoProPreview, setDemoProPreview] = useState(false);
  const pro = planIsPro || (demoProUnlock && demoProPreview);
  const canWrite = source === "live";
  const reliabilityOn =
    reliabilityEnabled(plan) || (demoProUnlock && demoProPreview);
  const starterLocked = isStarterPlan(plan) && !demoProUnlock;
  const modRolesOn =
    modDashboardEnabled(plan) || (demoProUnlock && demoProPreview);

  const [grace, setGrace] = useState(base.grace_minutes);
  const [threshold, setThreshold] = useState(base.strike_threshold);
  const [lockoutDays, setLockoutDays] = useState(base.lockout_days);
  const [joinMinGhostless, setJoinMinGhostless] = useState(
    base.join_min_ghostless_pct == null
      ? ""
      : String(base.join_min_ghostless_pct),
  );
  const [joinLockoutEnforced, setJoinLockoutEnforced] = useState(
    base.join_lockout_enforced !== false,
  );
  const [roleId, setRoleId] = useState(base.ghostless_role_id ?? "");
  const [modRoleIds, setModRoleIds] = useState<string[]>(
    base.mod_role_ids ?? [],
  );
  const [discordRoles, setDiscordRoles] = useState<DiscordRoleOption[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesErr, setRolesErr] = useState<string | null>(null);
  const [digestChannel, setDigestChannel] = useState(
    base.digest_channel_id ?? "",
  );
  const [slug, setSlug] = useState(base.slug ?? "");
  const [publicPage, setPublicPage] = useState(base.public_page_enabled);
  const [publicMembers, setPublicMembers] = useState(base.public_member_list);
  const [listInDirectory, setListInDirectory] = useState(
    base.list_in_directory,
  );
  const [inviteUrl, setInviteUrl] = useState(base.discord_invite_url ?? "");
  const [hidePoweredBy, setHidePoweredBy] = useState(base.hide_powered_by);
  const [accent, setAccent] = useState(
    base.public_accent ?? (demoProUnlock ? "#B8F000" : ""),
  );
  const [icalToken, setIcalToken] = useState(base.ical_token ?? null);
  const [origin, setOrigin] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [icalBusy, setIcalBusy] = useState(false);
  const [icalMsg, setIcalMsg] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  useEffect(() => {
    setIcalToken(base.ical_token ?? null);
  }, [base.ical_token]);

  useEffect(() => {
    setModRoleIds(base.mod_role_ids ?? []);
  }, [base.mod_role_ids]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!modRolesOn) {
      setDiscordRoles([]);
      setRolesErr(null);
      return;
    }
    if (!canWrite) {
      setDiscordRoles(DEMO_ROLE_OPTIONS);
      setRolesErr(null);
      return;
    }
    let cancelled = false;
    setRolesLoading(true);
    setRolesErr(null);
    fetch(`/api/discord/roles?guildId=${encodeURIComponent(discordGuildId)}`)
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          roles?: DiscordRoleOption[];
          error?: string;
          hint?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setDiscordRoles([]);
          setRolesErr(
            json.error
              ? `${json.error}${json.hint ? ` — ${json.hint}` : ""}`
              : `Could not load roles (${res.status})`,
          );
          return;
        }
        setDiscordRoles(json.roles ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setRolesErr(err instanceof Error ? err.message : "Could not load roles");
      })
      .finally(() => {
        if (!cancelled) setRolesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canWrite, discordGuildId, modRolesOn]);

  const previewPath = `/s/${slug || discordGuildId}`;
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "";
  const inviteHref = clientId
    ? buildBotInviteUrl(clientId)
    : "https://discord.com/developers/applications";

  async function saveSettings() {
    if (!canWrite) return;
    setSaving(true);
    setSaveMsg(null);
    setSaveErr(null);
    try {
      const payload: Record<string, unknown> = {
        discordGuildId,
        public_page_enabled: reliabilityOn ? publicPage : false,
        public_member_list: publicMembers,
        list_in_directory: reliabilityOn ? listInDirectory : false,
        discord_invite_url: inviteUrl || null,
        slug: slug || null,
        hide_powered_by: hidePoweredBy,
        public_accent: accent || null,
      };
      if (reliabilityOn) {
        payload.grace_minutes = grace;
        payload.strike_threshold = threshold;
        payload.lockout_days = lockoutDays;
        payload.join_lockout_enforced = joinLockoutEnforced;
        const minRaw = joinMinGhostless.trim();
        payload.join_min_ghostless_pct =
          minRaw === "" ? null : Math.min(100, Math.max(1, Number(minRaw) || 0));
        if (
          payload.join_min_ghostless_pct === 0 ||
          !Number.isFinite(payload.join_min_ghostless_pct as number)
        ) {
          payload.join_min_ghostless_pct = null;
        }
        payload.ghostless_role_id = roleId || null;
        payload.digest_channel_id = digestChannel || null;
      }
      if (modRolesOn) {
        payload.mod_role_ids = modRoleIds;
      }
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
        vanityRejected?: boolean;
        ok?: boolean;
      };
      if (!res.ok) {
        setSaveErr(
          json.error
            ? `${json.error}${json.hint ? ` — ${json.hint}` : ""}`
            : `Save failed (${res.status})`,
        );
        return;
      }
      setSaveMsg(
        json.vanityRejected
          ? "Saved (Pro vanity fields skipped — upgrade for hide Powered by / accent)."
          : "Settings saved.",
      );
      router.refresh();
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function icalSubscribeUrl(token: string): string {
    const baseOrigin = origin || (typeof window !== "undefined" ? window.location.origin : "");
    return `${baseOrigin}/api/ical/${discordGuildId}?token=${encodeURIComponent(token)}`;
  }

  async function rotateOrClearIcal(action: "rotate" | "clear") {
    if (!canWrite || !pro) return;
    setIcalBusy(true);
    setIcalMsg(null);
    setSaveErr(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discordGuildId,
          rotate_ical_token: action === "rotate",
          clear_ical_token: action === "clear",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
        ical_token?: string | null;
      };
      if (!res.ok) {
        setIcalMsg(
          json.error
            ? `${json.error}${json.hint ? ` — ${json.hint}` : ""}`
            : `Failed (${res.status})`,
        );
        return;
      }
      setIcalToken(json.ical_token ?? null);
      setIcalMsg(
        action === "clear"
          ? "Calendar feed disabled."
          : "New subscribe URL ready — copy it below.",
      );
      router.refresh();
    } catch (err) {
      setIcalMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setIcalBusy(false);
    }
  }

  async function copyIcalUrl() {
    if (!icalToken) return;
    const url = icalSubscribeUrl(icalToken);
    try {
      await navigator.clipboard.writeText(url);
      setCopyMsg("Copied — paste into Apple / Google Calendar subscribe.");
    } catch {
      setCopyMsg(url);
    }
  }

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="font-display text-xl tracking-wide">Server</h2>
        <div className="rounded-brand border border-white/10 bg-slate-elevated/40 p-4 text-sm">
          <p>
            <span className="text-muted">Name</span> · {serverName}
          </p>
          <p className="mt-1">
            <span className="text-muted">Plan</span> · {plan}
            {priceLockCents != null
              ? ` · $${(priceLockCents / 100).toFixed(2)}/mo lock`
              : ""}
            {demoProUnlock && demoProPreview ? " · Pro preview" : ""}
          </p>
          <p className="mt-1 text-xs text-muted">
            Data source: {source}.{" "}
            {canWrite
              ? "Save writes server_settings when live."
              : "Demo changes stay in this browser tab (not saved)."}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl tracking-wide">Public page</h2>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={publicPage}
            disabled={starterLocked}
            onChange={(e) => setPublicPage(e.target.checked)}
            className="h-4 w-4 accent-coral disabled:cursor-not-allowed"
          />
          <span>Public page enabled</span>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={publicMembers}
            disabled={starterLocked}
            onChange={(e) => setPublicMembers(e.target.checked)}
            className="h-4 w-4 accent-lime disabled:cursor-not-allowed"
          />
          <span>Public Ghostless spotlight / list</span>
        </label>
        <label className="block max-w-md text-sm">
          <span className="text-muted">Vanity slug</span>
          <input
            type="text"
            value={slug}
            disabled={starterLocked}
            onChange={(e) =>
              setSlug(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, "")
                  .slice(0, 48),
              )
            }
            className="mt-1 w-full rounded-brand border border-white/15 bg-slate-elevated px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className="mt-1 block text-xs text-muted">
            <Link href={previewPath} className="text-coral hover:underline">
              {previewPath}
            </Link>
          </span>
        </label>

        <div className="max-w-md space-y-3 border-t border-white/10 pt-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={listInDirectory}
              disabled={starterLocked || !publicPage}
              onChange={(e) => setListInDirectory(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-coral disabled:cursor-not-allowed"
            />
            <span>
              <FieldInfo label="List in directory">
                Opt into{" "}
                <strong className="font-semibold text-white/90">/servers</strong>
                . Needs public page on + Community / trial / Pro. Shows name,
                icon, View → your /s page, and Join → your Discord invite. No
                cross-server Ghostless passport.
              </FieldInfo>
            </span>
          </label>
          <div className="block text-sm">
            <div className="text-muted">
              <FieldInfo label="Discord invite URL">
                Permanent or long-lived invite for the Join button on /servers.
                Use a{" "}
                <strong className="font-semibold text-white/90">
                  discord.gg
                </strong>{" "}
                or discord.com/invite link. Leave blank to hide Join until set.
              </FieldInfo>
            </div>
            <input
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://discord.gg/…"
              aria-label="Discord invite URL"
              value={inviteUrl}
              disabled={starterLocked}
              onChange={(e) => setInviteUrl(e.target.value)}
              className="mt-1 w-full rounded-brand border border-white/15 bg-slate-elevated px-3 py-2 text-white placeholder:text-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl tracking-wide">Pro vanity</h2>

        {demoProUnlock && demoProPreview ? (
          <p
            className="rounded-brand border border-lime/40 bg-lime/10 px-3 py-2 text-xs text-lime"
            role="status"
          >
            <span className="font-semibold uppercase tracking-wider">
              Demo · Pro preview
            </span>
            {" — "}
            Vanity controls unlocked locally. Not a purchase — Discord is
            unchanged. See a live Pro vanity card at{" "}
            <Link href="/s/founding-beta" className="underline hover:text-white">
              /s/founding-beta
            </Link>
            .
          </p>
        ) : null}

        {!pro ? (
          <div className="rounded-brand border border-coral/40 bg-coral/5 p-4 text-sm">
            <p className="text-muted">
              Hide “Powered by” and custom accent require Pro ($
              {PRO_PRICE_USD}/mo) or Founding Pro. Community can still set slug +
              public toggles.
            </p>
            {demoProUnlock ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setDemoProPreview(true);
                    setHidePoweredBy(true);
                    if (!accent) setAccent("#B8F000");
                  }}
                  className="mt-4 inline-block rounded-brand bg-coral px-4 py-2 text-sm font-semibold text-slate transition hover:brightness-110"
                >
                  Upgrade to Pro
                </button>
                <p className="mt-2 text-xs text-muted">
                  Demo only — unlocks a mock Pro vanity preview (not a
                  purchase).
                </p>
              </>
            ) : (
              <Link
                href={billingHref}
                className="mt-3 inline-block text-coral hover:underline"
              >
                Upgrade to Pro →
              </Link>
            )}
          </div>
        ) : null}

        {demoProUnlock && demoProPreview && !planIsPro ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDemoProPreview(false);
                setHidePoweredBy(base.hide_powered_by);
                setAccent(base.public_accent ?? "");
              }}
              className="rounded-brand border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:border-coral/50"
            >
              Back to locked view
            </button>
            <a
              href={inviteHref}
              className="rounded-brand bg-coral px-3 py-1.5 text-xs font-semibold text-slate transition hover:brightness-110"
            >
              Add to Discord
            </a>
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

        {pro ? (
          <div
            className="rounded-brand border border-white/10 bg-slate-elevated/40 px-4 py-3 text-xs text-muted"
            style={
              accent && /^#?[0-9a-fA-F]{6}$/.test(accent.trim())
                ? {
                    borderColor: `${accent.startsWith("#") ? accent : `#${accent}`}55`,
                  }
                : undefined
            }
          >
            Preview header chrome:{" "}
            {hidePoweredBy ? (
              <span className="text-lime/80">Founding / Pro · </span>
            ) : (
              <>
                Powered by <span className="text-coral">Rallied</span>
                {" · "}
              </>
            )}
            this Discord server only
          </div>
        ) : null}

        <p className="max-w-md text-xs text-muted">
          On Pro / Founding Pro, the public page shows your Discord server icon
          (top-right) instead of the Rallied mark. Icons sync when you log into
          the dashboard; if Discord has no icon, Rallied stays as the fallback.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl tracking-wide">Reliability rules</h2>
        {starterLocked || !reliabilityOn ? (
          <div className="rounded-brand border border-coral/35 bg-coral/10 px-4 py-3 text-sm text-white/85">
            <p className="font-medium text-coral">
              Ghostless &amp; strikes need Community
            </p>
            <p className="mt-1 text-white/65">
              Starter keeps LFG under caps for this server (2 open · 5
              creates/24h). Upgrade to Community (${COMMUNITY_PRICE_USD}/mo) to
              edit grace, strikes, and digest.
            </p>
            <Link
              href={billingHref}
              className="mt-2 inline-block font-semibold text-coral hover:underline"
            >
              Upgrade to Community →
            </Link>
          </div>
        ) : null}
        <fieldset
          disabled={!reliabilityOn}
          className={!reliabilityOn ? "space-y-4 opacity-50" : "space-y-4"}
        >
          <div className="block max-w-sm text-sm">
            <div className="text-muted">
              <FieldInfo label="Grace window (minutes)">
                Minutes after a ready-check before a no-show counts as a ghost /
                strike. Default is 5.
              </FieldInfo>
            </div>
            <input
              type="number"
              min={0}
              max={60}
              aria-label="Grace window (minutes)"
              value={grace}
              onChange={(e) => setGrace(Number(e.target.value))}
              className="mt-1 w-full rounded-brand border border-white/15 bg-slate-elevated px-3 py-2 text-white"
            />
          </div>
          <div className="block max-w-sm text-sm">
            <div className="text-muted">
              <FieldInfo label="Strike threshold → lockout">
                How many strikes before LFG lockout. Default is 3.
              </FieldInfo>
            </div>
            <input
              type="number"
              min={1}
              max={20}
              aria-label="Strike threshold → lockout"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="mt-1 w-full rounded-brand border border-white/15 bg-slate-elevated px-3 py-2 text-white"
            />
          </div>
          <div className="block max-w-sm text-sm">
            <div className="text-muted">
              <FieldInfo label="Lockout days">
                How long an LFG lockout lasts. Default is 7 days.
              </FieldInfo>
            </div>
            <input
              type="number"
              min={1}
              max={365}
              aria-label="Lockout days"
              value={lockoutDays}
              onChange={(e) => setLockoutDays(Number(e.target.value))}
              className="mt-1 w-full rounded-brand border border-white/15 bg-slate-elevated px-3 py-2 text-white"
            />
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={joinLockoutEnforced}
              onChange={(e) => setJoinLockoutEnforced(e.target.checked)}
              className="h-4 w-4 accent-coral"
            />
            <span>
              <FieldInfo label="Enforce lockout on Join">
                When on, locked-out members cannot Join (or Create). Off =
                lockouts still exist but Join is not blocked. Starter ignores
                this gate.
              </FieldInfo>
            </span>
          </label>
          <div className="block max-w-sm text-sm">
            <div className="text-muted">
              <FieldInfo label="Min Ghostless % to Join">
                Optional. Reject Join when a member&apos;s show rate is below
                this (e.g. 80). Leave blank to turn off. New players with no
                history are allowed. Community+ only.
              </FieldInfo>
            </div>
            <input
              type="number"
              min={1}
              max={100}
              placeholder="Off"
              aria-label="Min Ghostless % to Join"
              value={joinMinGhostless}
              onChange={(e) => setJoinMinGhostless(e.target.value)}
              className="mt-1 w-full rounded-brand border border-white/15 bg-slate-elevated px-3 py-2 text-white placeholder:text-muted/50"
            />
          </div>
          <div className="block max-w-md text-sm">
            <div className="text-muted">
              <FieldInfo label="Ghostless Discord role ID">
                Optional. Paste a Discord{" "}
                <strong className="font-semibold text-white/90">role</strong> ID
                to auto-assign Ghostless. Developer Mode → Roles → Copy Role ID.
                Leave blank to skip.
              </FieldInfo>
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Role ID"
              aria-label="Ghostless Discord role ID"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="mt-1 w-full rounded-brand border border-white/15 bg-slate-elevated px-3 py-2 text-white placeholder:text-muted/50"
            />
          </div>
          <div className="block max-w-md text-sm">
            <div className="text-muted">
              <FieldInfo label="Weekly digest channel ID">
                Optional. Paste a Discord{" "}
                <strong className="font-semibold text-white/90">channel</strong>{" "}
                ID for the weekly digest. Right-click channel → Copy Channel ID.
                Leave blank to skip.
              </FieldInfo>
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Channel ID"
              aria-label="Weekly digest channel ID"
              value={digestChannel}
              onChange={(e) => setDigestChannel(e.target.value)}
              className="mt-1 w-full rounded-brand border border-white/15 bg-slate-elevated px-3 py-2 text-white placeholder:text-muted/50"
            />
          </div>
          <p className="max-w-md text-xs text-muted">
            Developer Mode must be on in Discord to copy role and channel IDs.
          </p>
        </fieldset>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl tracking-wide">Rallied Mod access</h2>
        <div className="block max-w-md text-sm">
          <div className="text-muted">
            <FieldInfo label="Rallied Mod roles">
              Community+ only. Members with any selected Discord role can open{" "}
              <strong className="font-semibold text-white/90">
                Overview, LFG, People, Disputes, Analytics
              </strong>{" "}
              after Log in (bot must be present). They cannot change Settings or
              Billing — owners keep Manage Server for that. Starter: upgrade to
              Community. Re-login after granting a role.
            </FieldInfo>
          </div>
          {!modRolesOn ? (
            <div className="mt-2 rounded-brand border border-coral/35 bg-coral/10 px-3 py-2 text-xs text-white/80">
              Rallied Mod roles need Community (or trial / Pro).{" "}
              <Link
                href={billingHref}
                className="font-semibold text-coral hover:underline"
              >
                Upgrade →
              </Link>
            </div>
          ) : (
            <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto rounded-brand border border-white/10 bg-slate-elevated/40 p-2">
              {rolesLoading ? (
                <p className="px-1 py-1 text-xs text-muted">
                  Loading Discord roles…
                </p>
              ) : null}
              {rolesErr ? (
                <p className="px-1 py-1 text-xs text-coral">{rolesErr}</p>
              ) : null}
              {!rolesLoading && !rolesErr && discordRoles.length === 0 ? (
                <p className="px-1 py-1 text-xs text-muted">
                  No roles returned. Ensure the bot is in this server.
                </p>
              ) : null}
              {discordRoles.map((role) => {
                const checked = modRoleIds.includes(role.id);
                return (
                  <label
                    key={role.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!canWrite && !demoProUnlock}
                      onChange={(e) => {
                        setModRoleIds((prev) =>
                          e.target.checked
                            ? [...prev, role.id]
                            : prev.filter((id) => id !== role.id),
                        );
                      }}
                      className="h-4 w-4 accent-coral disabled:cursor-not-allowed"
                    />
                    <span
                      className="size-2.5 shrink-0 rounded-sm"
                      style={{
                        backgroundColor: role.color
                          ? `#${role.color.toString(16).padStart(6, "0")}`
                          : "#94a3b8",
                      }}
                      aria-hidden
                    />
                    <span className="truncate text-white/85">{role.name}</span>
                    {role.managed ? (
                      <span className="text-[10px] uppercase tracking-wide text-muted">
                        bot
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          )}
          {modRolesOn && modRoleIds.length > 0 ? (
            <p className="mt-1.5 text-xs text-muted">
              {modRoleIds.length} role{modRoleIds.length === 1 ? "" : "s"}{" "}
              selected for Rallied Mod access.
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl tracking-wide">
          Calendar subscribe (Pro)
        </h2>
        {!pro ? (
          <div className="rounded-brand border border-coral/35 bg-coral/10 px-4 py-3 text-sm text-white/85">
            <p className="font-medium text-coral">Pro / Founding only</p>
            <p className="mt-1 text-white/65">
              Subscribe URL returns upcoming{" "}
              <code className="text-coral">scheduled_start_at</code> parties as
              a free <code className="text-white/80">.ics</code> feed from our
              Worker — not Google Calendar API, no OAuth, no third-party SaaS.
            </p>
            <Link
              href={billingHref}
              className="mt-2 inline-block font-semibold text-coral hover:underline"
            >
              Upgrade to Pro →
            </Link>
          </div>
        ) : (
          <div className="max-w-xl space-y-3 text-sm">
            <p className="text-muted">
              Subscribe in Apple Calendar or Google Calendar with the URL below.
              Their app polls our Worker (~every 15 min cache). Only parties with
              a scheduled start in the next 60 days appear.
            </p>
            {icalToken ? (
              <div className="space-y-2">
                <code className="block break-all rounded-brand border border-white/10 bg-slate-elevated/50 px-3 py-2 text-xs text-white/85">
                  {origin
                    ? icalSubscribeUrl(icalToken)
                    : `/api/ical/${discordGuildId}?token=…`}
                </code>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyIcalUrl()}
                    className="rounded-brand border border-lime/40 px-3 py-1.5 text-xs font-semibold text-lime transition hover:bg-lime/10"
                  >
                    Copy subscribe URL
                  </button>
                  <button
                    type="button"
                    disabled={!canWrite || icalBusy}
                    onClick={() => void rotateOrClearIcal("rotate")}
                    className="rounded-brand border border-white/20 px-3 py-1.5 text-xs text-white/85 disabled:opacity-40"
                  >
                    Rotate token
                  </button>
                  <button
                    type="button"
                    disabled={!canWrite || icalBusy}
                    onClick={() => void rotateOrClearIcal("clear")}
                    className="rounded-brand border border-coral/30 px-3 py-1.5 text-xs text-coral/90 disabled:opacity-40"
                  >
                    Disable feed
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={!canWrite || icalBusy}
                onClick={() => void rotateOrClearIcal("rotate")}
                className="rounded-brand bg-coral px-4 py-2 text-sm font-semibold text-slate disabled:opacity-40"
              >
                {icalBusy ? "Generating…" : "Generate subscribe URL"}
              </button>
            )}
            {copyMsg ? (
              <p className="text-xs text-lime break-all">{copyMsg}</p>
            ) : null}
            {icalMsg ? (
              <p className="text-xs text-muted">{icalMsg}</p>
            ) : null}
            {!canWrite ? (
              <p className="text-xs text-muted">
                Live guild required to create or rotate the token.
              </p>
            ) : null}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canWrite || saving}
          onClick={() => void saveSettings()}
          className="rounded-brand bg-coral px-4 py-2 text-sm font-semibold text-slate disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {!canWrite ? (
          <p className="text-xs text-muted">
            {demoProUnlock
              ? "Demo settings are local preview only."
              : <>
                  Needs live guild +{" "}
                  <code className="text-coral">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
                  on the web Worker.
                </>}
          </p>
        ) : null}
        {saveMsg ? <p className="text-xs text-lime">{saveMsg}</p> : null}
        {saveErr ? <p className="text-xs text-coral">{saveErr}</p> : null}
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-xl tracking-wide">Billing snapshot</h2>
        <p className="text-sm text-muted">
          Per Discord server: Community ${COMMUNITY_PRICE_USD} · Pro $
          {PRO_PRICE_USD} · Founding Pro ${PLANS.founding_pro.priceMonthly}{" "}
          locked (≤{PLANS.founding_pro.seatCap}).{" "}
          <Link href={billingHref} className="text-coral hover:underline">
            Open billing
          </Link>
        </p>
      </section>
    </div>
  );
}
