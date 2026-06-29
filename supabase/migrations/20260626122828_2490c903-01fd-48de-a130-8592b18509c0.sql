CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  title text NOT NULL,
  company text NOT NULL,
  location text,
  category text DEFAULT 'general',
  employment_type text DEFAULT 'full-time',
  salary_range text,
  description text,
  apply_url text,
  is_published boolean NOT NULL DEFAULT true,
  published_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  source text DEFAULT 'direct',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jobs publicly readable" ON public.jobs
  FOR SELECT TO anon, authenticated
  USING (is_published = true AND (expires_at IS NULL OR expires_at > now()));

CREATE INDEX IF NOT EXISTS idx_jobs_city_published
  ON public.jobs (city, published_at DESC)
  WHERE is_published = true;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();