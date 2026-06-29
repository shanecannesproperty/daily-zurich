
-- 1. Dedupe existing rows by (source_id, link), keeping the oldest
DELETE FROM public.syndicated_stories a
USING public.syndicated_stories b
WHERE a.source_id = b.source_id
  AND a.link = b.link
  AND a.fetched_at > b.fetched_at;

-- 2. Prevent future duplicate links per source
CREATE UNIQUE INDEX IF NOT EXISTS syndicated_stories_source_link_uniq
  ON public.syndicated_stories (source_id, link);

-- 3. Commentary approval workflow
ALTER TABLE public.syndicated_stories
  ADD COLUMN IF NOT EXISTS commentary_draft text,
  ADD COLUMN IF NOT EXISTS commentary_status text NOT NULL DEFAULT 'none';
-- status values: 'none' | 'pending' | 'published'

-- 4. Per-source fetch stats
ALTER TABLE public.syndication_sources
  ADD COLUMN IF NOT EXISTS last_fetched_count integer,
  ADD COLUMN IF NOT EXISTS last_inserted_count integer;
