-- Staff provisioning: allow admin/super_admin roles when created via service invite.

CREATE OR REPLACE FUNCTION public.enforce_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  staff_provision boolean;
BEGIN
  SELECT COALESCE(u.raw_user_meta_data->>'staff_provision', 'false') = 'true'
  INTO staff_provision
  FROM auth.users u
  WHERE u.id = NEW.id;

  IF (TG_OP = 'INSERT') THEN
    IF public.is_admin() OR staff_provision THEN
      IF NEW.role NOT IN ('patient', 'doctor', 'admin', 'super_admin') THEN
        NEW.role := 'patient';
      END IF;
      RETURN NEW;
    END IF;

    IF NEW.role NOT IN ('patient', 'doctor') THEN
      NEW.role := 'patient';
    END IF;
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    IF public.is_admin() OR staff_provision THEN
      IF NEW.role NOT IN ('patient', 'doctor', 'admin', 'super_admin') THEN
        NEW.role := OLD.role;
      END IF;
      RETURN NEW;
    END IF;

    IF (NEW.role IS DISTINCT FROM OLD.role) THEN
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
  is_staff boolean;
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
    CASE WHEN is_staff THEN 'approved'::account_status ELSE 'pending'::account_status END,
    is_staff
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    city = COALESCE(EXCLUDED.city, profiles.city),
    role = EXCLUDED.role,
    account_status = EXCLUDED.account_status,
    is_active = EXCLUDED.is_active,
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

DROP POLICY IF EXISTS "Admins can view staff permissions" ON public.admin_staff;
CREATE POLICY "Admins can view staff permissions" ON public.admin_staff
  FOR SELECT USING (public.is_admin());
