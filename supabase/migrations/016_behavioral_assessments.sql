-- ============================================================
-- 016_behavioral_assessments.sql
-- Database tables and RLS policies for Behavioral Assessment Test
-- ============================================================

-- Create table for patient assessments
CREATE TABLE IF NOT EXISTS public.patient_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    test_type TEXT NOT NULL CHECK (test_type IN ('anxiety', 'anger')),
    responses JSONB NOT NULL, -- Array of { question: string, score: number, answerText: string }
    total_score NUMERIC NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('healthy', 'mild', 'moderate', 'severe')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create table for sharing assessments with doctors
CREATE TABLE IF NOT EXISTS public.assessment_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES public.patient_assessments(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('new', 'reviewed')) DEFAULT 'new',
    doctor_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    shared_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (assessment_id, doctor_id)
);

-- Enable RLS on both tables
ALTER TABLE public.patient_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_shares ENABLE ROW LEVEL SECURITY;

-- Helper function to get patient_id of an assessment in a SECURITY DEFINER context
CREATE OR REPLACE FUNCTION public.get_assessment_patient_id(p_assessment_id UUID)
RETURNS UUID AS $$
  SELECT patient_id FROM public.patient_assessments WHERE id = p_assessment_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to verify if current user is a doctor
CREATE OR REPLACE FUNCTION public.is_doctor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'doctor'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS Policies for patient_assessments
DROP POLICY IF EXISTS "Patients can view their own assessments" ON public.patient_assessments;
CREATE POLICY "Patients can view their own assessments" ON public.patient_assessments
    FOR SELECT USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Patients can insert their own assessments" ON public.patient_assessments;
CREATE POLICY "Patients can insert their own assessments" ON public.patient_assessments
    FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- RLS Policies for assessment_shares
DROP POLICY IF EXISTS "Users can view shares they are involved in" ON public.assessment_shares;
CREATE POLICY "Users can view shares they are involved in" ON public.assessment_shares
    FOR SELECT USING (
        auth.uid() = doctor_id OR 
        auth.uid() = public.get_assessment_patient_id(assessment_id)
    );

DROP POLICY IF EXISTS "Patients can create shares for their assessments" ON public.assessment_shares;
CREATE POLICY "Patients can create shares for their assessments" ON public.assessment_shares
    FOR INSERT WITH CHECK (
        auth.uid() = public.get_assessment_patient_id(assessment_id)
    );

DROP POLICY IF EXISTS "Doctors can update shares assigned to them" ON public.assessment_shares;
CREATE POLICY "Doctors can update shares assigned to them" ON public.assessment_shares
    FOR UPDATE USING (
        auth.uid() = doctor_id
    ) WITH CHECK (
        auth.uid() = doctor_id
    );
