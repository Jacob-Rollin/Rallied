-- Rallied 015 — Feedback / bug reports inbox (ops dashboard)
-- Safe to re-run (IF NOT EXISTS).
-- Phone paste: store docs/rallied-supabase-015-feedback.sql
--
-- Anyone can submit via bot /feedback or web Report (service role inserts).
-- Ops triage via /ops allowlisted by OPS_DISCORD_IDS (web Worker).
-- Status workflow: new → triaging → done | wontfix

create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null
    check (kind in ('bug', 'suggestion')),
  surface text not null
    check (surface in ('bot', 'web', 'discord')),
  status text not null default 'new'
    check (status in ('new', 'triaging', 'done', 'wontfix')),
  title text not null,
  details text not null default '',
  reporter_discord_user_id text not null,
  reporter_display_name text not null default '',
  discord_guild_id text,
  guild_name text,
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.feedback_reports is
  'Product feedback + bug reports. Submitted from Discord /feedback or web Report. Triaged on /ops (OPS_DISCORD_IDS allowlist).';

comment on column public.feedback_reports.kind is
  'bug | suggestion';

comment on column public.feedback_reports.surface is
  'Where it was filed: bot | web | discord (channel posts optional)';

comment on column public.feedback_reports.status is
  'new → triaging → done | wontfix';

comment on column public.feedback_reports.internal_note is
  'Ops-only note; never shown to reporters';

create index if not exists feedback_reports_status_created_idx
  on public.feedback_reports (status, created_at desc);

create index if not exists feedback_reports_kind_idx
  on public.feedback_reports (kind);

create index if not exists feedback_reports_reporter_idx
  on public.feedback_reports (reporter_discord_user_id);

create index if not exists feedback_reports_guild_idx
  on public.feedback_reports (discord_guild_id)
  where discord_guild_id is not null;

alter table public.feedback_reports enable row level security;
-- Service role bypasses RLS. No anon policies — web/bot use SUPABASE_SERVICE_ROLE_KEY.
