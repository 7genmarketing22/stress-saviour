-- ================================================================
-- 019_notification_rpcs_and_login_alerts.sql
-- 1. create_notification   – SECURITY DEFINER so any authenticated user
--    can insert a notification for any target user_id.
-- 2. notify_admins_on_login – called by doctor/patient after sign-in;
--    inserts login-alert notifications directly into all admin rows
--    without exposing admin profile IDs to the caller.
-- ================================================================

-- 1. Generic notification creator (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id  UUID,
  p_title    TEXT,
  p_message  TEXT,
  p_type     TEXT DEFAULT 'system',
  p_metadata JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (p_user_id, p_title, p_message, p_type, p_metadata);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, JSONB)
  TO authenticated;

-- 2. Notify all admins when a doctor or patient logs in
CREATE OR REPLACE FUNCTION public.notify_admins_on_login(
  p_user_id UUID,
  p_role    TEXT,
  p_name    TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  SELECT
    pr.id,
    CASE p_role
      WHEN 'doctor'  THEN 'Doctor Logged In'
      WHEN 'patient' THEN 'Patient Logged In'
      ELSE 'User Logged In'
    END,
    CASE p_role
      WHEN 'doctor'  THEN p_name || ' (Doctor) has just logged in to the platform.'
      WHEN 'patient' THEN p_name || ' (Patient) has just logged in to their account.'
      ELSE p_name || ' logged in.'
    END,
    'system',
    jsonb_build_object('user_id', p_user_id, 'role', p_role)
  FROM public.profiles pr
  WHERE pr.role IN ('admin', 'super_admin');
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_admins_on_login(UUID, TEXT, TEXT)
  TO authenticated;
