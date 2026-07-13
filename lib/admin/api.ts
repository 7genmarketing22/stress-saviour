import { createClient } from "@/lib/supabase/client";
import type { AdminPermissions, Profile, UserRole, AppointmentStatus, DoctorStatus } from "@/types";
import type { AdminStaffMember } from "./staff-types";
import type { Database } from "@/types/database";
import type {
  AdminAppointment,
  AdminDoctor,
  AdminPatientSummary,
  AdminPayment,
  AdminStats,
} from "./types";
import { createNotification } from "@/lib/notifications/api";
import { initiateRefundForCancelledAppointment } from "@/lib/refunds/process";
import {
  attachTaxonomyToDoctor,
  DOCTOR_TAXONOMY_SELECT,
} from "@/lib/doctor/taxonomy";

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
  ),
  ${DOCTOR_TAXONOMY_SELECT}
`;

const APPOINTMENT_ADMIN_SELECT = `
  *,
  patient:profiles!appointments_patient_id_fkey ( id, full_name, email, phone, city, avatar_url ),
  doctor:doctor_profiles!appointments_doctor_id_fkey (
    id, specialization,
    profile:profiles!doctor_profiles_user_id_fkey ( full_name, avatar_url )
  ),
  payments (
    id, status, amount, refund_status, refund_amount,
    refund_initiated_at, refund_processed_at, refund_note, refund_id, refunded_at
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
  return ((data ?? []) as Record<string, unknown>[]).map((row) =>
    attachTaxonomyToDoctor(row),
  ) as unknown as AdminDoctor[];
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

export async function getAdminStaffDetailed(): Promise<{
  staff: AdminStaffMember[];
  canManage: boolean;
}> {
  const response = await fetch("/api/admin/staff", { method: "GET" });
  const payload = (await response.json()) as {
    staff?: AdminStaffMember[];
    canManage?: boolean;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load staff");
  }
  return { staff: payload.staff ?? [], canManage: Boolean(payload.canManage) };
}

export async function createAdminStaffMember(input: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: "admin" | "super_admin";
  accessPreset: "full" | "operations" | "finance" | "support" | "custom";
  permissions?: Partial<AdminPermissions>;
}) {
  const response = await fetch("/api/admin/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as { staff?: AdminStaffMember; error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to create staff member");
  }
  return payload.staff!;
}

export async function updateAdminStaffMember(
  userId: string,
  input: {
    fullName?: string;
    phone?: string | null;
    role?: Extract<UserRole, "admin" | "super_admin">;
    isActive?: boolean;
    accessPreset?: "full" | "operations" | "finance" | "support" | "custom";
    permissions?: Partial<AdminPermissions>;
  }
) {
  const response = await fetch(`/api/admin/staff/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as { staff?: AdminStaffMember; error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to update staff member");
  }
  return payload.staff!;
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

// --- Admin doctor profile editor ---

export async function adminUpdateDoctorProfile(
  doctorProfileId: string,
  profileUserId: string,
  profileUpdates: {
    full_name?: string;
    phone?: string | null;
    city?: string | null;
  },
  doctorUpdates: {
    specialization?: string;
    qualification?: string[];
    bio?: string | null;
    experience_years?: number;
    consultation_fee?: number;
    follow_up_fee?: number | null;
    pmdc_number?: string;
    is_available?: boolean;
  }
) {
  const hasProfileChanges = Object.keys(profileUpdates).length > 0;
  const hasDoctorChanges = Object.keys(doctorUpdates).length > 0;

  let updatedProfile = null;
  let updatedDoctor = null;

  if (hasProfileChanges) {
    const { data, error } = await table("profiles")
      .update(profileUpdates as Database["public"]["Tables"]["profiles"]["Update"])
      .eq("id", profileUserId)
      .select()
      .single();
    if (error) throw error;
    updatedProfile = data;
  }

  if (hasDoctorChanges) {
    const { data, error } = await table("doctor_profiles")
      .update(doctorUpdates as Database["public"]["Tables"]["doctor_profiles"]["Update"])
      .eq("id", doctorProfileId)
      .select(DOCTOR_ADMIN_SELECT)
      .single();
    if (error) throw error;
    updatedDoctor = data as AdminDoctor;
  }

  return { updatedProfile, updatedDoctor };
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
  }).then(async (doctor) => {
    const userId = doctor.profile?.id ?? doctor.user_id;
    if (userId) {
      await table("profiles")
        .update({
          account_status: "approved",
          is_active: true,
          approved_by: adminId,
          approved_at: new Date().toISOString(),
          rejection_reason: null,
        } as Database["public"]["Tables"]["profiles"]["Update"])
        .eq("id", userId);

      // In-app notification
      await safeNotify(() => createNotification(
        userId,
        "Account approved",
        "Congratulations! Your doctor profile has been verified and approved. You can now accept patient bookings.",
        "approval"
      ));

      // Email notification
      const doctorEmail = doctor.profile?.email;
      const doctorName = doctor.profile?.full_name ?? "Doctor";
      if (doctorEmail) {
        await safeNotify(() =>
          fetch("/api/admin/notify-doctor-approved", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ doctorEmail, doctorName, action: "approved" }),
          }).then(() => undefined)
        );
      }
    }
    return doctor;
  });
}

export function rejectDoctor(doctorProfileId: string, reason?: string) {
  const rejectionReason =
    reason?.trim() || "Application did not meet verification requirements.";

  return setDoctorStatus(doctorProfileId, {
    status: "rejected",
    rejection_reason: rejectionReason,
    is_available: false,
  }).then(async (doctor) => {
    const userId = doctor.profile?.id ?? doctor.user_id;
    if (userId) {
      await table("profiles")
        .update({
          account_status: "rejected",
          is_active: false,
          rejection_reason: rejectionReason,
        } as Database["public"]["Tables"]["profiles"]["Update"])
        .eq("id", userId);

      // In-app notification
      await safeNotify(() => createNotification(
        userId,
        "Application not approved",
        `Your doctor registration was not approved: ${rejectionReason}. Contact support if you believe this is an error.`,
        "approval"
      ));

      // Email notification
      const doctorEmail = doctor.profile?.email;
      const doctorName = doctor.profile?.full_name ?? "Doctor";
      if (doctorEmail) {
        await safeNotify(() =>
          fetch("/api/admin/notify-doctor-approved", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ doctorEmail, doctorName, action: "rejected", rejectionReason }),
          }).then(() => undefined)
        );
      }
    }
    return doctor;
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

export async function approvePatient(userId: string, adminId: string): Promise<Profile> {
  const { data, error } = await table("profiles")
    .update({
      account_status: "approved",
      is_active: true,
      approved_by: adminId,
      approved_at: new Date().toISOString(),
      rejection_reason: null,
    } as Database["public"]["Tables"]["profiles"]["Update"])
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  await safeNotify(() => createNotification(
    userId,
    "Account approved",
    "Your patient account has been approved. You can now browse doctors and book appointments.",
    "approval"
  ));
  return data as Profile;
}

export async function rejectPatient(
  userId: string,
  reason?: string
): Promise<Profile> {
  const rejectionReason =
    reason?.trim() || "Registration could not be verified at this time.";

  const { data, error } = await table("profiles")
    .update({
      account_status: "rejected",
      is_active: false,
      rejection_reason: rejectionReason,
    } as Database["public"]["Tables"]["profiles"]["Update"])
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  await safeNotify(() => createNotification(
    userId,
    "Registration not approved",
    `Your patient account was not approved: ${rejectionReason}. Contact support for assistance.`,
    "approval"
  ));
  return data as Profile;
}

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
  reason?: string,
  adminId?: string
) {
  const updates: Record<string, unknown> = { status };
  if (status === "cancelled") {
    updates.cancellation_reason = reason?.trim() || "Cancelled by administrator.";
    if (adminId) updates.cancelled_by = adminId;
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
  const appointment = data as AdminAppointment;

  if (status === "cancelled") {
    await initiateRefundForCancelledAppointment({
      appointmentId,
      cancelledBy: "admin",
      cancellationReason: (updates.cancellation_reason as string) ?? "",
    }).catch(() => {});
  }

  return appointment;
}

// --- Doctor payout / settlement actions ---

async function safeNotify(fn: () => Promise<void>) {
  try { await fn(); } catch (err) { console.warn("Notification skipped:", err); }
}

/** Best-effort notification to the doctor when a payout is cleared. Never throws. */
async function notifyDoctorPayout(doctorUserId: string, amount: number, reference: string) {
  await safeNotify(() => createNotification(
    doctorUserId,
    "Payout cleared",
    `A payout of PKR ${Math.round(amount).toLocaleString("en-PK")} has been settled to your account (Ref: ${reference}).`,
    "payout",
    { reference }
  ));
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
  options?: { reference?: string; notifyDoctorUserId?: string; receiptUrl?: string }
): Promise<AdminPayment> {
  const { data: existing, error: fetchErr } = await table("payments")
    .select("id, refund_status, status")
    .eq("id", paymentId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  const row = existing as { id: string; refund_status?: string; status: string } | null;
  if (!row) throw new Error("Payment not found");
  if (row.status !== "completed") throw new Error("Only collected payments can be settled");
  const rs = row.refund_status ?? "not_applicable";
  if (rs !== "not_applicable") {
    throw new Error("Cannot settle a payment with an active or completed refund");
  }

  const reference = options?.reference?.trim() || payoutReference();
  const { data, error } = await table("payments")
    .update({
      payout_status: "paid",
      paid_at: new Date().toISOString(),
      paid_by: adminId,
      payout_reference: reference,
      ...(options?.receiptUrl ? { payout_receipt_url: options.receiptUrl } : {}),
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

// --- Patient payment proof approval ---

async function notifyPatientPayment(
  patientId: string,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
) {
  await safeNotify(() => createNotification(patientId, title, message, "payment", metadata));
}

/** Approve a patient's payment proof and confirm their booking. */
export async function approvePatientPayment(
  paymentId: string,
  adminId: string
): Promise<AdminPayment> {
  const { data: existing, error: fetchError } = await table("payments")
    .select("id, status, proof_url, appointment_id, patient_id, amount")
    .eq("id", paymentId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) throw new Error("Payment not found");
  const row = existing as {
    id: string;
    status: string;
    proof_url: string | null;
    appointment_id: string;
    patient_id: string;
    amount: number;
  };
  if (row.status !== "pending") throw new Error("Only pending payments can be approved");
  if (!row.proof_url) throw new Error("No payment proof uploaded yet");

  const txnId = `TXN-${row.id.slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();

  const { data: payment, error: payError } = await table("payments")
    .update({
      status: "completed",
      transaction_id: txnId,
      reviewed_by: adminId,
      reviewed_at: now,
      rejection_reason: null,
    } as Database["public"]["Tables"]["payments"]["Update"])
    .eq("id", paymentId)
    .select(PAYMENT_ADMIN_SELECT)
    .single();

  if (payError) throw payError;

  const { error: aptError } = await table("appointments")
    .update({ status: "scheduled" } as Database["public"]["Tables"]["appointments"]["Update"])
    .eq("id", row.appointment_id);

  if (aptError) throw aptError;

  await notifyPatientPayment(
    row.patient_id,
    "Booking confirmed",
    `Your payment of PKR ${Math.round(Number(row.amount)).toLocaleString("en-PK")} was approved. Your appointment is now confirmed.`,
    { payment_id: paymentId, appointment_id: row.appointment_id }
  );

  // Also notify the doctor that the appointment is now confirmed
  const aptRow = payment as AdminPayment & { doctor?: { user_id?: string } };
  const doctorUserId = aptRow.doctor?.user_id;
  if (doctorUserId) {
    await safeNotify(() => createNotification(
      doctorUserId,
      "Appointment confirmed",
      `A patient's payment was verified. Your appointment is now confirmed and scheduled.`,
      "appointment",
      { appointment_id: row.appointment_id, payment_id: paymentId }
    ));
  }

  return payment as AdminPayment;
}

/** Reject a patient's payment proof. Booking stays unconfirmed. */
export async function rejectPatientPayment(
  paymentId: string,
  adminId: string,
  reason?: string
): Promise<AdminPayment> {
  const { data: existing, error: fetchError } = await table("payments")
    .select("id, status, patient_id, amount")
    .eq("id", paymentId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) throw new Error("Payment not found");
  const row = existing as { id: string; status: string; patient_id: string; amount: number };
  if (row.status !== "pending") throw new Error("Only pending payments can be rejected");

  const rejectionReason =
    reason?.trim() || "Payment proof could not be verified. Please upload a valid screenshot.";

  const { data: payment, error: payError } = await table("payments")
    .update({
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectionReason,
    } as Database["public"]["Tables"]["payments"]["Update"])
    .eq("id", paymentId)
    .select(PAYMENT_ADMIN_SELECT)
    .single();

  if (payError) throw payError;

  await notifyPatientPayment(
    row.patient_id,
    "Payment rejected",
    `${rejectionReason} You can re-book and submit a new payment proof.`,
    { payment_id: paymentId }
  );

  return payment as AdminPayment;
}

/**
 * Settle every outstanding (completed + pending) payment for one doctor in a
 * single batch. Returns the updated rows and the shared payout reference.
 */
export async function settleDoctorPayments(
  doctorProfileId: string,
  adminId: string,
  options?: { notifyDoctorUserId?: string; receiptUrl?: string }
): Promise<{ updated: AdminPayment[]; reference: string; total: number }> {
  const reference = payoutReference();
  const { data, error } = await table("payments")
    .update({
      payout_status: "paid",
      paid_at: new Date().toISOString(),
      paid_by: adminId,
      payout_reference: reference,
      ...(options?.receiptUrl ? { payout_receipt_url: options.receiptUrl } : {}),
    } as Database["public"]["Tables"]["payments"]["Update"])
    .eq("doctor_id", doctorProfileId)
    .eq("status", "completed")
    .eq("payout_status", "pending")
    .eq("refund_status", "not_applicable")
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
  if (p.status !== "completed") return false;
  const rs = p.refund_status ?? "not_applicable";
  if (rs === "pending" || rs === "processing" || rs === "refunded") return false;
  return true;
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
  const pendingPatients = patients.filter((p) => p.account_status === "pending").length;
  const activePatients = patients.filter(
    (p) => p.is_active && p.account_status === "approved"
  ).length;

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
    pendingPatients,
    totalPatients: patients.length,
    activePatients,
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
      // Single source of truth: a "session" that produces earnings is a paid,
      // non-refunded payment. Deriving both `consultations` and `earnings` from
      // the SAME set guarantees they can never contradict each other
      // (earnings > 0 ⟺ sessions > 0), fixing the "Rs5.4k / 0 sessions" bug.
      const paidPayments = payments.filter((p) => p.doctor_id === doctor.id && isEarned(p));
      const earnings = paidPayments.reduce((sum, p) => sum + Number(p.doctor_earning), 0);
      const consultations = paidPayments.length;
      // Sessions actually held (doctor marked complete) — for reference only.
      const completedSessions = appointments.filter(
        (a) => a.doctor_id === doctor.id && a.status === "completed"
      ).length;
      return {
        id: doctor.id,
        name: doctor.profile?.full_name ?? "Doctor",
        specialization: doctor.specialization,
        rating: Number(doctor.rating) || 0,
        consultations,
        completedSessions,
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
