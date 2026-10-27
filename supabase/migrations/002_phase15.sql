-- Rallied Phase 1.5 — settings, disputes, dashboard users
-- Still per-server only. No cross-server grades.

-- ---------------------------------------------------------------------------
-- dashboard_users — Discord OAuth admins (no email/password)
-- ---------------------------------------------------------------------------
create table if not exists public.dashboard_users (
  discord_user_id text primary key,
  username text not null default '',
  global_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- server_settings — one row per server (grace, roles, digest, strike ladder)
-- ---------------------------------------------------------------------------
create table if not exists public.server_settings (
  server_id uuid primary key references public.servers (id) on delete cascade,
  grace_minutes int not null default 5 check (grace_minutes between 0 and 60),
  ghostless_role_id text,           -- Discord role id; null = skip auto-assign
  ghostless_role_threshold_pct numeric(5,2) not null default 90
    check (ghostless_role_threshold_pct between 0 and 100),
  ghostless_role_min_sessions int not null default 10,
  digest_channel_id text,           -- Discord channel for weekly digest; null = log only
  strike_threshold int not null default 3 check (strike_threshold between 1 and 20),
  lockout_days int not null default 7 check (lockout_days between 1 and 90),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger server_settings_updated_at
  before update on public.server_settings
  for each row execute function public.set_updated_at();

create trigger dashboard_users_updated_at
  before update on public.dashboard_users
  for each row execute function public.set_updated_at();

-- Auto-create settings when a server is inserted
create or replace function public.ensure_server_settings()
returns trigger
language plpgsql
as $$
begin
  insert into public.server_settings (server_id)
  values (new.id)
  on conflict (server_id) do nothing;
  return new;
end;
$$;

drop trigger if exists servers_ensure_settings on public.servers;
create trigger servers_ensure_settings
  after insert on public.servers
  for each row execute function public.ensure_server_settings();

-- Backfill settings for existing servers
insert into public.server_settings (server_id)
select id from public.servers
on conflict (server_id) do nothing;

-- ---------------------------------------------------------------------------
-- disputes — appeal a strike or vibe ghost flag (this server)
-- ---------------------------------------------------------------------------
create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  strike_id uuid references public.strikes (id) on delete set null,
  vibe_check_id uuid references public.vibe_checks (id) on delete set null,
  opener_member_id uuid not null references public.members (id) on delete cascade,
  status text not null default 'open'
    check (status in ('open', 'upheld', 'overturned')),
  resolver_member_id uuid references public.members (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (strike_id is not null or vibe_check_id is not null)
);

create index disputes_server_status_idx on public.disputes (server_id, status);
create index disputes_opener_idx on public.disputes (opener_member_id);

comment on table public.disputes is
  'Per-guild dispute queue. Resolve via /strikes or admin web. Never global.';

comment on column public.server_settings.grace_minutes is
  'Minutes late that do NOT count as a no-show / ghost for strike logic (default 5).';

-- ---------------------------------------------------------------------------
-- RLS stubs (service role bypasses; tighten with Discord OAuth JWT later)
-- ---------------------------------------------------------------------------
alter table public.dashboard_users enable row level security;
alter table public.server_settings enable row level security;
alter table public.disputes enable row level security;

-- Deny-by-default for anon until OAuth claims are wired.
