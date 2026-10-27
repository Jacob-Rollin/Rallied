-- Optional demo data for local / staging. Safe to re-run only on empty tables.
-- IDs are fixed UUIDs so the web mock layer can stay aligned if desired.

insert into public.servers (id, discord_guild_id, name, plan)
values
  ('11111111-1111-1111-1111-111111111111', 'demo-guild-1', 'Demo Esports Lounge', 'community')
on conflict (discord_guild_id) do nothing;

insert into public.members (id, server_id, discord_user_id, display_name, avatar_url)
values
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'user-aria', 'Aria', null),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'user-ben', 'Ben', null),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'user-casey', 'Casey', null),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'user-dev', 'Dev', null)
on conflict (server_id, discord_user_id) do nothing;

insert into public.lfg_parties (id, server_id, host_member_id, game, rank_text, slots, status, expires_at)
values
  (
    '33333333-3333-3333-3333-333333333301',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222201',
    'Valorant',
    'Diamond+',
    5,
    'open',
    now() + interval '2 hours'
  ),
  (
    '33333333-3333-3333-3333-333333333302',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222203',
    'League of Legends',
    'Gold–Plat',
    5,
    'filled',
    now() + interval '1 hour'
  )
on conflict (id) do nothing;

insert into public.lfg_party_members (party_id, member_id, role)
values
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'host'),
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222202', 'member'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222203', 'host'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222201', 'member'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222204', 'member')
on conflict (party_id, member_id) do nothing;

insert into public.ghostless_stats (server_id, member_id, shows, ghosts, vibe_sum, vibe_count)
values
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 18, 1, 72, 16),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', 9, 3, 28, 8),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', 22, 0, 95, 20),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222204', 4, 2, 12, 4)
on conflict (server_id, member_id) do nothing;

insert into public.strikes (server_id, member_id, reason, created_by, active)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222202',
    'No-show after ready check',
    '22222222-2222-2222-2222-222222222201',
    true
  );

insert into public.lockouts (server_id, member_id, until, reason)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222204',
    now() + interval '3 days',
    'Repeated ghosts this server'
  );

-- Phase 1.5 / public pages settings + sample dispute (run after 002 + 003)
insert into public.server_settings (
  server_id, grace_minutes, strike_threshold, lockout_days,
  slug, public_page_enabled, public_member_list
)
values (
  '11111111-1111-1111-1111-111111111111', 5, 3, 7,
  'demo-esports', true, false
)
on conflict (server_id) do update
  set grace_minutes = excluded.grace_minutes,
      slug = excluded.slug,
      public_page_enabled = excluded.public_page_enabled,
      public_member_list = excluded.public_member_list;

insert into public.disputes (server_id, strike_id, opener_member_id, status, notes)
select
  '11111111-1111-1111-1111-111111111111',
  s.id,
  '22222222-2222-2222-2222-222222222202',
  'open',
  'I was in VC — lag kicked me'
from public.strikes s
where s.server_id = '11111111-1111-1111-1111-111111111111'
limit 1;
