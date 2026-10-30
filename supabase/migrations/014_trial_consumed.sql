-- Rallied 014 — One Community trial per Discord guild (anti-farming)
-- Safe to re-run (IF NOT EXISTS).
-- Phone paste: store docs/rallied-supabase-014-trial-consumed.sql
--
-- Uninstall must NOT delete servers rows — trial_consumed_at survives reinstall.
-- Support reset (Jacob only):
--   update public.servers set trial_consumed_at = null where discord_guild_id = '…';

alter table public.servers
  add column if not exists trial_consumed_at timestamptz;

comment on column public.servers.trial_consumed_at is
  'When set, this discord_guild_id already used its one Community trial. Never clear on bot leave, cancel, or lapse. Null = eligible for Stripe Checkout trial_period_days (Community only). Support may null it via SQL.';

create index if not exists servers_trial_consumed_at_idx
  on public.servers (trial_consumed_at)
  where trial_consumed_at is not null;

-- Backfill: any guild that already had a trial clock or paid/lapsed plan
-- has consumed eligibility (no second free trial after reinstall).
update public.servers
set trial_consumed_at = coalesce(
  trial_ends_at - interval '14 days',
  created_at,
  now()
)
where trial_consumed_at is null
  and (
    trial_ends_at is not null
    or plan in ('trial', 'community', 'pro', 'founding_pro', 'lapsed')
  );
