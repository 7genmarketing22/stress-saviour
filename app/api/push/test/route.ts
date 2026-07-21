import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUsers } from "@/lib/push/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendPushToUsers([user.id], {
      title: "Stress Saviors notifications enabled",
      body: "This test confirms that push notifications can reach this device.",
      url: "/",
      icon: "/logo-192.png",
      badge: "/logo-96.png",
      tag: "push-test",
    });

    if (!result.configured) {
      return NextResponse.json(
        { error: "VAPID keys are not configured on the server" },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Test push failed", error);
    return NextResponse.json({ error: "Unable to send test notification" }, { status: 500 });
  }
}
