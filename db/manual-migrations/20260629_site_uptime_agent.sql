-- site-uptime-agent: always-on uptime monitoring for the Daily Network.
--
-- The Supabase edge function `site-uptime-agent` (supabase/functions/
-- site-uptime-agent/index.ts) probes the data API (PostgREST), the published
-- article read path, and the public sites. pg_cron invokes it every minute and
-- the function runs two sweeps 30s apart, so every surface is checked roughly
-- every 30 seconds. Each probe is logged; sustained failures open an incident
-- and fire a DOWN alert (Resend email and/or webhook), and recoveries close it
-- with a RECOVERY alert. Down = network error/timeout or a 5xx/Cloudflare 5xx
-- (the 504/522 storm seen during a DB resize). A 4xx is treated as UP.
--
-- Apply once against the project DB (sjcwxiesvetkblatydrd). Requires pg_cron and
-- pg_net (already enabled for the other agents).
--
-- Auth: the cron and the function share a dedicated secret UPTIME_AGENT_SECRET
-- in Supabase Vault (created below if missing). The cron reads it from
-- vault.decrypted_secrets; the function reads it via the get_vault_secret RPC.
-- A dedicated key (not AGENTS_WEBHOOK_SECRET) avoids colliding with the other
-- agents, which keep theirs as a project env secret.
--
-- Optional secrets (Vault or function env) enable alerting:
--   ALERT_WEBHOOK_URL  - Slack/Discord/PagerDuty-compatible incoming webhook
--   RESEND_API_KEY     - Resend key for email alerts
--   ALERT_EMAIL        - recipient (defaults to the owner's email)
--   ALERT_FROM         - verified Resend sender
-- With none set, the agent still records every check (alerting is skipped).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Dedicated hook secret shared by the cron and the edge function.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'UPTIME_AGENT_SECRET') then
    perform vault.create_secret(encode(gen_random_bytes(24), 'hex'), 'UPTIME_AGENT_SECRET',
      'Shared secret for site-uptime-agent cron -> edge function auth');
  end if;
end $$;

-- Raw probe audit trail. Service-role only (RLS on, no public policies) —
-- mirrors the other agent log tables.
create table if not exists public.site_health_checks (
  id          bigserial primary key,
  target      text not null,
  url         text,
  ok          boolean not null,
  degraded    boolean not null default false,
  status_code int,
  latency_ms  int,
  error       text,
  run_source  text,
  checked_at  timestamptz not null default now()
);
create index if not exists site_health_checks_target_time on public.site_health_checks (target, checked_at desc);
create index if not exists site_health_checks_time on public.site_health_checks (checked_at desc);
create index if not exists site_health_checks_down on public.site_health_checks (checked_at desc) where ok = false;
alter table public.site_health_checks enable row level security;

-- One row per target: the current incident state used for alert de-duplication.
create table if not exists public.site_health_incidents (
  target               text primary key,
  url                  text,
  is_down              boolean not null default false,
  consecutive_failures int not null default 0,
  opened_at            timestamptz,
  notified             boolean not null default false,
  last_status          int,
  last_error           text,
  updated_at           timestamptz not null default now()
);
alter table public.site_health_incidents enable row level security;

-- Keep the audit trail bounded: drop probes older than 14 days, hourly.
do $$
begin
  perform cron.unschedule('site-health-checks-prune')
  from cron.job where jobname = 'site-health-checks-prune';
exception when others then null;
end $$;

select cron.schedule(
  'site-health-checks-prune',
  '23 * * * *',
  $cron$ delete from public.site_health_checks where checked_at < now() - interval '14 days'; $cron$
);

-- Probe every minute; the function fans out to two sweeps 30s apart.
do $$
begin
  perform cron.unschedule('site-uptime-agent')
  from cron.job where jobname = 'site-uptime-agent';
exception when others then null;
end $$;

select cron.schedule(
  'site-uptime-agent',
  '* * * * *',
  $cron$
    select net.http_post(
      url := 'https://sjcwxiesvetkblatydrd.supabase.co/functions/v1/site-uptime-agent',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-hook-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'UPTIME_AGENT_SECRET' limit 1)
      ),
      body := jsonb_build_object('source', 'cron_1min', 'sweeps', 2, 'interval_ms', 30000, 'scheduled_at', now()),
      timeout_milliseconds := 70000
    );
  $cron$
);

select jobname, schedule, active from cron.job where jobname in ('site-uptime-agent','site-health-checks-prune');
