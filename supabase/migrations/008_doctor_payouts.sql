-- Doctor payout settlement layer.
-- Separates the patient -> platform payment lifecycle (payments.status) from the
-- platform -> doctor settlement lifecycle (payments.payout_status). Admins clear
-- ("settle") a doctor's earned amount; doctors see paid / pending / cleared totals.

-- 1. Settlement columns on payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payout_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payout_status IN ('pending', 'paid')),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS payout_reference TEXT;

-- 2. Index to quickly find a doctor's outstanding payouts
CREATE INDEX IF NOT EXISTS idx_payments_doctor_payout
  ON payments(doctor_id, payout_status);

-- 3. Allow admins to create notifications (e.g. "your payout was cleared").
--    Relies on public.is_admin() from 003_fix_rls_recursion.sql.
DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;
CREATE POLICY "Admins can insert notifications" ON notifications
  FOR INSERT WITH CHECK (public.is_admin());

-- 4. Realtime: broadcast payments row changes so doctor dashboards update live
--    when an admin settles a payment. Adds the table to the supabase_realtime
--    publication (idempotent) and emits full rows for accurate client filtering.
ALTER TABLE payments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE payments;
  END IF;
END $$;
