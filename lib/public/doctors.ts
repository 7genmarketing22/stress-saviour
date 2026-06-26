import { createClient } from "@/lib/supabase/server";
import type { DoctorWithProfile } from "@/lib/patient/types";

const DOCTOR_SELECT = `
  id, user_id, status, specialization, sub_specialization, qualification, experience_years,
  pmdc_number, bio, consultation_fee, follow_up_fee, rating, total_reviews,
  is_available, cities, languages, hospital_affiliations,
  profile:profiles!doctor_profiles_user_id_fkey ( full_name, avatar_url, city, phone )
`;

export async function getApprovedDoctorsServer(): Promise<DoctorWithProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doctor_profiles")
    .select(DOCTOR_SELECT)
    .eq("status", "approved")
    .order("rating", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DoctorWithProfile[];
}

export async function getDoctorByIdServer(id: string): Promise<DoctorWithProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doctor_profiles")
    .select(DOCTOR_SELECT)
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();

  if (error) throw error;
  return (data as DoctorWithProfile | null) ?? null;
}

export async function getDoctorAvailabilityServer(doctorProfileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("availability_slots")
    .select("*")
    .eq("doctor_id", doctorProfileId)
    .eq("is_active", true)
    .order("day_of_week")
    .order("start_time");

  if (error) throw error;
  return data ?? [];
}
