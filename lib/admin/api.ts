import { createClient } from "@/lib/supabase/client";
import type { AppointmentStatus, DoctorStatus, Profile } from "@/types";
import type { Database } from "@/types/database";
import type {
  AdminAppointment,
  AdminDoctor,
  AdminPatientSummary,
  AdminPayment,
  AdminStats,
} from "./types";

type TableName = keyof Database["public"]["Tables"];

function table(name: TableName) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient().from(name) as any;
}

export type AdminContextFailureReason =
  | "not_signed_in"
  | "profile_missing"
  | "wrong_role"
  | "unknown";

export type AdminContextResult =
  | { ok: true; data: { profile: Profile } }
  | { ok: false; reason: AdminContextFailureReason; message: string };

const DOCTOR_ADMIN_SELECT = `
  *,
  profile:profiles!doctor_profiles_user_id_fkey (
    id, full_name, email, phone, city, avatar_url, is_active, created_at
  )
`;

const APPOINTMENT_ADMIN_SELECT = `
  *,
  patient:profiles!appointments_patient_id_fkey ( id, full_name, email, phone, city, avatar_url ),
  doctor:doctor_profiles!appointments_doctor_id_fkey (
    id, specialization,
    profile:profiles!doctor_profiles_user_id_fkey ( full_name, avatar_url )
  )
`;

const PAYMENT_ADMIN_SELECT = `
  *,
  patient:profiles!payments_patient_id_fkey ( id, full_name ),
  doctor:doctor_profiles!payments_doctor_id_fkey (
    id, user_id, specialization,
    profile:profiles!doctor_profiles_user_id_fkey ( full_name )
  ),
  appointment:appointments!payments_appointment_id_fkey ( appointment_type )
`;

export async function getAdminContext(): Promise<AdminContextResult> {
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
      message: "You are not signed in. Please log in with an admin account.",
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

  const typedProfile = profile as Profile;
  if (typedProfile.role !== "admin" && typedProfile.role !== "super_admin") {
    return {
      ok: false,
      reason: "wrong_role",
      message: `This portal is for administrators only. Your account role is "${typedProfile.role}".`,
    };
  }

  return { ok: true, data: { profile: typedProfile } };
}

export async function getAdminDoctors(): Promise<AdminDoctor[]> {
  const { data, error } = await table("doctor_profiles")
    .select(DOCTOR_ADMIN_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AdminDoctor[];
}

export async function getAdminPatients(): Promise<Profile[]> {
  const { data, error } = await table("profiles")
    .select("*")
    .eq("role", "patient")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function getAdminStaff(): Promise<Profile[]> {
  const { data, error } = await table("profiles")
    .select("*")
    .in("role", ["admin", "super_admin"])
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function getAdminAppointments(): Promise<AdminAppointment[]> {
  const { data, error } = await table("appointments")
    .select(APPOINTMENT_ADMIN_SELECT)
    .order("scheduled_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AdminAppointment[];
}

export async function getAdminPayments(): Promise<AdminPayment[]> {
  const { data, error } = await table("payments")
    .select(PAYMENT_ADMIN_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AdminPayment[];
}

// --- Doctor verification actions ---

async function setDoctorStatus(
  doctorProfileId: string,
  updates: Partial<{
    status: DoctorStatus;
    approved_by: string | null;
    approved_at: string | null;
    rejection_reason: string | null;
    is_available: boolean;
  }>
) {
  const { data, error } = await table("doctor_profiles")
    .update(updates as Database["public"]["Tables"]["doctor_profiles"]["Update"])
    .eq("id", doctorProfileId)
    .select(DOCTOR_ADMIN_SELECT)
    .single();

  if (error) throw error;
  return data as AdminDoctor;
}

export function approveDoctor(doctorProfileId: string, adminId: string) {
  return setDoctorStatus(doctorProfileId, {
    status: "approved",
    approved_by: adminId,
    approved_at: new Date().toISOString(),
    rejection_reason: null,
    is_available: true,
  });
}

export function rejectDoctor(doctorProfileId: string, reason?: string) {
  return setDoctorStatus(doctorProfileId, {
    status: "rejected",
    rejection_reason: reason?.trim() || "Application did not meet verification requirements.",
    is_available: false,
  });
}

export function suspendDoctor(doctorProfileId: string, reason?: string) {
  return setDoctorStatus(doctorProfileId, {
    status: "suspended",
    rejection_reason: reason?.trim() || "Account suspended by administrator.",
    is_available: false,
  });
}

export function reinstateDoctor(doctorProfileId: string, adminId: string) {
  return setDoctorStatus(doctorProfileId, {
    status: "approved",
    approved_by: adminId,
    approved_at: new Date().toISOString(),
    rejection_reason: null,
    is_available: true,
  });
}

// --- Patient account actions ---

export async function setProfileActive(userId: string, isActive: boolean): Promise<Profile> {
  const { data, error } = await table("profiles")
    .update({ is_active: isActive } as Database["public"]["Tables"]["profiles"]["Update"])
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

// --- Appointment actions ---

export async function updateAppointmentStatusAdmin(
  appointmentId: string,
  status: AppointmentStatus,
  reason?: string
) {
  const updates: Record<string, unknown> = { status };
  if (status === "cancelled") {
    updates.cancellation_reason = reason?.trim() || "Cancelled by administrator.";
  }
  if (status === "completed") {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await table("appointments")
    .update(updates as Database["public"]["Tables"]["appointments"]["Update"])
    .eq("id", appointmentId)
    .select(APPOINTMENT_ADMIN_SELECT)
    .single();

  if (error) throw error;
  return data as AdminAppointment;
}

// --- Doctor payout / settlement actions ---

/** Best-effort notification to the doctor when a payout is cleared. Never throws. */
async function notifyDoctorPayout(doctorUserId: string, amount: number, reference: string) {
  try {
    await table("notifications").insert({
      user_id: doctorUserId,
      title: "Payout cleared",
      message: `A payout of PKR ${Math.round(amount).toLocaleString(
        "en-PK"
      )} has been settled to your account (Ref ${reference}).`,
      type: "payment",
    } as Database["public"]["Tables"]["notifications"]["Insert"]);
  } catch (err) {
    console.warn("Doctor payout notification skipped:", err);
  }
}

function payoutReference() {
  return `PO-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

/** Mark a single payment as settled/cleared to the doctor. */
export async function markPaymentPaid(
  paymentId: string,
  adminId: string,
  options?: { reference?: string; notifyDoctorUserId?: string }
): Promise<AdminPayment> {
  const reference = options?.reference?.trim() || payoutReference();
  const { data, error } = await table("payments")
    .update({
      payout_status: "paid",
      paid_at: new Date().toISOString(),
      paid_by: adminId,
      payout_reference: reference,
    } as Database["public"]["Tables"]["payments"]["Update"])
    .eq("id", paymentId)
    .select(PAYMENT_ADMIN_SELECT)
    .single();

  if (error) throw error;
  const payment = data as AdminPayment;
  if (options?.notifyDoctorUserId) {
    await notifyDoctorPayout(
      options.notifyDoctorUserId,
      Number(payment.doctor_earning),
      reference
    );
  }
  return payment;
}

/** Revert a settlement back to pending (correction / clawback). */
export async function markPaymentPending(paymentId: string): Promise<AdminPayment> {
  const { data, error } = await table("payments")
    .update({
      payout_status: "pending",
      paid_at: null,
      paid_by: null,
      payout_reference: null,
    } as Database["public"]["Tables"]["payments"]["Update"])
    .eq("id", paymentId)
    .select(PAYMENT_ADMIN_SELECT)
    .single();

  if (error) throw error;
  return data as AdminPayment;
}

/**
 * Settle every outstanding (completed + pending) payment for one doctor in a
 * single batch. Returns the updated rows and the shared payout reference.
 */
export async function settleDoctorPayments(
  doctorProfileId: string,
  adminId: string,
  options?: { notifyDoctorUserId?: string }
): Promise<{ updated: AdminPayment[]; reference: string; total: number }> {
  const reference = payoutReference();
  const { data, error } = await table("payments")
    .update({
      payout_status: "paid",
      paid_at: new Date().toISOString(),
      paid_by: adminId,
      payout_reference: reference,
    } as Database["public"]["Tables"]["payments"]["Update"])
    .eq("doctor_id", doctorProfileId)
    .eq("status", "completed")
    .eq("payout_status", "pending")
    .select(PAYMENT_ADMIN_SELECT);

  if (error) throw error;
  const updated = (data ?? []) as AdminPayment[];
  const total = updated.reduce((sum, p) => sum + Number(p.doctor_earning), 0);
  if (options?.notifyDoctorUserId && total > 0) {
    await notifyDoctorPayout(options.notifyDoctorUserId, total, reference);
  }
  return { updated, reference, total };
}

// --- Aggregation helpers (pure) ---

/** A completed payment is "earned" by the doctor and eligible for settlement. */
function isEarned(p: AdminPayment) {
  return p.status === "completed";
}

export interface DoctorPayoutSummary {
  doctorId: string;
  name: string;
  specialization: string;
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  paidCount: number;
  pendingCount: number;
  lastPaidAt: string | null;
}

/** Per-doctor settlement rollup used by the admin payouts view. */
export function buildDoctorPayoutSummaries(
  payments: AdminPayment[]
): DoctorPayoutSummary[] {
  const map = new Map<string, DoctorPayoutSummary>();

  for (const p of payments) {
    if (!isEarned(p) || !p.doctor_id) continue;
    const key = p.doctor_id;
    const existing =
      map.get(key) ??
      ({
        doctorId: key,
        name: p.doctor?.profile?.full_name ?? "Doctor",
        specialization: p.doctor?.specialization ?? "—",
        totalEarned: 0,
        totalPaid: 0,
        totalPending: 0,
        paidCount: 0,
        pendingCount: 0,
        lastPaidAt: null,
      } as DoctorPayoutSummary);

    const earning = Number(p.doctor_earning);
    existing.totalEarned += earning;
    if (p.payout_status === "paid") {
      existing.totalPaid += earning;
      existing.paidCount += 1;
      if (p.paid_at && (!existing.lastPaidAt || p.paid_at > existing.lastPaidAt)) {
        existing.lastPaidAt = p.paid_at;
      }
    } else {
      existing.totalPending += earning;
      existing.pendingCount += 1;
    }
    map.set(key, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.totalPending - a.totalPending);
}

export interface PayoutTotals {
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  commission: number;
  grossVolume: number;
}

/** Platform-wide settlement totals across the supplied payments. */
export function buildPayoutTotals(payments: AdminPayment[]): PayoutTotals {
  let totalEarned = 0;
  let totalPaid = 0;
  let totalPending = 0;
  let commission = 0;
  let grossVolume = 0;

  for (const p of payments) {
    if (!isEarned(p)) continue;
    const earning = Number(p.doctor_earning);
    totalEarned += earning;
    grossVolume += Number(p.amount);
    commission += Number(p.platform_fee);
    if (p.payout_status === "paid") totalPaid += earning;
    else totalPending += earning;
  }

  return { totalEarned, totalPaid, totalPending, commission, grossVolume };
}

function isSameMonth(date: Date, ref: Date) {
  return date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth();
}

function isSameDay(date: Date, ref: Date) {
  return (
    date.getFullYear() === ref.getFullYear() &&
    date.getMonth() === ref.getMonth() &&
    date.getDate() === ref.getDate()
  );
}

export function buildAdminStats(
  doctors: AdminDoctor[],
  patients: Profile[],
  appointments: AdminAppointment[],
  payments: AdminPayment[]
): AdminStats {
  const now = new Date();

  const completedPayments = payments.filter((p) => p.status === "completed");
  const monthlyPlatformRevenue = completedPayments
    .filter((p) => isSameMonth(new Date(p.created_at), now))
    .reduce((sum, p) => sum + Number(p.platform_fee), 0);

  const grossVolume = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Doctor settlement (platform -> doctor) totals, derived from completed payments.
  const totalDoctorEarnings = completedPayments.reduce(
    (sum, p) => sum + Number(p.doctor_earning),
    0
  );
  const totalPaidOut = completedPayments
    .filter((p) => p.payout_status === "paid")
    .reduce((sum, p) => sum + Number(p.doctor_earning), 0);
  const pendingPayouts = completedPayments
    .filter((p) => p.payout_status !== "paid")
    .reduce((sum, p) => sum + Number(p.doctor_earning), 0);

  const activeDoctors = doctors.filter((d) => d.status === "approved").length;
  const pendingDoctors = doctors.filter((d) => d.status === "pending").length;

  const todays = appointments.filter((a) => isSameDay(new Date(a.scheduled_at), now));
  const appointmentsTodayCompleted = todays.filter((a) => a.status === "completed").length;
  const appointmentsTodayUpcoming = todays.filter(
    (a) => a.status === "scheduled" || a.status === "ongoing"
  ).length;

  const newPatientsThisMonth = patients.filter((p) =>
    isSameMonth(new Date(p.created_at), now)
  ).length;
  const newDoctorsThisMonth = doctors.filter((d) =>
    isSameMonth(new Date(d.created_at), now)
  ).length;

  const ratedDoctors = doctors.filter((d) => Number(d.total_reviews) > 0);
  const avgRating =
    ratedDoctors.length > 0
      ? ratedDoctors.reduce((sum, d) => sum + Number(d.rating), 0) / ratedDoctors.length
      : 0;
  const totalReviews = doctors.reduce((sum, d) => sum + Number(d.total_reviews), 0);

  return {
    monthlyPlatformRevenue,
    grossVolume,
    pendingPayouts,
    totalDoctorEarnings,
    totalPaidOut,
    activeDoctors,
    pendingDoctors,
    totalPatients: patients.length,
    appointmentsToday: todays.length,
    appointmentsTodayCompleted,
    appointmentsTodayUpcoming,
    newPatientsThisMonth,
    newDoctorsThisMonth,
    avgRating,
    totalReviews,
  };
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Revenue (platform fee) and gross volume per month for the last `months` months. */
export function revenueByMonth(payments: AdminPayment[], months = 6) {
  const now = new Date();
  const buckets: Array<{ month: string; revenue: number; volume: number }> = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ month: MONTH_LABELS[d.getMonth()], revenue: 0, volume: 0 });
  }

  const earliest = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  for (const p of payments) {
    if (p.status !== "completed") continue;
    const created = new Date(p.created_at);
    if (created < earliest) continue;
    const index =
      (created.getFullYear() - earliest.getFullYear()) * 12 +
      (created.getMonth() - earliest.getMonth());
    if (index < 0 || index >= buckets.length) continue;
    buckets[index].revenue += Number(p.platform_fee);
    buckets[index].volume += Number(p.amount);
  }

  return buckets;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Appointment counts for each day in the trailing 7 days. */
export function appointmentsByDay(appointments: AdminAppointment[]) {
  const now = new Date();
  const buckets: Array<{ day: string; count: number }> = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    buckets.push({ day: WEEKDAY_LABELS[d.getDay()], count: 0 });
  }

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - 6);

  for (const a of appointments) {
    const scheduled = new Date(a.scheduled_at);
    if (scheduled < start) continue;
    const diffDays = Math.floor(
      (scheduled.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (diffDays < 0 || diffDays >= buckets.length) continue;
    if (a.status === "cancelled") continue;
    buckets[diffDays].count += 1;
  }

  return buckets;
}

/** Monthly patient registration counts for the last `months` months. */
export function registrationByMonth(patients: Profile[], months = 6) {
  const now = new Date();
  const buckets: Array<{ month: string; count: number }> = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ month: MONTH_LABELS[d.getMonth()], count: 0 });
  }

  const earliest = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  for (const p of patients) {
    const created = new Date(p.created_at);
    if (created < earliest) continue;
    const index =
      (created.getFullYear() - earliest.getFullYear()) * 12 +
      (created.getMonth() - earliest.getMonth());
    if (index < 0 || index >= buckets.length) continue;
    buckets[index].count += 1;
  }

  return buckets;
}

/** Per-patient activity summary, combining profile + appointment + payment data. */
export function buildPatientSummaries(
  patients: Profile[],
  appointments: AdminAppointment[],
  payments: AdminPayment[]
): AdminPatientSummary[] {
  const now = Date.now();

  return patients.map((profile) => {
    const patientAppointments = appointments.filter((a) => a.patient_id === profile.id);
    const patientPayments = payments.filter(
      (p) => p.patient_id === profile.id && p.status === "completed"
    );

    const upcoming = patientAppointments.filter(
      (a) =>
        (a.status === "scheduled" || a.status === "ongoing") &&
        new Date(a.scheduled_at).getTime() >= now
    ).length;
    const completed = patientAppointments.filter((a) => a.status === "completed").length;
    const totalSpent = patientPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    const sortedByDate = [...patientAppointments].sort(
      (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
    );
    const lastActivity = sortedByDate[0]?.scheduled_at ?? null;

    const doctorCounts = new Map<string, number>();
    for (const a of patientAppointments) {
      const name = a.doctor?.profile?.full_name;
      if (!name) continue;
      doctorCounts.set(name, (doctorCounts.get(name) ?? 0) + 1);
    }
    let preferredDoctor: string | null = null;
    let max = 0;
    for (const [name, count] of doctorCounts) {
      if (count > max) {
        max = count;
        preferredDoctor = name;
      }
    }

    return {
      profile,
      totalAppointments: patientAppointments.length,
      upcomingAppointments: upcoming,
      completedAppointments: completed,
      totalSpent,
      lastActivity,
      preferredDoctor,
    };
  });
}

export function topDoctors(
  doctors: AdminDoctor[],
  payments: AdminPayment[],
  appointments: AdminAppointment[],
  limit = 5
) {
  return doctors
    .map((doctor) => {
      const earnings = payments
        .filter((p) => p.doctor_id === doctor.id && p.status === "completed")
        .reduce((sum, p) => sum + Number(p.doctor_earning), 0);
      const consultations = appointments.filter(
        (a) => a.doctor_id === doctor.id && a.status === "completed"
      ).length;
      return {
        id: doctor.id,
        name: doctor.profile?.full_name ?? "Doctor",
        specialization: doctor.specialization,
        rating: Number(doctor.rating) || 0,
        consultations,
        earnings,
      };
    })
    .sort((a, b) => b.earnings - a.earnings || b.consultations - a.consultations)
    .slice(0, limit);
}

export function buildRecentActivity(
  appointments: AdminAppointment[],
  payments: AdminPayment[],
  patients: Profile[],
  doctors: AdminDoctor[],
  limit = 6
) {
  type Activity = { id: string; text: string; type: string; at: number };
  const events: Activity[] = [];

  for (const a of appointments) {
    events.push({
      id: `apt-${a.id}`,
      type: "appointment",
      at: new Date(a.created_at).getTime(),
      text: `Appointment booked: ${a.patient?.full_name ?? "Patient"} with ${
        a.doctor?.profile?.full_name ?? "Doctor"
      }`,
    });
  }
  for (const p of payments) {
    if (p.status !== "completed") continue;
    events.push({
      id: `pay-${p.id}`,
      type: "payment",
      at: new Date(p.created_at).getTime(),
      text: `Payment received — PKR ${Number(p.amount).toLocaleString("en-PK")}`,
    });
  }
  for (const pt of patients) {
    events.push({
      id: `pat-${pt.id}`,
      type: "user",
      at: new Date(pt.created_at).getTime(),
      text: `New patient registered: ${pt.full_name}`,
    });
  }
  for (const d of doctors) {
    events.push({
      id: `doc-${d.id}`,
      type: "doctor",
      at: new Date(d.created_at).getTime(),
      text: `Doctor ${d.status === "approved" ? "verified" : "applied"}: ${
        d.profile?.full_name ?? "Doctor"
      }`,
    });
  }

  return events.sort((a, b) => b.at - a.at).slice(0, limit);
}

export { signOut } from "@/lib/auth/session";
