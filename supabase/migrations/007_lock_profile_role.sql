-- Security hardening: prevent privilege escalation via the `role` column.
--
-- The existing "Users can insert/update their own profile" RLS policies only
-- check `auth.uid() = id` and do NOT restrict which `role` value a user may set.
-- That allowed any signed-in user to call the API directly and promote their own
-- account to `doctor`, `admin`, or `super_admin` (and `is_admin()` trusts
-- `profiles.role`). This trigger forces a safe role for non-admin callers.

CREATE OR REPLACE FUNCTION public.enforce_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Self sign-up can only ever create a patient account. Only an existing
    -- admin may create privileged accounts.
    IF NOT public.is_admin() THEN
      NEW.role := 'patient';
    END IF;
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    -- Only admins may change a profile's role. For everyone else the role is
    -- pinned to its previous value regardless of what was submitted.
    IF (NEW.role IS DISTINCT FROM OLD.role) AND NOT public.is_admin() THEN
      NEW.role := OLD.role;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_profile_role ON public.profiles;
CREATE TRIGGER trg_enforce_profile_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_role();
