-- Pro iCal subscribe token (Founding/Pro). Rotate from Settings.
-- Also ensures join-gate columns if 009_join_gates has not been applied yet
-- (Standby PR); IF NOT EXISTS so either merge order is safe.

alter table public.server_settings
  add column if not exists join_min_ghostless_pct int
    check (
      join_min_ghostless_pct is null
      or (join_min_ghostless_pct between 1 and 100)
    ),
  add column if not exists join_lockout_enforced boolean not null default true,
  add column if not exists ical_token text;

comment on column public.server_settings.join_min_ghostless_pct is
  'Optional Join gate: reject when show rate % is below this (null = off). Community+ only.';
comment on column public.server_settings.join_lockout_enforced is
  'When true (default), Join rejects active lockouts. Community+ only; Starter ignores.';
comment on column public.server_settings.ical_token is
  'Opaque subscribe token for GET /api/ical/<discord_guild_id>?token=… (Pro/Founding). Rotate from Settings. Null = feed disabled.';
