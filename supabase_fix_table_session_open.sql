-- =============================================================
-- PLAY ROOM ARTICHOKE — corectarea deschiderii sesiunilor de masă
-- Rulați integral în proiectul aiyoepumhzofjsfhohtk:
-- Supabase Dashboard → SQL Editor → New query → Run.
-- =============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_open_table_session(p_table_number INTEGER)
RETURNS TABLE (session_id UUID, token UUID, opened_at TIMESTAMPTZ, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session public.table_sessions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Administrator access required';
  END IF;

  IF p_table_number NOT BETWEEN 1 AND 6 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid table number';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(83001, p_table_number);

  UPDATE public.table_sessions AS expired_session
  SET
    status = 'closed',
    closed_at = expired_session.expires_at
  WHERE expired_session.table_number = p_table_number
    AND expired_session.status = 'active'
    AND expired_session.expires_at <= now();

  SELECT active_session.*
  INTO v_session
  FROM public.table_sessions AS active_session
  WHERE active_session.table_number = p_table_number
    AND active_session.status = 'active'
    AND active_session.expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.table_sessions (table_number, opened_by)
    VALUES (p_table_number, auth.uid())
    RETURNING * INTO v_session;
  END IF;

  RETURN QUERY
  SELECT
    v_session.id,
    v_session.token,
    v_session.opened_at,
    v_session.expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_open_table_session(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_open_table_session(INTEGER)
  TO authenticated, service_role;

COMMIT;
