import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { sendSystemPushForNotification } from "@/lib/notifications/server-push";
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
    const pushResult = await sendSystemPushForNotification({
      userId: user.id,
      title,
      message,
      type,
      metadata: { source: "push-test" },
      url,
      tag: "push-test",
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

    if (pushResult.sent === 0) {
      return NextResponse.json(
        {
          error:
            "No push subscription found for this account on this device. Tap Enable again while signed in.",
          bell: !notifError,
          push: pushResult,
        },
        { status: 404 }
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
