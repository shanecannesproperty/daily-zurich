REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_article_view(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_article_view(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO service_role;