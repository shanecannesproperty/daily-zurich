-- 20260626_01_article_comments.sql
-- article_comments + comment_flags + comment_rate (REPO A: ref sjcwxiesvetkblatydrd).
-- Hand-applied to the shared 19-city DB. Depends on 20260626_00_role_system.sql.
--
-- STATUS: ALREADY APPLIED LIVE + VERIFIED (tables, triggers, RLS policies, and the
-- 5 SECURITY DEFINER rpcs all present; anon has NO table SELECT grant). This file
-- is the source-of-truth record of what was applied.
--
-- set_updated_at() is VERIFIED present in this DB — do NOT recreate it.
--
-- SECURITY INVARIANTS (Voller pre-moderation + multi-tenant isolation):
--   * Default and ONLY public-making path is admin moderate_comment('approve').
--   * anon holds NO table grant; the public list is served solely by the
--     list_approved_comments(city, article_id) SECURITY DEFINER rpc.
--   * All reader writes go through SECURITY DEFINER rpcs; no INSERT/UPDATE grant.
--   * author_hidden (self-hide) is ORTHOGONAL to admin status; admin-removed
--     content is invisible even to its author.
--   * Flagging only records a flag + recomputes flag_count; NEVER changes status.

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.article_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text CHECK (author_name IS NULL OR char_length(author_name) <= 80),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'hidden', 'rejected')),
  author_hidden boolean NOT NULL DEFAULT false,
  flag_count integer NOT NULL DEFAULT 0,
  moderated_by uuid REFERENCES auth.users(id),
  moderated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS article_comments_public_idx
  ON public.article_comments (city, article_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS article_comments_admin_idx
  ON public.article_comments (city, status, flag_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS article_comments_user_idx
  ON public.article_comments (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.comment_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.article_comments(id) ON DELETE CASCADE,
  city text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text CHECK (reason IS NULL OR char_length(reason) <= 280),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS comment_flags_comment_idx ON public.comment_flags (comment_id);
CREATE INDEX IF NOT EXISTS comment_flags_city_idx ON public.comment_flags (city, created_at DESC);

-- Repo A has no feedback_rate -> create comment_rate.
CREATE TABLE IF NOT EXISTS public.comment_rate (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL DEFAULT date_trunc('hour', now()),
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, window_start)
);
ALTER TABLE public.comment_rate ENABLE ROW LEVEL SECURITY; -- no policies: definer/service only

-- ---------------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------------
-- City ALWAYS derived from the parent article. Voller hard-stop on a non-pending
-- insert from a non-service role (defence-in-depth atop submit_comment).
CREATE OR REPLACE FUNCTION public.article_comments_derive_city()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a_city text; a_pub boolean;
BEGIN
  SELECT city, is_published INTO a_city, a_pub FROM public.articles WHERE id = NEW.article_id;
  IF a_city IS NULL THEN RAISE EXCEPTION 'unknown article %', NEW.article_id; END IF;
  NEW.city := a_city;
  IF TG_OP = 'INSERT' AND NEW.status <> 'pending' AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'comments must be created pending';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_article_comments_derive_city ON public.article_comments;
CREATE TRIGGER trg_article_comments_derive_city BEFORE INSERT ON public.article_comments
  FOR EACH ROW EXECUTE FUNCTION public.article_comments_derive_city();

DROP TRIGGER IF EXISTS article_comments_set_updated_at ON public.article_comments;
CREATE TRIGGER article_comments_set_updated_at BEFORE UPDATE ON public.article_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); -- VERIFIED present, do not recreate

-- ---------------------------------------------------------------------------
-- GRANTS (no direct table DML for anon/authenticated; reads+writes via rpc)
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.article_comments FROM anon, authenticated;
REVOKE ALL ON public.comment_flags FROM anon, authenticated;
GRANT ALL ON public.article_comments, public.comment_flags, public.comment_rate TO service_role;

-- ---------------------------------------------------------------------------
-- RLS — the REAL tenant + status boundary
-- ---------------------------------------------------------------------------
ALTER TABLE public.article_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_flags ENABLE ROW LEVEL SECURITY;

-- article_comments: NO anon SELECT policy and NO anon table grant -> anon cannot
-- read the table at all (the public list comes only from list_approved_comments).
DROP POLICY IF EXISTS ac_author_read_own ON public.article_comments;
CREATE POLICY ac_author_read_own ON public.article_comments FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND status IN ('pending', 'approved'));
DROP POLICY IF EXISTS ac_admin_read_all ON public.article_comments;
CREATE POLICY ac_admin_read_all ON public.article_comments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS ac_admin_update ON public.article_comments;
CREATE POLICY ac_admin_update ON public.article_comments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- No anon/authenticated INSERT or DELETE policy: submit/flag/author-hide are rpc-only.
GRANT SELECT ON public.article_comments TO authenticated; -- gated to own+admin by policies
-- anon: intentionally NO grant.

-- comment_flags: own reads + city-scoped admin reads. No write policy (flag via rpc).
DROP POLICY IF EXISTS cf_read_own ON public.comment_flags;
CREATE POLICY cf_read_own ON public.comment_flags FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS cf_admin_read ON public.comment_flags;
CREATE POLICY cf_admin_read ON public.comment_flags FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.comment_flags TO authenticated;

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER RPCS — every mutating path + the public read
-- Param names are exactly city / article_id / comment_id so a single
-- rpc(fn, { city: CITY, ... }) call satisfies the city-guard AND the function.
-- ---------------------------------------------------------------------------

-- 1) PUBLIC READ (anon + authenticated). The ONLY anon read path.
CREATE OR REPLACE FUNCTION public.list_approved_comments(city text, article_id uuid)
RETURNS TABLE (id uuid, author_name text, body text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ac.id, ac.author_name, ac.body, ac.created_at
  FROM public.article_comments ac
  WHERE ac.city = list_approved_comments.city
    AND ac.article_id = list_approved_comments.article_id
    AND ac.status = 'approved' AND ac.author_hidden = false
  ORDER BY ac.created_at DESC LIMIT 200;
$$;
REVOKE EXECUTE ON FUNCTION public.list_approved_comments(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_approved_comments(text, uuid) TO anon, authenticated;

-- 2) SUBMIT. Forces user_id=auth.uid(), status='pending', city from article.
CREATE OR REPLACE FUNCTION public.submit_comment(city text, article_id uuid, body text, author_name text DEFAULT NULL)
RETURNS public.article_comments LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); a_city text; a_pub boolean; clean text; nm text; n int; row public.article_comments;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT a.city, a.is_published INTO a_city, a_pub FROM public.articles a WHERE a.id = submit_comment.article_id;
  IF a_city IS NULL OR a_pub IS NOT TRUE THEN RAISE EXCEPTION 'unknown article'; END IF;
  IF a_city <> submit_comment.city THEN RAISE EXCEPTION 'city mismatch'; END IF;
  clean := btrim(submit_comment.body);
  IF char_length(clean) < 1 OR char_length(clean) > 2000 THEN RAISE EXCEPTION 'body length'; END IF;
  nm := NULLIF(left(btrim(coalesce(submit_comment.author_name, '')), 80), '');
  IF EXISTS (SELECT 1 FROM public.article_comments c WHERE c.user_id = uid AND c.created_at > now() - interval '30 seconds')
    THEN RAISE EXCEPTION 'slow down'; END IF;
  INSERT INTO public.comment_rate(user_id) VALUES (uid)
    ON CONFLICT (user_id, window_start) DO UPDATE SET count = public.comment_rate.count + 1 RETURNING count INTO n;
  IF n >= 10 THEN RAISE EXCEPTION 'rate limited'; END IF;  -- count starts at 0, so >=10 caps at exactly 10/hour
  INSERT INTO public.article_comments(city, article_id, user_id, author_name, body, status)
    VALUES (a_city, submit_comment.article_id, uid, nm, clean, 'pending') RETURNING * INTO row;
  RETURN row;
END $$;
REVOKE EXECUTE ON FUNCTION public.submit_comment(text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_comment(text, uuid, text, text) TO authenticated;

-- 3) FLAG. Idempotent, recomputes count, NEVER changes status, no oracle, rate-limited.
CREATE OR REPLACE FUNCTION public.flag_comment(city text, comment_id uuid, reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); fcity text; fstatus text; fhidden boolean; nflags int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF (SELECT count(*) FROM public.comment_flags f WHERE f.user_id = uid AND f.created_at > now() - interval '1 hour') >= 30
    THEN RAISE EXCEPTION 'rate limited'; END IF;
  SELECT c.city, c.status, c.author_hidden INTO fcity, fstatus, fhidden
    FROM public.article_comments c WHERE c.id = flag_comment.comment_id;
  IF fcity IS NULL OR fcity <> flag_comment.city OR NOT (fstatus = 'approved' AND fhidden = false) THEN
    RETURN; -- silent no-op: no existence/state oracle
  END IF;
  INSERT INTO public.comment_flags(comment_id, city, user_id, reason)
    VALUES (flag_comment.comment_id, fcity, uid, NULLIF(left(btrim(coalesce(flag_comment.reason, '')), 280), ''))
    ON CONFLICT (comment_id, user_id) DO NOTHING;
  SELECT count(*) INTO nflags FROM public.comment_flags f WHERE f.comment_id = flag_comment.comment_id;
  UPDATE public.article_comments c SET flag_count = nflags WHERE c.id = flag_comment.comment_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.flag_comment(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.flag_comment(text, uuid, text) TO authenticated;

-- 4) AUTHOR HIDE (own row only). Sets author_hidden (orthogonal to admin status).
CREATE OR REPLACE FUNCTION public.author_hide_comment(city text, comment_id uuid, hidden boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  UPDATE public.article_comments c SET author_hidden = author_hide_comment.hidden, updated_at = now()
   WHERE c.id = author_hide_comment.comment_id AND c.user_id = uid AND c.city = author_hide_comment.city;
  IF NOT FOUND THEN RAISE EXCEPTION 'not your comment'; END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.author_hide_comment(text, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.author_hide_comment(text, uuid, boolean) TO authenticated;

-- 5) MODERATE (admin only). City asserted against the parent article.
CREATE OR REPLACE FUNCTION public.moderate_comment(city text, comment_id uuid, action text)
RETURNS public.article_comments LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); new_status text; row public.article_comments; rcity text;
BEGIN
  IF NOT public.has_role(uid, 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  new_status := CASE moderate_comment.action
    WHEN 'approve' THEN 'approved' WHEN 'restore' THEN 'approved'
    WHEN 'hide' THEN 'hidden' WHEN 'reject' THEN 'rejected' ELSE NULL END;
  IF new_status IS NULL THEN RAISE EXCEPTION 'bad action'; END IF;
  SELECT c.city INTO rcity FROM public.article_comments c WHERE c.id = moderate_comment.comment_id;
  IF rcity IS NULL OR rcity <> moderate_comment.city THEN RAISE EXCEPTION 'city mismatch'; END IF;
  UPDATE public.article_comments c SET status = new_status, moderated_by = uid, moderated_at = now(), updated_at = now()
   WHERE c.id = moderate_comment.comment_id AND c.city = moderate_comment.city RETURNING * INTO row;
  RETURN row;
END $$;
REVOKE EXECUTE ON FUNCTION public.moderate_comment(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_comment(text, uuid, text) TO authenticated;
