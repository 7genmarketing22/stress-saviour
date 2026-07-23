import { NextResponse } from "next/server";
import { processAppointmentSessions } from "@/lib/appointments/process-sessions";
import { getErrorMessage } from "@/lib/errors";

/**
 * Cron endpoint — call every few minutes via Vercel Cron or external scheduler.
 * Authorization: Bearer {CRON_SECRET}
 * Vercel Cron also sends x-vercel-cron: 1
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  if (auth !== `Bearer ${secret}` && !isVercelCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processAppointmentSessions();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Internal error") },
      { status: 500 }
    );
  }
}
