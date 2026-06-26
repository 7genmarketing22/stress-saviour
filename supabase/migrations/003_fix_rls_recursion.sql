-- Fix infinite recursion in RLS policies (profiles <-> doctor_profiles <-> appointments)

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_doctor_of_patient(doctor_uid uuid, patient_uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM appointments a
    JOIN doctor_profiles dp ON dp.id = a.doctor_id
    WHERE a.patient_id = patient_uid
      AND dp.user_id = doctor_uid
  );
$$;

CREATE OR REPLACE FUNCTION public.doctor_owns_profile(doctor_profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.doctor_profiles
    WHERE id = doctor_profile_id AND user_id = auth.uid()
  );
$$;

-- profiles: replace recursive patient-view policy
DROP POLICY IF EXISTS "Doctors can view their patients profiles" ON profiles;
CREATE POLICY "Doctors can view their patients profiles" ON profiles
  FOR SELECT USING (public.is_doctor_of_patient(auth.uid(), id));

-- doctor_profiles: stop subquerying profiles
DROP POLICY IF EXISTS "Doctors can view their own profile" ON doctor_profiles;
CREATE POLICY "Doctors can view their own profile" ON doctor_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Doctors can update their own profile" ON doctor_profiles;
CREATE POLICY "Doctors can update their own profile" ON doctor_profiles
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all doctor profiles" ON doctor_profiles;
CREATE POLICY "Admins can view all doctor profiles" ON doctor_profiles
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update doctor profiles" ON doctor_profiles;
CREATE POLICY "Admins can update doctor profiles" ON doctor_profiles
  FOR UPDATE USING (public.is_admin());

-- appointments
DROP POLICY IF EXISTS "Doctors can view their appointments" ON appointments;
CREATE POLICY "Doctors can view their appointments" ON appointments
  FOR SELECT USING (public.doctor_owns_profile(doctor_id));

DROP POLICY IF EXISTS "Doctors can update their appointments" ON appointments;
CREATE POLICY "Doctors can update their appointments" ON appointments
  FOR UPDATE USING (public.doctor_owns_profile(doctor_id));

DROP POLICY IF EXISTS "Admins can view all appointments" ON appointments;
CREATE POLICY "Admins can view all appointments" ON appointments
  FOR ALL USING (public.is_admin());

-- payments
DROP POLICY IF EXISTS "Doctors can view their payments" ON payments;
CREATE POLICY "Doctors can view their payments" ON payments
  FOR SELECT USING (public.doctor_owns_profile(doctor_id));

DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
CREATE POLICY "Admins can view all payments" ON payments
  FOR ALL USING (public.is_admin());

-- chat_messages
DROP POLICY IF EXISTS "Appointment participants can view messages" ON chat_messages;
CREATE POLICY "Appointment participants can view messages" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE id = appointment_id
        AND (
          patient_id = auth.uid()
          OR public.doctor_owns_profile(doctor_id)
        )
    )
  );

DROP POLICY IF EXISTS "Appointment participants can send messages" ON chat_messages;
CREATE POLICY "Appointment participants can send messages" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM appointments
      WHERE id = appointment_id
        AND (
          patient_id = auth.uid()
          OR public.doctor_owns_profile(doctor_id)
        )
    )
  );

-- admin_staff & platform_settings
DROP POLICY IF EXISTS "Super admins can manage staff" ON admin_staff;
CREATE POLICY "Super admins can manage staff" ON admin_staff
  FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS "Admins can view settings" ON platform_settings;
CREATE POLICY "Admins can view settings" ON platform_settings
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Super admins can update settings" ON platform_settings;
CREATE POLICY "Super admins can update settings" ON platform_settings
  FOR ALL USING (public.is_super_admin());

-- availability_slots
DROP POLICY IF EXISTS "Doctors can manage their slots" ON availability_slots;
CREATE POLICY "Doctors can manage their slots" ON availability_slots
  FOR ALL USING (public.doctor_owns_profile(doctor_id));
