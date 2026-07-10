-- ============================================================
-- 017_fix_assessment_doctor_rls.sql
-- Allow doctors to read patient_assessments shared with them,
-- and fix any stale assessment_shares rows that stored
-- doctor_profiles.id instead of profiles.id (user_id).
-- ============================================================

-- Allow doctors to view patient_assessments shared with them
DROP POLICY IF EXISTS "Doctors can view assessments shared with them" ON public.patient_assessments;
CREATE POLICY "Doctors can view assessments shared with them" ON public.patient_assessments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.assessment_shares
            WHERE assessment_id = patient_assessments.id
              AND doctor_id = auth.uid()
        )
    );

-- Fix any stale rows where doctor_id was stored as doctor_profiles.id
-- instead of the correct profiles.id (user_id).
UPDATE public.assessment_shares AS s
SET doctor_id = dp.user_id
FROM public.doctor_profiles dp
WHERE s.doctor_id = dp.id
  AND s.doctor_id != dp.user_id;
