-- PLAY ROOM ARTICHOKE — numere scurte pentru verificarea comenzilor
-- Rulează o singură dată în Supabase Dashboard → SQL Editor.

BEGIN;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'executed', 'cancelled'));

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq
  AS BIGINT
  START WITH 100001;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number BIGINT;

ALTER TABLE public.orders
  ALTER COLUMN order_number SET DEFAULT nextval('public.order_number_seq');

UPDATE public.orders
SET order_number = nextval('public.order_number_seq')
WHERE order_number IS NULL;

DO $$
DECLARE
  v_last_number BIGINT;
BEGIN
  SELECT GREATEST(COALESCE(MAX(order_number), 100000), 100000)
  INTO v_last_number
  FROM public.orders;

  PERFORM setval('public.order_number_seq', v_last_number, TRUE);
END;
$$;

ALTER TABLE public.orders
  ALTER COLUMN order_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_key
  ON public.orders(order_number);

ALTER SEQUENCE public.order_number_seq
  OWNED BY public.orders.order_number;

CREATE OR REPLACE FUNCTION public.get_public_order_board()
RETURNS TABLE (
  order_number BIGINT,
  status TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    orders.order_number,
    orders.status,
    orders.updated_at
  FROM public.orders
  WHERE orders.order_number IS NOT NULL
    AND orders.created_at >= now() - INTERVAL '1 day'
    AND orders.status IN ('pending', 'processing', 'completed')
    AND (
      orders.status <> 'completed'
      OR orders.updated_at >= now() - INTERVAL '15 minutes'
    )
  ORDER BY
    CASE orders.status
      WHEN 'completed' THEN 1
      WHEN 'processing' THEN 2
      ELSE 3
    END,
    CASE WHEN orders.status = 'completed' THEN orders.updated_at END DESC,
    CASE WHEN orders.status <> 'completed' THEN orders.created_at END ASC
  LIMIT 60;
$$;

REVOKE ALL ON FUNCTION public.get_public_order_board() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_order_board() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_create_order(
  p_items JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_order_id UUID;
  v_order_number BIGINT;
  v_total NUMERIC(10,2);
  v_input_count INTEGER;
  v_unique_count INTEGER;
  v_valid_count INTEGER;
  v_notes TEXT := NULLIF(pg_catalog.btrim(COALESCE(p_notes, '')), '');
BEGIN
  IF v_user_id IS NULL OR NOT private.is_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Administrator access required';
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
        AND requested.quantity BETWEEN 1 AND 99
    )::INTEGER,
    COALESCE(
      pg_catalog.sum(
        CASE
          WHEN products.id IS NOT NULL AND requested.quantity BETWEEN 1 AND 99
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

  INSERT INTO public.orders (user_id, total, notes, status)
  VALUES (v_user_id, v_total, v_notes, 'pending')
  RETURNING id, order_number INTO v_order_id, v_order_number;

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

  RETURN v_order_number;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_order(JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_order(JSONB, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(p_order_id UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Administrator access required';
  END IF;

  IF p_status NOT IN ('pending', 'processing', 'completed', 'executed', 'cancelled') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid order status';
  END IF;

  UPDATE public.orders
  SET status = p_status, updated_at = now()
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Order not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_order_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(UUID, TEXT) TO authenticated, service_role;

COMMIT;
