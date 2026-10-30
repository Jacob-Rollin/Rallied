-- 009: Join gates (Community+) — min Ghostless % + lockout enforce toggle
-- Starter ignores these in app code (reliabilityEnabled = false).
-- Defaults: min % off (null); lockout enforce on (matches prior Join reject).

alter table public.server_settings
  add column if not exists join_min_ghostless_pct int
    check (
      join_min_ghostless_pct is null
      or (join_min_ghostless_pct between 1 and 100)
    ),
  add column if not exists join_lockout_enforced boolean not null default true;

comment on column public.server_settings.join_min_ghostless_pct is
  'Optional Join gate: reject when show rate % is below this (null = off). Community+ only.';
comment on column public.server_settings.join_lockout_enforced is
  'When true (default), Join rejects active lockouts. Community+ only; Starter ignores.';
