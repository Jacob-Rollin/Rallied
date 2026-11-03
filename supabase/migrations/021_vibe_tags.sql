-- Fixed post-session vibe tags on vibe_checks (after Showed up).
-- One tag per (party, rater, ratee) via existing unique constraint — upsert/overwrite.
-- Does NOT feed Ghostless shows/ghosts/vibe_score math; display is 30d + ≥2 raters in app.

alter table public.vibe_checks
  add column if not exists vibe_tag text
    check (
      vibe_tag is null
      or vibe_tag in (
        'reliable',
        'communicator',
        'clutch',
        'friendly',
        'toxic',
        'afk'
      )
    );

comment on column public.vibe_checks.vibe_tag is
  'Optional play tag after Showed up (reliable/communicator/clutch/friendly/toxic/afk). Null when skipped or Ghosted. Upsert per (party,rater,ratee). Never drives Ghostless %.';

-- Ratee lookups for Recent vibes (30 days) aggregates on player pages.
create index if not exists vibe_checks_ratee_tag_created_idx
  on public.vibe_checks (ratee_id, created_at desc)
  where vibe_tag is not null;
