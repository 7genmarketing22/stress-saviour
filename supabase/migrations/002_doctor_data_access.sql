-- Allow doctors to view profiles of patients they have appointments with
CREATE POLICY "Doctors can view their patients profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN doctor_profiles dp ON dp.id = a.doctor_id
      WHERE a.patient_id = profiles.id
      AND dp.user_id = auth.uid()
    )
  );

-- Allow doctors to insert their own doctor profile (onboarding)
CREATE POLICY "Doctors can insert their own profile" ON doctor_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
