
-- 1. Lock down SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;
-- has_role is used by RLS policies for authenticated users; keep that grant only.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated, service_role;

-- 2. Restrict public column access on syndication_sources.
-- Keep public RLS row visibility, but revoke column privileges on sensitive
-- operational fields so anonymous visitors cannot read feed_url / last_error
-- / last_fetched_at / last_fetched_count / last_inserted_count / last_error.
REVOKE SELECT ON public.syndication_sources FROM anon;
GRANT SELECT (id, name, homepage_url, active, created_at) ON public.syndication_sources TO anon;

-- Authenticated admin reads continue to work through the admin-write policy
-- and full-table grant; ensure authenticated retains full SELECT for admin UI.
GRANT SELECT ON public.syndication_sources TO authenticated;
