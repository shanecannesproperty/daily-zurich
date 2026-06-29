-- Cron updates to include the x-hook-secret header on the gated public hooks.
-- The hook handlers now require this header to match AGENTS_WEBHOOK_SECRET.
-- Apply once against the project DB. Replace <SECRET> with the value of
-- AGENTS_WEBHOOK_SECRET stored in vault.decrypted_secrets (or pass it inline).

-- Re-schedule acquire-article-images with the shared-secret header.
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
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-hook-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'AGENTS_WEBHOOK_SECRET' limit 1)
      ),
      body := jsonb_build_object('source', 'cron', 'limit', 20, 'scheduled_at', now()),
      timeout_milliseconds := 120000
    );
  $cron$
);

-- Re-schedule the rss-ingest cron with the shared-secret header. The original
-- schedule was created outside the repo; replace the schedule expression below
-- if the production cadence differs.
do $$
begin
  perform cron.unschedule('rss-ingest')
  from cron.job where jobname = 'rss-ingest';
exception when others then null;
end $$;

select cron.schedule(
  'rss-ingest',
  '17 * * * *',
  $cron$
    select net.http_post(
      url := 'https://daily-canberra-site.lovable.app/api/public/hooks/rss-ingest',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-hook-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'AGENTS_WEBHOOK_SECRET' limit 1)
      ),
      body := jsonb_build_object('source', 'cron', 'scheduled_at', now()),
      timeout_milliseconds := 120000
    );
  $cron$
);
