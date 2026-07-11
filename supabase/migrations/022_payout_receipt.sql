-- ================================================================
-- 022_payout_receipt.sql
-- Adds a payout_receipt_url column to payments so admins can attach
-- a bank-transfer screenshot / receipt to every settlement action.
-- ================================================================

-- 1. New column on payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payout_receipt_url TEXT;

-- 2. Storage bucket for payout receipts (public URL access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payout-receipts',
  'payout-receipts',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS: only admins can upload / update
DROP POLICY IF EXISTS "Admins can upload payout receipts" ON storage.objects;
CREATE POLICY "Admins can upload payout receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payout-receipts'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can update payout receipts" ON storage.objects;
CREATE POLICY "Admins can update payout receipts"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'payout-receipts'
    AND public.is_admin()
  );

-- 4. Any authenticated user (including doctors) can read their receipt
DROP POLICY IF EXISTS "Authenticated users can read payout receipts" ON storage.objects;
CREATE POLICY "Authenticated users can read payout receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'payout-receipts');
