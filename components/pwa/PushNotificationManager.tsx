"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

const DISMISSED_KEY = "push-notification-prompt-dismissed";

function urlBase64ToArrayBuffer(value: string): ArrayBuffer {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
  return bytes.buffer as ArrayBuffer;
}

async function saveSubscription(subscription: PushSubscription) {
  const response = await fetch("/api/push/subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });

  if (!response.ok) throw new Error("Unable to save push subscription");
}

async function subscribeForPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error("Push notifications are not configured");

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    await saveSubscription(existing);
    return existing;
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToArrayBuffer(publicKey),
  });
  await saveSubscription(subscription);
  return subscription;
}

export function PushNotificationManager() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  useEffect(() => {
    if (!supported || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;

    if (Notification.permission === "granted") {
      subscribeForPush().catch((subscriptionError) => {
        console.error("Unable to refresh push subscription", subscriptionError);
      });
      return;
    }

    if (Notification.permission === "default" && sessionStorage.getItem(DISMISSED_KEY) !== "true") {
      setShowPrompt(true);
    }
  }, [supported]);

  const enable = useCallback(async () => {
    setIsEnabling(true);
    setError(null);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setShowPrompt(false);
        return;
      }

      await subscribeForPush();
      setShowPrompt(false);

      const testResponse = await fetch("/api/push/test", { method: "POST" });
      if (!testResponse.ok) {
        console.warn("Push enabled, but the test notification could not be sent");
      }
    } catch (enableError) {
      setError(
        enableError instanceof Error ? enableError.message : "Unable to enable notifications"
      );
    } finally {
      setIsEnabling(false);
    }
  }, []);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(DISMISSED_KEY, "true");
    setShowPrompt(false);
  }, []);

  if (!supported || !showPrompt) return null;

  return (
    <aside
      className="bg-background fixed right-4 bottom-4 left-4 z-[100] mx-auto max-w-md rounded-xl border p-4 shadow-xl"
      aria-label="Enable push notifications"
    >
      <button
        type="button"
        onClick={dismiss}
        className="text-muted-foreground hover:bg-muted absolute top-2 right-2 rounded-md p-1"
        aria-label="Dismiss notification prompt"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3 pr-6">
        <BellRing className="text-primary mt-0.5 h-6 w-6 shrink-0" />
        <div>
          <p className="font-semibold">Never miss an appointment</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Enable lock-screen reminders, including when the app is closed.
          </p>
          {error && <p className="text-destructive mt-2 text-sm">{error}</p>}
          <Button className="mt-3" size="sm" onClick={enable} disabled={isEnabling}>
            {isEnabling ? "Enabling…" : "Enable notifications"}
          </Button>
        </div>
      </div>
    </aside>
  );
}
