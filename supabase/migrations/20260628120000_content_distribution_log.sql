-- Per-channel distribution ledger. Records which articles have been submitted to
-- search engines (IndexNow, Google Indexing API) and posted to social channels
-- (Facebook, Instagram) so the distribution cron never resubmits a search URL
-- unnecessarily and never double-posts to socials.
--
-- Written only by the service-role distribution job (src/lib/distribution.server.ts);
-- no anon access. The unique (city, slug, channel) key is the dedup guarantee.
CREATE TABLE IF NOT EXISTS public.content_distribution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  article_id uuid,
  slug text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('indexnow', 'google', 'facebook', 'instagram')),
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'error')),
  detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_distribution_log_unique UNIQUE (city, slug, channel)
);

ALTER TABLE public.content_distribution_log ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; the explicit policy keeps reads service-only.
CREATE POLICY "distribution_log read service" ON public.content_distribution_log
  FOR SELECT TO service_role USING (true);

CREATE INDEX IF NOT EXISTS idx_distribution_log_city_slug
  ON public.content_distribution_log (city, slug);

GRANT ALL ON public.content_distribution_log TO service_role;
