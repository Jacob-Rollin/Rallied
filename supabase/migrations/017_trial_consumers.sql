-- Rallied 017 — One Community trial per Discord user (Checkout initiator)
-- Safe to re-run (IF NOT EXISTS).
-- Phone paste: store docs/rallied-supabase-017-trial-per-user.sql
--
-- Complements servers.trial_consumed_at (014): trial requires BOTH guild and
-- user eligibility. Cancelling and creating a new server must NOT grant
-- another trial to the same Discord user.
-- Never clear on cancel / leave / reinstall. Support may delete a row via SQL.

create table if not exists public.trial_consumers (
  discord_user_id text primary key,
  trial_consumed_at timestamptz not null default now(),
  first_guild_id text
);

comment on table public.trial_consumers is
  'Discord users who already consumed their one Community Checkout trial. PK = discord_user_id of the session that started Checkout. Never clear on cancel/leave/reinstall.';

comment on column public.trial_consumers.discord_user_id is
  'Discord snowflake of the user who started Checkout / owns the billing session.';

comment on column public.trial_consumers.trial_consumed_at is
  'When this user first entered a Community trial (Checkout completed or subscription trialing). Never clear.';

comment on column public.trial_consumers.first_guild_id is
  'Optional discord_guild_id of the first guild where this user consumed a trial (audit only).';

create index if not exists trial_consumers_consumed_at_idx
  on public.trial_consumers (trial_consumed_at);
