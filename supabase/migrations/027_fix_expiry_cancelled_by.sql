-- ================================================================
-- 027_fix_expiry_cancelled_by.sql
-- cancelled_by is UUID REFERENCES profiles(id); 'system' is invalid.
-- ================================================================

CREATE OR REPLACE FUNCTION public.expire_unstarted_appointment(
  p_appointment_id UUID,
  p_no_show_party TEXT DEFAULT 'both',
  p_reason TEXT DEFAULT 'Session not started within grace period'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.appointments
  SET
    status = 'expired_no_show',
    cancellation_reason = p_reason,
    cancelled_by = NULL,
    no_show_party = p_no_show_party,
    expiry_processed_at = NOW(),
    video_room_url = NULL,
    updated_at = NOW()
  WHERE id = p_appointment_id
    AND status = 'scheduled'
    AND expiry_processed_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.no_show_events (appointment_id, party, reason)
  VALUES (p_appointment_id, p_no_show_party, p_reason);

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_unstarted_appointment(UUID, TEXT, TEXT)
  TO authenticated, service_role;
