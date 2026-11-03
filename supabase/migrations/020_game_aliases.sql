-- Per-server game name aliases for Top games hygiene + LFG suggestions.
-- Keys: trim + collapse whitespace + lowercased raw spellings.
-- Values: canonical display name. Does NOT rewrite lfg_parties.game rows;
-- resolve at read time (Top games / Analytics / CSV) and suggest on create.

alter table public.server_settings
  add column if not exists game_aliases jsonb not null default '{}'::jsonb;

comment on column public.server_settings.game_aliases is
  'Per-guild map of normalized alias → canonical display name. Used at read time for Top games; never rewrites lfg_parties.game.';
