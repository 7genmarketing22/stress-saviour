import { createClient } from "@/lib/supabase/server";
import type { DoctorWithProfile } from "@/lib/patient/types";
import {
  BASE_DOCTOR_SELECT,
  DOCTOR_SELECT_WITH_TAXONOMY,
  resolveDoctorRow,
  resolveDoctorRows,
} from "@/lib/public/doctor-select";

export async function getApprovedDoctorsServer(): Promise<DoctorWithProfile[]> {
  const supabase = await createClient();

  return resolveDoctorRows(
    await supabase
      .from("doctor_profiles")
      .select(DOCTOR_SELECT_WITH_TAXONOMY)
      .eq("status", "approved")
      .order("rating", { ascending: false }),
    async () =>
      await supabase
        .from("doctor_profiles")
        .select(BASE_DOCTOR_SELECT)
        .eq("status", "approved")
        .order("rating", { ascending: false }),
  );
}

export async function getDoctorByIdServer(id: string): Promise<DoctorWithProfile | null> {
  const supabase = await createClient();

  return resolveDoctorRow(
    await supabase
      .from("doctor_profiles")
      .select(DOCTOR_SELECT_WITH_TAXONOMY)
      .eq("id", id)
      .eq("status", "approved")
      .maybeSingle(),
    async () =>
      await supabase
        .from("doctor_profiles")
        .select(BASE_DOCTOR_SELECT)
        .eq("id", id)
        .eq("status", "approved")
        .maybeSingle(),
  );
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
