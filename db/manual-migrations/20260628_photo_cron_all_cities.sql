-- Fan the photo crons out across EVERY Daily Network city — STAGGERED.
--
-- Why: the photo crons (verify-all-photos, acquire-article-images) all POST to
-- a single host — https://daily-canberra-site.lovable.app/... — and the agent
-- targets the request's citySlug(). That host is not a known city domain, so it
-- resolves to the default city (canberra). Result: ONLY canberra's photos were
-- ever acquired/verified; every other city — Gold Coast, Brisbane, Sydney, … —
-- was starved and its hero images stayed broken/missing.
--
-- Fix: the public hooks now accept an explicit { "city": "<slug>" } override
-- (see src/routes/api/public/hooks/*). These cron jobs pin the city per request.
--
-- Load shaping: we do NOT fire all 19 cities at once. Each tick processes a
-- rotating SHARD of cities chosen from the current time bucket, so only a
-- handful run concurrently and the whole network is covered over a few ticks.
-- Timeouts are kept comfortably under the tick interval so runs never overlap.
-- This addresses external rate limits (Openverse / Wikimedia / Gemini) and
-- keeps the single deploy from being hit by 19 heavy requests simultaneously.
--
-- Apply once against the project DB (sjcwxiesvetkblatydrd). Requires pg_cron,
-- pg_net and vault.decrypted_secrets (all already enabled).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- The canonical city list (mirrors CITY_BRANDING in src/lib/city-config.ts).
-- Keep in sync when a city is added. `with ordinality` gives each a stable
-- index used for sharding below.
--   canberra, sydney, melbourne, perth, brisbane, goldcoast, tasmania, adelaide,
--   newcastle, wollongong, centralcoast, sunshinecoast, geelong, townsville,
--   darwin, toowoomba, ballarat, bendigo, cairns   (19 cities)

-- ── 1. Verification — every 5 min, 5 rotating shards (~4 cities/tick) ─────────
-- Each city is verified roughly every 25 minutes; at most ~4 run concurrently.
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
        'city', c.city,
        'article_limit', 20,
        'event_limit', 12,
        'scheduled_at', now()
      ),
      timeout_milliseconds := 110000
    )
    from (
      select city, (idx - 1) as i
      from unnest(array[
        'canberra','sydney','melbourne','perth','brisbane','goldcoast','tasmania',
        'adelaide','newcastle','wollongong','centralcoast','sunshinecoast','geelong',
        'townsville','darwin','toowoomba','ballarat','bendigo','cairns'
      ]) with ordinality as t(city, idx)
    ) c
    where c.i % 5 = (floor(extract(epoch from now()) / 300)::bigint % 5);
  $cron$
);

-- ── 2. Acquire missing images — every 10 min, 4 rotating shards (~5/tick) ─────
-- Each city is topped up roughly every 40 minutes; at most ~5 run concurrently.
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
      body := jsonb_build_object('source', 'cron_10min', 'city', c.city, 'limit', 15, 'scheduled_at', now()),
      timeout_milliseconds := 110000
    )
    from (
      select city, (idx - 1) as i
      from unnest(array[
        'canberra','sydney','melbourne','perth','brisbane','goldcoast','tasmania',
        'adelaide','newcastle','wollongong','centralcoast','sunshinecoast','geelong',
        'townsville','darwin','toowoomba','ballarat','bendigo','cairns'
      ]) with ordinality as t(city, idx)
    ) c
    where c.i % 4 = (floor(extract(epoch from now()) / 600)::bigint % 4);
  $cron$
);

-- ── 3. Daily full-scan — one city every 3 minutes from 02:00 UTC ─────────────
-- Fires at minutes 0,3,6,…,54 past 02:00 (19 slots); slot (minute/3) processes
-- the single city at that index. The 170s timeout sits inside the 180s gap, so
-- a slow city can never overlap the next — strictly one city at a time.
do $$
begin
  perform cron.unschedule('verify-all-photos-daily')
  from cron.job where jobname = 'verify-all-photos-daily';
exception when others then null;
end $$;

select cron.schedule(
  'verify-all-photos-daily',
  '0-54/3 2 * * *',
  $cron$
    select net.http_post(
      url := 'https://daily-canberra-site.lovable.app/api/public/hooks/verify-all-photos',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-hook-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'AGENTS_WEBHOOK_SECRET' limit 1)
      ),
      body := jsonb_build_object(
        'source', 'cron_daily',
        'city', c.city,
        'article_limit', 60,
        'event_limit', 40,
        'scheduled_at', now()
      ),
      timeout_milliseconds := 170000
    )
    from (
      select city, (idx - 1) as i
      from unnest(array[
        'canberra','sydney','melbourne','perth','brisbane','goldcoast','tasmania',
        'adelaide','newcastle','wollongong','centralcoast','sunshinecoast','geelong',
        'townsville','darwin','toowoomba','ballarat','bendigo','cairns'
      ]) with ordinality as t(city, idx)
    ) c
    where c.i = (extract(minute from now())::int / 3);
  $cron$
);

-- ── Verify schedule ──────────────────────────────────────────────────────────
select jobname, schedule, active
from cron.job
where jobname in ('verify-all-photos-5min', 'verify-all-photos-daily', 'acquire-article-images')
order by jobname;
