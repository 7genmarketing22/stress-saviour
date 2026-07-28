import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
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
 * Create an in-app bell notification and deliver Web Push to the recipient
 * in one authenticated request (avoids a fragile second fire-and-forget fetch).
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
  const notifType = type ?? "system";
  const admin = createServiceRoleClient();

  // Chat: keep only the latest unread for this conversation on the recipient.
  if (
    notifType === "chat" &&
    metadata &&
    typeof metadata.conversationId === "string"
  ) {
    await (admin as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("type", "chat")
      .eq("is_read", false)
      .contains("metadata", { conversationId: metadata.conversationId });
  }

  const { error: notifError } = await (admin as any).rpc("create_notification", {
    p_user_id: userId,
    p_title: title,
    p_message: message,
    p_type: notifType,
    p_metadata: metadata ?? null,
  });

  if (notifError) {
    console.error("create_notification failed", notifError);
    return NextResponse.json(
      { error: notifError.message || "Unable to create notification" },
      { status: 500 }
    );
  }

  const push = await sendSystemPushForNotification({
    userId,
    title,
    message,
    type: notifType,
    metadata: metadata ?? null,
    tag,
  });

  return NextResponse.json({ ok: true, push });
}
