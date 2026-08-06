-- ================================================================
-- Patients are auto-approved on signup (again).
-- Migration 026 overwrote the 018 auto-approve trigger and put every
-- new profile back to pending/inactive. Restore patient (and staff)
-- auto-approval while keeping doctor taxonomy sync + staff provisioning.
-- Doctors still require admin review.
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
  is_staff boolean;
  is_patient boolean;
  auto_approve boolean;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  is_staff := COALESCE(meta->>'staff_provision', 'false') = 'true';

  signup_role := COALESCE(meta->>'role', 'patient')::user_role;
  IF is_staff THEN
    IF signup_role NOT IN ('admin', 'super_admin') THEN
      signup_role := 'admin';
    END IF;
  ELSIF signup_role NOT IN ('patient', 'doctor') THEN
    signup_role := 'patient';
  END IF;

  is_patient := (signup_role = 'patient');
  -- Patients and provisioned staff skip admin account review.
  auto_approve := is_patient OR is_staff;

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
    CASE WHEN auto_approve THEN 'approved'::account_status ELSE 'pending'::account_status END,
    auto_approve
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    city = COALESCE(EXCLUDED.city, profiles.city),
    role = CASE
      WHEN is_staff THEN EXCLUDED.role
      ELSE profiles.role
    END,
    account_status = CASE
      WHEN is_staff THEN EXCLUDED.account_status
      ELSE profiles.account_status
    END,
    is_active = CASE
      WHEN is_staff THEN EXCLUDED.is_active
      ELSE profiles.is_active
    END,
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

    -- Present when doctor taxonomy migration has been applied
    IF EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'sync_doctor_taxonomy_from_meta'
    ) THEN
      PERFORM public.sync_doctor_taxonomy_from_meta(NEW.id, meta);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Unlock any patients still waiting on manual approval
UPDATE public.profiles
SET
  account_status = 'approved',
  is_active = true,
  updated_at = NOW()
WHERE role = 'patient'
  AND account_status = 'pending';
