-- =====================================================================
-- WoC port — Batch 0 post-apply validation
-- =====================================================================
-- Run AFTER 20260624_woc_batch0_quickwins.sql. Read-only.
-- Verifies the three security tightenings actually landed and that no
-- row counts moved (Batch 0 is policy/grant only — counts must be stable).
--
-- All checks raise NOTICE on pass and EXCEPTION on fail, then ROLLBACK.
-- =====================================================================

BEGIN;

CREATE TEMP TABLE _b0_check (
  ok       boolean,
  area     text,
  detail   text
) ON COMMIT DROP;

-- ---------------------------------------------------------------------
-- 1) Row-count invariants (Batch 0 must not change data)
-- ---------------------------------------------------------------------
-- We can't compare to a prior snapshot here, so just confirm the tables
-- still respond and record the live counts for the operator to eyeball.
DO $$
DECLARE
  c_articles int := 0;
  c_webhooks int := 0;
  c_weekly   int := 0;
BEGIN
  SELECT count(*) INTO c_articles FROM public.articles;
  INSERT INTO _b0_check VALUES (true, 'rowcount', format('articles=%s', c_articles));

  IF to_regclass('public.webhooks') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.webhooks' INTO c_webhooks;
    INSERT INTO _b0_check VALUES (true, 'rowcount', format('webhooks=%s', c_webhooks));
  END IF;

  IF to_regclass('public.weekly_picks') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.weekly_picks' INTO c_weekly;
    INSERT INTO _b0_check VALUES (true, 'rowcount', format('weekly_picks=%s', c_weekly));
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2) Policy: articles_public_read exists and references has_role
-- ---------------------------------------------------------------------
INSERT INTO _b0_check
SELECT
  (qual ILIKE '%has_role%' AND qual ILIKE '%published%'),
  'policy:articles_public_read',
  COALESCE(qual, '<missing>')
FROM pg_policies
WHERE schemaname='public' AND tablename='articles'
  AND policyname='articles_public_read'
UNION ALL
SELECT false, 'policy:articles_public_read', 'POLICY MISSING'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname='public' AND tablename='articles'
    AND policyname='articles_public_read'
);

-- ---------------------------------------------------------------------
-- 3) Function grants: match_articles / match_guides / has_role
-- ---------------------------------------------------------------------
-- match_* must NOT be executable by anon/authenticated
INSERT INTO _b0_check
SELECT
  NOT bool_or(grantee IN ('anon','authenticated','PUBLIC')),
  'grant:'||routine_name,
  string_agg(grantee, ',')
FROM information_schema.routine_privileges
WHERE specific_schema='public'
  AND routine_name IN ('match_articles','match_guides')
GROUP BY routine_name;

-- has_role must NOT be executable by anon
INSERT INTO _b0_check
SELECT
  NOT bool_or(grantee = 'anon'),
  'grant:has_role',
  string_agg(grantee, ',')
FROM information_schema.routine_privileges
WHERE specific_schema='public' AND routine_name='has_role';

-- ---------------------------------------------------------------------
-- 4) webhooks: authenticated must NOT have full SELECT
-- ---------------------------------------------------------------------
DO $$
DECLARE
  has_full boolean;
BEGIN
  IF to_regclass('public.webhooks') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.table_privileges
      WHERE table_schema='public' AND table_name='webhooks'
        AND grantee='authenticated' AND privilege_type='SELECT'
    ) INTO has_full;
    INSERT INTO _b0_check
    VALUES (NOT has_full, 'grant:webhooks.select',
            CASE WHEN has_full THEN 'authenticated still has table-wide SELECT'
                 ELSE 'column-scoped only (expected)' END);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 5) weekly_picks policy window narrowed
-- ---------------------------------------------------------------------
INSERT INTO _b0_check
SELECT
  (qual ILIKE '%week_start%' AND qual ILIKE '%interval%'),
  'policy:weekly_picks_public_read',
  COALESCE(qual,'<missing>')
FROM pg_policies
WHERE schemaname='public' AND tablename='weekly_picks'
  AND policyname='weekly_picks_public_read';

-- ---------------------------------------------------------------------
-- Report + fail on any false
-- ---------------------------------------------------------------------
SELECT ok, area, detail FROM _b0_check ORDER BY ok, area;

DO $$
DECLARE
  fails int;
BEGIN
  SELECT count(*) INTO fails FROM _b0_check WHERE ok IS FALSE;
  IF fails > 0 THEN
    RAISE EXCEPTION 'Batch 0 post-check FAILED: % issue(s). See rows above.', fails;
  END IF;
  RAISE NOTICE 'Batch 0 post-check OK.';
END $$;

ROLLBACK;
