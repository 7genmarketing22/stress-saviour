-- Account registration + admin approval workflow
-- Fixes client-side profile insert RLS failures by auto-creating profiles from auth.users.

DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status account_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Existing accounts should remain usable
UPDATE public.profiles
SET account_status = 'approved', is_active = true
WHERE account_status = 'pending';

-- Allow self-signup as patient or doctor (never admin)
CREATE OR REPLACE FUNCTION public.enforce_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NOT public.is_admin() THEN
      IF NEW.role NOT IN ('patient', 'doctor') THEN
        NEW.role := 'patient';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    IF (NEW.role IS DISTINCT FROM OLD.role) AND NOT public.is_admin() THEN
      NEW.role := OLD.role;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb;
  signup_role user_role;
  exp_years int;
  consult_fee numeric(10,2);
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  signup_role := COALESCE(meta->>'role', 'patient')::user_role;
  IF signup_role NOT IN ('patient', 'doctor') THEN
    signup_role := 'patient';
  END IF;

  exp_years := GREATEST(0, COALESCE(NULLIF(meta->>'experience_years', '')::int, 0));
  consult_fee := COALESCE(NULLIF(meta->>'consultation_fee', '')::numeric, 0);

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    city,
    role,
    account_status,
    is_active
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, meta->>'email'),
    COALESCE(NULLIF(meta->>'full_name', ''), split_part(COALESCE(NEW.email, ''), '@', 1)),
    NULLIF(meta->>'phone', ''),
    NULLIF(meta->>'city', ''),
    signup_role,
    'pending',
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    city = COALESCE(EXCLUDED.city, profiles.city),
    updated_at = NOW();

  IF signup_role = 'doctor' AND NULLIF(meta->>'pmdc_number', '') IS NOT NULL THEN
    INSERT INTO public.doctor_profiles (
      user_id,
      status,
      specialization,
      qualification,
      experience_years,
      pmdc_number,
      bio,
      consultation_fee,
      cities
    ) VALUES (
      NEW.id,
      'pending',
      COALESCE(NULLIF(meta->>'specialization', ''), 'Psychologist'),
      ARRAY[COALESCE(NULLIF(meta->>'qualification', ''), 'MBBS')],
      exp_years,
      meta->>'pmdc_number',
      NULLIF(meta->>'bio', ''),
      consult_fee,
      CASE
        WHEN NULLIF(meta->>'city', '') IS NOT NULL THEN ARRAY[meta->>'city']
        ELSE NULL
      END
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Admins can update any profile (approve / reject accounts)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());
