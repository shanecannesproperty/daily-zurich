
CREATE TABLE public.article_image_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid,
  city text NOT NULL,
  article_title text,
  action text NOT NULL,
  prev_url text,
  new_url text,
  probe_status integer,
  probe_content_type text,
  source text,
  reason text,
  visual_check text,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX article_image_audit_article_idx ON public.article_image_audit(article_id, checked_at DESC);
CREATE INDEX article_image_audit_city_checked_idx ON public.article_image_audit(city, checked_at DESC);

GRANT SELECT, INSERT ON public.article_image_audit TO authenticated;
GRANT ALL ON public.article_image_audit TO service_role;

ALTER TABLE public.article_image_audit ENABLE ROW LEVEL SECURITY;

-- Admins can read all rows; nobody (not even admins) can update or delete -> immutable log.
CREATE POLICY "audit admin read" ON public.article_image_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only service_role inserts (no policy needed for service_role; it bypasses RLS).
-- No UPDATE or DELETE policies -> immutable.
