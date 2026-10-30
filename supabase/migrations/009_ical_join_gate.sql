-- Pro iCal subscribe token + Community join-gate stub (min Ghostless %).
-- Bot join enforcement for join_min_ghostless_pct lands with Standby/gate work;
-- Settings UI can save the column now.

alter table public.server_settings
  add column if not exists ical_token text,
  add column if not exists join_min_ghostless_pct numeric(5,2)
    check (
      join_min_ghostless_pct is null
      or (join_min_ghostless_pct >= 0 and join_min_ghostless_pct <= 100)
    );

comment on column public.server_settings.ical_token is
  'Opaque subscribe token for GET /api/ical/<discord_guild_id>?token=… (Pro/Founding). Rotate from Settings. Null = feed disabled.';

comment on column public.server_settings.join_min_ghostless_pct is
  'Optional Join gate: require this Ghostless show-rate % (this server) to join an LFG party. Null = off. Community+.';
