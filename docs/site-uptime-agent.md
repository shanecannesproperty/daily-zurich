# Site Uptime Agent

An always-on monitoring agent that checks the Daily Network's critical surfaces
roughly **every 30 seconds**, records every probe, and automatically alerts when
something goes down — and again when it recovers.

## Why it exists

On 2026-06-29 the `daily-network` Supabase project (`sjcwxiesvetkblatydrd`) went
into a `RESIZING` state. During the resize the Postgres engine stayed up, but the
PostgREST/edge layer returned a storm of `504` / `522` (Cloudflare gateway)
errors, so the public sites couldn't load articles, design tokens, the live feed,
etc. There was no automated detection — the outage was noticed by a human.

This agent closes that gap.

## What it checks

Default targets (overridable per-invocation via the POST body):

| key | what it proves |
|---|---|
| `supabase_rest` | PostgREST + Postgres answer a real query (`design_tokens`) |
| `supabase_articles` | the published-article read path the whole site uses |
| `site_canonical` | `https://dailycanberra.com.au/` serves |
| `site_lovable` | `https://daily-canberra-site.lovable.app/` serves |

**Down** = a network error/timeout or any `5xx` (including Cloudflare `520–524`,
i.e. the exact resize failure mode). A `4xx` is treated as **up** — the server is
responding — so query mistakes never page anyone.

## How it runs

- `pg_cron` job `site-uptime-agent` invokes the edge function **every minute**.
- The function runs **two sweeps 30s apart** per invocation ⇒ a check every ~30s.
- Each probe is written to `public.site_health_checks` (pruned to 14 days by the
  `site-health-checks-prune` cron).
- Per-target incident state lives in `public.site_health_incidents`.

## How it "automatically deals with it"

- After **2 consecutive failures** for a target it opens an incident and fires a
  single **DOWN** alert (no minute-by-minute spam).
- When the target recovers it closes the incident and fires a **RECOVERY** alert
  with the measured downtime.
- It is deliberately read-only — it never mutates site data.

## Alert channels (optional)

Set any of these as Supabase Vault secrets or function env vars. With none set,
the agent still records every check; alerting is simply skipped.

| secret | purpose |
|---|---|
| `ALERT_WEBHOOK_URL` | Slack/Discord/PagerDuty-compatible incoming webhook |
| `RESEND_API_KEY` | Resend API key for email alerts |
| `ALERT_EMAIL` | recipient (defaults to the owner's email) |
| `ALERT_FROM` | verified Resend sender |

## Auth

The cron and the function share a dedicated secret `UPTIME_AGENT_SECRET` in
Supabase Vault (created by the migration if missing). The cron reads it from
`vault.decrypted_secrets`; the function reads it via the `get_vault_secret` RPC.
A dedicated key keeps it isolated from the other agents' `AGENTS_WEBHOOK_SECRET`.

## Files

- `supabase/functions/site-uptime-agent/index.ts` — the agent.
- `db/manual-migrations/20260629_site_uptime_agent.sql` — tables, secret, crons.

## Operating it

```sql
-- current status of every target
select * from public.site_health_incidents order by target;

-- recent probes
select target, ok, status_code, latency_ms, error, checked_at
from public.site_health_checks order by checked_at desc limit 40;

-- run an ad-hoc check (single sweep)
select net.http_post(
  url := 'https://sjcwxiesvetkblatydrd.supabase.co/functions/v1/site-uptime-agent',
  headers := jsonb_build_object('content-type','application/json',
    'x-hook-secret', (select decrypted_secret from vault.decrypted_secrets where name='UPTIME_AGENT_SECRET' limit 1)),
  body := jsonb_build_object('source','manual','sweeps',1,'interval_ms',0));
```

Tunable POST-body fields: `sweeps`, `interval_ms`, `timeout_ms`, `alert_after`,
`slow_ms`, `source`, and a custom `targets` array (`{key, url, withApiKey}`).
