import { createClient } from "@/lib/supabase/client";
import type {
  AppointmentStatus,
  AppointmentType,
  PaymentMethod,
  Profile,
} from "@/types";
import type { Database } from "@/types/database";
import { parseClinicalNotes } from "@/lib/doctor/notes";
import { uploadPaymentProof } from "@/lib/storage/paymentProof";
import { createNotification, notifyAllAdmins } from "@/lib/notifications/api";
import { initiateRefundForCancelledAppointment } from "@/lib/refunds/process";
import { getOrCreateConversation, sendMessage } from "@/lib/chat/api";
import type {
  AppointmentWithDoctor,
  DoctorWithProfile,
  PatientContextData,
  PatientPrescription,
  PaymentWithDoctor,
} from "./types";

type TableName = keyof Database["public"]["Tables"];

function table(name: TableName) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient().from(name) as any;
}

export type PatientContextFailureReason =
  | "not_signed_in"
  | "profile_missing"
  | "wrong_role"
  | "unknown";

export type PatientContextResult =
  | { ok: true; data: PatientContextData }
  | { ok: false; reason: PatientContextFailureReason; message: string };

const DOCTOR_SELECT = `
  id, user_id, status, specialization, qualification, experience_years,
  pmdc_number, bio, consultation_fee, follow_up_fee, rating, total_reviews,
  is_available, cities,
  profile:profiles!doctor_profiles_user_id_fkey ( full_name, avatar_url, city, phone )
`;

const APPOINTMENT_SELECT = `
  *,
  doctor:doctor_profiles!appointments_doctor_id_fkey (
    ${DOCTOR_SELECT}
  ),
  review:reviews!reviews_appointment_id_fkey ( rating, comment ),
  payments (
    id, status, proof_url, payment_method, rejection_reason, amount,
    refund_status, refund_amount, refund_initiated_at, refund_processed_at, refund_note, refunded_at
  )
`;

const PRESCRIPTION_APPOINTMENT_SELECT = `
  *,
  doctor:doctor_profiles!appointments_doctor_id_fkey (
    id, specialization,
    profile:profiles!doctor_profiles_user_id_fkey ( full_name )
  )
`;

export async function getPatientContext(): Promise<PatientContextResult> {
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
      message: "You are not signed in. Please log in with your patient account.",
    };
  }

  const { data: profile, error: profileError } = await table("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, reason: "unknown", message: profileError.message };
  }

  if (!profile) {
    return {
      ok: false,
      reason: "profile_missing",
      message: "Your user profile was not found. Please contact support.",
    };
  }

  if ((profile as Profile).role !== "patient") {
    const typedProfile = profile as Profile;
    return {
      ok: false,
      reason: "wrong_role",
      message: `This portal is for patients only. Your account role is "${typedProfile.role}".`,
    };
  }

  return { ok: true, data: { profile: profile as Profile } };
}

export async function getPatientAppointments(): Promise<AppointmentWithDoctor[]> {
  const { data, error } = await table("appointments")
    .select(APPOINTMENT_SELECT)
    .order("scheduled_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AppointmentWithDoctor[];
}

export async function getPatientPrescriptionAppointments(): Promise<AppointmentWithDoctor[]> {
  const { data, error } = await table("appointments")
    .select(PRESCRIPTION_APPOINTMENT_SELECT)
    .eq("status", "completed")
    .order("scheduled_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AppointmentWithDoctor[];
}

export async function getApprovedDoctors(): Promise<DoctorWithProfile[]> {
  const { data, error } = await table("doctor_profiles")
    .select(DOCTOR_SELECT)
    .eq("status", "approved")
    .order("rating", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DoctorWithProfile[];
}

export async function getDoctorById(id: string): Promise<DoctorWithProfile | null> {
  const { data, error } = await table("doctor_profiles")
    .select(DOCTOR_SELECT)
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();

  if (error) throw error;
  return (data as DoctorWithProfile | null) ?? null;
}

export async function getDoctorAvailability(doctorProfileId: string) {
  const { data, error } = await table("availability_slots")
    .select("*")
    .eq("doctor_id", doctorProfileId)
    .eq("is_active", true)
    .order("day_of_week")
    .order("start_time");

  if (error) throw error;
  return data ?? [];
}

export interface SlotAvailability {
  booked: string[];   // HH:MM — occupied by a patient appointment
  blocked: string[];  // HH:MM — doctor has marked off / unavailable
}

/**
 * Returns sets of "HH:MM" times that are either booked (by another patient)
 * or blocked (doctor marked as off) for a given doctor on a specific date.
 *
 * Uses a SECURITY DEFINER RPC so any authenticated patient can call it
 * without being able to read other patients' full appointment records.
 */
export async function getBookedSlotsForDate(
  doctorProfileId: string,
  date: string,
): Promise<SlotAvailability> {
  const supabase = createClient();
  const { data, error } = await (supabase as any).rpc("get_booked_slots", {
    p_doctor_id: doctorProfileId,
    p_date: date,
  });
  if (error) {
    console.warn("getBookedSlotsForDate error:", error.message);
    return { booked: [], blocked: [] };
  }
  const rows = (data ?? []) as { slot_time: string; is_blocked: boolean }[];
  return {
    booked: rows.filter((r) => !r.is_blocked).map((r) => r.slot_time),
    blocked: rows.filter((r) => r.is_blocked).map((r) => r.slot_time),
  };
}

export async function getPatientPayments(): Promise<PaymentWithDoctor[]> {
  const { data, error } = await table("payments")
    .select(
      `
      *,
      doctor:doctor_profiles!payments_doctor_id_fkey (
        id, specialization,
        profile:profiles!doctor_profiles_user_id_fkey ( full_name )
      ),
      appointment:appointments!payments_appointment_id_fkey ( appointment_type )
    `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PaymentWithDoctor[];
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

export async function bookAppointment(params: {
  doctorProfileId: string;
  scheduledAt: string;
  appointmentType: AppointmentType;
  patientNotes?: string;
  consultationFee: number;
  durationMinutes?: number;
  paymentMethod: PaymentMethod;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: appointment, error: aptError } = await table("appointments")
    .insert({
      patient_id: user.id,
      doctor_id: params.doctorProfileId,
      appointment_type: params.appointmentType,
      status: "pending_payment",
      scheduled_at: params.scheduledAt,
      duration_minutes: params.durationMinutes ?? 30,
      patient_notes: params.patientNotes?.trim() || null,
      consultation_fee: params.consultationFee,
    } as Database["public"]["Tables"]["appointments"]["Insert"])
    .select(APPOINTMENT_SELECT)
    .single();

  if (aptError) {
    if (aptError.code === "23505") {
      throw new Error(
        "This slot was just booked by another patient. Please choose a different time.",
      );
    }
    if (
      aptError.code === "P0001" &&
      aptError.message?.includes("SLOT_BLOCKED")
    ) {
      // Notify admins of the failed attempt for visibility
      await safeNotify(async () => {
        const scheduledDate = new Date(params.scheduledAt).toLocaleString("en-PK", {
          weekday: "short", day: "numeric", month: "short",
          hour: "2-digit", minute: "2-digit",
        });
        await notifyAllAdmins(
          "Booking blocked — doctor unavailable",
          `A patient attempted to book an appointment with doctor (ID: ${params.doctorProfileId}) on ${scheduledDate}, but the slot is marked as off by the doctor. No booking was created.`,
          "appointment",
          { doctor_id: params.doctorProfileId, scheduled_at: params.scheduledAt }
        );
      });
      throw new Error(
        "This doctor is unavailable at the selected time. Please choose a different slot."
      );
    }
    if (
      aptError.code === "P0001" &&
      aptError.message?.includes("SLOT_OUTSIDE_HOURS")
    ) {
      throw new Error(
        "The selected time is outside the doctor's working hours. Please choose another slot."
      );
    }
    throw aptError;
  }

  const booked = appointment as AppointmentWithDoctor;
  const platformFee = Math.round(params.consultationFee * 0.1 * 100) / 100;
  const doctorEarning = params.consultationFee - platformFee;

  const { data: payment, error: payError } = await table("payments")
    .insert({
      appointment_id: booked.id,
      patient_id: user.id,
      doctor_id: params.doctorProfileId,
      amount: params.consultationFee,
      platform_fee: platformFee,
      doctor_earning: doctorEarning,
      payment_method: params.paymentMethod,
      status: "pending",
    } as Database["public"]["Tables"]["payments"]["Insert"])
    .select("id")
    .single();

  if (payError) {
    await table("appointments").delete().eq("id", booked.id);
    throw payError;
  }

  const doctorUserId = booked.doctor?.user_id;
  const doctorName = booked.doctor?.profile?.full_name ?? "your doctor";
  const dateStr = new Date(params.scheduledAt).toLocaleString("en-PK", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
  const typeLabel = params.appointmentType.replace("_", " ");

  // ── In-app: notify doctor ────────────────────────────────────
  await safeNotify(async () => {
    if (!doctorUserId) return;
    await createNotification(
      doctorUserId,
      "New appointment booking",
      `A patient booked a ${typeLabel} session on ${dateStr}. Awaiting payment confirmation.`,
      "appointment",
      { appointment_id: booked.id }
    );
  });

  // ── In-app: confirm to patient ───────────────────────────────
  await safeNotify(async () => {
    await createNotification(
      user.id,
      "Appointment booked",
      `Your ${typeLabel} appointment with ${doctorName} is scheduled for ${dateStr}. Please complete payment to confirm.`,
      "appointment",
      { appointment_id: booked.id }
    );
  });

  // ── Chat: post a system-style confirmation in the thread ─────
  await safeNotify(async () => {
    if (!doctorUserId) return;
    const conversationId = await getOrCreateConversation(user.id, doctorUserId);
    await sendMessage({
      conversationId,
      senderId: user.id,
      body: `📅 Appointment Booked\n\nHello Dr. ${doctorName.split(" ")[0]}, I've scheduled a ${typeLabel} consultation for ${dateStr}. Payment is being processed — looking forward to the session!`,
    });
  });

  // ── Email: fire-and-forget to both parties ───────────────────
  await safeNotify(async () => {
    await fetch("/api/appointments/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId: booked.id,
        patientId: user.id,
        doctorProfileId: params.doctorProfileId,
        scheduledAt: params.scheduledAt,
        appointmentType: params.appointmentType,
        consultationFee: params.consultationFee,
        patientNotes: params.patientNotes ?? "",
      }),
    });
  });

  return { appointment: booked, paymentId: (payment as { id: string }).id };
}

async function safeNotify(fn: () => Promise<void>) {
  try { await fn(); } catch (err) { console.warn("Notification skipped:", err); }
}

export async function submitPaymentProof(paymentId: string, file: File) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: payment, error: fetchError } = await table("payments")
    .select("id, patient_id, status, appointment_id, amount")
    .eq("id", paymentId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!payment) throw new Error("Payment not found");
  if ((payment as { patient_id: string }).patient_id !== user.id) {
    throw new Error("Not authorized");
  }
  if ((payment as { status: string }).status !== "pending") {
    throw new Error("This payment can no longer be updated");
  }

  const proofUrl = await uploadPaymentProof(user.id, paymentId, file);

  const { error: updateError } = await table("payments")
    .update({
      proof_url: proofUrl,
      rejection_reason: null,
    } as Database["public"]["Tables"]["payments"]["Update"])
    .eq("id", paymentId);

  if (updateError) throw updateError;

  const amount = Number((payment as { amount: number }).amount);
  await safeNotify(() => createNotification(
    user.id,
    "Payment proof submitted",
    `Your payment of PKR ${Math.round(amount).toLocaleString("en-PK")} is under review. We will notify you once admin confirms your booking.`,
    "payment",
    { payment_id: paymentId }
  ));
  await safeNotify(() => notifyAllAdmins(
    "Payment proof to review",
    `A patient submitted a payment screenshot (PKR ${Math.round(amount).toLocaleString("en-PK")}). Approve to confirm the booking.`,
    "payment",
    { payment_id: paymentId, appointment_id: (payment as { appointment_id: string }).appointment_id }
  ));

  return proofUrl;
}

export async function getPatientPaymentById(paymentId: string): Promise<PaymentWithDoctor | null> {
  const { data, error } = await table("payments")
    .select(
      `
      *,
      doctor:doctor_profiles!payments_doctor_id_fkey (
        id, specialization,
        profile:profiles!doctor_profiles_user_id_fkey ( full_name )
      ),
      appointment:appointments!payments_appointment_id_fkey ( appointment_type )
    `
    )
    .eq("id", paymentId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as PaymentWithDoctor | null;
}

export async function cancelPatientAppointment(
  appointmentId: string,
  reason?: string
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data, error } = await table("appointments")
    .update({
      status: "cancelled" as AppointmentStatus,
      cancellation_reason: reason?.trim() || "Cancelled by patient",
      cancelled_by: user.id,
    } as Database["public"]["Tables"]["appointments"]["Update"])
    .eq("id", appointmentId)
    .select(APPOINTMENT_SELECT)
    .single();

  if (error) throw error;
  const cancelled = data as AppointmentWithDoctor;

  await initiateRefundForCancelledAppointment({
    appointmentId,
    cancelledBy: "patient",
    cancellationReason: reason?.trim() || "Cancelled by patient",
  }).catch(() => {});

  // Notify the doctor the appointment was cancelled
  await safeNotify(async () => {
    const doctorUserId = cancelled.doctor?.user_id;
    if (doctorUserId) {
      await createNotification(
        doctorUserId,
        "Appointment cancelled",
        `A patient cancelled their appointment scheduled for ${new Date(cancelled.scheduled_at).toLocaleString("en-PK", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.`,
        "appointment",
        { appointment_id: cancelled.id }
      );
    }
  });

  return cancelled;
}

export async function submitAppointmentReview(
  appointmentId: string,
  doctorProfileId: string,
  rating: number,
  comment?: string
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: existing } = await table("reviews")
    .select("id")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await table("reviews")
      .update({
        rating,
        comment: comment?.trim() || null,
      } as Database["public"]["Tables"]["reviews"]["Update"])
      .eq("appointment_id", appointmentId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await table("reviews")
    .insert({
      appointment_id: appointmentId,
      patient_id: user.id,
      doctor_id: doctorProfileId,
      rating,
      comment: comment?.trim() || null,
    } as Database["public"]["Tables"]["reviews"]["Insert"])
    .select()
    .single();

  if (error) throw error;
  return data;
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

export function buildPrescriptions(
  appointments: AppointmentWithDoctor[]
): PatientPrescription[] {
  return appointments
    .filter((apt) => apt.status === "completed")
    .map((apt) => {
      const parsed = parseClinicalNotes(apt.doctor_notes);
      const doctorName = apt.doctor?.profile?.full_name ?? "Doctor";
      return {
        id: apt.id,
        appointmentId: apt.id,
        doctorName,
        specialization: apt.doctor?.specialization ?? "Specialist",
        date: apt.completed_at ?? apt.scheduled_at,
        clinicalNote: parsed.clinicalNote,
        prescription: parsed.prescription,
        prescriptionUrl: apt.prescription_url,
      };
    })
    .filter(
      (item) =>
        item.prescription ||
        item.clinicalNote ||
        item.prescriptionUrl
    );
}

export function getRecentDoctors(appointments: AppointmentWithDoctor[]) {
  const byDoctor = new Map<
    string,
    {
      doctorProfileId: string;
      name: string;
      specialization: string;
      rating: number;
      sessions: number;
      lastVisit: string;
      avatarUrl: string | null;
    }
  >();

  for (const apt of appointments) {
    if (!apt.doctor) continue;
    const id = apt.doctor_id;
    const visitDate = apt.completed_at ?? apt.scheduled_at;
    const existing = byDoctor.get(id);

    if (!existing) {
      byDoctor.set(id, {
        doctorProfileId: id,
        name: apt.doctor.profile?.full_name ?? "Doctor",
        specialization: apt.doctor.specialization,
        rating: Number(apt.doctor.rating) || 0,
        sessions: apt.status === "completed" ? 1 : 0,
        lastVisit: visitDate,
        avatarUrl: apt.doctor.profile?.avatar_url ?? null,
      });
      continue;
    }

    if (apt.status === "completed") {
      existing.sessions += 1;
    }
    if (new Date(visitDate).getTime() > new Date(existing.lastVisit).getTime()) {
      existing.lastVisit = visitDate;
    }
    if (apt.doctor.profile?.avatar_url) {
      existing.avatarUrl = apt.doctor.profile.avatar_url;
    }
  }

  return Array.from(byDoctor.values()).sort(
    (a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime()
  );
}

export { signOut } from "@/lib/auth/session";
