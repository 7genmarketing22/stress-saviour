export type RefundStatus =
  | "not_applicable"
  | "pending"
  | "processing"
  | "refunded"
  | "failed";

export type CancellationActor = "patient" | "doctor" | "admin" | "system";

export interface RefundDecision {
  refundStatus: RefundStatus;
  refundAmount: number;
  note: string;
}

/** Hours before appointment that define the patient cancellation window. */
const FULL_REFUND_HOURS = 24;
const PARTIAL_REFUND_HOURS = 2;
const PARTIAL_REFUND_PERCENT = 0.5;

function isSystemCancellation(reason: string): boolean {
  const lower = reason.toLowerCase();
  return (
    lower.includes("system") ||
    lower.includes("duplicate") ||
    lower.includes("technical error") ||
    lower.includes("removed by system")
  );
}

function hoursUntilAppointment(scheduledAt: string): number {
  return (new Date(scheduledAt).getTime() - Date.now()) / 3_600_000;
}

/**
 * Determines refund eligibility and amount based on who cancelled and when.
 *
 * Policy:
 * - System / admin / doctor cancellation → full refund (pending, admin processes manually)
 * - Patient > 24 h before → full refund
 * - Patient 2–24 h before → 50 % refund
 * - Patient < 2 h before → no refund
 * - Unpaid appointments → not applicable
 */
export function evaluateRefundPolicy(params: {
  cancelledBy: CancellationActor;
  cancellationReason: string;
  scheduledAt: string;
  paymentAmount: number;
  paymentStatus: string;
}): RefundDecision {
  const { cancelledBy, cancellationReason, scheduledAt, paymentAmount, paymentStatus } = params;

  if (paymentStatus !== "completed") {
    return {
      refundStatus: "not_applicable",
      refundAmount: 0,
      note: "No payment was collected — refund not applicable.",
    };
  }

  const amount = Number(paymentAmount);

  if (cancelledBy === "system" || isSystemCancellation(cancellationReason)) {
    return {
      refundStatus: "pending",
      refundAmount: amount,
      note: "Full refund — cancelled by system.",
    };
  }

  if (cancelledBy === "admin") {
    return {
      refundStatus: "pending",
      refundAmount: amount,
      note: "Full refund — cancelled by administrator.",
    };
  }

  if (cancelledBy === "doctor") {
    return {
      refundStatus: "pending",
      refundAmount: amount,
      note: "Full refund — cancelled by doctor.",
    };
  }

  // Patient cancellation — time-based policy
  const hoursLeft = hoursUntilAppointment(scheduledAt);

  if (hoursLeft >= FULL_REFUND_HOURS) {
    return {
      refundStatus: "pending",
      refundAmount: amount,
      note: `Full refund — cancelled more than ${FULL_REFUND_HOURS} hours before appointment.`,
    };
  }

  if (hoursLeft >= PARTIAL_REFUND_HOURS) {
    const partial = Math.round(amount * PARTIAL_REFUND_PERCENT * 100) / 100;
    return {
      refundStatus: "pending",
      refundAmount: partial,
      note: `${Math.round(PARTIAL_REFUND_PERCENT * 100)}% refund — cancelled within ${FULL_REFUND_HOURS} hours of appointment.`,
    };
  }

  return {
    refundStatus: "not_applicable",
    refundAmount: 0,
    note: `No refund — cancelled less than ${PARTIAL_REFUND_HOURS} hours before appointment.`,
  };
}

export const REFUND_STATUS_LABEL: Record<RefundStatus, string> = {
  not_applicable: "Not Applicable",
  pending: "Pending",
  processing: "Processing",
  refunded: "Refunded",
  failed: "Failed",
};
