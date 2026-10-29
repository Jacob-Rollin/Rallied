-- Pro vanity: Discord guild icon on public /s pages
alter table public.servers
  add column if not exists icon_url text;

comment on column public.servers.icon_url is
  'CDN URL for Discord guild icon; Pro public page uses this instead of Rallied square.';
