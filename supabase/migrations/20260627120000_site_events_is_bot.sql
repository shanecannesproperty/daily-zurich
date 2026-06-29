-- Add is_bot flag to site_events so crawlers can be separated from real readers.
-- Existing rows default to false (unknown = treat as human for backward compat).

ALTER TABLE site_events
  ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS site_events_is_bot_idx ON site_events (is_bot);

-- Recreate the daily rollup view to expose is_bot so the admin queries can filter.
-- The original view groups by (city, event_name, day); we now also group by is_bot
-- so a single query can get human-only or all-traffic rows.
DROP VIEW IF EXISTS site_events_daily;

CREATE VIEW site_events_daily AS
SELECT
  city,
  event_name,
  is_bot,
  created_at::date AS day,
  COUNT(*)                                          AS events,
  COUNT(DISTINCT anon_session_id) FILTER (WHERE anon_session_id IS NOT NULL) AS sessions
FROM site_events
GROUP BY city, event_name, is_bot, created_at::date;

-- Recreate top-content view (unchanged, but depends on site_events).
DROP VIEW IF EXISTS site_events_top_content;

CREATE VIEW site_events_top_content AS
SELECT
  city,
  REPLACE(path, '/article/', '') AS path_ref,
  COUNT(*) AS reads
FROM site_events
WHERE event_name = 'article_read'
  AND is_bot = false
  AND path LIKE '/article/%'
GROUP BY city, path;
