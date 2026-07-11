-- ================================================================
-- 023_refund_handling.sql
-- Refund tracking for cancelled appointments
-- ================================================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS refund_status TEXT NOT NULL DEFAULT 'not_applicable'
    CHECK (refund_status IN ('not_applicable', 'pending', 'processing', 'refunded', 'failed')),
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS refund_initiated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_processed_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS refund_note TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_refund_status
  ON public.payments(refund_status)
  WHERE refund_status NOT IN ('not_applicable', 'refunded');

CREATE OR REPLACE FUNCTION public.apply_cancellation_refund(
  p_payment_id    UUID,
  p_refund_status TEXT,
  p_refund_amount NUMERIC,
  p_refund_note   TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.payments
  SET
    refund_status       = p_refund_status,
    refund_amount       = CASE WHEN p_refund_amount > 0 THEN p_refund_amount ELSE NULL END,
    refund_initiated_at = CASE
                            WHEN p_refund_status IN ('pending', 'processing') THEN NOW()
                            ELSE refund_initiated_at
                          END,
    refund_note         = COALESCE(p_refund_note, refund_note),
    payout_status       = CASE
                            WHEN p_refund_status IN ('pending', 'processing', 'refunded')
                              AND status = 'completed' THEN 'pending'
                            ELSE payout_status
                          END,
    paid_at             = CASE
                            WHEN p_refund_status IN ('pending', 'processing', 'refunded')
                              AND status = 'completed' THEN NULL
                            ELSE paid_at
                          END,
    paid_by             = CASE
                            WHEN p_refund_status IN ('pending', 'processing', 'refunded')
                              AND status = 'completed' THEN NULL
                            ELSE paid_by
                          END,
    payout_reference    = CASE
                            WHEN p_refund_status IN ('pending', 'processing', 'refunded')
                              AND status = 'completed' THEN NULL
                            ELSE payout_reference
                          END,
    updated_at          = NOW()
  WHERE id = p_payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_cancellation_refund(UUID, TEXT, NUMERIC, TEXT)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_manual_refund(
  p_payment_id UUID,
  p_admin_id   UUID,
  p_reference  TEXT,
  p_note       TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can complete refunds';
  END IF;

  UPDATE public.payments
  SET
    refund_status        = 'refunded',
    status               = 'refunded',
    refund_processed_at  = NOW(),
    refund_processed_by  = p_admin_id,
    refund_id            = p_reference,
    refund_note          = COALESCE(p_note, refund_note),
    refunded_at          = NOW(),
    updated_at           = NOW()
  WHERE id = p_payment_id
    AND refund_status IN ('pending', 'processing');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found or not eligible for refund completion';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_manual_refund(UUID, UUID, TEXT, TEXT)
  TO authenticated;

-- Backfill existing cancelled+paid appointments
UPDATE public.payments p
SET
  refund_status       = 'pending',
  refund_amount       = p.amount,
  refund_initiated_at = NOW(),
  refund_note         = 'Auto-initiated: appointment was cancelled before refund system was deployed',
  payout_status       = 'pending',
  paid_at             = NULL,
  paid_by             = NULL,
  payout_reference    = NULL
FROM public.appointments a
WHERE p.appointment_id = a.id
  AND a.status = 'cancelled'
  AND p.status = 'completed'
  AND p.refund_status = 'not_applicable';
