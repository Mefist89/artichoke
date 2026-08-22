-- =============================================================
-- PLAY ROOM ARTICHOKE — schema securizată pentru Supabase
-- Rulați în Supabase Dashboard → SQL Editor.
-- Browserul nu este o sursă de încredere pentru nume sau prețuri.
-- =============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. Catalogul canonic de produse
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL CHECK (price > 0),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  category    TEXT NOT NULL DEFAULT 'prod-cafea',
  description TEXT NOT NULL DEFAULT '',
  image       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.products (id, name, price, active) VALUES
  ('cappuccino',          'Cappuccino',                       20, TRUE),
  ('cacao',               'Cacao',                            20, TRUE),
  ('espresso-macchiato',  'Espresso macchiato',              20, TRUE),
  ('flat-white',          'Flat white',                       15, TRUE),
  ('latte',               'Latte',                            25, TRUE),
  ('latte-caramel',       'Latte Caramel',                    25, TRUE),
  ('ciocolata-calda',     'Ciocolată caldă',                 20, TRUE),
  ('americano',           'Americano',                        15, TRUE),
  ('americano-migdale',   'Americano cu lapte de migdale',   25, TRUE),
  ('cappuccino-migdale',  'Cappuccino cu lapte de migdale',  30, TRUE),
  ('latte-migdale',       'Latte cu lapte de migdale',       40, TRUE),
  ('cacao-migdale',       'Cacao cu lapte de migdale',       30, TRUE),
  ('matcha-latte',        'Matcha Latte',                     28, TRUE),
  ('infuzie-de-plante',   'Infuzie de plante',                25, TRUE),
  ('ice-tea-fructat',     'Ice Tea Fructat',                  20, TRUE),
  ('cupcake',             'Cupcake',                          40, TRUE),
  ('donut',               'Donut',                            35, TRUE),
  ('tort-pandispan',      'Tort pandișpan',                  50, TRUE),
  ('inghetata-spaghetti', 'Înghețată spaghetti',             50, TRUE),
  ('toast-cu-avocado',    'Toast cu avocado',                 40, TRUE),
  ('granola-cu-fructe',   'Granola cu fructe',                30, TRUE),
  ('omleta-cu-legume',    'Omletă cu legume',                 30, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2. Comenzi și coș
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  total       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id   TEXT NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  price        NUMERIC(10,2) NOT NULL CHECK (price > 0),
  quantity     INT NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 99),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cart_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id   TEXT NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  price        NUMERIC(10,2) NOT NULL CHECK (price > 0),
  quantity     INT NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 99),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  full_name  TEXT,
  avatar_url TEXT,
  phone      TEXT,
  provider   TEXT DEFAULT 'google',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mesaje publice. Browserul poate trimite doar prin RPC-ul validat de mai jos.
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  email       TEXT NOT NULL CHECK (char_length(email) <= 254),
  subject     TEXT NOT NULL CHECK (
                subject IN ('Întrebări generale', 'Rezervare masă', 'Eveniment privat', 'Feedback')
              ),
  message     TEXT NOT NULL CHECK (char_length(message) BETWEEN 10 AND 2000),
  status      TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rezervări publice. Câmpurile de stare nu pot fi controlate de browser.
CREATE TABLE IF NOT EXISTS public.reservations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  phone             TEXT NOT NULL CHECK (char_length(phone) BETWEEN 6 AND 30),
  reservation_date  DATE NOT NULL,
  reservation_time  TIME NOT NULL,
  guests            INTEGER NOT NULL CHECK (guests BETWEEN 2 AND 12),
  zone              TEXT NOT NULL CHECK (zone IN ('Interior', 'Terasă', 'Lângă fereastră')),
  message           TEXT CHECK (message IS NULL OR char_length(message) <= 1000),
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migrare compatibilă pentru bazele create cu versiunea anterioară.
ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS product_id TEXT REFERENCES public.products(id);

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_id TEXT REFERENCES public.products(id);

UPDATE public.cart_items AS cart
SET product_id = product.id
FROM public.products AS product
WHERE cart.product_id IS NULL
  AND cart.product_name = product.name;

UPDATE public.order_items AS item
SET product_id = product.id
FROM public.products AS product
WHERE item.product_id IS NULL
  AND item.product_name = product.name;

-- Consolidează eventualele duplicate create de schema veche.
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

-- Lista administratorilor nu este expusă prin Data API.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;

CREATE TABLE IF NOT EXISTS private.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE private.admin_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.admin_users FROM PUBLIC, anon, authenticated;

INSERT INTO private.admin_users (user_id)
SELECT id FROM auth.users WHERE lower(email) = lower('jeniabortnic@gmail.com')
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM private.admin_users
    WHERE user_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 3. RLS: utilizatorii pot doar citi propriile date.
-- Toate mutațiile sensibile trec prin funcțiile RPC de mai jos.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_select_active ON public.products;
CREATE POLICY products_select_active ON public.products
  FOR SELECT TO anon, authenticated
  USING (active = TRUE);

DROP POLICY IF EXISTS products_admin_select ON public.products;
CREATE POLICY products_admin_select ON public.products
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS cart_select_own ON public.cart_items;
CREATE POLICY cart_select_own ON public.cart_items
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS cart_insert_own ON public.cart_items;
DROP POLICY IF EXISTS cart_update_own ON public.cart_items;
DROP POLICY IF EXISTS cart_delete_own ON public.cart_items;

DROP POLICY IF EXISTS orders_select_own ON public.orders;
CREATE POLICY orders_select_own ON public.orders
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS orders_admin_select ON public.orders;
CREATE POLICY orders_admin_select ON public.orders
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS orders_insert_own ON public.orders;

DROP POLICY IF EXISTS order_items_select_own ON public.order_items;
CREATE POLICY order_items_select_own ON public.order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS order_items_admin_select ON public.order_items;
CREATE POLICY order_items_admin_select ON public.order_items
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS order_items_insert_own ON public.order_items;

DROP POLICY IF EXISTS contact_messages_admin_select ON public.contact_messages;
CREATE POLICY contact_messages_admin_select ON public.contact_messages
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS reservations_admin_select ON public.reservations;
CREATE POLICY reservations_admin_select ON public.reservations
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

-- ─────────────────────────────────────────────────────────────
-- 4. Funcții RPC securizate
-- SECURITY DEFINER este necesar deoarece mutațiile directe sunt revocate.
-- search_path gol previne deturnarea obiectelor folosite de funcții.
-- ─────────────────────────────────────────────────────────────
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

  SELECT *
  INTO v_product
  FROM public.products
  WHERE id = p_product_id
    AND active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Product unavailable';
  END IF;

  INSERT INTO public.cart_items (
    user_id,
    product_id,
    product_name,
    price,
    quantity
  ) VALUES (
    v_user_id,
    v_product.id,
    v_product.name,
    v_product.price,
    p_quantity
  )
  ON CONFLICT (user_id, product_id) DO UPDATE SET
    quantity = LEAST(public.cart_items.quantity + EXCLUDED.quantity, 99),
    product_name = EXCLUDED.product_name,
    price = EXCLUDED.price
  RETURNING id INTO v_cart_item_id;

  RETURN v_cart_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_cart_item_quantity(
  p_cart_item_id UUID,
  p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
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

  UPDATE public.cart_items
  SET quantity = p_quantity
  WHERE id = p_cart_item_id
    AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Cart item not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_cart_item(p_cart_item_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication required';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::TEXT, 0)
  );

  DELETE FROM public.cart_items
  WHERE id = p_cart_item_id
    AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Cart item not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.checkout_cart(p_notes TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_order_id UUID;
  v_total NUMERIC(10,2);
  v_cart_count INTEGER;
  v_valid_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication required';
  END IF;

  IF p_notes IS NOT NULL AND pg_catalog.char_length(p_notes) > 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Notes are too long';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::TEXT, 0)
  );

  -- Blochează rândurile coșului până la finalul tranzacției.
  PERFORM 1
  FROM public.cart_items
  WHERE user_id = v_user_id
  FOR UPDATE;

  SELECT pg_catalog.count(*)
  INTO v_cart_count
  FROM public.cart_items
  WHERE user_id = v_user_id;

  IF v_cart_count = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Cart is empty';
  END IF;

  SELECT
    pg_catalog.count(*),
    pg_catalog.coalesce(pg_catalog.sum(product.price * cart.quantity), 0)
  INTO v_valid_count, v_total
  FROM public.cart_items AS cart
  INNER JOIN public.products AS product ON product.id = cart.product_id
  WHERE cart.user_id = v_user_id
    AND product.active = TRUE
    AND cart.quantity BETWEEN 1 AND 99;

  IF v_valid_count <> v_cart_count THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Cart contains unavailable products';
  END IF;

  INSERT INTO public.orders (user_id, total, notes, status)
  VALUES (v_user_id, v_total, p_notes, 'pending')
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id,
    product_id,
    product_name,
    price,
    quantity
  )
  SELECT
    v_order_id,
    product.id,
    product.name,
    product.price,
    cart.quantity
  FROM public.cart_items AS cart
  INNER JOIN public.products AS product ON product.id = cart.product_id
  WHERE cart.user_id = v_user_id
    AND product.active = TRUE;

  DELETE FROM public.cart_items
  WHERE user_id = v_user_id;

  RETURN v_order_id;
END;
$$;

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

  IF v_email IS NULL
    OR pg_catalog.char_length(v_email) > 254
    OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid email';
  END IF;

  IF p_subject IS NULL
    OR p_subject NOT IN ('Întrebări generale', 'Rezervare masă', 'Eveniment privat', 'Feedback') THEN
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

  IF v_phone IS NULL
    OR pg_catalog.char_length(v_phone) NOT BETWEEN 6 AND 30
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
    name,
    phone,
    reservation_date,
    reservation_time,
    guests,
    zone,
    message
  ) VALUES (
    v_name,
    v_phone,
    p_date,
    p_time,
    p_guests,
    p_zone,
    v_message
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. Privilegii minime pentru Data API
-- ─────────────────────────────────────────────────────────────
GRANT SELECT ON TABLE public.products TO anon, authenticated;
GRANT SELECT ON TABLE public.cart_items, public.orders, public.order_items TO authenticated;
GRANT SELECT ON TABLE public.contact_messages, public.reservations TO authenticated;

REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.cart_items, public.orders, public.order_items
  FROM anon, authenticated;

REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.contact_messages, public.reservations
  FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.add_to_cart(TEXT, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_cart_item_quantity(UUID, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_cart_item(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.checkout_cart(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_contact_message(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_reservation(TEXT, TEXT, DATE, TIME, INTEGER, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.add_to_cart(TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_cart_item_quantity(UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.remove_cart_item(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.checkout_cart(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_contact_message(TEXT, TEXT, TEXT, TEXT)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_reservation(TEXT, TEXT, DATE, TIME, INTEGER, TEXT, TEXT)
  TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 6. Indecși
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_product_id ON public.cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
  ON public.contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email_created
  ON public.contact_messages(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_date_time
  ON public.reservations(reservation_date, reservation_time);
CREATE INDEX IF NOT EXISTS idx_reservations_phone_created
  ON public.reservations(phone, created_at DESC);

COMMIT;
