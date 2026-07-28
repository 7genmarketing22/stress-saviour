"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, X, CheckCircle2, BellOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getErrorMessage } from "@/lib/errors";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  playNotificationSound,
  unlockNotificationSound,
} from "@/lib/notifications/sound";

/** Persists across logins / new tabs (unlike sessionStorage). */
const PROMPT_HANDLED_KEY = "push-notification-prompt-handled";
const STANDALONE_PROMPTED_KEY = "push-notification-standalone-prompted";
export const ENABLE_PUSH_EVENT = "stress-saviors:enable-push";

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

function wasStandalonePrompted(): boolean {
  try {
    return localStorage.getItem(STANDALONE_PROMPTED_KEY) === "true";
  } catch {
    return false;
  }
}

function markStandalonePrompted(): void {
  try {
    localStorage.setItem(STANDALONE_PROMPTED_KEY, "true");
  } catch {
    // ignore
  }
}

function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    nav.standalone === true
  );
}

/** Strip quotes/whitespace that often break Vercel-copied VAPID keys. */
function sanitizeVapidPublicKey(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, "");
}

/** Chrome expects a Uint8Array applicationServerKey (not a raw ArrayBuffer). */
function urlBase64ToUint8Array(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function isBraveBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Brave/i.test(navigator.userAgent) || !!(navigator as Navigator & { brave?: unknown }).brave;
}

function mapPushSubscribeError(err: unknown): string {
  const message = getErrorMessage(err, "Unable to enable notifications");
  const lower = message.toLowerCase();

  if (
    lower.includes("push service error") ||
    lower.includes("registration failed") ||
    lower.includes("applicationserverkey") ||
    lower.includes("invalid")
  ) {
    if (isBraveBrowser()) {
      return `Push blocked in Brave (${message}). Open brave://settings/privacy and enable "Use Google services for push messaging", then try again. Chrome/Edge usually work without that.`;
    }
    return `Push setup failed (${message}). Use Chrome or Edge, or reset site notifications for this domain (lock icon → Notifications → Reset), then try again. Also confirm Vercel VAPID keys match and the site was Redeployed.`;
  }

  return message;
}

/** True when an existing browser subscription was created with the current VAPID public key. */
function subscriptionUsesCurrentVapidKey(
  subscription: PushSubscription,
  expected: Uint8Array
): boolean {
  const current = subscription.options.applicationServerKey;
  if (!current) return false;
  const cur =
    current instanceof ArrayBuffer
      ? new Uint8Array(current)
      : new Uint8Array(current as ArrayBuffer);
  if (cur.byteLength !== expected.byteLength) return false;
  for (let i = 0; i < cur.byteLength; i += 1) {
    if (cur[i] !== expected[i]) return false;
  }
  return true;
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser");
  }

  let registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) {
    registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  }

  await navigator.serviceWorker.ready;

  // Desktop Chrome/Brave sometimes need an active controller before PushManager.subscribe.
  if (!navigator.serviceWorker.controller) {
    await new Promise<void>((resolve) => {
      const onController = () => {
        navigator.serviceWorker.removeEventListener("controllerchange", onController);
        resolve();
      };
      navigator.serviceWorker.addEventListener("controllerchange", onController);
      // Don't hang forever if the page was opened before SW existed.
      window.setTimeout(() => {
        navigator.serviceWorker.removeEventListener("controllerchange", onController);
        resolve();
      }, 2500);
      registration?.update().catch(() => {});
    });
  }

  return registration;
}

/** Encode ArrayBuffer keys the way Web Push expects (base64url). */
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * Mobile Chrome sometimes returns incomplete toJSON().keys —
 * always fall back to getKey() so the API receives p256dh + auth.
 */
function serializePushSubscription(subscription: PushSubscription): {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
} {
  const json = subscription.toJSON();
  const p256dhBuffer = subscription.getKey("p256dh");
  const authBuffer = subscription.getKey("auth");

  const p256dh =
    json.keys?.p256dh ||
    (p256dhBuffer ? arrayBufferToBase64Url(p256dhBuffer) : "");
  const auth =
    json.keys?.auth || (authBuffer ? arrayBufferToBase64Url(authBuffer) : "");

  if (!subscription.endpoint || !p256dh || !auth) {
    throw new Error(
      "This browser did not provide complete push keys. Update Chrome and try again."
    );
  }

  return {
    endpoint: subscription.endpoint,
    expirationTime:
      typeof subscription.expirationTime === "number"
        ? subscription.expirationTime
        : null,
    keys: { p256dh, auth },
  };
}

async function saveSubscription(subscription: PushSubscription) {
  const payload = serializePushSubscription(subscription);
  const response = await fetch("/api/push/subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof body?.error === "string" && body.error.trim()
        ? body.error
        : response.status === 401
          ? "Please sign in again, then enable notifications."
          : "Unable to save push subscription";
    throw new Error(message);
  }
}

async function getExistingSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await ensureServiceWorker();
    return (await registration.pushManager.getSubscription()) ?? null;
  } catch {
    return null;
  }
}

async function subscribeWithKey(
  registration: ServiceWorkerRegistration,
  applicationServerKey: Uint8Array
): Promise<PushSubscription> {
  // Copy into a clean ArrayBuffer — some Chromium builds reject shared/offset views.
  const keyCopy = new Uint8Array(applicationServerKey);
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyCopy,
  });
}

async function subscribeForPush() {
  const rawKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!rawKey) {
    throw new Error(
      "Push notifications are not configured in this build. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY on Vercel and Redeploy."
    );
  }

  const publicKey = sanitizeVapidPublicKey(rawKey);
  let applicationServerKey: Uint8Array;
  try {
    applicationServerKey = urlBase64ToUint8Array(publicKey);
  } catch {
    throw new Error(
      "Invalid VAPID public key. Generate a new pair with npm run push:generate-keys and update Vercel env vars."
    );
  }

  if (applicationServerKey.byteLength !== 65) {
    throw new Error(
      `Invalid VAPID public key length (${applicationServerKey.byteLength}). Use the publicKey from npm run push:generate-keys (not the private key), with no quotes.`
    );
  }

  const registration = await ensureServiceWorker();
  const existing = await registration.pushManager.getSubscription();

  if (existing) {
    if (subscriptionUsesCurrentVapidKey(existing, applicationServerKey)) {
      try {
        await saveSubscription(existing);
        return existing;
      } catch {
        await existing.unsubscribe().catch(() => {});
      }
    } else {
      // Old subscription used a different VAPID pair — must resubscribe.
      await existing.unsubscribe().catch(() => {});
    }
  }

  try {
    const subscription = await subscribeWithKey(registration, applicationServerKey);
    await saveSubscription(subscription);
    return subscription;
  } catch (firstError) {
    const leftover = await registration.pushManager.getSubscription();
    if (leftover) await leftover.unsubscribe().catch(() => {});
    try {
      const subscription = await subscribeWithKey(registration, applicationServerKey);
      await saveSubscription(subscription);
      return subscription;
    } catch {
      throw firstError;
    }
  }
}

export function PushNotificationManager() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justEnabled, setJustEnabled] = useState(false);
  const [denied, setDenied] = useState(false);
  const { refresh } = useNotifications();

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const enable = useCallback(async () => {
    setIsEnabling(true);
    setError(null);
    setDenied(false);

    try {
      // Unlock audio during this click so in-app bell works even if push subscribe fails.
      await unlockNotificationSound();

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        markPromptHandled();
        setShowPrompt(false);
        if (permission === "denied") setDenied(true);
        return;
      }

      let pushReady = false;
      try {
        await subscribeForPush();
        pushReady = true;
      } catch (subscribeError) {
        // Permission is granted — in-app + desktop Notification API still work while the tab is open.
        console.warn("Web Push subscribe failed; continuing with in-app alerts", subscribeError);
        setError(mapPushSubscribeError(subscribeError));
      }

      markPromptHandled();
      markStandalonePrompted();
      await unlockNotificationSound();
      playNotificationSound();

      if (pushReady) {
        const testResponse = await fetch("/api/push/test", {
          method: "POST",
          credentials: "same-origin",
        });
        const testBody = await testResponse.json().catch(() => ({}));
        if (!testResponse.ok) {
          console.warn("Push enabled, but the test notification could not be sent", testBody);
          const status = await fetch("/api/push/status")
            .then((r) => r.json())
            .catch(() => null);
          const hint =
            status && !status.configured
              ? " Server is missing VAPID keys — add them on Vercel and Redeploy."
              : status && !status.hasServiceRole
                ? " Also set SUPABASE_SERVICE_ROLE_KEY on Vercel so push can be saved/sent."
                : "";
          setError(
            (typeof testBody?.error === "string"
              ? testBody.error
              : "Subscription saved, but the test push failed. Check VAPID keys on the server.") +
              hint
          );
        } else {
          setError(null);
        }
      }

      try {
        refresh();
      } catch {
        // NotificationProvider always wraps this component.
      }

      setJustEnabled(true);
      // Keep prompt open if push failed so the user can read the Brave/Chrome hint.
      if (pushReady) setShowPrompt(false);
    } catch (enableError) {
      setError(mapPushSubscribeError(enableError));
      setShowPrompt(true);
    } finally {
      setIsEnabling(false);
    }
  }, [refresh]);

  useEffect(() => {
    if (!supported || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;

    let cancelled = false;

    (async () => {
      const permission = Notification.permission;
      const standalone = isStandalonePwa();
      const existing = await getExistingSubscription();

      if (cancelled) return;

      if (permission === "granted") {
        markPromptHandled();
        subscribeForPush().catch((subscriptionError) => {
          console.error("Unable to refresh push subscription", subscriptionError);
        });
        void unlockNotificationSound();
        return;
      }

      if (permission === "denied") {
        setDenied(true);
        return;
      }

      // default permission — show prompt for first visit, or once more after installing as PWA
      const shouldPrompt =
        !wasPromptHandled() ||
        (standalone && !wasStandalonePrompted() && !existing);

      if (shouldPrompt) {
        if (standalone) markStandalonePrompted();
        setShowPrompt(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supported]);

  // Header / settings can request enabling push on this device.
  useEffect(() => {
    if (!supported) return;
    const onEnableRequest = () => {
      setShowPrompt(true);
      setError(null);
      void enable();
    };
    window.addEventListener(ENABLE_PUSH_EVENT, onEnableRequest);
    return () => window.removeEventListener(ENABLE_PUSH_EVENT, onEnableRequest);
  }, [supported, enable]);

  // Service worker: play sound + re-save rotated subscriptions (mobile).
  useEffect(() => {
    if (!supported || !("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "PLAY_NOTIFICATION_SOUND") {
        playNotificationSound();
      }
      if (event.data?.type === "PUSH_SUBSCRIPTION_CHANGED") {
        const sub = event.data.subscription;
        if (sub) {
          void fetch("/api/push/subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sub),
          }).catch(() => {});
        } else if (Notification.permission === "granted") {
          void subscribeForPush().catch(() => {});
        }
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [supported]);

  useEffect(() => {
    if (!supported) return;
    const unlock = () => {
      void unlockNotificationSound();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [supported]);

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
            <p className="font-semibold">Notifications enabled on this device</p>
            <p className="text-muted-foreground mt-1 text-sm">
              You should hear the bell and see a test alert. Enable again on every device/account that should receive messages (patient, doctor, and admin each need their own enable).
            </p>
          </div>
        </div>
      </aside>
    );
  }

  if (denied && !showPrompt) {
    return (
      <aside
        className="bg-background fixed right-4 bottom-4 left-4 z-[100] mx-auto max-w-md rounded-xl border border-amber-200 p-4 shadow-xl"
        aria-label="Notifications blocked"
      >
        <button
          type="button"
          onClick={() => setDenied(false)}
          className="text-muted-foreground hover:bg-muted absolute top-2 right-2 rounded-md p-1"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex gap-3 pr-6">
          <BellOff className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Notifications are blocked</p>
            <p className="text-muted-foreground mt-1 text-sm">
              On your phone: open system Settings → Apps → Stress Saviors (or Chrome) → Notifications → Allow, then reopen this app and tap Enable.
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
          <p className="font-semibold">
            {isStandalonePwa() ? "Turn on app notifications" : "Stay updated on this device"}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {isStandalonePwa()
              ? "Allow alerts on this phone for chat, appointments, and account updates — even when the app is closed."
              : "Enable system notifications for chat, appointments, payments, and account updates. Alerts also appear under the bell in every portal."}
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
