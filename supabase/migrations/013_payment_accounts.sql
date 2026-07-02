-- Platform payment accounts shown to patients for manual payments
CREATE TABLE IF NOT EXISTS public.payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method TEXT NOT NULL,
  account_title TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT,
  iban TEXT,
  instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active payment accounts" ON public.payment_accounts;
CREATE POLICY "Anyone can view active payment accounts"
  ON public.payment_accounts FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage payment accounts" ON public.payment_accounts;
CREATE POLICY "Admins can manage payment accounts"
  ON public.payment_accounts FOR ALL
  USING (public.is_admin());

CREATE OR REPLACE TRIGGER set_payment_accounts_updated_at
  BEFORE UPDATE ON public.payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
