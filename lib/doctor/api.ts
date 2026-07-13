import { createClient } from "@/lib/supabase/client";
import { initiateRefundForCancelledAppointment } from "@/lib/refunds/process";
import type { DoctorProfile, Profile, AppointmentStatus } from "@/types";
import type { Database } from "@/types/database";
import { formatClinicalNotes } from "./notes";
import {
  dayNameToIndex,
  formatSlotRange,
  time12To24,
} from "./mappers";
import type {
  AppointmentWithPatient,
  DoctorContextData,
  DoctorDocuments,
  PaymentWithPatient,
} from "./types";

function parseDocuments(raw: unknown): DoctorDocuments {
  if (!raw || typeof raw !== "object") return {};
  return raw as DoctorDocuments;
}

type TableName = keyof Database["public"]["Tables"];

function table(name: TableName) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient().from(name) as any;
}

export type DoctorContextFailureReason =
  | "not_signed_in"
  | "profile_missing"
  | "doctor_profile_missing"
  | "doctor_profile_create_failed"
  | "unknown";

export type DoctorContextResult =
  | { ok: true; data: DoctorContextData }
  | { ok: false; reason: DoctorContextFailureReason; message: string };

async function ensureDoctorProfile(
  userId: string,
  profile: Profile
): Promise<DoctorProfile | null> {
  const { data: existing, error: existingError } = await table("doctor_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing as DoctorProfile;

  const pmdcSuffix = userId.replace(/-/g, "").slice(0, 8).toUpperCase();
  const { data: created, error: createError } = await table("doctor_profiles")
    .insert({
      user_id: userId,
      specialization: "Clinical Psychologist",
      qualification: ["Pending verification"],
      experience_years: 1,
      pmdc_number: `PENDING-${pmdcSuffix}`,
      consultation_fee: 2000,
      bio: `Professional profile for ${profile.full_name}`,
      status: "pending",
      is_available: false,
    } as Database["public"]["Tables"]["doctor_profiles"]["Insert"])
    .select()
    .single();

  if (createError) {
    console.error("Failed to create doctor profile:", createError);
    return null;
  }

  return created as DoctorProfile;
}

export async function getDoctorContext(): Promise<DoctorContextResult> {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  let user = session?.user ?? null;
  if (!user) {
    const {
      data: { user: fetchedUser },
    } = await supabase.auth.getUser();
    user = fetchedUser;
  }

  if (!user) {
    return {
      ok: false,
      reason: "not_signed_in",
      message: "You are not signed in. Please log in with your doctor account.",
    };
  }

  const { data: profile, error: profileError } = await table("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false,
      reason: "unknown",
      message: profileError.message,
    };
  }

  if (!profile) {
    return {
      ok: false,
      reason: "profile_missing",
      message:
        "Your user profile was not found in the database. An admin must create a profiles row for your account.",
    };
  }

  if (profile.role !== "doctor") {
    const typedProfile = profile as Profile;
    return {
      ok: false,
      reason: "profile_missing",
      message: `This portal is for doctors only. Your account role is "${typedProfile.role}".`,
    };
  }

  const typedProfile = profile as Profile;

  let doctorProfile: DoctorProfile | null = null;

  const { data: existingDoctor, error: doctorError } = await table("doctor_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (doctorError) {
    return {
      ok: false,
      reason: "unknown",
      message: doctorError.message,
    };
  }

  if (existingDoctor) {
    doctorProfile = existingDoctor as DoctorProfile;
  } else {
    doctorProfile = await ensureDoctorProfile(user.id, typedProfile);
    if (!doctorProfile) {
      return {
        ok: false,
        reason: "doctor_profile_create_failed",
        message:
          "No doctor professional profile exists for your account, and one could not be created automatically. Ask an admin to add you in doctor_profiles, or run migration 002_doctor_data_access.sql in Supabase.",
      };
    }
  }

  const doctor = doctorProfile;

  return {
    ok: true,
    data: {
      profile: typedProfile,
      doctorProfile: doctor,
      documents: parseDocuments(doctor.documents),
    },
  };
}

export async function getDoctorAppointments(
  doctorProfileId: string
): Promise<AppointmentWithPatient[]> {
  const { data, error } = await table("appointments")
    .select(
      `
      *,
      patient:profiles!appointments_patient_id_fkey (
        id, full_name, email, phone, city, date_of_birth, gender, avatar_url
      )
    `
    )
    .eq("doctor_id", doctorProfileId)
    .neq("status", "pending_payment")
    .order("scheduled_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as AppointmentWithPatient[];
}

export async function updateAppointment(
  appointmentId: string,
  updates: {
    status?: AppointmentStatus;
    scheduled_at?: string;
    doctor_notes?: string | null;
    prescription_url?: string | null;
    video_room_url?: string | null;
    completed_at?: string | null;
    cancellation_reason?: string | null;
    cancelled_by?: string | null;
  }
) {
  const { data, error } = await table("appointments")
    .update(updates as Database["public"]["Tables"]["appointments"]["Update"])
    .eq("id", appointmentId)
    .select()
    .single();

  if (error) throw error;

  if (updates.status === "cancelled") {
    await initiateRefundForCancelledAppointment({
      appointmentId,
      cancelledBy: "doctor",
      cancellationReason: updates.cancellation_reason?.trim() || "Cancelled by doctor",
    }).catch(() => {});
  }

  return data;
}

export async function saveClinicalRecords(
  appointmentId: string,
  clinicalNote: string,
  prescription?: { medication: string; dosage: string } | null,
  markCompleted = true
) {
  const notes = formatClinicalNotes(clinicalNote, prescription);
  return updateAppointment(appointmentId, {
    doctor_notes: notes,
    status: markCompleted ? "completed" : undefined,
    completed_at: markCompleted ? new Date().toISOString() : undefined,
  });
}

export async function getDoctorPayments(
  doctorProfileId: string
): Promise<PaymentWithPatient[]> {
  const { data, error } = await table("payments")
    .select(
      `
      *,
      patient:profiles!payments_patient_id_fkey ( id, full_name ),
      appointment:appointments!payments_appointment_id_fkey ( appointment_type )
    `
    )
    .eq("doctor_id", doctorProfileId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PaymentWithPatient[];
}

export async function getAvailabilitySlots(doctorProfileId: string) {
  const { data, error } = await table("availability_slots")
    .select("*")
    .eq("doctor_id", doctorProfileId)
    .order("day_of_week")
    .order("start_time");

  if (error) throw error;
  return data ?? [];
}

export async function saveAvailabilitySlots(
  doctorProfileId: string,
  schedule: Array<{
    day: string;
    slots: string[];
    isActive: boolean;
  }>,
  slotDurationMinutes = 30
) {
  const { error: deleteError } = await table("availability_slots")
    .delete()
    .eq("doctor_id", doctorProfileId);

  if (deleteError) throw deleteError;

  const rows = schedule.flatMap((daySchedule) => {
    if (!daySchedule.isActive || daySchedule.slots.length === 0) return [];

    return daySchedule.slots.map((slot) => {
      const [startLabel, endLabel] = slot.split(" - ").map((part) => part.trim());
      return {
        doctor_id: doctorProfileId,
        day_of_week: dayNameToIndex(daySchedule.day),
        start_time: time12To24(startLabel),
        end_time: time12To24(endLabel),
        slot_duration_minutes: slotDurationMinutes,
        is_active: true,
      };
    });
  });

  if (rows.length === 0) return [];

  const { data, error } = await table("availability_slots")
    .insert(rows as Database["public"]["Tables"]["availability_slots"]["Insert"][])
    .select();

  if (error) throw error;
  return data ?? [];
}

export function slotsToWeeklySchedule(
  slots: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active: boolean;
  }>
) {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return days.map((day) => {
    const dayIndex = dayNameToIndex(day);
    const daySlots = slots
      .filter((slot) => slot.day_of_week === dayIndex && slot.is_active)
      .map((slot) => formatSlotRange(slot.start_time, slot.end_time));

    return {
      day,
      slots: daySlots,
      isActive: daySlots.length > 0,
    };
  });
}

export async function updateDoctorDocuments(
  doctorProfileId: string,
  currentDocuments: DoctorDocuments,
  patch: Partial<DoctorDocuments>
) {
  const merged = { ...currentDocuments, ...patch };

  const { data, error } = await table("doctor_profiles")
    .update({ documents: merged as Database["public"]["Tables"]["doctor_profiles"]["Update"]["documents"] })
    .eq("id", doctorProfileId)
    .select()
    .single();

  if (error) throw error;
  return { doctorProfile: data as DoctorProfile, documents: merged };
}

export async function updateDoctorProfile(
  doctorProfileId: string,
  updates: Partial<DoctorProfile>
) {
  const { data, error } = await table("doctor_profiles")
    .update(updates as Database["public"]["Tables"]["doctor_profiles"]["Update"])
    .eq("id", doctorProfileId)
    .select()
    .single();

  if (error) throw error;
  return data as DoctorProfile;
}

export async function updateUserProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await table("profiles")
    .update(updates as Database["public"]["Tables"]["profiles"]["Update"])
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function getNotifications(userId: string, limit = 10) {
  const { data, error } = await table("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await table("notifications")
    .update({ is_read: true } as Database["public"]["Tables"]["notifications"]["Update"])
    .eq("id", notificationId);

  if (error) throw error;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export function buildLastVisitMap(appointments: AppointmentWithPatient[]) {
  const map: Record<string, string> = {};
  const completed = appointments
    .filter((apt) => apt.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.completed_at ?? b.scheduled_at).getTime() -
        new Date(a.completed_at ?? a.scheduled_at).getTime()
    );

  for (const apt of completed) {
    if (!map[apt.patient_id]) {
      map[apt.patient_id] = new Date(
        apt.completed_at ?? apt.scheduled_at
      ).toLocaleDateString("en-PK", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  }
  return map;
}

export function getUniquePatients(appointments: AppointmentWithPatient[]) {
  const patients = new Map<string, AppointmentWithPatient>();

  for (const apt of appointments) {
    if (!apt.patient) continue;
    const existing = patients.get(apt.patient_id);
    if (
      !existing ||
      new Date(apt.scheduled_at).getTime() >
        new Date(existing.scheduled_at).getTime()
    ) {
      patients.set(apt.patient_id, apt);
    }
  }

  return Array.from(patients.values());
}

// ── Doctor Blocked Slots ───────────────────────────────────────────

export interface DoctorBlockedSlot {
  id: string;
  doctor_id: string;
  blocked_date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM or null (full day)
  end_time: string | null;   // HH:MM or null (full day)
  reason: string;
  created_at: string;
}

/** Fetch all blocked slots for this doctor (optionally for a specific date). */
export async function getDocBlockedSlots(
  doctorProfileId: string,
  date?: string
): Promise<DoctorBlockedSlot[]> {
  let q = (createClient() as any)
    .from("doctor_blocked_slots")
    .select("*")
    .eq("doctor_id", doctorProfileId)
    .order("blocked_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (date) q = q.eq("blocked_date", date);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DoctorBlockedSlot[];
}

/** Block a date or time range for this doctor. */
export async function addDocBlockedSlot(
  doctorProfileId: string,
  blockedDate: string,
  reason: string,
  startTime?: string, // "HH:MM" or omit for full-day
  endTime?: string
): Promise<DoctorBlockedSlot> {
  const { data, error } = await (createClient() as any)
    .from("doctor_blocked_slots")
    .insert({
      doctor_id: doctorProfileId,
      blocked_date: blockedDate,
      start_time: startTime ?? null,
      end_time: endTime ?? null,
      reason: reason || "Unavailable",
    })
    .select()
    .single();

  if (error) throw error;
  return data as DoctorBlockedSlot;
}

/** Remove a blocked slot entry. */
export async function removeDocBlockedSlot(slotId: string): Promise<void> {
  const { error } = await (createClient() as any)
    .from("doctor_blocked_slots")
    .delete()
    .eq("id", slotId);

  if (error) throw error;
}
