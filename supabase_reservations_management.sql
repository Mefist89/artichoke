-- =============================================================
-- PLAY ROOM ARTICHOKE — administrarea rezervărilor și a meselor
-- Rulați integral în Supabase Dashboard → SQL Editor.
-- =============================================================

BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.reservation_number_seq
  AS BIGINT
  START WITH 100001;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS reservation_number BIGINT;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS table_number SMALLINT;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 120;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS table_session_id UUID
    REFERENCES public.table_sessions(id) ON DELETE SET NULL;

UPDATE public.reservations
SET reservation_number = nextval('public.reservation_number_seq')
WHERE reservation_number IS NULL;

DO $$
DECLARE
  v_last_number BIGINT;
BEGIN
  SELECT GREATEST(COALESCE(MAX(reservation_number), 100000), 100000)
  INTO v_last_number
  FROM public.reservations;

  PERFORM setval('public.reservation_number_seq', v_last_number, TRUE);
END;
$$;

ALTER TABLE public.reservations
  ALTER COLUMN reservation_number SET DEFAULT nextval('public.reservation_number_seq'),
  ALTER COLUMN reservation_number SET NOT NULL;

ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_status_check;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status IN ('pending', 'confirmed', 'arrived', 'completed', 'cancelled', 'no_show'));

ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_table_number_check;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_table_number_check
  CHECK (table_number IS NULL OR table_number BETWEEN 1 AND 6);

ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_duration_minutes_check;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_duration_minutes_check
  CHECK (duration_minutes BETWEEN 30 AND 240 AND duration_minutes % 30 = 0);

ALTER TABLE public.table_sessions
  ADD COLUMN IF NOT EXISTS reservation_id UUID
    REFERENCES public.reservations(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reservations_number_key
  ON public.reservations(reservation_number);

CREATE INDEX IF NOT EXISTS idx_reservations_schedule
  ON public.reservations(reservation_date, table_number, reservation_time)
  WHERE status IN ('confirmed', 'arrived');

CREATE INDEX IF NOT EXISTS idx_reservations_archive
  ON public.reservations(status, reservation_date DESC, reservation_time DESC);

DROP FUNCTION IF EXISTS public.submit_reservation(TEXT, TEXT, DATE, TIME, INTEGER, TEXT, TEXT);

CREATE FUNCTION public.submit_reservation(
  p_name TEXT,
  p_phone TEXT,
  p_date DATE,
  p_time TIME,
  p_guests INTEGER,
  p_zone TEXT,
  p_message TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_number BIGINT;
  v_name TEXT := pg_catalog.btrim(p_name);
  v_phone TEXT := pg_catalog.btrim(p_phone);
  v_message TEXT := NULLIF(pg_catalog.btrim(p_message), '');
  v_today DATE := (pg_catalog.now() AT TIME ZONE 'Europe/Chisinau')::DATE;
  v_now TIME := (pg_catalog.now() AT TIME ZONE 'Europe/Chisinau')::TIME;
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

  IF p_time IS NULL OR p_time < TIME '09:00' OR p_time > TIME '20:00' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid reservation time';
  END IF;

  IF p_date = v_today AND p_time <= v_now THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Reservation time is in the past';
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
  RETURNING reservation_number INTO v_number;

  RETURN v_number;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_update_reservation_status(UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_manage_reservation(UUID, TEXT, INTEGER);

CREATE FUNCTION public.admin_manage_reservation(
  p_reservation_id UUID,
  p_status TEXT,
  p_table_number INTEGER DEFAULT NULL
)
RETURNS TABLE (
  reservation_id UUID,
  reservation_number BIGINT,
  reservation_status TEXT,
  assigned_table SMALLINT,
  session_token UUID,
  session_opened_at TIMESTAMPTZ,
  session_expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_reservation public.reservations%ROWTYPE;
  v_session public.table_sessions%ROWTYPE;
  v_table SMALLINT;
  v_start TIMESTAMP;
  v_end TIMESTAMP;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Administrator access required';
  END IF;

  IF p_status NOT IN ('confirmed', 'arrived', 'completed', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid reservation status';
  END IF;

  SELECT reservations.*
  INTO v_reservation
  FROM public.reservations
  WHERE reservations.id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Reservation not found';
  END IF;

  v_table := COALESCE(p_table_number::SMALLINT, v_reservation.table_number);

  IF p_status IN ('confirmed', 'arrived') THEN
    IF v_table IS NULL OR v_table NOT BETWEEN 1 AND 6 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Select a table';
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
      84001,
      (v_reservation.reservation_date - DATE '2000-01-01')::INTEGER * 10 + v_table
    );

    v_start := v_reservation.reservation_date + v_reservation.reservation_time;
    v_end := v_start + pg_catalog.make_interval(mins => v_reservation.duration_minutes);

    IF EXISTS (
      SELECT 1
      FROM public.reservations AS other_reservation
      WHERE other_reservation.id <> v_reservation.id
        AND other_reservation.table_number = v_table
        AND other_reservation.status IN ('confirmed', 'arrived')
        AND other_reservation.reservation_date = v_reservation.reservation_date
        AND other_reservation.reservation_date + other_reservation.reservation_time < v_end
        AND other_reservation.reservation_date + other_reservation.reservation_time
          + pg_catalog.make_interval(mins => other_reservation.duration_minutes) > v_start
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '23P01', MESSAGE = 'Table schedule conflict';
    END IF;
  END IF;

  IF p_status = 'confirmed' THEN
    IF v_reservation.status NOT IN ('pending', 'confirmed') THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Invalid status transition';
    END IF;

    UPDATE public.reservations
    SET
      status = 'confirmed',
      table_number = v_table,
      updated_at = pg_catalog.now()
    WHERE id = v_reservation.id
    RETURNING * INTO v_reservation;

  ELSIF p_status = 'arrived' THEN
    IF v_reservation.status <> 'confirmed' THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Confirm reservation first';
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(83001, v_table);

    UPDATE public.table_sessions AS expired_session
    SET
      status = 'closed',
      closed_at = expired_session.expires_at
    WHERE expired_session.table_number = v_table
      AND expired_session.status = 'active'
      AND expired_session.expires_at <= pg_catalog.now();

    SELECT active_session.*
    INTO v_session
    FROM public.table_sessions AS active_session
    WHERE active_session.table_number = v_table
      AND active_session.status = 'active'
      AND active_session.expires_at > pg_catalog.now()
    FOR UPDATE;

    IF FOUND AND v_session.reservation_id IS DISTINCT FROM v_reservation.id THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Table already has an active session';
    END IF;

    IF NOT FOUND THEN
      INSERT INTO public.table_sessions (
        table_number,
        opened_by,
        reservation_id,
        expires_at
      ) VALUES (
        v_table,
        auth.uid(),
        v_reservation.id,
        pg_catalog.now() + pg_catalog.make_interval(mins => v_reservation.duration_minutes)
      )
      RETURNING * INTO v_session;
    END IF;

    UPDATE public.reservations
    SET
      status = 'arrived',
      table_number = v_table,
      table_session_id = v_session.id,
      updated_at = pg_catalog.now()
    WHERE id = v_reservation.id
    RETURNING * INTO v_reservation;

  ELSIF p_status = 'completed' THEN
    IF v_reservation.status <> 'arrived' THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Client has not arrived';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.orders AS active_order
      WHERE active_order.table_session_id = v_reservation.table_session_id
        AND active_order.status NOT IN ('executed', 'cancelled')
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Table has unfinished orders';
    END IF;

    UPDATE public.table_sessions AS completed_session
    SET status = 'closed', closed_at = pg_catalog.now()
    WHERE completed_session.id = v_reservation.table_session_id
      AND completed_session.status = 'active';

    UPDATE public.reservations
    SET status = 'completed', updated_at = pg_catalog.now()
    WHERE id = v_reservation.id
    RETURNING * INTO v_reservation;

  ELSIF p_status = 'cancelled' THEN
    IF v_reservation.status NOT IN ('pending', 'confirmed') THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Invalid status transition';
    END IF;

    UPDATE public.reservations
    SET status = 'cancelled', updated_at = pg_catalog.now()
    WHERE id = v_reservation.id
    RETURNING * INTO v_reservation;

  ELSIF p_status = 'no_show' THEN
    IF v_reservation.status <> 'confirmed' THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Invalid status transition';
    END IF;

    UPDATE public.reservations
    SET status = 'no_show', updated_at = pg_catalog.now()
    WHERE id = v_reservation.id
    RETURNING * INTO v_reservation;
  END IF;

  RETURN QUERY
  SELECT
    v_reservation.id,
    v_reservation.reservation_number,
    v_reservation.status,
    v_reservation.table_number,
    v_session.token,
    v_session.opened_at,
    v_session.expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_reservation(TEXT, TEXT, DATE, TIME, INTEGER, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_manage_reservation(UUID, TEXT, INTEGER)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.submit_reservation(TEXT, TEXT, DATE, TIME, INTEGER, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_manage_reservation(UUID, TEXT, INTEGER)
  TO authenticated, service_role;

COMMIT;
