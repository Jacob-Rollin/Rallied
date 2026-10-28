-- Ready check + grace no-show tracking (Phase 1 Play mock parity).
alter table public.lfg_party_members
  add column if not exists ready_at timestamptz;

alter table public.lfg_parties
  add column if not exists ready_check_started_at timestamptz,
  add column if not exists ready_check_message_id text,
  add column if not exists ready_check_channel_id text,
  add column if not exists grace_ends_at timestamptz,
  add column if not exists ready_check_resolved_at timestamptz;

create index if not exists lfg_parties_expires_open_idx
  on public.lfg_parties (expires_at)
  where status = 'open' and deleted_at is null;

create index if not exists lfg_parties_grace_pending_idx
  on public.lfg_parties (grace_ends_at)
  where grace_ends_at is not null and ready_check_resolved_at is null;
