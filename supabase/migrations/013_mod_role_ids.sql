-- Rallied 013 — Rallied Mod Discord role ids for Community+ dashboard access
-- Safe to re-run (IF NOT EXISTS).
-- Phone paste: store docs/rallied-supabase-013-mod-role-ids.sql

alter table public.server_settings
  add column if not exists mod_role_ids text[] not null default '{}';

comment on column public.server_settings.mod_role_ids is
  'Discord role ids that grant Rallied Mod dashboard access (Overview/LFG/People/Disputes/Analytics). Community+ only; empty = mods off. Owners (Manage Guild) always full access.';
