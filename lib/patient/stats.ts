import type { RefundStatus } from "@/types";
import type { AppointmentWithDoctor } from "./types";
import type { PaymentWithDoctor } from "./types";

/** Payment counts toward the patient's net spend (excludes refunds in progress or done). */
export function isPatientNetPayment(payment: {
  status: string;
  refund_status?: RefundStatus | null;
}): boolean {
  if (payment.status === "refunded") return false;
  if (payment.status !== "completed") return false;
  const rs = payment.refund_status ?? "not_applicable";
  return rs !== "pending" && rs !== "processing" && rs !== "refunded";
}

export interface PatientDashboardStats {
  /** Sum of completed, non-refunded payments — true out-of-pocket spend. */
  netSpent: number;
  /** Count of payments included in netSpent (denominator for average). */
  paidSessionCount: number;
  /** Average cost per paid (non-refunded) consultation. */
  avgPerSession: number;
  /** Payments awaiting or processing refund. */
  pendingRefundCount: number;
  pendingRefundAmount: number;
  /** Appointments marked completed by the doctor. */
  completedAppointments: number;
  /** All non-cancelled bookings (scheduled, ongoing, completed, etc.). */
  activeBookings: number;
}

export function buildPatientDashboardStats(
  payments: PaymentWithDoctor[],
  appointments: AppointmentWithDoctor[],
): PatientDashboardStats {
  const netPayments = payments.filter(isPatientNetPayment);
  const netSpent = netPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const paidSessionCount = netPayments.length;
  const avgPerSession =
    paidSessionCount > 0 ? Math.round(netSpent / paidSessionCount) : 0;

  const pendingRefundPayments = payments.filter((p) => {
    const rs = p.refund_status ?? "not_applicable";
    return (
      p.status === "completed" &&
      (rs === "pending" || rs === "processing")
    );
  });
  const pendingRefundAmount = pendingRefundPayments.reduce(
    (sum, p) => sum + Number(p.refund_amount ?? p.amount),
    0,
  );

  const completedAppointments = appointments.filter(
    (a) => a.status === "completed",
  ).length;
  const activeBookings = appointments.filter(
    (a) => a.status !== "cancelled",
  ).length;

  return {
    netSpent,
    paidSessionCount,
    avgPerSession,
    pendingRefundCount: pendingRefundPayments.length,
    pendingRefundAmount,
    completedAppointments,
    activeBookings,
  };
}
