-- =============================================================
-- PLAY ROOM ARTICHOKE — securizare suplimentară
-- Rulați integral în Supabase Dashboard → SQL Editor.
-- Poate fi rulat din nou fără a reseta produse sau prețuri.
-- =============================================================

BEGIN;

-- Doar administratorul privat poate vedea mesaje și rezervări.
DROP POLICY IF EXISTS contact_messages_admin_select ON public.contact_messages;
CREATE POLICY contact_messages_admin_select ON public.contact_messages
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS reservations_admin_select ON public.reservations;
CREATE POLICY reservations_admin_select ON public.reservations
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

-- Unește rândurile duplicate existente înainte de a adăuga unicitatea.
CREATE TEMP TABLE cart_items_to_merge ON COMMIT DROP AS
SELECT
  user_id,
  product_id,
  (pg_catalog.array_agg(id ORDER BY created_at, id))[1] AS keep_id,
  LEAST(pg_catalog.sum(quantity), 99)::INTEGER AS merged_quantity
FROM public.cart_items
WHERE product_id IS NOT NULL
GROUP BY user_id, product_id
HAVING pg_catalog.count(*) > 1;

UPDATE public.cart_items AS cart
SET quantity = merge.merged_quantity
FROM cart_items_to_merge AS merge
WHERE cart.id = merge.keep_id;

DELETE FROM public.cart_items AS cart
USING cart_items_to_merge AS merge
WHERE cart.user_id = merge.user_id
  AND cart.product_id = merge.product_id
  AND cart.id <> merge.keep_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_user_product_unique
  ON public.cart_items(user_id, product_id);

CREATE OR REPLACE FUNCTION public.add_to_cart(
  p_product_id TEXT,
  p_quantity INTEGER DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_product public.products%ROWTYPE;
  v_cart_item_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication required';
  END IF;
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 99 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid quantity';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::TEXT, 0)
  );

  SELECT * INTO v_product
  FROM public.products
  WHERE id = p_product_id AND active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Product unavailable';
  END IF;

  INSERT INTO public.cart_items (
    user_id, product_id, product_name, price, quantity
  ) VALUES (
    v_user_id, v_product.id, v_product.name, v_product.price, p_quantity
  )
  ON CONFLICT (user_id, product_id) DO UPDATE SET
    quantity = LEAST(public.cart_items.quantity + EXCLUDED.quantity, 99),
    product_name = EXCLUDED.product_name,
    price = EXCLUDED.price
  RETURNING id INTO v_cart_item_id;

  RETURN v_cart_item_id;
END;
$$;

-- Limite server-side. Blocarea globală împiedică ocolirea prin cereri paralele.
CREATE OR REPLACE FUNCTION public.submit_contact_message(
  p_name TEXT,
  p_email TEXT,
  p_subject TEXT,
  p_message TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
  v_name TEXT := pg_catalog.btrim(p_name);
  v_email TEXT := pg_catalog.lower(pg_catalog.btrim(p_email));
  v_message TEXT := pg_catalog.btrim(p_message);
BEGIN
  IF v_name IS NULL OR pg_catalog.char_length(v_name) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid name';
  END IF;
  IF v_email IS NULL OR pg_catalog.char_length(v_email) > 254
    OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid email';
  END IF;
  IF p_subject IS NULL OR p_subject NOT IN ('Întrebări generale', 'Rezervare masă', 'Eveniment privat', 'Feedback') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid subject';
  END IF;
  IF v_message IS NULL OR pg_catalog.char_length(v_message) NOT BETWEEN 10 AND 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid message';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('public-contact-form', 0)
  );

  IF (SELECT pg_catalog.count(*) FROM public.contact_messages
      WHERE created_at >= pg_catalog.now() - INTERVAL '10 minutes') >= 30 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Rate limit exceeded';
  END IF;
  IF (SELECT pg_catalog.count(*) FROM public.contact_messages
      WHERE email = v_email AND created_at >= pg_catalog.now() - INTERVAL '1 hour') >= 3 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Rate limit exceeded';
  END IF;

  INSERT INTO public.contact_messages (name, email, subject, message)
  VALUES (v_name, v_email, p_subject, v_message)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_reservation(
  p_name TEXT,
  p_phone TEXT,
  p_date DATE,
  p_time TIME,
  p_guests INTEGER,
  p_zone TEXT,
  p_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
  v_name TEXT := pg_catalog.btrim(p_name);
  v_phone TEXT := pg_catalog.btrim(p_phone);
  v_message TEXT := NULLIF(pg_catalog.btrim(p_message), '');
  v_today DATE := (pg_catalog.now() AT TIME ZONE 'Europe/Chisinau')::DATE;
BEGIN
  IF v_name IS NULL OR pg_catalog.char_length(v_name) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid name';
  END IF;
  IF v_phone IS NULL OR pg_catalog.char_length(v_phone) NOT BETWEEN 6 AND 30
    OR v_phone !~ '^[0-9+() .-]+$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid phone';
  END IF;
  IF p_date IS NULL OR p_date < v_today OR p_date > v_today + 365 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid reservation date';
  END IF;
  IF p_time IS NULL OR p_time < TIME '09:00' OR p_time > TIME '22:00' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid reservation time';
  END IF;
  IF p_guests IS NULL OR p_guests NOT BETWEEN 2 AND 12 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid guest count';
  END IF;
  IF p_zone IS NULL OR p_zone NOT IN ('Interior', 'Terasă', 'Lângă fereastră') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid zone';
  END IF;
  IF v_message IS NOT NULL AND pg_catalog.char_length(v_message) > 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Message is too long';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('public-reservation-form', 0)
  );

  IF (SELECT pg_catalog.count(*) FROM public.reservations
      WHERE created_at >= pg_catalog.now() - INTERVAL '10 minutes') >= 30 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Rate limit exceeded';
  END IF;
  IF (SELECT pg_catalog.count(*) FROM public.reservations
      WHERE phone = v_phone AND created_at >= pg_catalog.now() - INTERVAL '24 hours') >= 5 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Rate limit exceeded';
  END IF;

  INSERT INTO public.reservations (
    name, phone, reservation_date, reservation_time, guests, zone, message
  ) VALUES (
    v_name, v_phone, p_date, p_time, p_guests, p_zone, v_message
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_contact_messages_email_created
  ON public.contact_messages(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_phone_created
  ON public.reservations(phone, created_at DESC);

REVOKE ALL ON FUNCTION public.add_to_cart(TEXT, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_contact_message(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_reservation(TEXT, TEXT, DATE, TIME, INTEGER, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.add_to_cart(TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_contact_message(TEXT, TEXT, TEXT, TEXT)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_reservation(TEXT, TEXT, DATE, TIME, INTEGER, TEXT, TEXT)
  TO anon, authenticated, service_role;

COMMIT;
