-- content-health-agent: Anthropic-powered content QA, every 30 minutes.
--
-- The Supabase edge function `content-health-agent` (supabase/functions/
-- content-health-agent/index.ts) samples recently-published articles across
-- every city and asks Anthropic Claude (vision) whether each hero photo
-- correctly illustrates THAT city's article. Wrong/broken/wrong-location
-- photos are auto-fixed by clearing the hero (reversible — the acquisition
-- cron refills it under the location-aware rules); every decision is logged.
--
-- The Anthropic key lives in Supabase, so the function reads it from its own
-- env or from Vault. Sponsored/advertiser articles are excluded (their hero is
-- paid creative). Apply once against the project DB. Requires pg_cron, pg_net.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Audit trail of every agent decision. Service-role only (RLS on, no public
-- policies) — mirrors the other agent log tables.
create table if not exists public.content_health_log (
  id          bigserial primary key,
  article_id  uuid,
  city        text,
  decision    text not null check (decision in ('keep','cleared')),
  reason      text,
  prev_hero   text,
  ran_at      timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists content_health_log_created on public.content_health_log (created_at desc);
create index if not exists content_health_log_decision on public.content_health_log (decision, created_at desc);
alter table public.content_health_log enable row level security;

-- Run every 30 minutes (off the :00/:30 marks to avoid fleet pile-ups).
do $$
begin
  perform cron.unschedule('content-health-agent')
  from cron.job where jobname = 'content-health-agent';
exception when others then null;
end $$;

select cron.schedule(
  'content-health-agent',
  '7,37 * * * *',
  $cron$
    select net.http_post(
      url := 'https://sjcwxiesvetkblatydrd.supabase.co/functions/v1/content-health-agent',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-hook-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'AGENTS_WEBHOOK_SECRET' limit 1)
      ),
      body := jsonb_build_object('source', 'cron_30min', 'limit', 25, 'scheduled_at', now()),
      timeout_milliseconds := 280000
    );
  $cron$
);

select jobname, schedule, active from cron.job where jobname = 'content-health-agent';
