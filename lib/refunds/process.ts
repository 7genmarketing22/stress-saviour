import { createClient } from "@/lib/supabase/client";
import {
  evaluateRefundPolicy,
  type CancellationActor,
  type RefundDecision,
} from "./policy";

interface PaymentRow {
  id: string;
  status: string;
  amount: number;
  patient_id: string;
}

interface AppointmentRow {
  id: string;
  scheduled_at: string;
  cancellation_reason: string | null;
  patient_id: string;
  doctor_id: string;
}

/** Apply refund policy to the payment linked to a cancelled appointment. */
export async function initiateRefundForCancelledAppointment(params: {
  appointmentId: string;
  cancelledBy: CancellationActor;
  cancellationReason: string;
}): Promise<RefundDecision | null> {
  const supabase = createClient();

  const { data: apt, error: aptErr } = await (supabase as any)
    .from("appointments")
    .select("id, scheduled_at, cancellation_reason, patient_id, doctor_id")
    .eq("id", params.appointmentId)
    .single();

  if (aptErr || !apt) return null;
  const appointment = apt as AppointmentRow;

  const { data: payment, error: payErr } = await (supabase as any)
    .from("payments")
    .select("id, status, amount, patient_id")
    .eq("appointment_id", params.appointmentId)
    .maybeSingle();

  if (payErr || !payment) return null;
  const pay = payment as PaymentRow;

  const decision = evaluateRefundPolicy({
    cancelledBy: params.cancelledBy,
    cancellationReason: params.cancellationReason || appointment.cancellation_reason || "",
    scheduledAt: appointment.scheduled_at,
    paymentAmount: Number(pay.amount),
    paymentStatus: pay.status,
  });

  const { error: rpcErr } = await (supabase as any).rpc("apply_cancellation_refund", {
    p_payment_id: pay.id,
    p_refund_status: decision.refundStatus,
    p_refund_amount: decision.refundAmount,
    p_refund_note: decision.note,
  });

  if (rpcErr) {
    console.warn("apply_cancellation_refund failed:", rpcErr.message);
    return null;
  }

  // Fire-and-forget notification + email
  if (decision.refundStatus === "pending" && decision.refundAmount > 0) {
    notifyRefundInitiated({
      patientId: pay.patient_id,
      appointmentId: params.appointmentId,
      refundAmount: decision.refundAmount,
      note: decision.note,
    }).catch(() => {});
  }

  return decision;
}

async function notifyRefundInitiated(params: {
  patientId: string;
  appointmentId: string;
  refundAmount: number;
  note: string;
}) {
  const supabase = createClient();

  await (supabase as any).rpc("create_notification", {
    p_user_id: params.patientId,
    p_title: "Refund initiated",
    p_message: `A refund of PKR ${Math.round(params.refundAmount).toLocaleString("en-PK")} has been initiated for your cancelled appointment. ${params.note} You will be notified once it is processed (typically 3–5 business days).`,
    p_type: "payment",
    p_metadata: { appointment_id: params.appointmentId, refund_amount: params.refundAmount },
  });

  await fetch("/api/refunds/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "initiated",
      patientId: params.patientId,
      appointmentId: params.appointmentId,
      refundAmount: params.refundAmount,
      note: params.note,
    }),
  }).catch(() => {});
}

/** Admin marks an offline/manual refund as completed. */
export async function completeManualRefund(
  paymentId: string,
  adminId: string,
  options?: { reference?: string; note?: string },
): Promise<void> {
  const supabase = createClient();
  const reference =
    options?.reference?.trim() ||
    `RF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const { error } = await (supabase as any).rpc("complete_manual_refund", {
    p_payment_id: paymentId,
    p_admin_id: adminId,
    p_reference: reference,
    p_note: options?.note?.trim() || null,
  });

  if (error) throw error;

  // Fetch patient for notification
  const { data: payment } = await (supabase as any)
    .from("payments")
    .select("patient_id, refund_amount, amount, appointment_id")
    .eq("id", paymentId)
    .single();

  if (payment) {
    const amount = Number(payment.refund_amount ?? payment.amount);
    await (supabase as any).rpc("create_notification", {
      p_user_id: payment.patient_id,
      p_title: "Refund completed",
      p_message: `Your refund of PKR ${Math.round(amount).toLocaleString("en-PK")} has been processed (Ref: ${reference}). Funds will appear in your account within 3–5 business days.`,
      p_type: "payment",
      p_metadata: { payment_id: paymentId, reference },
    }).catch(() => {});

    await fetch("/api/refunds/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "completed",
        patientId: payment.patient_id,
        appointmentId: payment.appointment_id,
        refundAmount: amount,
        reference,
      }),
    }).catch(() => {});
  }
}
