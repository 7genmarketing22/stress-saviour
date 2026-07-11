-- ================================================================
-- 021_prevent_double_booking.sql
-- ================================================================

-- Step 1: For each duplicate (doctor_id, scheduled_at) group,
--         keep the earliest appointment and cancel all later ones.
UPDATE public.appointments
SET status = 'cancelled',
    cancellation_reason = 'Duplicate booking removed by system'
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY doctor_id, scheduled_at
             ORDER BY created_at ASC
           ) AS rn
    FROM public.appointments
    WHERE status NOT IN ('cancelled', 'no_show')
  ) ranked
  WHERE rn > 1
);

-- Step 2: Partial unique index — only one active booking per doctor+slot.
-- Cancelled / no-show rows are excluded so the slot opens back up.
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_doctor_slot
  ON public.appointments (doctor_id, scheduled_at)
  WHERE status NOT IN ('cancelled', 'no_show');

-- Step 3: SECURITY DEFINER RPC so any authenticated patient can query
--         which slots are already booked for a doctor on a given date,
--         without being able to read other patients' full appointment rows.
CREATE OR REPLACE FUNCTION public.get_booked_slots(
  p_doctor_id UUID,
  p_date      DATE
)
RETURNS TABLE(slot_time TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT
    to_char(
      scheduled_at AT TIME ZONE 'Asia/Karachi',
      'HH24:MI'
    ) AS slot_time
  FROM public.appointments
  WHERE doctor_id = p_doctor_id
    AND (scheduled_at AT TIME ZONE 'Asia/Karachi')::DATE = p_date
    AND status NOT IN ('cancelled', 'no_show')
  ORDER BY slot_time;
$$;

GRANT EXECUTE ON FUNCTION public.get_booked_slots(UUID, DATE)
  TO authenticated, anon;
