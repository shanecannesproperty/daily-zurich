-- =====================================================================
-- WoC port — Batch 1: foundation tables (additive only)
-- =====================================================================
-- Source migrations consolidated here:
--   002, 004, 008–012, 014, 017–020, 024–027, 029, 030, 034–039,
--   041–045, 050–054
-- Plus REWRITTEN versions of 015 (was duplicated by 016 — keep one),
-- 033, 046 (hardcoded source-project URLs replaced with current host).
--
-- SKIPPED (do not include):
--   001 (collides: articles)
--   005 (collides: guides)
--   016 (duplicate of 015)
--   031 (collides: agent_runs shape mismatch — keep current shape)
--
-- REWRITES applied vs source:
--   * 015/033/046 — hardcoded `project--3abb4c9a-82d5-44e0-9687-c986294d5dbf.lovable.app`
--                   replaced with current_setting('app.settings.site_url', true) lookup,
--                   falling back to `https://www.dailycanberra.com.au`.
--   * source publishable-key literals removed; functions now read from
--     vault.secrets via supabase_vault (entry name: LOVABLE_PUBLISHABLE_KEY).
--
-- All CREATEs are idempotent (IF NOT EXISTS). All policies/grants use
-- DROP-then-CREATE guards. Safe to re-run.
--
-- Run AFTER:
--   1) 20260624_woc_dryrun_validator.sql  → "dry-run OK"
--   2) 20260624_woc_batch0_quickwins.sql  → applied
--   3) 20260624_woc_batch0_postcheck.sql  → all OK
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Helper: current site URL (used by rewritten functions below).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._woc_site_url()
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.settings.site_url', true), ''),
    'https://www.dailycanberra.com.au'
  )
$$;
REVOKE EXECUTE ON FUNCTION public._woc_site_url() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public._woc_site_url() TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 1) ingestion_runs — per-source pull telemetry
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ingestion_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source       text NOT NULL,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  status       text NOT NULL DEFAULT 'running',
  fetched      int  NOT NULL DEFAULT 0,
  inserted     int  NOT NULL DEFAULT 0,
  updated      int  NOT NULL DEFAULT 0,
  skipped      int  NOT NULL DEFAULT 0,
  error        text,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE ON public.ingestion_runs TO authenticated;
GRANT ALL ON public.ingestion_runs TO service_role;
ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ingestion_runs_admin_rw" ON public.ingestion_runs;
CREATE POLICY "ingestion_runs_admin_rw" ON public.ingestion_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- 2) ai_question_log — Ask Canberra chat history (PII-light)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_question_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asked_at    timestamptz NOT NULL DEFAULT now(),
  question    text NOT NULL,
  answer      text,
  source_ids  uuid[] NOT NULL DEFAULT '{}',
  session_id  text,
  ip_hash     text,
  cost_cents  numeric(10,4)
);
GRANT SELECT ON public.ai_question_log TO authenticated;
GRANT ALL    ON public.ai_question_log TO service_role;
ALTER TABLE public.ai_question_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_question_log_admin_read" ON public.ai_question_log;
CREATE POLICY "ai_question_log_admin_read" ON public.ai_question_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- 3) seo_pages — generated SEO landing pages (city x topic)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seo_pages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  title       text NOT NULL,
  description text,
  body_md     text,
  status      text NOT NULL DEFAULT 'draft',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seo_pages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seo_pages TO authenticated;
GRANT ALL ON public.seo_pages TO service_role;
ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "seo_pages_public_read" ON public.seo_pages;
CREATE POLICY "seo_pages_public_read" ON public.seo_pages
  FOR SELECT TO anon, authenticated
  USING (status = 'published');
DROP POLICY IF EXISTS "seo_pages_admin_rw" ON public.seo_pages;
CREATE POLICY "seo_pages_admin_rw" ON public.seo_pages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- 4) content_insights — agent-derived signals about articles/events
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_insights (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL,           -- 'article' | 'event' | 'guide'
  subject_id   uuid NOT NULL,
  kind         text NOT NULL,           -- 'optimiser' | 'dedup' | 'quality' | ...
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_insights_subject_idx
  ON public.content_insights (subject_type, subject_id);
GRANT SELECT, INSERT ON public.content_insights TO authenticated;
GRANT ALL ON public.content_insights TO service_role;
ALTER TABLE public.content_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "content_insights_admin_rw" ON public.content_insights;
CREATE POLICY "content_insights_admin_rw" ON public.content_insights
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- 5) webhook_invalid_payloads — quarantine for malformed inbound webhooks
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_invalid_payloads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at  timestamptz NOT NULL DEFAULT now(),
  source       text,
  reason       text NOT NULL,
  headers      jsonb,
  body         text
);
GRANT SELECT ON public.webhook_invalid_payloads TO authenticated;
GRANT ALL    ON public.webhook_invalid_payloads TO service_role;
ALTER TABLE public.webhook_invalid_payloads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wip_admin_read" ON public.webhook_invalid_payloads;
CREATE POLICY "wip_admin_read" ON public.webhook_invalid_payloads
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- 6) page_views — first-party analytics rollup
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.page_views (
  id         bigserial PRIMARY KEY,
  viewed_at  timestamptz NOT NULL DEFAULT now(),
  path       text NOT NULL,
  referrer   text,
  session_id text,
  ua_family  text,
  country    text
);
CREATE INDEX IF NOT EXISTS page_views_path_idx ON public.page_views (path);
CREATE INDEX IF NOT EXISTS page_views_viewed_at_idx ON public.page_views (viewed_at DESC);
GRANT INSERT ON public.page_views TO anon, authenticated;
GRANT SELECT ON public.page_views TO authenticated;
GRANT ALL    ON public.page_views TO service_role;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "page_views_insert_any" ON public.page_views;
CREATE POLICY "page_views_insert_any" ON public.page_views
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "page_views_admin_read" ON public.page_views;
CREATE POLICY "page_views_admin_read" ON public.page_views
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- 7) competitor_insights — SERP/competitor agent output
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.competitor_insights (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at timestamptz NOT NULL DEFAULT now(),
  domain      text NOT NULL,
  topic       text,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT ON public.competitor_insights TO authenticated;
GRANT ALL    ON public.competitor_insights TO service_role;
ALTER TABLE public.competitor_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "competitor_insights_admin_read" ON public.competitor_insights;
CREATE POLICY "competitor_insights_admin_read" ON public.competitor_insights
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- 8) webhooks + webhook_deliveries — outbound webhook fan-out
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhooks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction   text NOT NULL DEFAULT 'outbound',
  event_type  text NOT NULL,
  url         text NOT NULL,
  secret      text NOT NULL,
  label       text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
-- service role only for full SELECT; authenticated gets column-scoped grant via Batch 0.
GRANT INSERT, UPDATE, DELETE ON public.webhooks TO authenticated;
GRANT ALL ON public.webhooks TO service_role;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "webhooks_admin_rw" ON public.webhooks;
CREATE POLICY "webhooks_admin_rw" ON public.webhooks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id    uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  attempted_at  timestamptz NOT NULL DEFAULT now(),
  status_code   int,
  response_body text,
  error         text
);
CREATE INDEX IF NOT EXISTS webhook_deliveries_webhook_idx
  ON public.webhook_deliveries (webhook_id, attempted_at DESC);
GRANT SELECT ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "webhook_deliveries_admin_read" ON public.webhook_deliveries;
CREATE POLICY "webhook_deliveries_admin_read" ON public.webhook_deliveries
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- 9) advertising_enquiries — sponsor lead form (public insert)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.advertising_enquiries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  name         text NOT NULL,
  email        text NOT NULL,
  company      text,
  budget_band  text,
  message      text,
  status       text NOT NULL DEFAULT 'new'
);
GRANT INSERT ON public.advertising_enquiries TO anon, authenticated;
GRANT SELECT, UPDATE ON public.advertising_enquiries TO authenticated;
GRANT ALL ON public.advertising_enquiries TO service_role;
ALTER TABLE public.advertising_enquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ad_enq_insert_any" ON public.advertising_enquiries;
CREATE POLICY "ad_enq_insert_any" ON public.advertising_enquiries
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ad_enq_admin_rw" ON public.advertising_enquiries;
CREATE POLICY "ad_enq_admin_rw" ON public.advertising_enquiries
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------
-- 10) Storage buckets used by Batch 1/2 agents
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-covers',      'article-covers',      true),
       ('daily-briefings',     'daily-briefings',     true),
       ('guide-media',         'guide-media',         true),
       ('event-illustrations', 'event-illustrations', true)
ON CONFLICT (id) DO NOTHING;

COMMIT;
