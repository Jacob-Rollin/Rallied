-- Phase 1 LFG parity: temp voice, waitlist role, filters, one-shot schedule.
-- Apply in Supabase SQL editor (or CLI) before deploying the bot that reads these columns.

-- ---------------------------------------------------------------------------
-- Party filters + voice + schedule
-- ---------------------------------------------------------------------------
alter table public.lfg_parties
  add column if not exists discord_voice_channel_id text,
  add column if not exists mic text not null default '',
  add column if not exists region text not null default '',
  add column if not exists scheduled_start_at timestamptz,
  add column if not exists schedule_reminder_sent_at timestamptz;

comment on column public.lfg_parties.discord_voice_channel_id is
  'Temp Discord voice channel for this party; deleted on close/expire.';
comment on column public.lfg_parties.mic is
  'Mic preference: Required | Optional | Any | empty.';
comment on column public.lfg_parties.region is
  'Free-text region / platform filter (e.g. NA, EU, West).';
comment on column public.lfg_parties.rank_text is
  'Rank / MMR / notes filter text shown on the card.';
comment on column public.lfg_parties.scheduled_start_at is
  'Optional one-shot start time; Worker pings ~T-10m.';
comment on column public.lfg_parties.schedule_reminder_sent_at is
  'Set when the T-10m (or overdue) reminder was sent.';

create index if not exists lfg_parties_schedule_remind_idx
  on public.lfg_parties (scheduled_start_at)
  where scheduled_start_at is not null
    and schedule_reminder_sent_at is null
    and deleted_at is null
    and status in ('open', 'filled');

-- ---------------------------------------------------------------------------
-- Waitlist: party member role may be waitlist (not counted toward slots)
-- ---------------------------------------------------------------------------
alter table public.lfg_party_members
  drop constraint if exists lfg_party_members_role_check;

alter table public.lfg_party_members
  add constraint lfg_party_members_role_check
  check (role in ('host', 'member', 'waitlist'));

create index if not exists lfg_party_members_waitlist_idx
  on public.lfg_party_members (party_id, joined_at)
  where role = 'waitlist';
