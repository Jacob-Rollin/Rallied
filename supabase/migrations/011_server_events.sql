-- Lightweight per-server event log (standby promotes, ready-check outcomes).
-- Soft-fail reads when empty — older guilds simply show empty states until new activity.

create table if not exists public.server_events (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  event_type text not null,
  party_id uuid references public.lfg_parties (id) on delete set null,
  member_id uuid references public.members (id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists server_events_server_type_created_idx
  on public.server_events (server_id, event_type, created_at desc);

create index if not exists server_events_server_created_idx
  on public.server_events (server_id, created_at desc);

comment on table public.server_events is
  'Minimal audit/metrics bus: waitlist_promote, ready_check_resolved, etc. Bot soft-fails inserts.';

alter table public.server_events enable row level security;
