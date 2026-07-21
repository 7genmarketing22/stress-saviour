import webpush from "web-push";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export interface PushDeliveryResult {
  sent: number;
  failed: number;
  removed: number;
  configured: boolean;
}

interface StoredPushSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

let vapidConfigured = false;

function configureVapid() {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:support@stresssaviors.pk";

  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<PushDeliveryResult> {
  const result: PushDeliveryResult = {
    sent: 0,
    failed: 0,
    removed: 0,
    configured: configureVapid(),
  };

  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (!result.configured || uniqueUserIds.length === 0) return result;

  const supabase = createServiceRoleClient();
  // Regenerate Database types after applying the migration to remove this cast.
  const { data, error } = await (supabase as any)
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", uniqueUserIds);

  if (error) throw new Error(`Unable to load push subscriptions: ${error.message}`);

  await Promise.all(
    ((data ?? []) as StoredPushSubscription[]).map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          JSON.stringify(payload),
          { TTL: 300, urgency: "high" }
        );
        result.sent += 1;
      } catch (error) {
        result.failed += 1;
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number(error.statusCode)
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          const { error: deleteError } = await (supabase as any)
            .from("push_subscriptions")
            .delete()
            .eq("id", row.id);
          if (!deleteError) result.removed += 1;
        } else {
          console.error("Web Push delivery failed", {
            statusCode,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })
  );

  return result;
}
