-- Pro iCal subscribe token (Founding/Pro). Rotate from Settings.
-- Join gates: see 009_join_gates.sql.

alter table public.server_settings
  add column if not exists ical_token text;

comment on column public.server_settings.ical_token is
  'Opaque subscribe token for GET /api/ical/<discord_guild_id>?token=… (Pro/Founding). Rotate from Settings. Null = feed disabled.';
