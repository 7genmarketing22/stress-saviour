import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getErrorMessage } from "@/lib/errors";
import { getSupabaseKey, getSupabaseUrl } from "@/lib/supabase/env";

/** Mark a consultation ongoing only after the assigned doctor joins Jitsi. */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(getSupabaseUrl(), getSupabaseKey(), {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) =>
          cs.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { appointmentId } = (await request.json()) as {
      appointmentId?: string;
    };
    if (!appointmentId) {
      return NextResponse.json(
        { error: "appointmentId is required" },
        { status: 400 }
      );
    }

    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select(
        `
        id, status,
        doctor:doctor_profiles!appointments_doctor_id_fkey ( user_id )
      `
      )
      .eq("id", appointmentId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const row = appointment as unknown as {
      id: string;
      status: string;
      doctor: { user_id: string } | null;
    };
    if (row.doctor?.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (["cancelled", "completed", "no_show", "expired_no_show"].includes(row.status)) {
      return NextResponse.json(
        { error: "This appointment cannot be started." },
        { status: 409 }
      );
    }

    if (row.status === "scheduled") {
      const { error: updateError } = await supabase
        .from("appointments")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ status: "ongoing" } as any)
        .eq("id", appointmentId)
        .eq("status", "scheduled");
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, status: "ongoing" });
  } catch (err) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Internal error") },
      { status: 500 }
    );
  }
}
