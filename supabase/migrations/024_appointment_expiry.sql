-- ================================================================
-- 024_appointment_expiry.sql
-- Auto-expire unstarted consultations + no-show audit log
-- ================================================================

ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'expired_no_show';

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expiry_processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_show_party TEXT
    CHECK (no_show_party IS NULL OR no_show_party IN ('doctor', 'patient', 'both'));

CREATE INDEX IF NOT EXISTS idx_appointments_expiry_candidates
  ON public.appointments (scheduled_at)
  WHERE status = 'scheduled' AND expiry_processed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.no_show_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  party TEXT NOT NULL CHECK (party IN ('doctor', 'patient', 'both')),
  reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_no_show_events_appointment
  ON public.no_show_events (appointment_id);

ALTER TABLE public.no_show_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read no_show_events"
  ON public.no_show_events FOR SELECT
  USING (public.is_admin());

-- Rebuild slot uniqueness index to free slots after auto-expiry.
DROP INDEX IF EXISTS uq_appointments_doctor_slot;
CREATE UNIQUE INDEX uq_appointments_doctor_slot
  ON public.appointments (doctor_id, scheduled_at)
  WHERE status NOT IN ('cancelled', 'no_show', 'expired_no_show');

-- Mark an unstarted appointment as expired (idempotent).
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
    cancelled_by = 'system',
    no_show_party = p_no_show_party,
    expiry_processed_at = NOW(),
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
