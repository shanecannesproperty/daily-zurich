-- Weather alerts opt-in: tag subscribers who signed up specifically for
-- severe-weather alerts via the /weather page CTA. Run once in the Supabase SQL
-- editor (project sjcwxiesvetkblatydrd). Idempotent: safe to re-run.
--
-- The app inserts `wants_weather_alerts = true` for these signups, but the
-- server function (src/lib/forms.functions.ts) retries the insert WITHOUT the
-- flag if this column is missing — so signups keep working before this runs.
-- Apply this migration to start segmenting weather-alert subscribers cleanly.

alter table public.subscribers
  add column if not exists wants_weather_alerts boolean not null default false;

-- Targeted index for the eventual "send weather alerts for this city" query.
create index if not exists subscribers_weather_alerts_idx
  on public.subscribers (city)
  where wants_weather_alerts;

-- Anon inserts the flag from the public weather form. Harmless/redundant when
-- table-level INSERT already covers the column; required if INSERT is granted
-- per-column.
grant insert (wants_weather_alerts) on public.subscribers to anon;
