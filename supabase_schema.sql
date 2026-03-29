-- =============================================================
-- PLAY ROOM ARTICHOKE — Схема базы данных
-- Запустить в: Supabase Dashboard → SQL Editor → New query
-- =============================================================

-- ─────────────────────────────────────────
-- 1. Таблица заказов (orders)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  total       NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- 2. Позиции заказа (order_items)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  price        NUMERIC(10,2) NOT NULL,
  quantity     INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- 3. Таблица cart_items (если ещё не создана)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cart_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  price        NUMERIC(10,2) NOT NULL,
  quantity     INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- 4. Таблица профилей (если ещё не создана)
-- ─────────────────────────────────────────
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

-- ─────────────────────────────────────────
-- 5. RLS — Row Level Security
-- Примечание: Supabase использует PostgreSQL 15.
-- CREATE POLICY не поддерживает IF NOT EXISTS —
-- используем DO $$ ... EXCEPTION WHEN duplicate_object.
-- ─────────────────────────────────────────

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- cart_items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "cart_select_own" ON public.cart_items
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cart_insert_own" ON public.cart_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cart_update_own" ON public.cart_items
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cart_delete_own" ON public.cart_items
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "orders_select_own" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "orders_insert_own" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "order_items_select_own" ON public.order_items
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_items.order_id
          AND orders.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "order_items_insert_own" ON public.order_items
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_items.order_id
          AND orders.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────
-- 6. Индексы для производительности
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_user_id    ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_cart_user_id      ON public.cart_items(user_id);

-- ─────────────────────────────────────────
-- Готово! Можно проверить таблицы:
-- SELECT * FROM public.orders LIMIT 5;
-- ─────────────────────────────────────────
