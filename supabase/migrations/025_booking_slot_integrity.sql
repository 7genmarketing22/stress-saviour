-- ================================================================
-- 025_booking_slot_integrity.sql
-- Working-hours enforcement, slot-status consistency, realtime sync
-- ================================================================

-- ── 1. Working-hours validation helper ───────────────────────────

CREATE OR REPLACE FUNCTION public.is_slot_within_working_hours(
  p_doctor_id        UUID,
  p_scheduled_at     TIMESTAMPTZ,
  p_duration_minutes INT DEFAULT 30
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE;
  v_time TIME;
  v_dow  INT;
  v_found BOOLEAN := FALSE;
  rec RECORD;
  v_slot_end TIME;
BEGIN
  v_date := (p_scheduled_at AT TIME ZONE 'Asia/Karachi')::DATE;
  v_time := (p_scheduled_at AT TIME ZONE 'Asia/Karachi')::TIME;
  v_dow  := EXTRACT(DOW FROM v_date)::INT;
  v_slot_end := (v_time + make_interval(mins => p_duration_minutes))::TIME;

  FOR rec IN
    SELECT start_time, end_time, COALESCE(slot_duration_minutes, 30) AS step_minutes
    FROM public.availability_slots
    WHERE doctor_id = p_doctor_id
      AND day_of_week = v_dow
      AND is_active = TRUE
  LOOP
    -- Slot must start on the configured grid and fit entirely within the window.
    IF v_time >= rec.start_time
       AND v_slot_end <= rec.end_time
       AND (
         EXTRACT(EPOCH FROM (v_time - rec.start_time))::INT / 60
       ) % rec.step_minutes = 0
    THEN
      v_found := TRUE;
      EXIT;
    END IF;
  END LOOP;

  RETURN v_found;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_slot_within_working_hours(UUID, TIMESTAMPTZ, INT)
  TO authenticated, anon;

-- ── 2. Appointment slot integrity trigger ────────────────────────

CREATE OR REPLACE FUNCTION public.validate_appointment_slot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE;
  v_time TIME;
BEGIN
  -- Skip validation for statuses that do not occupy a slot.
  IF NEW.status IN ('cancelled', 'no_show', 'expired_no_show') THEN
    RETURN NEW;
  END IF;

  v_date := (NEW.scheduled_at AT TIME ZONE 'Asia/Karachi')::DATE;
  v_time := (NEW.scheduled_at AT TIME ZONE 'Asia/Karachi')::TIME;

  IF public.is_slot_blocked(NEW.doctor_id, v_date, v_time) THEN
    RAISE EXCEPTION 'SLOT_BLOCKED: Dr. % is unavailable at the selected time. Please choose another slot.',
      NEW.doctor_id;
  END IF;

  IF NOT public.is_slot_within_working_hours(
    NEW.doctor_id,
    NEW.scheduled_at,
    COALESCE(NEW.duration_minutes, 30)
  ) THEN
    RAISE EXCEPTION 'SLOT_OUTSIDE_HOURS: The selected time is outside the doctor''s working hours.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_slot_not_blocked ON public.appointments;
DROP TRIGGER IF EXISTS check_appointment_slot_integrity ON public.appointments;

CREATE TRIGGER check_appointment_slot_integrity
  BEFORE INSERT OR UPDATE OF scheduled_at, doctor_id, duration_minutes, status
  ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_appointment_slot();

-- ── 3. Slot availability RPC (booked + blocked, status-aligned) ─

CREATE OR REPLACE FUNCTION public.get_booked_slots(
  p_doctor_id UUID,
  p_date      DATE
)
RETURNS TABLE(slot_time TEXT, is_blocked BOOLEAN)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- Occupied appointment slots (includes completed — they must not reopen).
  SELECT DISTINCT
    to_char(scheduled_at AT TIME ZONE 'Asia/Karachi', 'HH24:MI'),
    FALSE
  FROM public.appointments
  WHERE doctor_id = p_doctor_id
    AND (scheduled_at AT TIME ZONE 'Asia/Karachi')::DATE = p_date
    AND status NOT IN ('cancelled', 'no_show', 'expired_no_show')

  UNION

  -- Doctor-blocked windows expanded using the doctor's configured slot step.
  SELECT DISTINCT
    to_char(
      make_time(
        ((gs.slot_index * step_mins) / 60)::INT,
        ((gs.slot_index * step_mins) % 60)::INT,
        0
      ),
      'HH24:MI'
    ),
    TRUE
  FROM public.doctor_blocked_slots dbs
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      (
        SELECT MIN(av.slot_duration_minutes)
        FROM public.availability_slots av
        WHERE av.doctor_id = dbs.doctor_id
          AND av.day_of_week = EXTRACT(DOW FROM dbs.blocked_date)::INT
          AND av.is_active = TRUE
      ),
      30
    ) AS step_mins
  ) cfg
  CROSS JOIN LATERAL (
    SELECT generate_series(
      (EXTRACT(EPOCH FROM COALESCE(dbs.start_time, '00:00'::TIME))::INT / (cfg.step_mins * 60)),
      GREATEST(
        (EXTRACT(EPOCH FROM COALESCE(dbs.end_time, '23:59'::TIME))::INT / (cfg.step_mins * 60)) - 1,
        (EXTRACT(EPOCH FROM COALESCE(dbs.start_time, '00:00'::TIME))::INT / (cfg.step_mins * 60))
      ),
      1
    ) AS slot_index
  ) gs
  WHERE dbs.doctor_id = p_doctor_id
    AND dbs.blocked_date = p_date

  ORDER BY slot_time;
$$;

GRANT EXECUTE ON FUNCTION public.get_booked_slots(UUID, DATE)
  TO authenticated, anon;

-- ── 4. Realtime: broadcast appointment changes for live slot sync ─

ALTER TABLE public.appointments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'appointments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
  END IF;
END $$;
