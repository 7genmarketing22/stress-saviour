-- Returns the user_id of the first available admin so doctors can start a support chat.
CREATE OR REPLACE FUNCTION public.get_first_admin_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.profiles
  WHERE role IN ('admin', 'super_admin') AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_first_admin_id() TO authenticated;
