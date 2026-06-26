-- Patients can view names/contact of approved doctors (for browse & appointments)
CREATE POLICY "Anyone can view approved doctor user profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM doctor_profiles dp
      WHERE dp.user_id = profiles.id AND dp.status = 'approved'
    )
  );

-- Patients can record payments for their bookings
CREATE POLICY "Patients can create payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- Patients can update their own reviews
CREATE POLICY "Patients can update their reviews" ON reviews
  FOR UPDATE USING (auth.uid() = patient_id);
