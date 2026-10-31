-- Per-host open party cap (anti lobby-spam hygiene).
-- Community+ default 3; admin can set 1–10 in Settings.
-- Starter still uses guild open / creates caps; per-host ≤ guild open (≤2).

alter table public.server_settings
  add column if not exists max_open_parties_per_host integer not null default 3;

alter table public.server_settings
  drop constraint if exists server_settings_max_open_parties_per_host_check;

alter table public.server_settings
  add constraint server_settings_max_open_parties_per_host_check
  check (max_open_parties_per_host >= 1 and max_open_parties_per_host <= 10);

comment on column public.server_settings.max_open_parties_per_host is
  'Max concurrent open/filled parties one Discord user may host in this guild. Hygiene (anti lobby-spam), not a paid plan gate. Default 3; Settings allow 1–10 on Community+. Starter enforcement caps at guild open max (2).';
