import { createClient } from "@/lib/supabase/client";

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string | null;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type NotificationType =
  | "appointment"
  | "payment"
  | "payout"
  | "approval"
  | "chat"
  | "assessment"
  | "system";

/** Fetch the latest notifications for a user, newest first. */
export async function getNotifications(
  userId: string,
  limit = 20
): Promise<AppNotification[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

/**
 * Accurate unread count from the DB (not capped by the bell list limit).
 * Excludes read chat rows so it matches what the header bell shows.
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
  return count ?? 0;
}

/** Mark a single notification as read. */
export async function markNotificationRead(id: string): Promise<void> {
  const supabase = createClient();
  await (supabase.from("notifications") as any)
    .update({ is_read: true })
    .eq("id", id);
}

/** Mark ALL unread notifications for a user as read. */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const supabase = createClient();
  await (supabase.from("notifications") as any)
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
}

/**
 * Mark unread chat notifications for a specific conversation as read.
 * Used when the user opens / views that conversation so the header bell stays in sync.
 */
export async function markChatNotificationsRead(
  userId: string,
  conversationId: string
): Promise<void> {
  const supabase = createClient();
  await (supabase.from("notifications") as any)
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("type", "chat")
    .eq("is_read", false)
    .contains("metadata", { conversationId });
}

/**
 * Create a chat notification for a conversation, replacing prior unread
 * chat notifications for the same thread so the bell shows only the latest message.
 */
export async function createChatNotification(
  userId: string,
  senderName: string,
  messagePreview: string,
  conversationId: string
): Promise<void> {
  await createNotification(
    userId,
    `Message from ${senderName.trim() || "someone"}`,
    messagePreview.trim() || "Sent a message",
    "chat",
    { conversationId }
  );
}

/**
 * Create an in-app (bell) notification and deliver OS push when the recipient
 * has enabled Web Push on a device.
 *
 * In the browser this goes through `/api/notifications/create` so push runs on
 * the server in the same request (more reliable on mobile than a second fetch).
 */
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType = "system",
  metadata?: Record<string, unknown>
): Promise<void> {
  if (typeof window !== "undefined") {
    const response = await fetch("/api/notifications/create", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        title,
        message,
        type,
        metadata: metadata ?? null,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        typeof body?.error === "string" && body.error.trim()
          ? body.error
          : "Unable to create notification"
      );
    }
    return;
  }

  // Server-side callers (no browser session for self-fetch).
  const { createServiceRoleClient } = await import("@/lib/supabase/admin");
  const { sendSystemPushForNotification } = await import(
    "@/lib/notifications/server-push"
  );
  const supabase = createServiceRoleClient();

  if (type === "chat" && typeof metadata?.conversationId === "string") {
    await (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("type", "chat")
      .eq("is_read", false)
      .contains("metadata", { conversationId: metadata.conversationId });
  }

  const { error } = await (supabase as any).rpc("create_notification", {
    p_user_id: userId,
    p_title: title,
    p_message: message,
    p_type: type,
    p_metadata: metadata ?? null,
  });
  if (error) throw error;

  await sendSystemPushForNotification({
    userId,
    title,
    message,
    type,
    metadata: metadata ?? null,
  });
}

/**
 * Notify all admin / super_admin users at once (bell + system push).
 */
export async function notifyAllAdmins(
  title: string,
  message: string,
  type: NotificationType = "system",
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = createClient();
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "super_admin"]);

  if (!admins?.length) return;
  await Promise.all(
    (admins as { id: string }[]).map((a) =>
      createNotification(a.id, title, message, type, metadata)
    )
  );
}
