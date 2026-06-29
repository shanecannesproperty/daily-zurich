-- Audit table for Run All trigger attempts + diagnostic columns on agent_runs.
-- Run this in the Supabase SQL editor (project: sjcwxiesvetkblatydrd) once.

-- 1) Diagnostic columns on agent_runs
alter table public.agent_runs
  add column if not exists stack_trace text,
  add column if not exists prompt_payload jsonb;

-- 2) Trigger audit table
create table if not exists public.agent_trigger_audit (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  city text not null,
  source text not null check (source in ('ui-bearer','api-secret','webhook')),
  actor_user_id uuid,
  actor_email text,
  secret_hash text,
  ip text,
  user_agent text,
  agents_queued int not null default 0,
  ok boolean not null default true,
  error text
);

create index if not exists agent_trigger_audit_city_created_idx
  on public.agent_trigger_audit (city, created_at desc);

-- 3) Grants (Data API needs these even with RLS)
grant select on public.agent_trigger_audit to authenticated;
grant all on public.agent_trigger_audit to service_role;

-- 4) RLS: only the platform owner can read
alter table public.agent_trigger_audit enable row level security;

drop policy if exists "admin can read trigger audit" on public.agent_trigger_audit;
create policy "admin can read trigger audit"
  on public.agent_trigger_audit
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'shane@spexperts.com.au');

-- Inserts happen via service_role from the server routes; no insert policy needed.
