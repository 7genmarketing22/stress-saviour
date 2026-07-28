import { createServiceRoleClient } from "@/lib/supabase/admin";
import { sendPushToUsers, type PushDeliveryResult } from "@/lib/push/server";
import { resolveNotificationPath } from "@/lib/notifications/links";

function absoluteAssetUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (!base) return path;
  try {
    return new URL(path, `${base}/`).href;
  } catch {
    return path;
  }
}

/**
 * Send an OS / browser system notification for a user who has enabled Web Push.
 * Never throws; returns delivery stats (sent may be 0 if no subscription / VAPID).
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
}): Promise<PushDeliveryResult> {
  const empty: PushDeliveryResult = {
    sent: 0,
    failed: 0,
    removed: 0,
    configured: false,
  };

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
    // Absolute click URL helps Android PWAs open the right screen.
    const url = absoluteAssetUrl(path);

    return await sendPushToUsers([params.userId], {
      title: params.title,
      body: params.message,
      url,
      icon: absoluteAssetUrl("/logo-192.png"),
      badge: absoluteAssetUrl("/logo-96.png"),
      sound: absoluteAssetUrl("/bell.wav"),
      tag:
        params.tag ??
        (params.type === "chat" &&
        typeof params.metadata?.conversationId === "string"
          ? `chat-${params.metadata.conversationId}`
          : `notif-${params.type ?? "system"}-${params.userId.slice(0, 8)}`),
      data: {
        type: params.type ?? "system",
        ...(params.metadata ?? {}),
      },
    });
  } catch (err) {
    console.warn("System push dispatch skipped:", err);
    return empty;
  }
}
