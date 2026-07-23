import { createServiceRoleClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push/server";
import { resolveNotificationPath } from "@/lib/notifications/links";

/**
 * Send an OS / browser system notification for a user who has enabled Web Push.
 * Safe to call fire-and-forget; never throws to callers.
 */
export async function sendSystemPushForNotification(params: {
  userId: string;
  title: string;
  message: string;
  type?: string | null;
  metadata?: Record<string, unknown> | null;
  /** Optional explicit path; otherwise resolved from role + type. */
  url?: string;
  tag?: string;
}): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", params.userId)
      .maybeSingle();

    const role = (profile as { role?: string } | null)?.role ?? "patient";
    const path =
      params.url ??
      resolveNotificationPath(params.type ?? "system", role, params.metadata, params.title);

    await sendPushToUsers([params.userId], {
      title: params.title,
      body: params.message,
      url: path,
      icon: "/logo-192.png",
      badge: "/logo-96.png",
      tag: params.tag ?? `notif-${params.type ?? "system"}-${params.userId.slice(0, 8)}`,
      data: {
        type: params.type ?? "system",
        ...(params.metadata ?? {}),
      },
    });
  } catch (err) {
    console.warn("System push dispatch skipped:", err);
  }
}
