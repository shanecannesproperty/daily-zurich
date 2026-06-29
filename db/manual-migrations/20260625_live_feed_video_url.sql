-- Live feed: optional source video URL (YouTube / Vimeo) per item.
-- Run once in the Supabase SQL editor (project sjcwxiesvetkblatydrd).
-- Idempotent: safe to re-run. Additive only. The existing anon read-only RLS
-- policy on public.live_feed already covers this column (it grants select on
-- the whole row), so no policy change is needed.

alter table public.live_feed
  add column if not exists video_url text;

comment on column public.live_feed.video_url is
  'Optional source video (YouTube or Vimeo) for the item. Rendered as a click-to-play tile, credited and linked back to the source. Never autoplayed with sound.';
