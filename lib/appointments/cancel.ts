import { createClient } from "@/lib/supabase/client";
import { createNotification } from "@/lib/notifications/api";
import { initiateRefundForCancelledAppointment } from "@/lib/refunds/process";
import type { CancellationActor, RefundDecision } from "@/lib/refunds/policy";
import { getErrorMessage } from "@/lib/errors";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Karachi",
  });
}

async function safeNotify(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    console.warn("Cancellation notification skipped:", err);
  }
}

/** Mark unfinished payment attempts as failed so they cannot be approved later. */
export async function voidUnpaidPaymentsForAppointment(appointmentId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await (supabase as any)
    .from("payments")
    .update({
      status: "failed",
      rejection_reason: "Appointment cancelled before payment was completed.",
    })
    .eq("appointment_id", appointmentId)
    .eq("status", "pending");

  if (error) {
    console.warn("voidUnpaidPaymentsForAppointment failed:", error.message);
  }
}

export async function notifyAppointmentCancelled(params: {
  appointmentId: string;
  patientId: string;
  doctorUserId?: string | null;
  scheduledAt: string;
  reason: string;
  cancelledBy: CancellationActor;
  notifyPatient?: boolean;
  notifyDoctor?: boolean;
}): Promise<void> {
  const when = formatWhen(params.scheduledAt);
  const reasonText = params.reason.trim() || "No reason provided";

  const patientTitle =
    params.cancelledBy === "doctor"
      ? "Appointment cancelled by your doctor"
      : params.cancelledBy === "admin"
        ? "Appointment cancelled by admin"
        : "Appointment cancelled";

  const patientMessage =
    params.cancelledBy === "doctor"
      ? `Your appointment on ${when} was cancelled by the doctor. Reason: ${reasonText}. If you paid, a full refund will be initiated.`
      : params.cancelledBy === "admin"
        ? `Your appointment on ${when} was cancelled by an administrator. Reason: ${reasonText}. If you paid, a full refund will be initiated.`
        : `Your appointment on ${when} was cancelled. Reason: ${reasonText}.`;

  if (params.notifyPatient !== false) {
    await safeNotify(() =>
      createNotification(params.patientId, patientTitle, patientMessage, "appointment", {
        appointment_id: params.appointmentId,
        cancelled_by: params.cancelledBy,
      })
    );
  }

  if (params.notifyDoctor && params.doctorUserId) {
    await safeNotify(() =>
      createNotification(
        params.doctorUserId!,
        "Appointment cancelled",
        `An appointment scheduled for ${when} was cancelled. Reason: ${reasonText}.`,
        "appointment",
        { appointment_id: params.appointmentId, cancelled_by: params.cancelledBy }
      )
    );
  }

  // Best-effort cancellation email (does not block cancel success).
  await fetch("/api/appointments/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "cancelled",
      appointmentId: params.appointmentId,
      patientId: params.patientId,
      scheduledAt: params.scheduledAt,
      reason: reasonText,
      cancelledBy: params.cancelledBy,
    }),
  }).catch(() => {});
}

/**
 * Shared post-cancel side effects: invalidate unpaid payments, refund if paid,
 * and notify the relevant parties.
 */
export async function finalizeAppointmentCancellation(params: {
  appointmentId: string;
  patientId: string;
  doctorUserId?: string | null;
  scheduledAt: string;
  cancelledBy: CancellationActor;
  cancellationReason: string;
  notifyPatient?: boolean;
  notifyDoctor?: boolean;
}): Promise<{ refund: RefundDecision | null; refundError?: string }> {
  await voidUnpaidPaymentsForAppointment(params.appointmentId);

  let refund: RefundDecision | null = null;
  let refundError: string | undefined;

  try {
    refund = await initiateRefundForCancelledAppointment({
      appointmentId: params.appointmentId,
      cancelledBy: params.cancelledBy,
      cancellationReason: params.cancellationReason,
    });
  } catch (err) {
    refundError = getErrorMessage(err, "Refund initiation failed");
    console.error("Refund initiation failed after cancel:", refundError);
  }

  await notifyAppointmentCancelled({
    appointmentId: params.appointmentId,
    patientId: params.patientId,
    doctorUserId: params.doctorUserId,
    scheduledAt: params.scheduledAt,
    reason: params.cancellationReason,
    cancelledBy: params.cancelledBy,
    notifyPatient: params.notifyPatient,
    notifyDoctor: params.notifyDoctor,
  });

  return { refund, refundError };
}
