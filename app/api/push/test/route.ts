import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push/server";
import { resolveNotificationPath } from "@/lib/notifications/links";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createServiceRoleClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = (profile as { role?: string } | null)?.role ?? "patient";
    const title = "Notifications enabled";
    const message =
      "You're all set. You'll get alerts in the app bell and as system notifications on this device.";
    const type = "system";
    const url = resolveNotificationPath(type, role);

    // 1) In-app bell
    const { error: notifError } = await (admin as any).rpc("create_notification", {
      p_user_id: user.id,
      p_title: title,
      p_message: message,
      p_type: type,
      p_metadata: { source: "push-test" },
    });
    if (notifError) {
      console.error("Test bell notification failed", notifError);
    }

    // 2) System / lock-screen notification (desktop + mobile)
    const pushResult = await sendPushToUsers([user.id], {
      title,
      body: message,
      url,
      icon: "/logo-192.png",
      badge: "/logo-96.png",
      tag: "push-test",
      data: { source: "push-test", type },
    });

    if (!pushResult.configured) {
      return NextResponse.json(
        {
          error: "VAPID keys are not configured on the server",
          bell: !notifError,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      bell: !notifError,
      push: pushResult,
      url,
    });
  } catch (error) {
    console.error("Test push failed", error);
    return NextResponse.json({ error: "Unable to send test notification" }, { status: 500 });
  }
}
