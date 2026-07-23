import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseUrl, getSupabaseKey } from "@/lib/supabase/env";
import { getErrorMessage } from "@/lib/errors";
import {
  buildRoomName,
  buildRoomPath,
  getJitsiDomain,
  isJitsiJwtConfigured,
  isSelfHostedJitsiConfigured,
  signJitsiJwt,
} from "@/lib/video/jwt";

/** Patients/doctors may join from this many minutes before the scheduled start. */
const JOIN_EARLY_MINUTES = 10;
/** Each request gets a fresh short-lived token, capped at the appointment end. */
const TOKEN_TTL_MINUTES = 15;

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(getSupabaseUrl(), getSupabaseKey(), {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) =>
          cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { appointmentId } = (await request.json()) as { appointmentId?: string };
    if (!appointmentId) {
      return NextResponse.json({ error: "appointmentId is required" }, { status: 400 });
    }

    const { data: appointment, error: aptError } = await supabase
      .from("appointments")
      .select(
        `
        id, patient_id, doctor_id, status, scheduled_at, duration_minutes, video_room_url,
        doctor:doctor_profiles!appointments_doctor_id_fkey (
          id, user_id,
          profile:profiles!doctor_profiles_user_id_fkey ( full_name, avatar_url, email )
        ),
        patient:profiles!appointments_patient_id_fkey ( id, full_name, avatar_url, email )
      `
      )
      .eq("id", appointmentId)
      .maybeSingle();

    if (aptError) {
      return NextResponse.json({ error: aptError.message }, { status: 500 });
    }
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const apt = appointment as unknown as {
      id: string;
      patient_id: string;
      doctor_id: string;
      status: string;
      scheduled_at: string;
      duration_minutes: number;
      video_room_url: string | null;
      doctor: {
        user_id: string;
        profile: { full_name: string; avatar_url: string | null; email: string } | null;
      } | null;
      patient: { id: string; full_name: string; avatar_url: string | null; email: string } | null;
    };

    // ── Access control: only the assigned doctor, the patient, or an admin ──
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, full_name, avatar_url, email")
      .eq("id", user.id)
      .single();

    const me = profile as unknown as {
      id: string;
      role: string;
      full_name: string;
      avatar_url: string | null;
      email: string;
    } | null;

    if (!me) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }

    const isDoctor = apt.doctor?.user_id === me.id;
    const isPatient = apt.patient_id === me.id;
    const isAdmin = me.role === "admin";

    if (!isDoctor && !isPatient && !isAdmin) {
      return NextResponse.json(
        { error: "You are not a participant of this appointment." },
        { status: 403 }
      );
    }

    if (["cancelled", "no_show", "expired_no_show"].includes(apt.status)) {
      const label =
        apt.status === "cancelled"
          ? "This appointment has been cancelled and the meeting room is closed."
          : "This appointment is no longer available.";
      return NextResponse.json(
        { error: label, message: label },
        { status: 409 }
      );
    }
    if (apt.status === "pending_payment") {
      return NextResponse.json(
        { error: "Payment for this appointment has not been confirmed yet." },
        { status: 409 }
      );
    }

    // ── Time window ──
    const scheduledStart = new Date(apt.scheduled_at).getTime();
    const scheduledEnd = scheduledStart + apt.duration_minutes * 60_000;
    const windowOpens = scheduledStart - JOIN_EARLY_MINUTES * 60_000;
    const windowCloses = scheduledEnd;
    const now = Date.now();

    // Doctor/patient tokens are only issued inside the appointment window.
    // Rejoining an ongoing room does not bypass expiry.
    if (!isAdmin) {
      if (now < windowOpens) {
        return NextResponse.json(
          {
            error: "too_early",
            message: `The consultation room opens ${JOIN_EARLY_MINUTES} minutes before the scheduled time.`,
            opensAt: new Date(windowOpens).toISOString(),
          },
          { status: 425 }
        );
      }
      if (now > windowCloses) {
        return NextResponse.json(
          { error: "expired", message: "The join window for this consultation has ended." },
          { status: 410 }
        );
      }
    }

    if (!isSelfHostedJitsiConfigured()) {
      return NextResponse.json(
        {
          error: "video_not_configured",
          message:
            "Secure video hosting is temporarily unavailable. Please contact support.",
        },
        { status: 503 }
      );
    }

    // ── Secure room name (persisted once per appointment) ──
    const room = buildRoomName(apt.id);
    const domain = getJitsiDomain();
    const canonicalUrl = `https://${domain}/${buildRoomPath(room)}`;
    if (apt.video_room_url !== canonicalUrl) {
      await supabase
        .from("appointments")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ video_room_url: canonicalUrl } as any)
        .eq("id", apt.id);
    }

    // The doctor is the moderator. The appointment becomes ongoing only after
    // Jitsi confirms that the doctor actually joined (POST /api/video/started).
    const role: "moderator" | "participant" = isDoctor || isAdmin ? "moderator" : "participant";

    const displayName = isDoctor
      ? `Dr. ${apt.doctor?.profile?.full_name ?? me.full_name}`
      : me.full_name;

    const jwt = signJitsiJwt({
      room: buildRoomPath(room),
      userId: me.id,
      displayName,
      email: me.email,
      avatarUrl: me.avatar_url,
      moderator: role === "moderator",
      expiresAt: Math.floor(
        (isAdmin
          ? now + TOKEN_TTL_MINUTES * 60_000
          : Math.min(windowCloses, now + TOKEN_TTL_MINUTES * 60_000)) / 1000
      ),
    });

    return NextResponse.json({
      domain,
      room: buildRoomPath(room),
      jwt,
      jwtConfigured: isJitsiJwtConfigured(),
      role,
      displayName,
      status: apt.status,
      scheduledAt: apt.scheduled_at,
      durationMinutes: apt.duration_minutes,
      doctorName: apt.doctor?.profile?.full_name ?? "Doctor",
      patientName: apt.patient?.full_name ?? "Patient",
    });
  } catch (err) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Internal error") },
      { status: 500 }
    );
  }
}
