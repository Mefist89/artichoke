-- =============================================================
-- PLAY ROOM ARTICHOKE — Storage pentru imaginile produselor
-- Încărcarea și modificarea sunt permise numai administratorilor.
-- =============================================================

BEGIN;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'product-images',
  'product-images',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS product_images_admin_insert ON storage.objects;
CREATE POLICY product_images_admin_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND private.is_admin()
  );

DROP POLICY IF EXISTS product_images_admin_update ON storage.objects;
CREATE POLICY product_images_admin_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND private.is_admin()
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND private.is_admin()
  );

DROP POLICY IF EXISTS product_images_admin_delete ON storage.objects;
CREATE POLICY product_images_admin_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND private.is_admin()
  );

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
  IF v_image IS NOT NULL AND (
    pg_catalog.char_length(v_image) > 500
    OR (
      v_image !~ '^/img/[A-Za-z0-9_./-]+$'
      AND v_image !~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/product-images/[A-Za-z0-9_./-]+$'
    )
  ) THEN
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

REVOKE ALL ON FUNCTION public.admin_upsert_product(TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, BOOLEAN, INTEGER)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_product(TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, BOOLEAN, INTEGER)
  TO authenticated, service_role;

COMMIT;
