-- PLAY ROOM ARTICHOKE — numere scurte pentru verificarea comenzilor
-- Rulează o singură dată în Supabase Dashboard → SQL Editor.

BEGIN;

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

COMMIT;
