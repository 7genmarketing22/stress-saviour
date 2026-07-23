"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getErrorMessage } from "@/lib/errors";
import { useNotifications } from "@/contexts/NotificationContext";

/** Persists across logins / new tabs (unlike sessionStorage). */
const PROMPT_HANDLED_KEY = "push-notification-prompt-handled";

function wasPromptHandled(): boolean {
  try {
    return localStorage.getItem(PROMPT_HANDLED_KEY) === "true";
  } catch {
    return false;
  }
}

function markPromptHandled(): void {
  try {
    localStorage.setItem(PROMPT_HANDLED_KEY, "true");
  } catch {
    // private mode / blocked storage — ignore
  }
}

function urlBase64ToArrayBuffer(value: string): ArrayBuffer {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
  return bytes.buffer as ArrayBuffer;
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser");
  }
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) {
    await navigator.serviceWorker.ready;
    return existing;
  }
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  return registration;
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

  const registration = await ensureServiceWorker();
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
  const [justEnabled, setJustEnabled] = useState(false);
  const { refresh } = useNotifications();

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  useEffect(() => {
    if (!supported || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;

    const permission = Notification.permission;

    if (permission === "granted") {
      markPromptHandled();
      subscribeForPush().catch((subscriptionError) => {
        console.error("Unable to refresh push subscription", subscriptionError);
      });
      return;
    }

    if (permission === "denied" || wasPromptHandled()) {
      return;
    }

    setShowPrompt(true);
  }, [supported]);

  const enable = useCallback(async () => {
    setIsEnabling(true);
    setError(null);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        markPromptHandled();
        setShowPrompt(false);
        return;
      }

      await subscribeForPush();
      markPromptHandled();

      const testResponse = await fetch("/api/push/test", { method: "POST" });
      const testBody = await testResponse.json().catch(() => ({}));
      if (!testResponse.ok) {
        console.warn("Push enabled, but the test notification could not be sent", testBody);
      }

      // Refresh bell so the in-app test notification appears immediately.
      try {
        refresh();
      } catch {
        // NotificationProvider always wraps this component.
      }

      setJustEnabled(true);
      setShowPrompt(false);
    } catch (enableError) {
      if (Notification.permission === "granted") {
        markPromptHandled();
      }
      setError(getErrorMessage(enableError, "Unable to enable notifications"));
    } finally {
      setIsEnabling(false);
    }
  }, [refresh]);

  const dismiss = useCallback(() => {
    markPromptHandled();
    setShowPrompt(false);
    setJustEnabled(false);
  }, []);

  useEffect(() => {
    if (!justEnabled) return;
    const timer = setTimeout(() => setJustEnabled(false), 6000);
    return () => clearTimeout(timer);
  }, [justEnabled]);

  if (!supported) return null;

  if (justEnabled) {
    return (
      <aside
        className="bg-background fixed right-4 bottom-4 left-4 z-[100] mx-auto max-w-md rounded-xl border p-4 shadow-xl"
        aria-label="Notifications enabled"
      >
        <button
          type="button"
          onClick={dismiss}
          className="text-muted-foreground hover:bg-muted absolute top-2 right-2 rounded-md p-1"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex gap-3 pr-6">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold">Notifications enabled</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Check your system notification tray and the bell icon — a test alert was sent to both.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  if (!showPrompt) return null;

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
            Enable system notifications on this device. Alerts also appear under the bell in the app.
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
