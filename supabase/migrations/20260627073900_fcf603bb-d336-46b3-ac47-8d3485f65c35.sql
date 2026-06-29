-- 1. Lock down claim_first_admin: it's a legacy helper that was replaced by
-- src/lib/admin-bootstrap.functions.ts. No web caller should reach it.
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM authenticated;

-- 2. increment_article_view stays public (the article page calls it as anon),
-- but harden the inputs so it can't be abused to write arbitrary keys into
-- article_views. Reject anything outside expected bounds.
CREATE OR REPLACE FUNCTION public.increment_article_view(p_slug text, p_city text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Basic bounds: slug must be a short, url-safe-ish string; city must be
  -- a recognised network city slug.
  IF p_slug IS NULL OR length(p_slug) = 0 OR length(p_slug) > 200 THEN
    RETURN;
  END IF;
  IF p_city IS NULL OR p_city NOT IN (
    'canberra','sydney','melbourne','brisbane','perth','adelaide','gold_coast',
    'newcastle','hobart','darwin','cairns','wollongong','geelong','townsville',
    'ballarat','bendigo','albury','launceston','mackay'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.article_views (city, slug, view_count, updated_at)
  VALUES (p_city, p_slug, 1, now())
  ON CONFLICT (city, slug)
  DO UPDATE SET view_count = public.article_views.view_count + 1,
                updated_at = now();
END
$function$;

-- Keep anon + authenticated EXECUTE (intentional public counter); revoke PUBLIC.
REVOKE EXECUTE ON FUNCTION public.increment_article_view(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_article_view(text, text) TO anon, authenticated;