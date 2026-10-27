-- Public player-facing pages (per-server). Strikes stay private — never expose on public routes.

alter table public.server_settings
  add column if not exists slug text,
  add column if not exists public_page_enabled boolean not null default true,
  add column if not exists public_member_list boolean not null default false;

-- Unique slug when set (nulls allowed for multiple unset)
create unique index if not exists server_settings_slug_uidx
  on public.server_settings (slug)
  where slug is not null;

comment on column public.server_settings.slug is
  'Optional vanity path for /s/[slug]. Falls back to discord_guild_id.';
comment on column public.server_settings.public_page_enabled is
  'When false, /s/[slug] returns not found / disabled.';
comment on column public.server_settings.public_member_list is
  'When true, show Ghostless spotlight/list on public page. Default false = Ghostless-only spotlight still OK for top reliable; prefer Ghostless-only when false (no full directory). Strikes never public.';

-- Seed-friendly: leave slug null until admin sets it in dashboard.
