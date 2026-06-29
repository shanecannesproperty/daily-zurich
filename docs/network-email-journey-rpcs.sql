-- Email-journey RPCs for the shared Daily Network subscribers table.
-- These functions are SECURITY DEFINER so the anon publishable key can call
-- them safely; row access is gated on the per-subscriber unsubscribe_token
-- (a 32-char opaque secret minted at signup time).
--
-- This SQL is idempotent (CREATE OR REPLACE). Run it ONCE on the SHARED
-- Daily Network Supabase project — the one that holds the `subscribers`
-- table (https://sjcwxiesvetkblatydrd.supabase.co) — NOT on this project's
-- own database. The functions may already exist; this script is safe to
-- re-run.

CREATE OR REPLACE FUNCTION public.unsubscribe_by_token(
  p_token text,
  p_email text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  IF p_token IS NULL OR length(p_token) < 8 OR p_email IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.subscribers
     SET status          = 'unsubscribed',
         unsubscribed_at = now()
   WHERE unsubscribe_token = p_token
     AND lower(email)      = lower(p_email)
     AND city              = 'canberra';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unsubscribe_by_token(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_subscriber_by_token(
  p_token text
) RETURNS TABLE (
  email      text,
  city       text,
  status     text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.email, s.city, s.status, s.created_at
    FROM public.subscribers s
   WHERE s.unsubscribe_token = p_token
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_subscriber_by_token(text) TO anon, authenticated;
