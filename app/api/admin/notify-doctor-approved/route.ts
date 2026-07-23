import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseUrl, getSupabaseKey } from "@/lib/supabase/env";
import { getErrorMessage } from "@/lib/errors";

// Sends an approval/rejection email to a doctor via Resend (if configured).
// Falls back gracefully when RESEND_API_KEY is absent.

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(getSupabaseUrl(), getSupabaseKey(), {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    });

    // Only admins can call this endpoint
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "super_admin"].includes((profile as any).role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { doctorEmail, doctorName, action, rejectionReason } = body as {
      doctorEmail: string;
      doctorName: string;
      action: "approved" | "rejected";
      rejectionReason?: string;
    };

    const siteUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
      "https://stress-saviour.vercel.app";

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      // No email service configured — still return success (in-app notification covers it)
      return NextResponse.json({ sent: false, reason: "RESEND_API_KEY not configured" });
    }

    const isApproved = action === "approved";

    const emailHtml = isApproved
      ? `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px 24px;background:#fff;border-radius:12px;border:1px solid #e2e8f0">
          <h2 style="color:#0f172a;margin-bottom:8px">Congratulations, ${doctorName}! 🎉</h2>
          <p style="color:#475569;line-height:1.6">
            Your doctor profile on <strong>Stress Saviors</strong> has been reviewed and <strong style="color:#16a34a">approved</strong>.
            You can now log in and start accepting patient bookings.
          </p>
          <a href="${siteUrl}/login?role=doctor"
             style="display:inline-block;margin-top:24px;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Log in to your dashboard
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">Stress Saviors · Pakistan Telehealth Platform</p>
        </div>`
      : `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px 24px;background:#fff;border-radius:12px;border:1px solid #e2e8f0">
          <h2 style="color:#0f172a;margin-bottom:8px">Application Update — ${doctorName}</h2>
          <p style="color:#475569;line-height:1.6">
            After review, your doctor application on <strong>Stress Saviors</strong> was <strong style="color:#dc2626">not approved</strong>.
          </p>
          ${rejectionReason ? `<p style="color:#475569;background:#fef2f2;padding:12px;border-radius:8px;border:1px solid #fecaca"><strong>Reason:</strong> ${rejectionReason}</p>` : ""}
          <p style="color:#475569;line-height:1.6">If you believe this is an error, please contact our support team.</p>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">Stress Saviors · Pakistan Telehealth Platform</p>
        </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Stress Saviors <noreply@stresssaviors.pk>",
        to: [doctorEmail],
        subject: isApproved
          ? "✅ Your doctor profile has been approved — Stress Saviors"
          : "Your doctor application — Stress Saviors",
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Resend error:", errBody);
      return NextResponse.json({ sent: false, reason: errBody }, { status: 500 });
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("notify-doctor-approved error:", err);
    return NextResponse.json({ sent: false, reason: getErrorMessage(err, "Notify failed") }, { status: 500 });
  }
}
