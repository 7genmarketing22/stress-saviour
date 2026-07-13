import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  GRACE_MINUTES_AFTER_START,
  getAppointmentSessionTiming,
} from "@/lib/appointments/session-timing";

const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://stress-saviour.vercel.app"
).replace(/\/$/, "");

interface AppointmentRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: string;
  scheduled_at: string;
  duration_minutes: number;
  reminder_sent_at: string | null;
  appointment_type: string;
  patient: { full_name: string; email: string } | null;
  doctor: {
    user_id: string;
    profile: { full_name: string; email: string } | null;
  } | null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Karachi",
  });
}

async function sendEmail(to: string, subject: string, html: string) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey || !to) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Stress Saviors <noreply@stresssaviors.pk>",
      to: [to],
      subject,
      html,
    }),
  });
  return res.ok;
}

async function createNotification(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  title: string,
  message: string,
  type: string,
  metadata?: Record<string, unknown>
) {
  await (supabase as any).rpc("create_notification", {
    p_user_id: userId,
    p_title: title,
    p_message: message,
    p_type: type,
    p_metadata: metadata ?? null,
  });
}

async function notifyAdmins(
  supabase: ReturnType<typeof createServiceRoleClient>,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
) {
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "super_admin"]);
  if (!admins?.length) return;
  await Promise.all(
    (admins as { id: string }[]).map((a) =>
      createNotification(supabase, a.id, title, message, "appointment", metadata)
    )
  );
}

async function applyExpiryRefund(
  supabase: ReturnType<typeof createServiceRoleClient>,
  appointmentId: string
) {
  const { data: payment } = await supabase
    .from("payments")
    .select("id, status, amount, patient_id")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (!payment || (payment as { status: string }).status !== "completed") return;

  const pay = payment as { id: string; status: string; amount: number; patient_id: string };
  const amount = Number(pay.amount);
  await (supabase as any).rpc("apply_cancellation_refund", {
    p_payment_id: pay.id,
    p_refund_status: "pending",
    p_refund_amount: amount,
    p_refund_note:
      "Full refund — consultation expired (call not started within grace period).",
  });

  await createNotification(
    supabase,
    pay.patient_id,
    "Refund initiated",
    `A full refund of PKR ${Math.round(amount).toLocaleString("en-PK")} has been initiated because your consultation expired without starting.`,
    "payment",
    { appointment_id: appointmentId, refund_amount: amount }
  );
}

export interface ProcessSessionsResult {
  remindersSent: number;
  expired: number;
  errors: string[];
}

/** Batch-process reminders + auto-expiry for all due scheduled appointments. */
export async function processAppointmentSessions(): Promise<ProcessSessionsResult> {
  const supabase = createServiceRoleClient();
  const result: ProcessSessionsResult = { remindersSent: 0, expired: 0, errors: [] };

  const { data: rows, error } = await supabase
    .from("appointments")
    .select(
      `
      id, patient_id, doctor_id, status, scheduled_at, duration_minutes,
      reminder_sent_at, appointment_type,
      patient:profiles!appointments_patient_id_fkey ( full_name, email ),
      doctor:doctor_profiles!appointments_doctor_id_fkey (
        user_id,
        profile:profiles!doctor_profiles_user_id_fkey ( full_name, email )
      )
    `
    )
    .eq("status", "scheduled")
    .is("expiry_processed_at", null)
    .order("scheduled_at", { ascending: true })
    .limit(200);

  if (error) {
    result.errors.push(error.message);
    return result;
  }

  const appointments = (rows ?? []) as unknown as AppointmentRow[];

  for (const apt of appointments) {
    try {
      const timing = getAppointmentSessionTiming({
        scheduledAt: apt.scheduled_at,
        durationMinutes: apt.duration_minutes,
        status: "scheduled",
        reminderSentAt: apt.reminder_sent_at,
      });

      const patientName = apt.patient?.full_name ?? "Patient";
      const doctorName = apt.doctor?.profile?.full_name ?? "Doctor";
      const when = fmtDate(apt.scheduled_at);

      if (timing.shouldSendReminder && apt.doctor?.user_id) {
        const msg = `Your consultation with ${patientName} is scheduled for ${when}. Please join on time.`;
        await Promise.all([
          createNotification(supabase, apt.patient_id, "Consultation starting soon", `Your appointment with Dr. ${doctorName} is in ${timing.minutesUntilStart} minutes (${when}).`, "appointment", { appointment_id: apt.id }),
          createNotification(supabase, apt.doctor.user_id, "Consultation starting soon", msg, "appointment", { appointment_id: apt.id }),
        ]);

        const emailHtml = (name: string, body: string) =>
          `<div style="font-family:sans-serif;max-width:560px"><p>Hi ${name},</p><p>${body}</p><p><a href="${SITE_URL}">Open Stress Saviors</a></p></div>`;

        await Promise.allSettled([
          apt.patient?.email
            ? sendEmail(
                apt.patient.email,
                `Reminder: consultation with Dr. ${doctorName}`,
                emailHtml(
                  patientName,
                  `Your consultation is scheduled for <strong>${when}</strong>. Please be ready to join from your dashboard.`
                )
              )
            : Promise.resolve(false),
          apt.doctor?.profile?.email
            ? sendEmail(
                apt.doctor.profile.email,
                `Reminder: consultation with ${patientName}`,
                emailHtml(
                  `Dr. ${doctorName}`,
                  `You have a consultation with <strong>${patientName}</strong> at <strong>${when}</strong>. Start the call from your dashboard when ready.`
                )
              )
            : Promise.resolve(false),
        ]);

        await supabase
          .from("appointments")
          .update({ reminder_sent_at: new Date().toISOString() } as never)
          .eq("id", apt.id);

        result.remindersSent += 1;
      }

      if (!timing.shouldAutoExpire) continue;

      const { data: expired, error: expireErr } = await (supabase as any).rpc(
        "expire_unstarted_appointment",
        {
          p_appointment_id: apt.id,
          p_no_show_party: "both",
          p_reason: `Session not started within ${GRACE_MINUTES_AFTER_START} minutes of scheduled time`,
        }
      );

      if (expireErr || !expired) continue;

      result.expired += 1;

      await applyExpiryRefund(supabase, apt.id);

      const expiryMsg = `Your appointment with ${patientName} scheduled for ${when} was not started and has expired. A full refund has been initiated if payment was collected.`;
      const patientMsg = `Your appointment with Dr. ${doctorName} scheduled for ${when} was not started and has expired. ${apt.patient ? "A full refund has been initiated if payment was collected." : ""}`;

      await Promise.all([
        apt.doctor?.user_id
          ? createNotification(supabase, apt.doctor.user_id, "Consultation expired", expiryMsg, "appointment", {
              appointment_id: apt.id,
              no_show_party: "both",
            })
          : Promise.resolve(),
        createNotification(supabase, apt.patient_id, "Consultation expired", patientMsg, "appointment", {
          appointment_id: apt.id,
          no_show_party: "both",
        }),
        notifyAdmins(
          supabase,
          "Consultation auto-expired",
          `Appointment ${apt.id.slice(0, 8)} (${doctorName} / ${patientName}, ${when}) expired — neither party started the call.`,
          { appointment_id: apt.id, no_show_party: "both" }
        ),
      ]);

      await Promise.allSettled([
        apt.patient?.email
          ? sendEmail(
              apt.patient.email,
              "Consultation expired — Stress Saviors",
              `<p>Hi ${patientName},</p><p>${patientMsg}</p>`
            )
          : Promise.resolve(false),
        apt.doctor?.profile?.email
          ? sendEmail(
              apt.doctor.profile.email,
              "Consultation expired — Stress Saviors",
              `<p>Hi Dr. ${doctorName},</p><p>${expiryMsg}</p>`
            )
          : Promise.resolve(false),
      ]);
    } catch (err) {
      result.errors.push(
        `${apt.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return result;
}
