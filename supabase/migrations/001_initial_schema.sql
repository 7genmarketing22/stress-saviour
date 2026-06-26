-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS
CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin', 'super_admin');
CREATE TYPE doctor_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'ongoing', 'completed', 'cancelled', 'no_show');
CREATE TYPE appointment_type AS ENUM ('video', 'chat', 'in_person');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('jazzcash', 'easypaisa', 'stripe', 'bank_transfer');
CREATE TYPE gender AS ENUM ('male', 'female', 'other');

-- PROFILES (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'patient',
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  city TEXT,
  date_of_birth DATE,
  gender gender,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DOCTOR PROFILES
CREATE TABLE doctor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  status doctor_status DEFAULT 'pending',
  specialization TEXT NOT NULL,
  sub_specialization TEXT,
  qualification TEXT[] NOT NULL,
  experience_years INT NOT NULL,
  pmdc_number TEXT UNIQUE NOT NULL,
  bio TEXT,
  consultation_fee NUMERIC(10,2) NOT NULL,
  follow_up_fee NUMERIC(10,2),
  languages TEXT[] DEFAULT ARRAY['Urdu', 'English'],
  cities TEXT[],
  hospital_affiliations TEXT[],
  documents JSONB,
  rating NUMERIC(3,2) DEFAULT 0,
  total_reviews INT DEFAULT 0,
  total_consultations INT DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DOCTOR AVAILABILITY SLOTS
CREATE TABLE availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INT DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- APPOINTMENTS
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES profiles(id),
  doctor_id UUID REFERENCES doctor_profiles(id),
  appointment_type appointment_type NOT NULL,
  status appointment_status DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 30,
  patient_notes TEXT,
  doctor_notes TEXT,
  prescription_url TEXT,
  video_room_url TEXT,
  consultation_fee NUMERIC(10,2) NOT NULL,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENTS
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id),
  patient_id UUID REFERENCES profiles(id),
  doctor_id UUID REFERENCES doctor_profiles(id),
  amount NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2) DEFAULT 0,
  doctor_earning NUMERIC(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  status payment_status DEFAULT 'pending',
  transaction_id TEXT UNIQUE,
  gateway_response JSONB,
  refund_id TEXT,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- REVIEWS
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID UNIQUE REFERENCES appointments(id),
  patient_id UUID REFERENCES profiles(id),
  doctor_id UUID REFERENCES doctor_profiles(id),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ADMIN STAFF
CREATE TABLE admin_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  permissions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CHAT MESSAGES
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  message TEXT,
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PLATFORM SETTINGS
CREATE TABLE platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_doctor_profiles_user_id ON doctor_profiles(user_id);
CREATE INDEX idx_doctor_profiles_status ON doctor_profiles(status);
CREATE INDEX idx_doctor_profiles_specialization ON doctor_profiles(specialization);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX idx_payments_appointment_id ON payments(appointment_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_chat_messages_appointment_id ON chat_messages(appointment_id);

-- TRIGGERS for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctor_profiles_updated_at BEFORE UPDATE ON doctor_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- DOCTOR PROFILES POLICIES
CREATE POLICY "Anyone can view approved doctors" ON doctor_profiles
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Doctors can view their own profile" ON doctor_profiles
  FOR SELECT USING (
    auth.uid() = (SELECT id FROM profiles WHERE id = user_id)
  );

CREATE POLICY "Doctors can update their own profile" ON doctor_profiles
  FOR UPDATE USING (
    auth.uid() = (SELECT id FROM profiles WHERE id = user_id)
  );

CREATE POLICY "Admins can view all doctor profiles" ON doctor_profiles
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can update doctor profiles" ON doctor_profiles
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

-- APPOINTMENTS POLICIES
CREATE POLICY "Patients can view their own appointments" ON appointments
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view their appointments" ON appointments
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM doctor_profiles WHERE id = doctor_id)
  );

CREATE POLICY "Patients can create appointments" ON appointments
  FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update their appointments" ON appointments
  FOR UPDATE USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can update their appointments" ON appointments
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM doctor_profiles WHERE id = doctor_id)
  );

CREATE POLICY "Admins can view all appointments" ON appointments
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

-- PAYMENTS POLICIES
CREATE POLICY "Patients can view their payments" ON payments
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view their payments" ON payments
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM doctor_profiles WHERE id = doctor_id)
  );

CREATE POLICY "Admins can view all payments" ON payments
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- REVIEWS POLICIES
CREATE POLICY "Anyone can view visible reviews" ON reviews
  FOR SELECT USING (is_visible = true);

CREATE POLICY "Patients can create reviews for their appointments" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = patient_id AND
    EXISTS (
      SELECT 1 FROM appointments 
      WHERE id = appointment_id 
      AND patient_id = auth.uid() 
      AND status = 'completed'
    )
  );

-- CHAT MESSAGES POLICIES
CREATE POLICY "Appointment participants can view messages" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments 
      WHERE id = appointment_id 
      AND (
        patient_id = auth.uid() OR
        auth.uid() = (SELECT user_id FROM doctor_profiles WHERE id = doctor_id)
      )
    )
  );

CREATE POLICY "Appointment participants can send messages" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM appointments 
      WHERE id = appointment_id 
      AND (
        patient_id = auth.uid() OR
        auth.uid() = (SELECT user_id FROM doctor_profiles WHERE id = doctor_id)
      )
    )
  );

-- ADMIN STAFF POLICIES
CREATE POLICY "Super admins can manage staff" ON admin_staff
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

-- PLATFORM SETTINGS POLICIES
CREATE POLICY "Admins can view settings" ON platform_settings
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Super admins can update settings" ON platform_settings
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

-- AVAILABILITY SLOTS POLICIES
CREATE POLICY "Anyone can view active slots" ON availability_slots
  FOR SELECT USING (is_active = true);

CREATE POLICY "Doctors can manage their slots" ON availability_slots
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM doctor_profiles WHERE id = doctor_id)
  );
