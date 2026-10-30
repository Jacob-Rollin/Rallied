-- Rallied 016 — Data retention: survive setup/reinstall; soft-archive after inactivity
-- Safe to re-run (IF NOT EXISTS).
-- Phone paste: store docs/rallied-supabase-016-data-retention.sql
--
-- Product rules (locked):
--   * /setup and bot reinstall NEVER delete servers or child history
--     (parties, members, ghostless_stats, vibes, strikes, server_events).
--   * Soft-closed parties (deleted_at) stay for monthly Top hosts / host credit.
--   * Optional soft-archive after SERVER_INACTIVE_PURGE_DAYS (90) with no
--     party creates / server_events / servers.updated_at activity.
--   * forever_pro / Official never archived unless RETENTION_INCLUDE_FOREVER_PRO.
--
-- Ops note — list inactive candidates (90 days):
--   with last_seen as (
--     select s.id, s.discord_guild_id, s.forever_pro, s.plan,
--       greatest(
--         s.updated_at,
--         coalesce((select max(p.created_at) from public.lfg_parties p where p.server_id = s.id), s.created_at),
--         coalesce((select max(e.created_at) from public.server_events e where e.server_id = s.id), s.created_at)
--       ) as last_activity_at
--     from public.servers s
--     where s.archived_at is null
--   )
--   select * from last_seen
--   where last_activity_at < now() - interval '90 days'
--     and coalesce(forever_pro, false) = false
--     and plan is distinct from 'founding_pro';
--
-- Soft-archive (conservative; never Official without intent):
--   update public.servers set archived_at = now(), updated_at = now()
--   where id in (/* ids from query above */)
--     and archived_at is null
--     and coalesce(forever_pro, false) = false;
--
-- Un-archive / restore visibility:
--   update public.servers set archived_at = null where discord_guild_id = '…';
--
-- Do NOT delete servers rows on bot leave (same as trial_consumed_at policy).

alter table public.servers
  add column if not exists archived_at timestamptz;

comment on column public.servers.archived_at is
  'Soft-archive after prolonged inactivity (default 90 days). Never set by /setup or bot leave. forever_pro / Official excluded unless ops flag.';

create index if not exists servers_archived_at_idx
  on public.servers (archived_at)
  where archived_at is not null;

comment on table public.lfg_parties is
  'LFG parties. deleted_at = soft-close for Find/open UI; rows remain for Top hosts host credit until inactivity archive. Do not hard-delete on a 14-day timer.';
