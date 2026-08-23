-- =============================================================
-- PLAY ROOM ARTICHOKE — alegerea mesei în formularul public
-- Rulați integral în Supabase Dashboard → SQL Editor.
-- Păstrează rezervările existente și înlocuiește doar funcția publică.
-- =============================================================

BEGIN;

DROP FUNCTION IF EXISTS public.submit_reservation(TEXT, TEXT, DATE, TIME, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.submit_reservation(TEXT, TEXT, DATE, TIME, INTEGER, INTEGER, TEXT);

CREATE FUNCTION public.submit_reservation(
  p_name TEXT,
  p_phone TEXT,
  p_date DATE,
  p_time TIME,
  p_guests INTEGER,
  p_table_number INTEGER,
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

  IF p_table_number IS NULL OR p_table_number NOT BETWEEN 1 AND 6 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid table number';
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
    table_number,
    zone,
    message
  ) VALUES (
    v_name,
    v_phone,
    p_date,
    p_time,
    p_guests,
    p_table_number,
    'Interior',
    v_message
  )
  RETURNING reservation_number INTO v_number;

  RETURN v_number;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_reservation(TEXT, TEXT, DATE, TIME, INTEGER, INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.submit_reservation(TEXT, TEXT, DATE, TIME, INTEGER, INTEGER, TEXT)
  TO service_role;

COMMIT;
