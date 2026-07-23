import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendSystemPushForNotification } from "@/lib/notifications/server-push";

const bodySchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  type: z.string().max(40).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  tag: z.string().max(120).optional(),
});

/**
 * Authenticated dispatch of an OS notification for a user who opted into Web Push.
 * Companion to in-app `createNotification` (bell) so both channels stay in sync.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { userId, title, message, type, metadata, tag } = parsed.data;

  // Fire-and-forget from the client; always ack quickly.
  await sendSystemPushForNotification({
    userId,
    title,
    message,
    type: type ?? "system",
    metadata: metadata ?? null,
    tag,
  });

  return NextResponse.json({ ok: true });
}
