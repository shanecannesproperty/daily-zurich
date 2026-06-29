
CREATE TABLE IF NOT EXISTS public.article_views (
  city text NOT NULL,
  slug text NOT NULL,
  view_count bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (city, slug)
);

GRANT SELECT ON public.article_views TO anon, authenticated;
GRANT ALL ON public.article_views TO service_role;

ALTER TABLE public.article_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "article_views public read" ON public.article_views;
CREATE POLICY "article_views public read" ON public.article_views
  FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS article_views_city_count_idx
  ON public.article_views (city, view_count DESC);

CREATE OR REPLACE FUNCTION public.increment_article_view(p_slug text, p_city text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.article_views (city, slug, view_count, updated_at)
  VALUES (p_city, p_slug, 1, now())
  ON CONFLICT (city, slug)
  DO UPDATE SET view_count = public.article_views.view_count + 1,
                updated_at = now();
$$;

REVOKE ALL ON FUNCTION public.increment_article_view(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_article_view(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_most_read(p_city text, p_limit int DEFAULT 5)
RETURNS TABLE (slug text, view_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT slug, view_count
  FROM public.article_views
  WHERE city = p_city
  ORDER BY view_count DESC, updated_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
$$;

REVOKE ALL ON FUNCTION public.get_most_read(text, int) FROM public;
GRANT EXECUTE ON FUNCTION public.get_most_read(text, int) TO anon, authenticated;
