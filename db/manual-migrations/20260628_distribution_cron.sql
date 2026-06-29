-- Scheduled content distribution: push newly-published articles to search
-- engines (IndexNow + Google Indexing API) and to Facebook + Instagram.
--
-- pg_cron POSTs to the public hook with the shared secret; the endpoint runs
-- src/lib/distribution.server.ts, which skips any channel already completed for
-- an article (dedup via content_distribution_log). Idempotent search submits and
-- once-only social posts both fall out of that ledger.
--
-- ONE deploy serves every Daily Network city and the hook targets the request's
-- citySlug(), so — exactly like the photo crons — we pin the city per request
-- and fan the 19 cities out across staggered shards to avoid bursts.
--
-- Apply once against the project DB (sjcwxiesvetkblatydrd). Requires pg_cron,
-- pg_net and vault.decrypted_secrets (all already enabled for the photo crons).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ── Distribute — every 5 min, 5 rotating shards (~4 cities/tick) ──────────────
-- Each city is distributed roughly every 25 minutes; at most ~4 run at once. A
-- 72h lookback means a newly published article is picked up within one tick and
-- (thanks to the ledger) only ever actioned once per channel.
do $$
begin
  perform cron.unschedule('distribute-content')
  from cron.job where jobname = 'distribute-content';
exception when others then null;
end $$;

select cron.schedule(
  'distribute-content',
  '*/5 * * * *',
  $cron$
    select net.http_post(
      url := 'https://daily-canberra-site.lovable.app/api/public/hooks/distribute',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-hook-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'AGENTS_WEBHOOK_SECRET' limit 1)
      ),
      body := jsonb_build_object(
        'source', 'cron_5min',
        'city', c.city,
        'limit', 25,
        'lookbackHours', 72,
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

-- ── Verify schedule ──────────────────────────────────────────────────────────
select jobname, schedule, active
from cron.job
where jobname = 'distribute-content';
