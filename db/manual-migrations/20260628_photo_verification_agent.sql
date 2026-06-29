-- Autonomous photo verification agent — daily runner + 5-minute recovery cron.
--
-- What this does:
--   1. Creates a photo_verification_log table to track per-image verification
--      state (last_verified_at, vision_score, decision) so the agent knows
--      which images need re-checking.
--   2. Schedules the new /api/public/hooks/verify-all-photos endpoint every
--      5 minutes for active remediation (catches everything fast).
--   3. Reschedules /api/public/hooks/acquire-article-images to every 10 minutes
--      (more aggressive than the previous 30 minutes) for acquiring missing images.
--   4. Adds a daily full-scan job that runs at 02:00 UTC to re-verify all photos
--      (maintenance mode after the initial backfill is complete).
--
-- Apply once against the project DB (sjcwxiesvetkblatydrd). Requires pg_cron,
-- pg_net, and vault.decrypted_secrets (all already enabled).
--
-- To dial back from 5-minute to daily once coverage is complete:
--   select cron.unschedule('verify-all-photos-5min');
--   (the daily job at 02:00 UTC continues automatically)

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ── 1. Photo verification log ────────────────────────────────────────────────
-- Tracks the last verification state for each image URL across articles/events.
-- Used by the agent to prioritise stale records and skip recently-verified ones.

create table if not exists photo_verification_log (
  id            bigserial primary key,
  city          text        not null default 'canberra',
  entity_type   text        not null check (entity_type in ('article', 'event')),
  entity_id     text        not null,
  image_url     text        not null,
  verified_at   timestamptz not null default now(),
  probe_ok      boolean,
  vision_score  smallint,          -- 0–10; null = not yet scored
  decision      text        check (decision in ('keep', 'prune', 'replace', 'skip')),
  replacement_url text,
  notes         text
);

create index if not exists photo_verification_log_entity
  on photo_verification_log (entity_type, entity_id, verified_at desc);

create index if not exists photo_verification_log_url
  on photo_verification_log (image_url, verified_at desc);

-- ── 2. 5-minute verification cron ────────────────────────────────────────────
-- Aggressive remediation: probe + vision-check + replace every 5 minutes until
-- every article and event has a verified, relevant photo.

do $$
begin
  perform cron.unschedule('verify-all-photos-5min')
  from cron.job where jobname = 'verify-all-photos-5min';
exception when others then null;
end $$;

select cron.schedule(
  'verify-all-photos-5min',
  '*/5 * * * *',
  $cron$
    select net.http_post(
      url := 'https://daily-canberra-site.lovable.app/api/public/hooks/verify-all-photos',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-hook-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'AGENTS_WEBHOOK_SECRET' limit 1)
      ),
      body := jsonb_build_object(
        'source', 'cron_5min',
        'article_limit', 40,
        'event_limit', 30,
        'scheduled_at', now()
      ),
      timeout_milliseconds := 280000
    );
  $cron$
);

-- ── 3. Upgrade acquire-article-images to every 10 minutes ───────────────────
-- The original 30-minute cadence is too slow for initial coverage.

do $$
begin
  perform cron.unschedule('acquire-article-images')
  from cron.job where jobname = 'acquire-article-images';
exception when others then null;
end $$;

select cron.schedule(
  'acquire-article-images',
  '*/10 * * * *',
  $cron$
    select net.http_post(
      url := 'https://daily-canberra-site.lovable.app/api/public/hooks/acquire-article-images',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-hook-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'AGENTS_WEBHOOK_SECRET' limit 1)
      ),
      body := jsonb_build_object('source', 'cron_10min', 'limit', 20, 'scheduled_at', now()),
      timeout_milliseconds := 120000
    );
  $cron$
);

-- ── 4. Daily full-scan at 02:00 UTC ─────────────────────────────────────────
-- Maintenance mode: re-verify ALL photos once daily in the small hours to catch
-- any images that have gone dead or drifted irrelevant since last verified.

do $$
begin
  perform cron.unschedule('verify-all-photos-daily')
  from cron.job where jobname = 'verify-all-photos-daily';
exception when others then null;
end $$;

select cron.schedule(
  'verify-all-photos-daily',
  '0 2 * * *',
  $cron$
    select net.http_post(
      url := 'https://daily-canberra-site.lovable.app/api/public/hooks/verify-all-photos',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-hook-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'AGENTS_WEBHOOK_SECRET' limit 1)
      ),
      body := jsonb_build_object(
        'source', 'cron_daily',
        'article_limit', 100,
        'event_limit', 60,
        'scheduled_at', now()
      ),
      timeout_milliseconds := 280000
    );
  $cron$
);

-- ── Verify cron schedule ─────────────────────────────────────────────────────
select jobname, schedule, active
from cron.job
where jobname in (
  'verify-all-photos-5min',
  'verify-all-photos-daily',
  'acquire-article-images',
  'rss-ingest'
)
order by jobname;
