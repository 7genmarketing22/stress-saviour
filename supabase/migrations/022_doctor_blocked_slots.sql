-- ================================================================
-- 022_doctor_blocked_slots.sql
-- Doctor-controlled slot unavailability + booking notifications
-- ================================================================

-- ── 1. Doctor Blocked Slots table ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.doctor_blocked_slots (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id    UUID        NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
  blocked_date DATE        NOT NULL,
  start_time   TIME,                  -- NULL = entire day blocked
  end_time     TIME,                  -- NULL = entire day blocked
  reason       TEXT        NOT NULL DEFAULT 'Unavailable',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_slots_doctor_date
  ON public.doctor_blocked_slots (doctor_id, blocked_date);

ALTER TABLE public.doctor_blocked_slots ENABLE ROW LEVEL SECURITY;

-- Doctors can manage their own blocked slots
CREATE POLICY "doctors_manage_own_blocked_slots"
  ON public.doctor_blocked_slots FOR ALL TO authenticated
  USING  (doctor_id IN (SELECT id FROM public.doctor_profiles WHERE user_id = auth.uid()))
  WITH CHECK (doctor_id IN (SELECT id FROM public.doctor_profiles WHERE user_id = auth.uid()));

-- Any authenticated user can read blocked slots (needed for availability display)
CREATE POLICY "authenticated_read_blocked_slots"
  ON public.doctor_blocked_slots FOR SELECT TO authenticated
  USING (true);

-- ── 2. is_slot_blocked RPC ──────────────────────────────────────
-- Checks if the doctor has marked a specific date+time as unavailable.
-- Called both server-side (trigger) and client-side (pre-flight check).

CREATE OR REPLACE FUNCTION public.is_slot_blocked(
  p_doctor_id UUID,
  p_date      DATE,
  p_time      TIME
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.doctor_blocked_slots
    WHERE doctor_id = p_doctor_id
      AND blocked_date = p_date
      AND (
        -- Full-day block (no time range specified)
        (start_time IS NULL AND end_time IS NULL)
        -- Ranged block covering p_time
        OR (start_time IS NOT NULL
            AND start_time <= p_time
            AND (end_time IS NULL OR end_time > p_time))
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_slot_blocked(UUID, DATE, TIME)
  TO authenticated, anon;

-- ── 3. DB-level trigger — blocks booking on doctor-off slots ────

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
  -- Convert scheduled_at from UTC to PKT (Asia/Karachi, UTC+5)
  v_date := (NEW.scheduled_at AT TIME ZONE 'Asia/Karachi')::DATE;
  v_time := (NEW.scheduled_at AT TIME ZONE 'Asia/Karachi')::TIME;

  IF public.is_slot_blocked(NEW.doctor_id, v_date, v_time) THEN
    RAISE EXCEPTION 'SLOT_BLOCKED: Dr. % is unavailable at the selected time. Please choose another slot.',
      NEW.doctor_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_slot_not_blocked ON public.appointments;

CREATE TRIGGER check_slot_not_blocked
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_appointment_slot();

-- ── 4. Update get_booked_slots to include blocked windows ───────
-- Returns slot_time TEXT, is_blocked BOOLEAN
--   is_blocked = FALSE → booked by a patient appointment
--   is_blocked = TRUE  → doctor has marked this time off

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
  -- Booked appointment slots
  SELECT DISTINCT
    to_char(scheduled_at AT TIME ZONE 'Asia/Karachi', 'HH24:MI'),
    FALSE
  FROM public.appointments
  WHERE doctor_id = p_doctor_id
    AND (scheduled_at AT TIME ZONE 'Asia/Karachi')::DATE = p_date
    AND status NOT IN ('cancelled', 'no_show')

  UNION

  -- Doctor-blocked windows expanded into 30-minute slot grid
  SELECT DISTINCT
    to_char(
      make_time(
        ((gs.slot_index * 30) / 60)::INT,
        ((gs.slot_index * 30) % 60)::INT,
        0
      ),
      'HH24:MI'
    ),
    TRUE
  FROM public.doctor_blocked_slots dbs
  CROSS JOIN LATERAL (
    SELECT generate_series(
      (EXTRACT(EPOCH FROM COALESCE(dbs.start_time, '00:00'::TIME))::INT / 1800),
      GREATEST(
        (EXTRACT(EPOCH FROM COALESCE(dbs.end_time, '23:30'::TIME))::INT / 1800) - 1,
        (EXTRACT(EPOCH FROM COALESCE(dbs.start_time, '00:00'::TIME))::INT / 1800)
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
