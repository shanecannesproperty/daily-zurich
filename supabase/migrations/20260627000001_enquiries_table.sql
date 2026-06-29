-- enquiries table for /advertise and /tips form submissions
CREATE TABLE IF NOT EXISTS public.enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  type text NOT NULL CHECK (type IN ('listing', 'property', 'sponsor', 'tip', 'general')),
  payload jsonb NOT NULL DEFAULT '{}',
  routed_to text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'actioned', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

-- Only service role can read; anon can insert (rate-limited by Supabase default)
CREATE POLICY "Enquiries insert anon" ON public.enquiries
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Enquiries read service" ON public.enquiries
  FOR SELECT TO service_role USING (true);

CREATE INDEX IF NOT EXISTS idx_enquiries_city_status
  ON public.enquiries (city, status, created_at DESC);

-- trigger to keep updated_at current
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS enquiries_touch_updated_at ON public.enquiries;
CREATE TRIGGER enquiries_touch_updated_at
  BEFORE UPDATE ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

GRANT SELECT, INSERT ON public.enquiries TO anon;
GRANT ALL ON public.enquiries TO service_role;
