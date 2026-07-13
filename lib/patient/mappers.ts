import type { AppointmentStatus, PaymentMethod, PaymentStatus, RefundStatus } from "@/types";
import { parseClinicalNotes } from "@/lib/doctor/notes";
import {
  getAppointmentSessionTiming,
  mapTimingToDisplayStatus,
  type AppointmentSessionTiming,
} from "@/lib/appointments/session-timing";
import {
  calcAge,
  formatCurrency,
  formatDate,
  formatTime,
  formatTimeRange,
  getInitials,
  isToday,
  mapAppointmentType,
  timeAgo,
} from "@/lib/doctor/mappers";
import type { AppointmentWithDoctor, DoctorWithProfile, PaymentWithDoctor } from "./types";

export interface PatientUIAppointment {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  doctorPhone: string;
  doctorAvatarUrl: string | null;
  date: string;
  time: string;
  timeRange: string;
  duration: string;
  type: string;
  status: "Confirmed" | "Pending" | "Completed" | "Cancelled" | "No Show" | "Expired / No Show" | "Ready" | "Starting Soon" | "Expired" | "Awaiting Payment" | "Payment Review";
  paymentStatus: PaymentStatus | null;
  paymentId: string | null;
  paymentMethod: PaymentMethod | null;
  paymentProofUrl: string | null;
  paymentRejectionReason: string | null;
  isPaid: boolean;
  reason: string;
  notes: string;
  roomUrl: string;
  prescription: { medication: string; dosage: string } | null;
  rating?: number;
  reviewComment?: string;
  createdAt: string;
  scheduledAt: string;
  consultationFee: number;
  rawStatus: AppointmentStatus;
  timing: AppointmentSessionTiming;
  canJoin: boolean;
  refundStatus: RefundStatus | null;
  refundAmount: number | null;
  refundProcessedAt: string | null;
  cancellationReason: string | null;
}

export function mapPatientStatus(
  status: AppointmentStatus,
  scheduledAt: string,
  payment?: { status: PaymentStatus; proof_url: string | null; rejection_reason?: string | null } | null,
  durationMinutes = 30
): PatientUIAppointment["status"] {
  if (status === "pending_payment") {
    if (!payment) return "Awaiting Payment";
    if (payment.status === "pending" && !payment.proof_url) return "Awaiting Payment";
    if (payment.status === "pending" && payment.proof_url) return "Payment Review";
    if (payment.rejection_reason) return "Awaiting Payment";
    return "Awaiting Payment";
  }
  if (status === "expired_no_show") return "Expired / No Show";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  if (status === "no_show") return "No Show";
  if (status === "ongoing") return "Ready";

  const timing = getAppointmentSessionTiming({
    scheduledAt,
    durationMinutes,
    status,
  });
  return mapTimingToDisplayStatus(status, timing) as PatientUIAppointment["status"];
}

export function mapToPatientAppointment(apt: AppointmentWithDoctor): PatientUIAppointment {
  const parsed = parseClinicalNotes(apt.doctor_notes);
  const scheduled = new Date(apt.scheduled_at);
  const doctorName = apt.doctor?.profile?.full_name ?? "Doctor";
  const review = Array.isArray(apt.review) ? apt.review[0] : apt.review;
  const paymentList = apt.payments ?? (apt.payment ? [apt.payment] : []);
  const payment = Array.isArray(paymentList) ? paymentList[0] : paymentList;

  const timing = getAppointmentSessionTiming({
    scheduledAt: apt.scheduled_at,
    durationMinutes: apt.duration_minutes,
    status: apt.status,
  });

  return {
    id: apt.id,
    doctorId: apt.doctor_id,
    doctorName,
    doctorSpecialization: apt.doctor?.specialization ?? "Specialist",
    doctorPhone: apt.doctor?.profile?.phone ?? "—",
    doctorAvatarUrl: apt.doctor?.profile?.avatar_url ?? null,
    date: scheduled.toISOString().split("T")[0],
    time: formatTime(scheduled),
    timeRange: formatTimeRange(apt.scheduled_at, apt.duration_minutes),
    duration: `${apt.duration_minutes} min`,
    type: mapAppointmentType(apt.appointment_type),
    status: mapPatientStatus(apt.status, apt.scheduled_at, payment, apt.duration_minutes),
    timing,
    canJoin:
      timing.canJoin &&
      ["scheduled", "ongoing"].includes(apt.status) &&
      payment?.status === "completed",
    paymentStatus: payment?.status ?? null,
    paymentId: payment?.id ?? null,
    paymentMethod: payment?.payment_method ?? null,
    paymentProofUrl: payment?.proof_url ?? null,
    paymentRejectionReason: payment?.rejection_reason ?? null,
    isPaid: payment?.status === "completed",
    reason: apt.patient_notes?.trim() || "General consultation",
    notes: parsed.clinicalNote,
    // In-app secure video page (issues per-user Jitsi tokens server-side).
    roomUrl: `/video/${apt.id}`,
    prescription: parsed.prescription,
    rating: review?.rating,
    reviewComment: review?.comment ?? undefined,
    createdAt: apt.created_at,
    scheduledAt: apt.scheduled_at,
    consultationFee: Number(apt.consultation_fee),
    rawStatus: apt.status,
    refundStatus: payment?.refund_status ?? null,
    refundAmount: payment?.refund_amount != null ? Number(payment.refund_amount) : null,
    refundProcessedAt: payment?.refund_processed_at ?? payment?.refunded_at ?? null,
    cancellationReason: apt.cancellation_reason ?? null,
  };
}

export function mapToDoctorCard(doc: DoctorWithProfile) {
  const name = doc.profile?.full_name ?? "Doctor";
  const city = doc.cities?.[0] ?? doc.profile?.city ?? "Pakistan";
  return {
    id: doc.id,
    name,
    specialization: doc.specialization,
    qualification: doc.qualification?.join(", ") ?? "",
    experience: `${doc.experience_years} years experience`,
    pmdcNumber: doc.pmdc_number,
    rating: Number(doc.rating) || 0,
    reviewsCount: doc.total_reviews ?? 0,
    consultationFee: formatCurrency(Number(doc.consultation_fee)),
    consultationFeeRaw: Number(doc.consultation_fee),
    city,
    isAvailableToday: doc.is_available,
    imageInitials: getInitials(name),
    avatarUrl: doc.profile?.avatar_url ?? null,
    bio: doc.bio,
  };
}

export function mapToPaymentRow(payment: PaymentWithDoctor) {
  const methodLabels: Record<PaymentMethod, string> = {
    jazzcash: "JazzCash Wallet",
    easypaisa: "EasyPaisa Mobile",
    stripe: "Stripe Card",
    bank_transfer: "Bank Transfer",
  };

  const statusLabels: Record<PaymentStatus, string> = {
    completed: "Completed",
    pending: "Pending",
    failed: "Failed",
    refunded: "Refunded",
  };

  return {
    paymentId: payment.id,
    id: payment.transaction_id ?? `TXN-${payment.id.slice(0, 8).toUpperCase()}`,
    doctorName: payment.doctor?.profile?.full_name ?? "Doctor",
    specialization: payment.doctor?.specialization ?? "",
    appointmentType: payment.appointment?.appointment_type
      ? mapAppointmentType(payment.appointment.appointment_type)
      : "Consultation",
    amount: formatCurrency(Number(payment.amount)),
    amountRaw: Number(payment.amount),
    date: formatDate(payment.created_at, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    createdAt: payment.created_at,
    method: methodLabels[payment.payment_method] ?? payment.payment_method,
    rawMethod: payment.payment_method,
    status: statusLabels[payment.status] ?? payment.status,
    rawStatus: payment.status,
    refundStatus: payment.refund_status ?? "not_applicable",
    refundAmount: payment.refund_amount != null ? Number(payment.refund_amount) : null,
    proofUrl: payment.proof_url,
    rejectionReason: payment.rejection_reason,
    reviewedAt: payment.reviewed_at,
  };
}

export type PatientPaymentRow = ReturnType<typeof mapToPaymentRow>;

export function formatRelativeDate(date: string): string {
  if (isToday(date)) return "Today";
  const value = new Date(date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (
    value.getFullYear() === tomorrow.getFullYear() &&
    value.getMonth() === tomorrow.getMonth() &&
    value.getDate() === tomorrow.getDate()
  ) {
    return "Tomorrow";
  }
  return formatDate(date, { month: "short", day: "numeric" });
}

export function getUpcomingAppointments(appointments: PatientUIAppointment[]) {
  const now = Date.now();
  return appointments
    .filter(
      (apt) =>
        (["Confirmed", "Pending", "Ready", "Starting Soon", "Payment Review"].includes(apt.status) ||
          (apt.status === "Awaiting Payment" && apt.paymentProofUrl)) &&
        ["scheduled", "ongoing", "pending_payment"].includes(apt.rawStatus) &&
        apt.rawStatus !== "expired_no_show" &&
        new Date(apt.scheduledAt).getTime() >= now - 30 * 60_000
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
}

export function getFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] ?? fullName;
}

export {
  calcAge,
  formatCurrency,
  formatDate,
  getInitials,
  timeAgo,
};
