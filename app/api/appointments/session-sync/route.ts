import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseUrl, getSupabaseKey } from "@/lib/supabase/env";
import { processAppointmentSessions } from "@/lib/appointments/process-sessions";
import { getErrorMessage } from "@/lib/errors";

/**
 * Lightweight sweep triggered when a doctor/patient dashboard loads.
 * Keeps expiry + reminders in sync without waiting for cron.
 */
export async function POST() {
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

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: true, skipped: true, reason: "no service role" });
    }

    const result = await processAppointmentSessions();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Internal error") },
      { status: 500 }
    );
  }
}
