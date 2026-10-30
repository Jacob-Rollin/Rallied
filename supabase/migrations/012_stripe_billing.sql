-- Rallied 012 — Stripe billing columns + webhook idempotency
-- Safe to re-run (IF NOT EXISTS).
-- Phone paste: store docs/rallied-supabase-012-stripe-billing.sql

-- ---------------------------------------------------------------------------
-- servers: Stripe subscription + price lock helpers
-- ---------------------------------------------------------------------------
alter table public.servers
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists billing_interval text
    check (billing_interval is null or billing_interval in ('month', 'year')),
  add column if not exists forever_pro boolean not null default false;

create index if not exists servers_stripe_customer_id_idx
  on public.servers (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists servers_stripe_subscription_id_idx
  on public.servers (stripe_subscription_id)
  where stripe_subscription_id is not null;

comment on column public.servers.stripe_customer_id is
  'Stripe Customer id (cus_…). One customer may map to one Discord server in v1.';
comment on column public.servers.stripe_subscription_id is
  'Active (or last) Stripe Subscription id (sub_…).';
comment on column public.servers.stripe_price_id is
  'Stripe Price id currently billed (price_…).';
comment on column public.servers.billing_interval is
  'month | year from the Stripe Price recurring.interval.';
comment on column public.servers.forever_pro is
  'When true, Stripe webhooks must never downgrade plan (Official Rallied / dogfood). Also protect plan=founding_pro from cancel → free.';
comment on column public.servers.price_lock_cents is
  'Effective monthly cents: 499 community, 999 pro list, 899 founding_pro lock.';

-- ---------------------------------------------------------------------------
-- Idempotent webhook processing (Stripe event ids are unique)
-- ---------------------------------------------------------------------------
create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

comment on table public.stripe_webhook_events is
  'Stripe event.id values already applied. Webhook handler inserts first; duplicate → skip.';

alter table public.stripe_webhook_events enable row level security;

-- ---------------------------------------------------------------------------
-- Official Rallied forever Founding Pro (safe re-run)
-- Guild: 1564716956198899824
-- ---------------------------------------------------------------------------
update public.servers
set
  plan = 'founding_pro',
  price_lock_cents = 899,
  priority_support = true,
  forever_pro = true,
  trial_ends_at = null,
  updated_at = now()
where discord_guild_id = '1564716956198899824';
