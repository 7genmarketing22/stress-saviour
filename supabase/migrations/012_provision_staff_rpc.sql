-- Provision staff accounts via super-admin session (no service role key required).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.provision_staff_member(
  p_email text,
  p_password text,
  p_full_name text,
  p_phone text,
  p_role user_role,
  p_permissions jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_encrypted_pw text;
  v_instance_id uuid;
  v_meta jsonb;
  v_email text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super administrators can provision staff';
  END IF;

  IF p_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid staff role';
  END IF;

  v_email := lower(trim(p_email));
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'A user with this email already exists';
  END IF;

  SELECT COALESCE(
    (SELECT instance_id FROM auth.users LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  )
  INTO v_instance_id;

  v_user_id := gen_random_uuid();
  v_encrypted_pw := crypt(p_password, gen_salt('bf'));

  v_meta := jsonb_build_object(
    'full_name', trim(p_full_name),
    'role', p_role::text,
    'phone', coalesce(trim(p_phone), ''),
    'staff_provision', 'true',
    'email', v_email
  );

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    v_instance_id,
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    v_encrypted_pw,
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    v_meta,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  UPDATE public.profiles
  SET
    full_name = trim(p_full_name),
    phone = NULLIF(trim(p_phone), ''),
    role = p_role,
    account_status = 'approved',
    is_active = true,
    approved_by = auth.uid(),
    approved_at = now()
  WHERE id = v_user_id;

  INSERT INTO public.admin_staff (user_id, created_by, permissions, is_active)
  VALUES (v_user_id, auth.uid(), p_permissions, true)
  ON CONFLICT (user_id) DO UPDATE SET
    permissions = EXCLUDED.permissions,
    is_active = true,
    created_by = COALESCE(admin_staff.created_by, EXCLUDED.created_by);

  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_staff_member(text, text, text, text, user_role, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_staff_member(text, text, text, text, user_role, jsonb) TO authenticated;
