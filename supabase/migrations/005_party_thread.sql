-- Squad discussion thread under the public party card (coordinate without friending).
alter table public.lfg_parties
  add column if not exists discord_thread_id text;
