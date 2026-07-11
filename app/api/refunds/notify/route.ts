import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseUrl, getSupabaseKey } from "@/lib/supabase/env";

const SITE_URL =
  (process.env.NEXT_PUBLIC_APP_URL ?? "https://stress-saviour.vercel.app").replace(/\/$/, "");

function fmtPKR(amount: number) {
  return `PKR ${Math.round(amount).toLocaleString("en-PK")}`;
}

async function sendEmail(to: string, subject: string, html: string, resendKey: string) {
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
  if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);
}

function baseLayout(content: string) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:linear-gradient(135deg,#0d9488,#0284c7);padding:28px 32px">
        <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700">Stress Saviors</h1>
      </div>
      <div style="padding:32px">${content}</div>
      <div style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
        <p style="color:#94a3b8;font-size:12px;margin:0">© 2026 Stress Saviors</p>
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as {
      type: "initiated" | "completed";
      patientId: string;
      appointmentId: string;
      refundAmount: number;
      note?: string;
      reference?: string;
    };

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return NextResponse.json({ sent: false, reason: "RESEND_API_KEY not configured" });

    const { data: patient } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", body.patientId)
      .single();

    if (!patient) return NextResponse.json({ sent: false, reason: "Patient not found" });

    const p = patient as { full_name: string; email: string };
    const amount = fmtPKR(body.refundAmount);
    const dashUrl = `${SITE_URL}/patient/appointments`;

    const html =
      body.type === "initiated"
        ? baseLayout(`
            <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin-bottom:24px">
              <p style="color:#92400e;font-weight:700;margin:0">Refund Initiated</p>
            </div>
            <p style="color:#334155">Hi <strong>${p.full_name}</strong>,</p>
            <p style="color:#475569;line-height:1.7">
              Your cancelled appointment refund of <strong>${amount}</strong> has been initiated.
              ${body.note ? `<br><br><em>${body.note}</em>` : ""}
            </p>
            <p style="color:#475569;line-height:1.7">
              Our team will process the refund to your original payment method within <strong>3–5 business days</strong>.
              You will receive another email once it is completed.
            </p>
            <a href="${dashUrl}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:16px">View My Appointments</a>
          `)
        : baseLayout(`
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:24px">
              <p style="color:#166534;font-weight:700;margin:0">✅ Refund Completed</p>
            </div>
            <p style="color:#334155">Hi <strong>${p.full_name}</strong>,</p>
            <p style="color:#475569;line-height:1.7">
              Your refund of <strong>${amount}</strong> has been processed successfully.
              ${body.reference ? `<br>Reference: <strong>${body.reference}</strong>` : ""}
            </p>
            <p style="color:#475569;line-height:1.7">
              Funds should appear in your account within 3–5 business days depending on your bank or wallet provider.
            </p>
            <a href="${dashUrl}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:16px">View My Appointments</a>
          `);

    const subject =
      body.type === "initiated"
        ? `Refund initiated — ${amount} — Stress Saviors`
        : `Refund completed — ${amount} — Stress Saviors`;

    await sendEmail(p.email, subject, html, resendKey);
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("refunds/notify error:", err);
    return NextResponse.json({ sent: false, reason: String(err) }, { status: 500 });
  }
}
