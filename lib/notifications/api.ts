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

/** Ask the server to deliver a matching OS / lock-screen notification. */
function dispatchSystemPush(payload: {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, unknown>;
}): void {
  if (typeof window === "undefined") return;
  void fetch("/api/push/dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Push is best-effort; bell notification already succeeded.
  });
}

/**
 * Create an in-app (bell) notification and, when the recipient has enabled Web Push,
 * also deliver a system notification on desktop / mobile.
 */
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType = "system",
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = createClient();
  const { error } = await (supabase as any).rpc("create_notification", {
    p_user_id: userId,
    p_title: title,
    p_message: message,
    p_type: type,
    p_metadata: metadata ?? null,
  });
  if (error) throw error;

  dispatchSystemPush({ userId, title, message, type, metadata });
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
