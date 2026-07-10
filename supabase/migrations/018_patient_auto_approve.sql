-- ================================================================
-- 018_patient_auto_approve.sql
-- Patients are auto-approved on signup.
-- Only doctors start as pending and require admin review.
-- ================================================================

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
  is_patient boolean;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  signup_role := COALESCE(meta->>'role', 'patient')::user_role;
  IF signup_role NOT IN ('patient', 'doctor') THEN
    signup_role := 'patient';
  END IF;

  is_patient := (signup_role = 'patient');
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
    CASE WHEN is_patient THEN 'approved'::account_status ELSE 'pending'::account_status END,
    is_patient  -- patients active immediately; doctors wait for admin review
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

-- Auto-approve any existing patients still stuck in pending
UPDATE public.profiles
SET account_status = 'approved', is_active = true
WHERE role = 'patient' AND account_status = 'pending';
