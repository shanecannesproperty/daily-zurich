-- Analytics: configurable bot UA categories, track_failures, and reconciliation view.
-- Idempotent: safe to re-run. Additive only.

-- =========================================================================
-- 1) Add ua_category column to site_events (nullable; null = not classified yet)
-- =========================================================================
ALTER TABLE public.site_events
  ADD COLUMN IF NOT EXISTS ua_category text;

-- =========================================================================
-- 2) app_settings — generic key/value store for operator-configurable settings.
--    First use: bot_ua_patterns (a jsonb object of category → string[]).
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'app_settings' AND policyname = 'admin full access app_settings'
  ) THEN
    CREATE POLICY "admin full access app_settings" ON public.app_settings
      FOR ALL TO authenticated
      USING ((auth.jwt() ->> 'email') = 'shane@spexperts.com.au')
      WITH CHECK ((auth.jwt() ->> 'email') = 'shane@spexperts.com.au');
  END IF;

  -- Anon may only read the bot_ua_patterns row (needed by the server worker).
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'app_settings' AND policyname = 'anon read bot_ua_patterns'
  ) THEN
    CREATE POLICY "anon read bot_ua_patterns" ON public.app_settings
      FOR SELECT TO anon
      USING (key = 'bot_ua_patterns');
  END IF;
END $$;

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

-- Seed default bot patterns (matches DEFAULT_BOT_PATTERNS in src/lib/bot-classify.ts).
INSERT INTO public.app_settings (key, value)
VALUES (
  'bot_ua_patterns',
  '{
    "googlebot":  ["googlebot", "google-inspectiontool"],
    "bingbot":    ["bingbot", "msnbot"],
    "social":     ["facebookexternalhit", "twitterbot", "linkedinbot", "whatsapp", "slackbot", "discordbot"],
    "seo":        ["semrushbot", "ahrefsbot", "mj12bot", "dotbot", "rogerbot"],
    "headless":   ["headlesschrome", "phantomjs", "lighthouse", "pagespeed", "playwright", "puppeteer"],
    "monitor":    ["pingdom", "uptimerobot", "statuscake", "gtmetrix"],
    "generic":    ["bot", "crawler", "spider", "slurp", "wget", "curl", "python-requests",
                   "go-http-client", "java/", "libwww", "httpclient", "okhttp"]
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- =========================================================================
-- 3) track_failures — counts of blocked/failed client-side tracker POSTs.
--    Anon increments via record_track_failure() RPC (SECURITY DEFINER).
--    No direct anon table access; admin reads via authenticated session.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.track_failures (
  day  date NOT NULL,
  city text NOT NULL,
  count int NOT NULL DEFAULT 0,
  PRIMARY KEY (day, city)
);

ALTER TABLE public.track_failures ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'track_failures' AND policyname = 'admin read track_failures'
  ) THEN
    CREATE POLICY "admin read track_failures" ON public.track_failures
      FOR SELECT TO authenticated
      USING ((auth.jwt() ->> 'email') = 'shane@spexperts.com.au');
  END IF;
END $$;

GRANT SELECT ON public.track_failures TO authenticated;
GRANT ALL ON public.track_failures TO service_role;

CREATE OR REPLACE FUNCTION public.record_track_failure(p_city text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO track_failures (day, city, count)
  VALUES (CURRENT_DATE, p_city, 1)
  ON CONFLICT (day, city)
  DO UPDATE SET count = track_failures.count + 1
  WHERE track_failures.count < 10000;
END;
$$;

REVOKE ALL ON FUNCTION public.record_track_failure(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_track_failure(text) TO anon;

-- =========================================================================
-- 4) UA-category daily rollup view (for the Source breakdown panel).
--    Rows with ua_category=null (old events) roll up as 'unknown'.
-- =========================================================================
CREATE OR REPLACE VIEW public.site_events_by_category_daily AS
SELECT
  city,
  (created_at AT TIME ZONE 'Australia/Sydney')::date AS day,
  COALESCE(ua_category, 'unknown') AS ua_category,
  count(*) AS events,
  count(DISTINCT anon_session_id) AS sessions
FROM public.site_events
GROUP BY city, (created_at AT TIME ZONE 'Australia/Sydney')::date, COALESCE(ua_category, 'unknown');

GRANT SELECT ON public.site_events_by_category_daily TO authenticated;
