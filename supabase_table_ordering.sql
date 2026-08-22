-- =============================================================
-- PLAY ROOM ARTICHOKE — comenzi la masă prin sesiuni QR de 2 ore
-- Rulați integral în Supabase Dashboard → SQL Editor.
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.table_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token        UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  table_number SMALLINT NOT NULL CHECK (table_number BETWEEN 1 AND 6),
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  opened_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '2 hours'),
  closed_at    TIMESTAMPTZ
);

ALTER TABLE public.table_sessions
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE public.table_sessions
SET expires_at = opened_at + INTERVAL '2 hours'
WHERE expires_at IS NULL;

ALTER TABLE public.table_sessions
  ALTER COLUMN expires_at SET DEFAULT (now() + INTERVAL '2 hours'),
  ALTER COLUMN expires_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS table_sessions_one_active_per_table
  ON public.table_sessions(table_number)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_table_sessions_status_opened
  ON public.table_sessions(status, opened_at DESC);

ALTER TABLE public.orders
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS table_session_id UUID
    REFERENCES public.table_sessions(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS table_number SMALLINT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_request_id UUID;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_table_number_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_table_number_check
  CHECK (table_number IS NULL OR table_number BETWEEN 1 AND 6);

CREATE UNIQUE INDEX IF NOT EXISTS orders_client_request_id_key
  ON public.orders(client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_table_session
  ON public.orders(table_session_id, created_at DESC);

ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.table_sessions FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.admin_get_tables();

CREATE FUNCTION public.admin_get_tables()
RETURNS TABLE (
  table_number SMALLINT,
  session_id UUID,
  token UUID,
  opened_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  order_count BIGINT,
  open_order_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Administrator access required';
  END IF;

  UPDATE public.table_sessions AS expired_session
  SET
    status = 'closed',
    closed_at = COALESCE(expired_session.closed_at, expired_session.expires_at)
  WHERE expired_session.status = 'active'
    AND expired_session.expires_at <= now();

  RETURN QUERY
  SELECT
    tables.table_number::SMALLINT,
    sessions.id,
    sessions.token,
    sessions.opened_at,
    sessions.expires_at,
    pg_catalog.count(orders.id),
    pg_catalog.count(orders.id) FILTER (
      WHERE orders.status NOT IN ('executed', 'cancelled')
    )
  FROM pg_catalog.generate_series(1, 6) AS tables(table_number)
  LEFT JOIN public.table_sessions AS sessions
    ON sessions.table_number = tables.table_number
   AND sessions.status = 'active'
  LEFT JOIN public.orders
    ON orders.table_session_id = sessions.id
  WHERE private.is_admin()
  GROUP BY tables.table_number, sessions.id, sessions.token, sessions.opened_at, sessions.expires_at
  ORDER BY tables.table_number;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_open_table_session(INTEGER);

CREATE FUNCTION public.admin_open_table_session(p_table_number INTEGER)
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
  SET status = 'closed', closed_at = expired_session.expires_at
  WHERE expired_session.table_number = p_table_number
    AND expired_session.status = 'active'
    AND expired_session.expires_at <= now();

  SELECT *
  INTO v_session
  FROM public.table_sessions
  WHERE table_number = p_table_number
    AND status = 'active'
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.table_sessions (table_number, opened_by)
    VALUES (p_table_number, auth.uid())
    RETURNING * INTO v_session;
  END IF;

  RETURN QUERY SELECT v_session.id, v_session.token, v_session.opened_at, v_session.expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_rotate_table_session(p_table_number INTEGER)
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

  UPDATE public.table_sessions AS active_session
  SET
    token = gen_random_uuid(),
    expires_at = now() + INTERVAL '2 hours'
  WHERE active_session.table_number = p_table_number
    AND active_session.status = 'active'
    AND active_session.expires_at > now()
  RETURNING active_session.* INTO v_session;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Active table session not found';
  END IF;

  RETURN QUERY SELECT v_session.id, v_session.token, v_session.opened_at, v_session.expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_close_table_session(p_table_number INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Administrator access required';
  END IF;

  IF p_table_number NOT BETWEEN 1 AND 6 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid table number';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(83001, p_table_number);

  SELECT id
  INTO v_session_id
  FROM public.table_sessions
  WHERE table_number = p_table_number
    AND status = 'active'
  FOR UPDATE;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Active table session not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.orders
    WHERE table_session_id = v_session_id
      AND status NOT IN ('executed', 'cancelled')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Table has unfinished orders';
  END IF;

  UPDATE public.table_sessions
  SET status = 'closed', closed_at = now()
  WHERE id = v_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_table_order_context(p_token UUID)
RETURNS TABLE (table_number SMALLINT, opened_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT sessions.table_number, sessions.opened_at
  FROM public.table_sessions AS sessions
  WHERE sessions.token = p_token
    AND sessions.status = 'active'
    AND sessions.expires_at > now()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.submit_table_order(
  p_token UUID,
  p_request_id UUID,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (order_number BIGINT, total NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session_id UUID;
  v_table_number SMALLINT;
  v_order_id UUID;
  v_order_number BIGINT;
  v_total NUMERIC(10,2);
  v_input_count INTEGER;
  v_unique_count INTEGER;
  v_valid_count INTEGER;
  v_notes TEXT := NULLIF(pg_catalog.btrim(COALESCE(p_notes, '')), '');
BEGIN
  IF p_token IS NULL OR p_request_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid table session';
  END IF;

  SELECT sessions.id, sessions.table_number
  INTO v_session_id, v_table_number
  FROM public.table_sessions AS sessions
  WHERE sessions.token = p_token
    AND sessions.status = 'active'
    AND sessions.expires_at > now()
  FOR UPDATE;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Table session is not active';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_session_id::TEXT, 83002)
  );

  SELECT orders.order_number, orders.total
  INTO v_order_number, v_total
  FROM public.orders
  WHERE orders.client_request_id = p_request_id
    AND orders.table_session_id = v_session_id;

  IF FOUND THEN
    RETURN QUERY SELECT v_order_number, v_total;
    RETURN;
  END IF;

  IF (
    SELECT pg_catalog.count(*)
    FROM public.orders
    WHERE table_session_id = v_session_id
      AND created_at >= now() - INTERVAL '1 hour'
  ) >= 20 THEN
    RAISE EXCEPTION USING ERRCODE = '54000', MESSAGE = 'Too many orders for this table session';
  END IF;

  IF p_items IS NULL
    OR pg_catalog.jsonb_typeof(p_items) <> 'array'
    OR pg_catalog.jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid order items';
  END IF;

  IF v_notes IS NOT NULL AND pg_catalog.char_length(v_notes) > 500 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Order note is too long';
  END IF;

  WITH requested AS (
    SELECT
      NULLIF(pg_catalog.btrim(item.product_id), '') AS product_id,
      item.quantity
    FROM pg_catalog.jsonb_to_recordset(p_items)
      AS item(product_id TEXT, quantity INTEGER)
  )
  SELECT
    pg_catalog.count(*)::INTEGER,
    pg_catalog.count(DISTINCT requested.product_id)::INTEGER,
    pg_catalog.count(*) FILTER (
      WHERE products.id IS NOT NULL
        AND requested.quantity BETWEEN 1 AND 20
    )::INTEGER,
    COALESCE(
      pg_catalog.sum(
        CASE
          WHEN products.id IS NOT NULL AND requested.quantity BETWEEN 1 AND 20
            THEN products.price * requested.quantity
          ELSE 0
        END
      ),
      0
    )
  INTO v_input_count, v_unique_count, v_valid_count, v_total
  FROM requested
  LEFT JOIN public.products
    ON products.id = requested.product_id
   AND products.active = TRUE;

  IF v_input_count <> v_unique_count OR v_input_count <> v_valid_count OR v_total <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid or unavailable product';
  END IF;

  INSERT INTO public.orders AS new_order (
    user_id,
    total,
    notes,
    status,
    table_session_id,
    table_number,
    client_request_id
  )
  VALUES (
    NULL,
    v_total,
    v_notes,
    'pending',
    v_session_id,
    v_table_number,
    p_request_id
  )
  RETURNING new_order.id, new_order.order_number INTO v_order_id, v_order_number;

  INSERT INTO public.order_items (
    order_id,
    product_id,
    product_name,
    price,
    quantity
  )
  SELECT
    v_order_id,
    products.id,
    products.name,
    products.price,
    requested.quantity
  FROM pg_catalog.jsonb_to_recordset(p_items)
    AS requested(product_id TEXT, quantity INTEGER)
  JOIN public.products
    ON products.id = pg_catalog.btrim(requested.product_id)
   AND products.active = TRUE;

  RETURN QUERY SELECT v_order_number, v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_tables() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_open_table_session(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_rotate_table_session(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_close_table_session(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_table_order_context(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_table_order(UUID, UUID, JSONB, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_get_tables() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_open_table_session(INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_rotate_table_session(INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_close_table_session(INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_table_order_context(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_table_order(UUID, UUID, JSONB, TEXT)
  TO service_role;

COMMIT;
