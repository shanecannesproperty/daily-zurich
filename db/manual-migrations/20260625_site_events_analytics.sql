-- First-party, privacy-light event analytics for The Daily Canberra.
-- Run once in the Supabase SQL editor (project sjcwxiesvetkblatydrd).
-- Idempotent: safe to re-run. Additive only.
--
-- Design notes:
--   * No PII. We store an anonymous, client-generated session id (a random
--     string in a first-party cookie/localStorage) and never an IP or email.
--   * Anon may INSERT an event row and nothing else. Anon may NOT SELECT, so
--     the event stream (and the session ids in it) can never be read back by
--     the public client.
--   * Reads are for the admin only (the same owner-email gate used by the
--     trigger audit table). The /admin analytics page reads via the
--     authenticated session.
--   * City scoping mirrors every other table: each row carries city and the
--     app's city-guard forces city='canberra' on insert.

-- =========================================================================
-- 1) Event stream
-- =========================================================================
create table if not exists public.site_events (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  event_name text not null check (event_name in (
    'pageview',
    'newsletter_signup',
    'newsletter_confirmed',
    'article_read',
    'audio_play',
    'live_feed_click'
  )),
  path text,
  -- Anonymous, non-PII session id generated on the client. Random, not tied to
  -- any account or email. Used only to de-duplicate and to count unique visits.
  anon_session_id text,
  -- Optional small label (article slug, live feed item host, signup source).
  ref text,
  created_at timestamptz not null default now()
);

create index if not exists site_events_city_created_idx
  on public.site_events (city, created_at desc);

create index if not exists site_events_city_event_created_idx
  on public.site_events (city, event_name, created_at desc);

-- =========================================================================
-- 2) Grants. The Data API needs column-level grants even with RLS on.
--    Anon gets INSERT on the safe columns only (never SELECT).
-- =========================================================================
grant insert (city, event_name, path, anon_session_id, ref) on public.site_events to anon;
grant select on public.site_events to authenticated;
grant all on public.site_events to service_role;

-- =========================================================================
-- 3) RLS
-- =========================================================================
alter table public.site_events enable row level security;

do $$
begin
  -- Anon may insert an event. with check keeps inserts to this city only and
  -- pins the event_name to the known set (the CHECK constraint also enforces).
  if not exists (
    select 1 from pg_policies
    where tablename = 'site_events' and policyname = 'anon insert site event'
  ) then
    create policy "anon insert site event" on public.site_events
      for insert to anon
      with check (city = 'canberra');
  end if;

  -- Only the platform owner can read the event stream. No anon SELECT policy
  -- exists, so the public client cannot read any row back.
  if not exists (
    select 1 from pg_policies
    where tablename = 'site_events' and policyname = 'admin read site events'
  ) then
    create policy "admin read site events" on public.site_events
      for select to authenticated
      using ((auth.jwt() ->> 'email') = 'shane@spexperts.com.au');
  end if;
end $$;

-- =========================================================================
-- 4) Daily rollup view for the admin analytics page (kept small and fast).
--    Reads inherit the table RLS, so this view is owner-readable only.
-- =========================================================================
create or replace view public.site_events_daily as
select
  city,
  event_name,
  (created_at at time zone 'Australia/Sydney')::date as day,
  count(*) as events,
  count(distinct anon_session_id) as sessions
from public.site_events
group by city, event_name, (created_at at time zone 'Australia/Sydney')::date;

grant select on public.site_events_daily to authenticated;

-- =========================================================================
-- 5) Top content view: most-read articles by article_read events.
-- =========================================================================
create or replace view public.site_events_top_content as
select
  city,
  ref as path_ref,
  count(*) as reads
from public.site_events
where event_name = 'article_read' and ref is not null
group by city, ref;

grant select on public.site_events_top_content to authenticated;
