-- =====================================================================
-- WoC port dry-run validator
-- =====================================================================
-- Reports table collisions, missing dependencies, and policy/role state
-- that the port assumes. Read-only: no DDL, no DML. Safe to re-run.
--
-- Usage:
--   psql ... -f db/manual-migrations/20260624_woc_dryrun_validator.sql
-- or paste into the Lovable SQL runner. If the final "FAIL" rollback fires,
-- the validator found a blocker — fix it before applying any batch.
-- =====================================================================

BEGIN;

-- Scratch report table (rolled back at the end)
CREATE TEMP TABLE _woc_report (
  severity text,         -- 'BLOCK' | 'WARN' | 'INFO'
  area     text,
  detail   text
) ON COMMIT DROP;

-- ---------------------------------------------------------------------
-- 1) Table collisions with Batch-1..4 additions
-- ---------------------------------------------------------------------
-- Tables the WoC port will CREATE. If any already exist, the CREATE will
-- fail unless you've reviewed the source migration and confirmed shape.
WITH wanted(name, batch, must_match_shape) AS (
  VALUES
    ('events',                   'core',  true),
    ('articles',                 'core',  true),
    ('guides',                   'core',  true),
    ('agent_runs',               'core',  true),
    ('user_roles',               'core',  true),
    ('profiles',                 'core',  true),
    ('subscribers',              'b2',    false),
    ('sponsors',                 'b2',    false),
    ('weekly_roundups',          'b2',    false),
    ('da_feed_status',           'b2',    false),
    ('ingestion_runs',           'b1',    false),
    ('ai_question_log',          'b1',    false),
    ('seo_pages',                'b1',    false),
    ('content_insights',         'b1',    false),
    ('webhook_invalid_payloads', 'b1',    false),
    ('page_views',               'b1',    false),
    ('competitor_insights',      'b1',    false),
    ('webhooks',                 'b1',    false),
    ('webhook_deliveries',       'b1',    false),
    ('advertising_enquiries',    'b1',    false),
    ('weekly_picks',             'b2',    false),
    ('newsletters',              'b2',    false),
    ('summary_flags',            'b2',    false),
    ('da_commentary',            'b2',    false),
    ('demand_events',            'b2',    false),
    ('demand_signals',           'b2',    false),
    ('demand_clusters',          'b2',    false),
    ('reengagement_preferences', 'b2',    false),
    ('reengagement_sends',       'b2',    false),
    ('daily_briefings',          'b2',    false),
    ('duplicate_detections',     'b2',    false),
    ('event_cover_history',      'b2',    false),
    ('cover_regeneration_runs',  'b2',    false),
    ('wellness_venues',          'b4',    false),
    ('wellness_enquiries',       'b4',    false),
    ('job_listings',             'b4',    false),
    ('job_enquiries',            'b4',    false),
    ('property_developments',    'b4',    false),
    ('property_enquiries',       'b4',    false),
    ('property_price_subscribers','b4',   false),
    ('ahrefs_audit_runs',        'b5',    false),
    ('ahrefs_expected_config',   'b5',    false),
    ('ahrefs_alert_log',         'b5',    false)
)
INSERT INTO _woc_report
SELECT
  CASE WHEN must_match_shape THEN 'BLOCK' ELSE 'WARN' END,
  'table-collision',
  format('Table %I already exists (batch=%s). %s',
         w.name, w.batch,
         CASE WHEN w.must_match_shape
              THEN 'Schema reconcile required before applying.'
              ELSE 'CREATE TABLE will fail; use IF NOT EXISTS or skip.'
         END)
FROM wanted w
JOIN information_schema.tables t
  ON t.table_schema = 'public' AND t.table_name = w.name;

-- ---------------------------------------------------------------------
-- 2) Missing dependencies the port assumes
-- ---------------------------------------------------------------------
-- Extensions
INSERT INTO _woc_report
SELECT 'WARN', 'extension-missing',
       format('Extension %s not installed (required by Batch 3 cron/http).', e)
FROM (VALUES ('pg_net'), ('pg_cron'), ('pgmq'), ('supabase_vault')) v(e)
WHERE NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = v.e);

-- Storage buckets (best-effort: storage.buckets is owned by storage schema)
INSERT INTO _woc_report
SELECT 'WARN', 'bucket-missing',
       format('Storage bucket %L not found. Create before applying Batch 1/2.', b)
FROM (VALUES ('article-covers'), ('daily-briefings'),
             ('guide-media'), ('event-illustrations')) v(b)
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = v.b
);

-- Functions the port re-grants or replaces
INSERT INTO _woc_report
SELECT 'INFO', 'function-missing',
       format('Function public.%s not present yet (will be created by Batch 1/2).', f)
FROM (VALUES ('match_articles'), ('match_guides'),
             ('has_role'), ('handle_new_user')) v(f)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = v.f
);

-- ---------------------------------------------------------------------
-- 3) Known shape mismatches (agent_runs is the loud one)
-- ---------------------------------------------------------------------
-- Daily Canberra agent_runs uses (agent, items_written, items_skipped,
-- cost_cents, stack_trace, prompt_payload). WoC migration 031 expects
-- (agent_name, summary, created_count, updated_count, error_message).
INSERT INTO _woc_report
SELECT 'BLOCK', 'shape-mismatch',
       'agent_runs columns differ from WoC migration 031. Keep this site''s shape; skip 031.'
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='agent_runs' AND column_name='agent'
);

-- ---------------------------------------------------------------------
-- 4) Hardcoded source-project URL leftovers (catches partial ports)
-- ---------------------------------------------------------------------
INSERT INTO _woc_report
SELECT 'BLOCK', 'hardcoded-source-url',
       format('Function %s.%s contains hardcoded source-project URL/key. Rewrite required.',
              n.nspname, p.proname)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%project--3abb4c9a-82d5-44e0-9687-c986294d5dbf%';

-- ---------------------------------------------------------------------
-- 5) Render report and FAIL if any BLOCK
-- ---------------------------------------------------------------------
SELECT severity, area, detail
FROM _woc_report
ORDER BY CASE severity WHEN 'BLOCK' THEN 0 WHEN 'WARN' THEN 1 ELSE 2 END,
         area, detail;

DO $$
DECLARE
  blockers int;
BEGIN
  SELECT count(*) INTO blockers FROM _woc_report WHERE severity = 'BLOCK';
  IF blockers > 0 THEN
    RAISE EXCEPTION
      'WoC dry-run FAILED: % blocker(s). Fix the BLOCK rows above before applying any batch.',
      blockers;
  ELSE
    RAISE NOTICE 'WoC dry-run OK. Warnings (if any) are advisory.';
  END IF;
END $$;

ROLLBACK;
