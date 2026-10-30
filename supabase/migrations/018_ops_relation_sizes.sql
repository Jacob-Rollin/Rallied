-- Ops Usage: relation size helper for /ops/usage (service role / Management API fallback).
-- Returns pg_total_relation_size for named public tables. SECURITY DEFINER; revoke from anon/authenticated.

create or replace function public.ops_relation_sizes(table_names text[])
returns table (
  table_name text,
  total_bytes bigint,
  size_pretty text
)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select
    t.relname::text as table_name,
    pg_total_relation_size(t.oid)::bigint as total_bytes,
    pg_size_pretty(pg_total_relation_size(t.oid)) as size_pretty
  from pg_class t
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relkind = 'r'
    and t.relname = any (table_names);
$$;

comment on function public.ops_relation_sizes(text[]) is
  'Ops Usage: total relation sizes (table+indexes) for free-tier watch. Call via service role only.';

revoke all on function public.ops_relation_sizes(text[]) from public;
revoke all on function public.ops_relation_sizes(text[]) from anon, authenticated;
grant execute on function public.ops_relation_sizes(text[]) to service_role;

create or replace function public.ops_database_size()
returns table (
  total_bytes bigint,
  size_pretty text
)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select
    pg_database_size(current_database())::bigint as total_bytes,
    pg_size_pretty(pg_database_size(current_database())) as size_pretty;
$$;

comment on function public.ops_database_size() is
  'Ops Usage: current database size estimate. Call via service role only.';

revoke all on function public.ops_database_size() from public;
revoke all on function public.ops_database_size() from anon, authenticated;
grant execute on function public.ops_database_size() to service_role;
