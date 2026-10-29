-- Opt-in public /servers directory (discovery without cross-server player grades).

alter table public.server_settings
  add column if not exists list_in_directory boolean not null default false,
  add column if not exists discord_invite_url text;

comment on column public.server_settings.list_in_directory is
  'When true (and public_page_enabled + Community+/trial), appear on /servers. Default false — opt-in only.';
comment on column public.server_settings.discord_invite_url is
  'Discord invite URL for Join on /servers (discord.gg / discord.com/invite). Set by admin in Settings.';

-- Paste-ready for dogfood (same as migration):
-- alter table public.server_settings
--   add column if not exists list_in_directory boolean not null default false,
--   add column if not exists discord_invite_url text;
