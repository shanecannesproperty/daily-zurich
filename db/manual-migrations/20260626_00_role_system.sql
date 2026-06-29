-- 20260626_00_role_system.sql
-- ROLE SYSTEM PREREQUISITE for article_comments (REPO A: ref sjcwxiesvetkblatydrd).
-- Ported verbatim from repo B. Idempotent. Hand-applied to the shared 19-city DB.
--
-- STATUS: ALREADY APPLIED LIVE + VERIFIED (has_role returns true for the seeded
-- admin shane@spexperts.com.au). This file is the source-of-truth record of what
-- was applied; do NOT re-run blindly against the live DB without confirming.
--
-- WHY: repo A admin gating previously checked session.user.email != null (mere
-- authentication). Adding reader magic-link to the SAME Supabase project would
-- make every reader satisfy the email-only gate and reach /admin/*. The role
-- system + role-based admin gating closes that hole BEFORE reader auth ships.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'reader', 'business');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ur_read_own ON public.user_roles;
CREATE POLICY ur_read_own ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
-- No write policy: roles are managed by service_role only.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Seed Shane as admin. Uses the real production auth.users uuid via email lookup.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'shane@spexperts.com.au'
ON CONFLICT DO NOTHING;
