-- Pro plan + Founding Pro price lock + vanity / priority flags
-- Founding = Pro features at $8.99 (899 cents), NOT Community $3.99.

-- Widen plan check (drop old constraint if present from 001)
alter table public.servers drop constraint if exists servers_plan_check;

alter table public.servers
  add column if not exists price_lock_cents int,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists priority_support boolean not null default false;

-- Existing rows may be 'free' from 001 — map to community-ish demo later; allow new values
alter table public.servers
  alter column plan set default 'trial';

alter table public.servers
  add constraint servers_plan_check
  check (plan in ('trial', 'community', 'pro', 'founding_pro', 'lapsed', 'demo', 'free'));

comment on column public.servers.plan is
  'trial | community | pro | founding_pro | lapsed | demo. founding_pro = Pro SKU at price_lock_cents (899).';
comment on column public.servers.price_lock_cents is
  'Effective monthly cents: 599 community, 999 pro list, 899 founding_pro lock.';
comment on column public.servers.priority_support is
  'Pro / founding_pro: priority support queue flag.';

-- Vanity on settings (public page reads these)
alter table public.server_settings
  add column if not exists hide_powered_by boolean not null default false,
  add column if not exists public_accent text;

comment on column public.server_settings.hide_powered_by is
  'Pro vanity: hide Powered by Rallied on /s/[slug]. Enforce only when server.plan is pro|founding_pro.';
comment on column public.server_settings.public_accent is
  'Pro vanity: optional accent color (hex) for public page.';
