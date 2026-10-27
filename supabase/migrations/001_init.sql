-- Rallied Phase 1 schema
-- All reputation / strikes / Ghostless aggregates are per-server (guild) only.
-- No cross-server public grade tables.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- servers
-- ---------------------------------------------------------------------------
create table public.servers (
  id uuid primary key default gen_random_uuid(),
  discord_guild_id text not null unique,
  name text not null default '',
  plan text not null default 'free'
    check (plan in ('free', 'community', 'pro')),
  stripe_customer_id text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index servers_discord_guild_id_idx on public.servers (discord_guild_id);

-- ---------------------------------------------------------------------------
-- members (per-server Discord users)
-- ---------------------------------------------------------------------------
create table public.members (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  discord_user_id text not null,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (server_id, discord_user_id)
);

create index members_server_id_idx on public.members (server_id);
create index members_discord_user_id_idx on public.members (discord_user_id);

-- ---------------------------------------------------------------------------
-- lfg_parties
-- Soft-delete / purge: closed or expired parties older than 14 days may be
-- hard-deleted by a scheduled job (see comment on deleted_at). Prefer purge
-- over unbounded growth on free-tier Supabase.
-- ---------------------------------------------------------------------------
create table public.lfg_parties (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  host_member_id uuid not null references public.members (id) on delete cascade,
  game text not null,
  rank_text text not null default '',
  slots int not null default 5 check (slots between 2 and 20),
  status text not null default 'open'
    check (status in ('open', 'filled', 'closed')),
  expires_at timestamptz,
  discord_message_id text,
  discord_channel_id text,
  deleted_at timestamptz, -- set on soft-close; purge rows where deleted_at < now() - interval '14 days'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lfg_parties_server_id_idx on public.lfg_parties (server_id);
create index lfg_parties_status_idx on public.lfg_parties (server_id, status)
  where deleted_at is null;
create index lfg_parties_purge_idx on public.lfg_parties (deleted_at)
  where deleted_at is not null;

-- ---------------------------------------------------------------------------
-- lfg_party_members
-- ---------------------------------------------------------------------------
create table public.lfg_party_members (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.lfg_parties (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  role text not null default 'member'
    check (role in ('host', 'member')),
  joined_at timestamptz not null default now(),
  unique (party_id, member_id)
);

create index lfg_party_members_party_id_idx on public.lfg_party_members (party_id);
create index lfg_party_members_member_id_idx on public.lfg_party_members (member_id);

-- ---------------------------------------------------------------------------
-- vibe_checks (post-session feedback; scoped via party → server)
-- ---------------------------------------------------------------------------
create table public.vibe_checks (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.lfg_parties (id) on delete cascade,
  rater_id uuid not null references public.members (id) on delete cascade,
  ratee_id uuid not null references public.members (id) on delete cascade,
  showed_up boolean not null default true,
  vibe_score smallint check (vibe_score is null or vibe_score between 1 and 5),
  ghosted boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  unique (party_id, rater_id, ratee_id),
  check (rater_id <> ratee_id)
);

create index vibe_checks_party_id_idx on public.vibe_checks (party_id);
create index vibe_checks_ratee_id_idx on public.vibe_checks (ratee_id);

-- ---------------------------------------------------------------------------
-- strikes — THIS SERVER ONLY
-- ---------------------------------------------------------------------------
create table public.strikes (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  reason text not null default '',
  created_by uuid references public.members (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index strikes_server_member_idx on public.strikes (server_id, member_id);
create index strikes_active_idx on public.strikes (server_id, member_id)
  where active = true;

-- ---------------------------------------------------------------------------
-- lockouts — THIS SERVER ONLY (temp LFG ban)
-- ---------------------------------------------------------------------------
create table public.lockouts (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  until timestamptz not null,
  reason text not null default '',
  created_at timestamptz not null default now()
);

create index lockouts_server_member_idx on public.lockouts (server_id, member_id);
create index lockouts_active_until_idx on public.lockouts (server_id, member_id, until);

-- ---------------------------------------------------------------------------
-- ghostless_stats — per server_id + member_id aggregates
-- NO cross-server public grades. Refresh via trigger or app upsert.
-- ---------------------------------------------------------------------------
create table public.ghostless_stats (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  shows int not null default 0,
  ghosts int not null default 0,
  vibe_sum int not null default 0,
  vibe_count int not null default 0,
  updated_at timestamptz not null default now(),
  unique (server_id, member_id)
);

create index ghostless_stats_server_member_idx
  on public.ghostless_stats (server_id, member_id);

-- Convenience view (same scope; for dashboard reads)
create or replace view public.ghostless_stats_view as
select
  gs.server_id,
  gs.member_id,
  gs.shows,
  gs.ghosts,
  gs.vibe_count,
  case when gs.vibe_count > 0
    then round(gs.vibe_sum::numeric / gs.vibe_count, 2)
    else null
  end as vibe_avg,
  case
    when (gs.shows + gs.ghosts) = 0 then null
    else round(gs.shows::numeric / (gs.shows + gs.ghosts) * 100, 1)
  end as show_rate_pct,
  gs.updated_at
from public.ghostless_stats gs;

comment on table public.ghostless_stats is
  'Per-guild Ghostless aggregates only. Never join across servers for a public grade.';

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger servers_updated_at
  before update on public.servers
  for each row execute function public.set_updated_at();

create trigger members_updated_at
  before update on public.members
  for each row execute function public.set_updated_at();

create trigger lfg_parties_updated_at
  before update on public.lfg_parties
  for each row execute function public.set_updated_at();

create trigger ghostless_stats_updated_at
  before update on public.ghostless_stats
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- Bot uses the service_role key (bypasses RLS).
-- Dashboard later: Discord OAuth → map to server membership; policies below
-- are stubs for authenticated reads when you wire auth.
-- ---------------------------------------------------------------------------
alter table public.servers enable row level security;
alter table public.members enable row level security;
alter table public.lfg_parties enable row level security;
alter table public.lfg_party_members enable row level security;
alter table public.vibe_checks enable row level security;
alter table public.strikes enable row level security;
alter table public.lockouts enable row level security;
alter table public.ghostless_stats enable row level security;

-- Service role bypasses RLS automatically (Supabase). No policies needed for bot.

-- Stub: authenticated users can read servers (tighten to Discord OAuth guild claims later)
-- create policy servers_select_authenticated on public.servers
--   for select to authenticated using (true);
--
-- Stub: authenticated read members of servers they admin (replace with JWT guild claims)
-- create policy members_select_authenticated on public.members
--   for select to authenticated using (true);
--
-- Same pattern for lfg_parties, strikes, lockouts, ghostless_stats — all filtered by
-- server_id the JWT claims the user can manage. Do NOT expose anon public grades.

-- Deny-by-default for anon: no policies → no access via anon key until OAuth is wired.
