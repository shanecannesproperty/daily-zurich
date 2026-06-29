-- Scheduled hero-image acquisition for articles missing a cover photo.
-- Replaces the fire-and-forget background task that Cloudflare Workers killed
-- before completion. pg_cron posts to the public hook every 30 minutes; the
-- endpoint acquires + writes hero_image via the service-role key, processing a
-- bounded batch of articles that still have a null/empty hero_image.
--
-- Apply once against the project DB (sjcwxiesvetkblatydrd). Requires the
-- pg_cron and pg_net extensions (already enabled for rss-ingest / design-agent).

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule('acquire-article-images')
  from cron.job where jobname = 'acquire-article-images';
exception when others then null;
end $$;

select cron.schedule(
  'acquire-article-images',
  '*/30 * * * *',
  $cron$
    select net.http_post(
      url := 'https://daily-canberra-site.lovable.app/api/public/hooks/acquire-article-images',
      headers := jsonb_build_object('content-type', 'application/json'),
      body := jsonb_build_object('source', 'cron', 'limit', 20, 'scheduled_at', now()),
      timeout_milliseconds := 120000
    );
  $cron$
);
