
CREATE OR REPLACE FUNCTION public.get_most_read(p_city text, p_limit int DEFAULT 5)
RETURNS TABLE (slug text, view_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
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

COMMENT ON FUNCTION public.increment_article_view(text, text) IS
  'Intentionally SECURITY DEFINER: lets anon/auth callers atomically increment a view counter without granting them write access on public.article_views. Narrow surface; no user-controlled SQL.';
