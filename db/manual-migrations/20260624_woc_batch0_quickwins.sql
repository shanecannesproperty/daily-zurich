-- =====================================================================
-- WoC port — Batch 0: quick-win security tightenings
-- =====================================================================
-- Sources: WoC migrations 072, 103, 117. No new tables, no data writes.
-- Each block is wrapped so missing tables/functions become a no-op, so
-- Daily Canberra can apply this even though it lacks some WoC sections
-- (weekly_picks, sponsors, roundups, match_guides, webhooks may or may
-- not exist).
--
-- REWRITES applied vs source:
--   * none (no hardcoded URLs in these three migrations)
--
-- Run AFTER 20260624_woc_dryrun_validator.sql reports OK.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- From 072: rewrite articles_public_read so anon path doesn't call has_role
-- ---------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies
             WHERE schemaname='public' AND tablename='articles'
               AND policyname='articles_public_read') THEN
    DROP POLICY "articles_public_read" ON public.articles;
  END IF;
END $$;

CREATE POLICY "articles_public_read" ON public.articles
  FOR SELECT TO anon, authenticated
  USING (
    CASE
      WHEN auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN true
      ELSE (status IS NULL OR status = 'published')
    END
  );

-- sponsors / roundups: only patch if they exist on this site.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies
             WHERE policyname='sponsors_public_read' AND tablename='sponsors') THEN
    DROP POLICY "sponsors_public_read" ON public.sponsors;
    CREATE POLICY "sponsors_public_read" ON public.sponsors
      FOR SELECT TO anon, authenticated
      USING (
        CASE
          WHEN auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN true
          ELSE (status IS NULL OR status = 'active')
        END
      );
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies
             WHERE policyname='roundups_public_read' AND tablename='roundups') THEN
    DROP POLICY "roundups_public_read" ON public.roundups;
    CREATE POLICY "roundups_public_read" ON public.roundups
      FOR SELECT TO anon, authenticated
      USING (
        CASE
          WHEN auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN true
          ELSE (status IS NULL OR status = 'published')
        END
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- From 103: narrow weekly_picks window; lock match_* EXECUTE to service_role
-- ---------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='weekly_picks') THEN
    DROP POLICY IF EXISTS "weekly_picks_public_read" ON public.weekly_picks;
    CREATE POLICY "weekly_picks_public_read" ON public.weekly_picks
      FOR SELECT TO anon, authenticated
      USING (
        week_start >= (current_date - interval '8 weeks')::date
        AND week_start <= (current_date + interval '2 weeks')::date
      );
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='match_articles') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.match_articles(extensions.vector, integer) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.match_articles(extensions.vector, integer) TO service_role';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='match_guides') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.match_guides(extensions.vector, integer, uuid) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.match_guides(extensions.vector, integer, uuid) TO service_role';
  END IF;
END $$;

-- has_role: remove anon EXECUTE, keep authenticated + service_role.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='has_role') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- From 117: hide webhooks.secret from authenticated; comment submitter_email
-- ---------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='webhooks') THEN
    EXECUTE 'REVOKE SELECT ON public.webhooks FROM authenticated';
    EXECUTE 'GRANT SELECT (id, direction, event_type, url, label, active, created_at, updated_at)
             ON public.webhooks TO authenticated';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='events'
               AND column_name='submitter_email') THEN
    EXECUTE $cmt$COMMENT ON COLUMN public.events.submitter_email IS
      'PII — never granted to anon/authenticated. Service role only.'$cmt$;
  END IF;
END $$;

COMMIT;
