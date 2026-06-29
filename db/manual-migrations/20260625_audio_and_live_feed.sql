-- Audio narration, daily audio briefing, and the live feed.
-- Run once in the Supabase SQL editor (project sjcwxiesvetkblatydrd).
-- Idempotent: safe to re-run. Additive only. Anon gets read-only access;
-- the service role (used by the edge functions) keeps full access.

-- =========================================================================
-- 1) Article narration columns
-- =========================================================================
alter table public.articles
  add column if not exists audio_url text,
  add column if not exists audio_voice text,
  add column if not exists audio_duration_sec int,
  add column if not exists audio_generated_at timestamptz;

-- =========================================================================
-- 2) Daily "City in 5 minutes" briefing
-- =========================================================================
create table if not exists public.audio_briefings (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  briefing_date date not null,
  title text,
  script_text text,
  audio_url text,
  duration_sec int,
  article_ids uuid[],
  created_at timestamptz default now()
);

create unique index if not exists audio_briefings_city_date_uq
  on public.audio_briefings (city, briefing_date);

create index if not exists audio_briefings_city_date_idx
  on public.audio_briefings (city, briefing_date desc);

alter table public.audio_briefings enable row level security;

do $$
begin
  -- Briefings are public, read-only. The script_text is included; it is the
  -- transcript of audio we publish, so there is nothing private to withhold.
  if not exists (
    select 1 from pg_policies
    where tablename = 'audio_briefings' and policyname = 'anon read briefings'
  ) then
    create policy "anon read briefings" on public.audio_briefings
      for select to anon
      using (true);
  end if;
end $$;

-- =========================================================================
-- 3) Live feed (rolling news + current weather)
-- =========================================================================
create table if not exists public.live_feed (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  kind text not null check (kind in ('news','weather','breaking','traffic','sport','community')),
  title text not null,
  summary text,
  url text,
  source text,
  image_url text,
  temp_c numeric,
  weather_text text,
  published_at timestamptz not null default now(),
  content_hash text not null unique,
  is_published boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists live_feed_city_published_idx
  on public.live_feed (city, is_published, published_at desc);

create index if not exists live_feed_city_kind_published_idx
  on public.live_feed (city, kind, published_at desc);

alter table public.live_feed enable row level security;

do $$
begin
  -- Anon can read published items only.
  if not exists (
    select 1 from pg_policies
    where tablename = 'live_feed' and policyname = 'anon read published live feed'
  ) then
    create policy "anon read published live feed" on public.live_feed
      for select to anon
      using (is_published);
  end if;
end $$;
