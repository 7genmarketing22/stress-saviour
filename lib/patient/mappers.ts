import type { AppointmentStatus, PaymentMethod, PaymentStatus } from "@/types";
import { parseClinicalNotes } from "@/lib/doctor/notes";
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
  status: "Confirmed" | "Pending" | "Completed" | "Cancelled" | "No Show" | "Ready";
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
}

export function mapPatientStatus(
  status: AppointmentStatus,
  scheduledAt: string
): PatientUIAppointment["status"] {
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  if (status === "no_show") return "No Show";
  if (status === "ongoing") return "Ready";

  const diffMinutes = (new Date(scheduledAt).getTime() - Date.now()) / 60_000;
  if (diffMinutes <= 15 && diffMinutes >= -30) return "Ready";
  if (status === "scheduled") return "Confirmed";
  return "Pending";
}

export function mapToPatientAppointment(apt: AppointmentWithDoctor): PatientUIAppointment {
  const parsed = parseClinicalNotes(apt.doctor_notes);
  const scheduled = new Date(apt.scheduled_at);
  const doctorName = apt.doctor?.profile?.full_name ?? "Doctor";
  const review = Array.isArray(apt.review) ? apt.review[0] : apt.review;

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
    status: mapPatientStatus(apt.status, apt.scheduled_at),
    reason: apt.patient_notes?.trim() || "General consultation",
    notes: parsed.clinicalNote,
    roomUrl:
      apt.video_room_url ??
      `https://meet.jit.si/stress-saviours-${apt.id.slice(0, 8)}`,
    prescription: parsed.prescription,
    rating: review?.rating,
    reviewComment: review?.comment ?? undefined,
    createdAt: apt.created_at,
    scheduledAt: apt.scheduled_at,
    consultationFee: Number(apt.consultation_fee),
    rawStatus: apt.status,
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
    id: payment.transaction_id ?? payment.id.slice(0, 8).toUpperCase(),
    doctorName: payment.doctor?.profile?.full_name ?? "Doctor",
    amount: formatCurrency(Number(payment.amount)),
    amountRaw: Number(payment.amount),
    date: formatDate(payment.created_at, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    method: methodLabels[payment.payment_method] ?? payment.payment_method,
    status: statusLabels[payment.status] ?? payment.status,
    rawStatus: payment.status,
  };
}

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
        ["Confirmed", "Pending", "Ready"].includes(apt.status) &&
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
