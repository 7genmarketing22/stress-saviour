-- ================================================================
-- 20260721181000_prevent_past_slot_booking.sql
-- Reject new bookings for slots that have already started.
-- ================================================================

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

  -- Only new bookings must be in the future; status updates on existing
  -- appointments (e.g. marking completed) must not trip this check.
  IF TG_OP = 'INSERT' AND NEW.scheduled_at <= now() THEN
    RAISE EXCEPTION 'SLOT_IN_PAST: The selected time has already passed. Please choose an upcoming slot.';
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
