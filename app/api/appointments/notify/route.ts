import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseUrl, getSupabaseKey } from "@/lib/supabase/env";
import { getErrorMessage } from "@/lib/errors";

const SITE_URL =
  (process.env.NEXT_PUBLIC_APP_URL ?? "https://stress-savious.vercel.app").replace(/\/$/, "");

type AppointmentType = "video" | "chat" | "in_person";

const TYPE_LABELS: Record<AppointmentType, string> = {
  video: "Video Consultation",
  chat: "Chat Consultation",
  in_person: "In-Person Visit",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-PK", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
    timeZone: "Asia/Karachi",
  });
}

function fmtPKR(amount: number) {
  return `PKR ${Math.round(amount).toLocaleString("en-PK")}`;
}

async function sendEmail(to: string, subject: string, html: string, resendKey: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Stress Saviors <noreply@stresssaviors.pk>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Resend error: ${txt}`);
  }
}

function baseLayout(content: string) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:linear-gradient(135deg,#0d9488,#0284c7);padding:28px 32px">
        <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700">Stress Saviors</h1>
        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px">Pakistan's Mental Wellness Platform</p>
      </div>
      <div style="padding:32px">${content}</div>
      <div style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
        <p style="color:#94a3b8;font-size:12px;margin:0">© 2026 Stress Saviors · <a href="${SITE_URL}" style="color:#0d9488;text-decoration:none">stresssaviors.pk</a></p>
      </div>
    </div>`;
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(getSupabaseUrl(), getSupabaseKey(), {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    });

    // Must be authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as {
      type?: "booked" | "cancelled";
      appointmentId: string;
      patientId: string;
      doctorProfileId?: string;
      scheduledAt: string;
      appointmentType?: AppointmentType;
      consultationFee?: number;
      patientNotes?: string;
      reason?: string;
      cancelledBy?: "patient" | "doctor" | "admin" | "system";
    };

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ sent: false, reason: "RESEND_API_KEY not configured" });
    }

    // ── Cancellation emails ───────────────────────────────────────
    if (body.type === "cancelled") {
      const { data: patientRow } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", body.patientId)
        .single();

      const { data: aptRow } = await (supabase as any)
        .from("appointments")
        .select(
          `
          doctor_id,
          doctor:doctor_profiles!appointments_doctor_id_fkey (
            profile:profiles!doctor_profiles_user_id_fkey ( full_name, email )
          )
        `
        )
        .eq("id", body.appointmentId)
        .maybeSingle();

      if (!patientRow) {
        return NextResponse.json({ sent: false, reason: "Patient not found" });
      }

      const patient = patientRow as { full_name: string; email: string };
      const doctorProfile = (
        aptRow as {
          doctor?: { profile?: { full_name: string; email: string } | null } | null;
        } | null
      )?.doctor?.profile;
      const dateFormatted = fmtDate(body.scheduledAt);
      const reasonText = body.reason?.trim() || "No reason provided";
      const cancelledBy = body.cancelledBy ?? "system";
      const patientDashUrl = `${SITE_URL}/patient/appointments`;
      const doctorDashUrl = `${SITE_URL}/doctor/appointments`;

      const actorLabel =
        cancelledBy === "doctor"
          ? "your doctor"
          : cancelledBy === "admin"
            ? "an administrator"
            : cancelledBy === "patient"
              ? "the patient"
              : "the system";

      const sends: Promise<void>[] = [];

      if (cancelledBy !== "patient" && patient.email) {
        const patientHtml = baseLayout(`
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 20px;margin-bottom:24px">
            <p style="color:#991b1b;font-weight:700;margin:0;font-size:15px">Appointment Cancelled</p>
          </div>
          <p style="color:#334155;font-size:15px">Hi <strong>${patient.full_name}</strong>,</p>
          <p style="color:#475569;line-height:1.7">
            Your appointment on <strong>${dateFormatted}</strong> was cancelled by ${actorLabel}.
          </p>
          <p style="color:#475569;line-height:1.7"><strong>Reason:</strong> ${reasonText}</p>
          <p style="color:#475569;line-height:1.7">
            If you already paid, a refund will be processed according to our cancellation policy
            (full refund when cancelled by the doctor or admin). You can track refund status in My Appointments.
          </p>
          <a href="${patientDashUrl}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:4px">View My Appointments</a>
        `);
        sends.push(
          sendEmail(
            patient.email,
            `Appointment cancelled — Stress Saviors`,
            patientHtml,
            resendKey
          )
        );
      }

      if (cancelledBy !== "doctor" && doctorProfile?.email) {
        const doctorHtml = baseLayout(`
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 20px;margin-bottom:24px">
            <p style="color:#991b1b;font-weight:700;margin:0;font-size:15px">Appointment Cancelled</p>
          </div>
          <p style="color:#334155;font-size:15px">Hi <strong>Dr. ${doctorProfile.full_name}</strong>,</p>
          <p style="color:#475569;line-height:1.7">
            An appointment with <strong>${patient.full_name}</strong> on <strong>${dateFormatted}</strong>
            was cancelled by ${actorLabel}.
          </p>
          <p style="color:#475569;line-height:1.7"><strong>Reason:</strong> ${reasonText}</p>
          <a href="${doctorDashUrl}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:4px">View My Appointments</a>
        `);
        sends.push(
          sendEmail(
            doctorProfile.email,
            `Appointment cancelled — Stress Saviors`,
            doctorHtml,
            resendKey
          )
        );
      }

      const results = await Promise.allSettled(sends);
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .map((r) => String(r.reason));

      return NextResponse.json({
        sent: results.some((r) => r.status === "fulfilled"),
        errors,
      });
    }

    // ── Booking confirmation emails (default) ─────────────────────
    if (!body.doctorProfileId || !body.appointmentType || body.consultationFee == null) {
      return NextResponse.json({ error: "Missing booking notify fields" }, { status: 400 });
    }

    // Fetch patient + doctor info
    const [{ data: patientRow }, { data: doctorRow }] = await Promise.all([
      supabase.from("profiles").select("full_name, email").eq("id", body.patientId).single(),
      (supabase as any)
        .from("doctor_profiles")
        .select("specialization, profile:profiles!doctor_profiles_user_id_fkey(full_name, email)")
        .eq("id", body.doctorProfileId)
        .single(),
    ]);

    if (!patientRow || !doctorRow) {
      return NextResponse.json({ sent: false, reason: "Profile not found" });
    }

    const patient = patientRow as { full_name: string; email: string };
    const doctor = doctorRow as { specialization: string; profile: { full_name: string; email: string } };
    const dateFormatted = fmtDate(body.scheduledAt);
    const typeLabel = TYPE_LABELS[body.appointmentType] ?? body.appointmentType;
    const dashboardUrl = `${SITE_URL}/patient/appointments`;
    const doctorDashUrl = `${SITE_URL}/doctor/appointments`;

    // ── Email to patient ──────────────────────────────────────────
    const patientHtml = baseLayout(`
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:24px">
        <p style="color:#166534;font-weight:700;margin:0;font-size:15px">✅ Appointment Confirmed!</p>
      </div>
      <p style="color:#334155;font-size:15px">Hi <strong>${patient.full_name}</strong>,</p>
      <p style="color:#475569;line-height:1.7">Your appointment has been successfully booked. Complete your payment below to confirm the slot.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
        <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;width:40%">Doctor</td>
            <td style="padding:10px 0;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9">Dr. ${doctor.profile.full_name}</td></tr>
        <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9">Specialty</td>
            <td style="padding:10px 0;color:#334155;border-bottom:1px solid #f1f5f9">${doctor.specialization}</td></tr>
        <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9">Type</td>
            <td style="padding:10px 0;color:#334155;border-bottom:1px solid #f1f5f9">${typeLabel}</td></tr>
        <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9">Date &amp; Time</td>
            <td style="padding:10px 0;font-weight:600;color:#0d9488;border-bottom:1px solid #f1f5f9">${dateFormatted}</td></tr>
        <tr><td style="padding:10px 0;color:#64748b">Consultation Fee</td>
            <td style="padding:10px 0;font-weight:700;color:#1e293b">${fmtPKR(body.consultationFee)}</td></tr>
      </table>
      ${body.patientNotes ? `<div style="background:#f8fafc;border-left:3px solid #0d9488;padding:12px 16px;border-radius:4px;margin:16px 0"><p style="color:#475569;font-size:13px;margin:0"><strong>Your notes:</strong> ${body.patientNotes}</p></div>` : ""}
      <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin:20px 0">
        <p style="color:#92400e;font-size:13px;margin:0">⚠️ <strong>Next step:</strong> Pay the consultation fee to the admin payment account and upload your payment screenshot in My Appointments to confirm your booking.</p>
      </div>
      <a href="${dashboardUrl}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:4px">View My Appointments</a>
    `);

    // ── Email to doctor ───────────────────────────────────────────
    const doctorHtml = baseLayout(`
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;margin-bottom:24px">
        <p style="color:#1d4ed8;font-weight:700;margin:0;font-size:15px">📅 New Appointment Request</p>
      </div>
      <p style="color:#334155;font-size:15px">Hi <strong>Dr. ${doctor.profile.full_name}</strong>,</p>
      <p style="color:#475569;line-height:1.7">A patient has booked a consultation with you. The appointment will be confirmed once the patient completes payment verification.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
        <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9;width:40%">Patient</td>
            <td style="padding:10px 0;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9">${patient.full_name}</td></tr>
        <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9">Type</td>
            <td style="padding:10px 0;color:#334155;border-bottom:1px solid #f1f5f9">${typeLabel}</td></tr>
        <tr><td style="padding:10px 0;color:#64748b;border-bottom:1px solid #f1f5f9">Date &amp; Time</td>
            <td style="padding:10px 0;font-weight:600;color:#0d9488;border-bottom:1px solid #f1f5f9">${dateFormatted}</td></tr>
        <tr><td style="padding:10px 0;color:#64748b">Fee</td>
            <td style="padding:10px 0;font-weight:700;color:#1e293b">${fmtPKR(body.consultationFee)}</td></tr>
      </table>
      ${body.patientNotes ? `<div style="background:#f0fdf4;border-left:3px solid #22c55e;padding:12px 16px;border-radius:4px;margin:16px 0"><p style="color:#166534;font-size:13px;margin:0"><strong>Patient's reason:</strong> ${body.patientNotes}</p></div>` : ""}
      <a href="${doctorDashUrl}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:4px">View My Appointments</a>
    `);

    // Send both emails concurrently — individual failures are logged but don't block
    const results = await Promise.allSettled([
      sendEmail(patient.email, `✅ Appointment booked with Dr. ${doctor.profile.full_name} — Stress Saviors`, patientHtml, resendKey),
      sendEmail(doctor.profile.email, `📅 New appointment request from ${patient.full_name} — Stress Saviors`, doctorHtml, resendKey),
    ]);

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => String(r.reason));

    if (errors.length) {
      console.error("Appointment email partial failure:", errors);
    }

    return NextResponse.json({ sent: results.some((r) => r.status === "fulfilled"), errors });
  } catch (err) {
    console.error("appointments/notify error:", err);
    return NextResponse.json({ sent: false, reason: getErrorMessage(err, "Notify failed") }, { status: 500 });
  }
}
