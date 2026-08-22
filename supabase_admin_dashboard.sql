-- =============================================================
-- PLAY ROOM ARTICHOKE — migrare pentru panoul administratorului
-- Rulați o singură dată în Supabase Dashboard → SQL Editor.
-- Nu conține parole sau chei API.
-- =============================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;

CREATE TABLE IF NOT EXISTS private.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE private.admin_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.admin_users FROM PUBLIC, anon, authenticated;

-- Contul unic de administrator creat anterior în Supabase Auth.
INSERT INTO private.admin_users (user_id)
SELECT id
FROM auth.users
WHERE lower(email) = lower('jeniabortnic@gmail.com')
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM private.admin_users
    WHERE user_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.is_admin();
$$;

REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated, service_role;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'prod-cafea',
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Completează doar metadatele vizuale. Prețurile stabilite de administrator
-- nu sunt suprascrise de această migrare.
UPDATE public.products AS product
SET
  category = seed.category,
  description = seed.description,
  image = seed.image,
  sort_order = seed.sort_order
FROM (VALUES
  ('cappuccino', 'prod-cafea', 'Espresso dublu, lapte texturat și artă latte.', '/img/cofe/cappuccino.jpg', 10),
  ('cacao', 'prod-cafea', 'Cacao caldă cu lapte spumat și gust catifelat.', '/img/cofe/cacao.jpg', 20),
  ('espresso-macchiato', 'prod-cafea', 'Espresso intens cu o notă fină de lapte.', '/img/cofe/espresso-macchiato.jpg', 30),
  ('flat-white', 'prod-cafea', 'Espresso dublu și lapte fin, textură cremoasă.', '/img/cofe/flat-white.jpg', 40),
  ('latte', 'prod-cafea', 'Băutură echilibrată cu lapte catifelat.', '/img/cofe/latte.jpg', 50),
  ('latte-caramel', 'prod-cafea', 'Latte catifelat cu caramel și spumă densă.', '/img/cofe/latte-caramel.jpg', 60),
  ('ciocolata-calda', 'prod-cafea', 'Ciocolată bogată cu lapte, aromă intensă.', '/img/cofe/hot-chocolate.jpg', 70),
  ('americano', 'prod-cafea', 'Gust echilibrat, intensitate moderată.', '/img/cofe/americano.jpg', 80),
  ('americano-migdale', 'prod-migdale', 'Aromă echilibrată și textură delicată.', '/img/migdale/americano-migdale.jpg', 90),
  ('cappuccino-migdale', 'prod-migdale', 'Spumă fină și gust cremos. Aromă delicată de migdale.', '/img/migdale/cappuccino-migdale.jpg', 100),
  ('latte-migdale', 'prod-migdale', 'Latte catifelat cu note dulci și aromă delicată de migdale.', '/img/migdale/latte-migdale.jpg', 110),
  ('cacao-migdale', 'prod-migdale', 'Cacao caldă și aromată.', '/img/migdale/cacao-migdale.jpg', 120),
  ('matcha-latte', 'prod-ceai', 'Matcha premium și lapte fin, ușor îndulcit.', '/img/tea/matcha-latte.jpg', 130),
  ('infuzie-de-plante', 'prod-ceai', 'Mușețel, mentă și melisă pentru calm și echilibru.', '/img/tea/infuzie-de-plante.jpg', 140),
  ('ice-tea-fructat', 'prod-ceai', 'Ceai rece cu citrice și fructe de pădure.', '/img/tea/ice-tea-fructat.jpg', 150),
  ('cupcake', 'prod-desert', 'Cu cremă de ciocolată.', '/img/deserti/cupcake.jpg', 160),
  ('donut', 'prod-desert', 'Cu glazură de căpșuni.', '/img/deserti/donut.jpg', 170),
  ('tort-pandispan', 'prod-desert', 'Cu cremă fină.', '/img/deserti/tort-pandispan.jpg', 180),
  ('inghetata-spaghetti', 'prod-desert', 'Desert cu înghețată.', '/img/deserti/inghetata-spaghetti.jpg', 190),
  ('toast-cu-avocado', 'prod-micdejun', 'Pâine artizanală, avocado și ou poșat.', '/img/dejun/toast-cu-avocado.jpg', 200),
  ('granola-cu-fructe', 'prod-micdejun', 'Iaurt, granola crocantă și topping natural.', '/img/dejun/granola-cu-fructe.jpg', 210),
  ('omleta-cu-legume', 'prod-micdejun', 'Ouă bio, legume proaspete și verdețuri.', '/img/dejun/omleta-cu-legume.jpg', 220)
) AS seed(id, category, description, image, sort_order)
WHERE product.id = seed.id;

DROP POLICY IF EXISTS products_admin_select ON public.products;
CREATE POLICY products_admin_select ON public.products
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS orders_admin_select ON public.orders;
CREATE POLICY orders_admin_select ON public.orders
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS order_items_admin_select ON public.order_items;
CREATE POLICY order_items_admin_select ON public.order_items
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS contact_messages_admin_select ON public.contact_messages;
CREATE POLICY contact_messages_admin_select ON public.contact_messages
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS reservations_admin_select ON public.reservations;
CREATE POLICY reservations_admin_select ON public.reservations
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

CREATE OR REPLACE FUNCTION public.admin_upsert_product(
  p_id TEXT,
  p_name TEXT,
  p_price NUMERIC,
  p_category TEXT,
  p_description TEXT DEFAULT '',
  p_image TEXT DEFAULT NULL,
  p_active BOOLEAN DEFAULT TRUE,
  p_sort_order INTEGER DEFAULT 0
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id TEXT := pg_catalog.lower(pg_catalog.btrim(p_id));
  v_name TEXT := pg_catalog.btrim(p_name);
  v_description TEXT := pg_catalog.btrim(COALESCE(p_description, ''));
  v_image TEXT := NULLIF(pg_catalog.btrim(p_image), '');
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Administrator access required';
  END IF;
  IF v_id IS NULL OR v_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR pg_catalog.char_length(v_id) > 80 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid product ID';
  END IF;
  IF v_name IS NULL OR pg_catalog.char_length(v_name) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid product name';
  END IF;
  IF p_price IS NULL OR p_price <= 0 OR p_price > 100000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid product price';
  END IF;
  IF p_category NOT IN ('prod-cafea', 'prod-migdale', 'prod-ceai', 'prod-desert', 'prod-micdejun') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid category';
  END IF;
  IF pg_catalog.char_length(v_description) > 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Description is too long';
  END IF;
  IF v_image IS NOT NULL AND (v_image !~ '^/img/[A-Za-z0-9_./-]+$' OR pg_catalog.char_length(v_image) > 255) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid image path';
  END IF;
  IF p_sort_order IS NULL OR p_sort_order NOT BETWEEN 0 AND 9999 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid sort order';
  END IF;

  INSERT INTO public.products (id, name, price, active, category, description, image, sort_order)
  VALUES (v_id, v_name, p_price, COALESCE(p_active, TRUE), p_category, v_description, v_image, p_sort_order)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    active = EXCLUDED.active,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    image = EXCLUDED.image,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(p_order_id UUID, p_status TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT private.is_admin() THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Administrator access required'; END IF;
  IF p_status NOT IN ('pending', 'processing', 'completed', 'cancelled') THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid order status'; END IF;
  UPDATE public.orders SET status = p_status, updated_at = now() WHERE id = p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Order not found'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_reservation_status(p_reservation_id UUID, p_status TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT private.is_admin() THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Administrator access required'; END IF;
  IF p_status NOT IN ('pending', 'confirmed', 'cancelled', 'completed') THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid reservation status'; END IF;
  UPDATE public.reservations SET status = p_status, updated_at = now() WHERE id = p_reservation_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Reservation not found'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_message_status(p_message_id UUID, p_status TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT private.is_admin() THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Administrator access required'; END IF;
  IF p_status NOT IN ('new', 'read', 'replied', 'archived') THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid message status'; END IF;
  UPDATE public.contact_messages SET status = p_status, updated_at = now() WHERE id = p_message_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Message not found'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_product(TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, BOOLEAN, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_order_status(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_reservation_status(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_message_status(UUID, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_upsert_product(TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, BOOLEAN, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_reservation_status(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_message_status(UUID, TEXT) TO authenticated, service_role;

COMMIT;
