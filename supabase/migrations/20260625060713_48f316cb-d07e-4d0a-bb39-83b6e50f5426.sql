
-- Roles infrastructure
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

-- First-admin bootstrap. Self-serve only while user_roles has no admin yet.
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role='admin') THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (uid, 'admin') ON CONFLICT DO NOTHING;
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

-- Syndication sources (RSS feeds we ingest)
CREATE TABLE public.syndication_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  homepage_url text,
  feed_url text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  last_fetched_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.syndication_sources TO anon, authenticated;
GRANT ALL ON public.syndication_sources TO service_role;
ALTER TABLE public.syndication_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sources public read" ON public.syndication_sources FOR SELECT USING (true);
CREATE POLICY "sources admin write" ON public.syndication_sources FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Syndicated stories (one row per RSS item)
CREATE TABLE public.syndicated_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.syndication_sources(id) ON DELETE CASCADE,
  guid text NOT NULL,
  title text NOT NULL,
  dek text,
  link text NOT NULL,
  source_published_at timestamptz,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('live','hidden','featured')),
  commentary text,
  commentary_updated_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  slug text NOT NULL UNIQUE,
  UNIQUE(source_id, guid)
);
CREATE INDEX syn_stories_status_pub_idx ON public.syndicated_stories(status, source_published_at DESC);
GRANT SELECT ON public.syndicated_stories TO anon, authenticated;
GRANT ALL ON public.syndicated_stories TO service_role;
ALTER TABLE public.syndicated_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stories public read non-hidden" ON public.syndicated_stories FOR SELECT USING (status <> 'hidden');
CREATE POLICY "stories admin read all" ON public.syndicated_stories FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "stories admin write" ON public.syndicated_stories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
