const DEFAULT_ICON = "/logo-192.png";
const DEFAULT_BADGE = "/logo-96.png";
const DEFAULT_SOUND = "/bell.wav";
// Bump when push behavior changes so installed PWAs pick up the new worker.
const SW_VERSION = "ss-push-v4";

function absoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return undefined;
  try {
    return new URL(pathOrUrl, self.location.origin).href;
  } catch {
    return pathOrUrl;
  }
}

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function serializeSubscription(subscription) {
  const json = subscription.toJSON();
  const p256dhBuffer = subscription.getKey("p256dh");
  const authBuffer = subscription.getKey("auth");
  const p256dh =
    (json.keys && json.keys.p256dh) ||
    (p256dhBuffer ? arrayBufferToBase64Url(p256dhBuffer) : "");
  const auth =
    (json.keys && json.keys.auth) ||
    (authBuffer ? arrayBufferToBase64Url(authBuffer) : "");
  return {
    endpoint: subscription.endpoint,
    expirationTime:
      typeof subscription.expirationTime === "number"
        ? subscription.expirationTime
        : null,
    keys: { p256dh, auth },
  };
}

async function fetchVapidPublicKey() {
  try {
    const res = await fetch("/api/push/vapid-public", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = await res.json().catch(() => null);
    const key =
      typeof body?.publicKey === "string" ? body.publicKey.trim() : "";
    return key || null;
  } catch {
    return null;
  }
}

async function persistSubscriptionOnServer(subscription) {
  const payload = serializeSubscription(subscription);
  if (!payload.endpoint || !payload.keys.p256dh || !payload.keys.auth) {
    throw new Error("Incomplete push subscription keys");
  }
  const res = await fetch("/api/push/subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Unable to save rotated push subscription");
  }
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      try {
        await caches.open(SW_VERSION);
      } catch {
        // ignore
      }
    })()
  );
});

/** Tell open app tabs to play /bell.wav (covers foreground desktop + mobile PWA). */
async function notifyClientsToPlaySound() {
  const clientList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  for (const client of clientList) {
    client.postMessage({ type: "PLAY_NOTIFICATION_SOUND" });
  }
}

/** Ask open pages to re-fetch bell unread after a push (covers missed realtime). */
async function notifyClientsToRefreshNotifications(payload) {
  const clientList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  for (const client of clientList) {
    client.postMessage({
      type: "REFRESH_NOTIFICATIONS",
      payload: payload || null,
    });
  }
}

/** Ask open pages to re-save a refreshed push subscription to the server. */
async function notifyClientsSubscriptionChanged(subscription) {
  const clientList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  const payload = {
    type: "PUSH_SUBSCRIPTION_CHANGED",
    subscription: subscription ? serializeSubscription(subscription) : null,
  };
  for (const client of clientList) {
    client.postMessage(payload);
  }
}

/**
 * True only when the user can actually see the app.
 * Mobile PWAs often keep a client that reports focused while visibility is
 * hidden (app switched away / lock screen) — those must still get a tray alert.
 */
async function hasVisibleClient() {
  const clientList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  return clientList.some((client) => {
    const visible =
      !("visibilityState" in client) || client.visibilityState === "visible";
    const focused = !("focused" in client) || client.focused === true;
    return visible && focused;
  });
}

async function bumpAppBadge(explicitCount) {
  try {
    if (
      typeof explicitCount === "number" &&
      explicitCount >= 0 &&
      self.registration.setAppBadge
    ) {
      if (explicitCount === 0) {
        await self.registration.clearAppBadge?.();
      } else {
        await self.registration.setAppBadge(explicitCount);
      }
      return;
    }
    // Unknown exact count while app is closed — at least show a badge dot/1.
    if (self.registration.setAppBadge) {
      await self.registration.setAppBadge();
    }
  } catch {
    // Badging unsupported on this browser/OS.
  }
}

self.addEventListener("push", (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || "Stress Saviors";
  const url = absoluteUrl(payload.url || "/") || "/";
  const options = {
    body: payload.body || "You have a new notification.",
    // Android Chrome installed PWAs need absolute icon URLs.
    icon: absoluteUrl(payload.icon || DEFAULT_ICON),
    badge: absoluteUrl(payload.badge || DEFAULT_BADGE),
    // Custom sound is best-effort; most mobile OSes use the system default tone.
    sound: absoluteUrl(payload.sound || DEFAULT_SOUND),
    silent: false,
    tag: payload.tag || "stress-saviors",
    renotify: true,
    vibrate: [200, 100, 200],
    // Keep alert visible longer on phones so the user does not miss it.
    requireInteraction: true,
    timestamp: Date.now(),
    data: {
      ...(payload.data || {}),
      url,
      sound: absoluteUrl(payload.sound || DEFAULT_SOUND),
    },
  };

  event.waitUntil(
    (async () => {
      const visible = await hasVisibleClient();

      // Always keep open pages in sync (bell badge + chime).
      await notifyClientsToRefreshNotifications(payload);
      await notifyClientsToPlaySound();

      // System tray only when the user cannot see the app.
      // (Uses visibilityState — mobile PWAs often sit hidden while "focused"
      // still true; old focused-only checks skipped the tray and the ring.)
      if (!visible) {
        await self.registration.showNotification(title, options);
        const unread =
          typeof payload.unreadCount === "number"
            ? payload.unreadCount
            : typeof payload.data?.unreadCount === "number"
              ? payload.data.unreadCount
              : undefined;
        await bumpAppBadge(unread);
      }
    })()
  );
});

// Browser may rotate the push endpoint (common on mobile) — keep DB in sync.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        let applicationServerKey =
          event.oldSubscription?.options?.applicationServerKey || null;

        if (!applicationServerKey) {
          const publicKey = await fetchVapidPublicKey();
          if (publicKey) {
            applicationServerKey = urlBase64ToUint8Array(publicKey);
          }
        }

        if (!applicationServerKey) {
          await notifyClientsSubscriptionChanged(null);
          return;
        }

        // Ensure a pure ArrayBuffer-backed key for Chromium mobile.
        const keyCopy = new Uint8Array(applicationServerKey);
        const subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyCopy,
        });

        // Prefer direct save from SW (works while app is closed) + notify pages.
        try {
          await persistSubscriptionOnServer(subscription);
        } catch (saveErr) {
          console.error("SW subscription save failed", saveErr);
        }
        await notifyClientsSubscriptionChanged(subscription);
      } catch (err) {
        console.error("pushsubscriptionchange failed", err);
        await notifyClientsSubscriptionChanged(null);
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  let targetUrl;
  try {
    targetUrl = new URL(event.notification.data?.url || "/", self.location.origin);
    if (targetUrl.origin !== self.location.origin) {
      targetUrl = new URL("/", self.location.origin);
    }
  } catch {
    targetUrl = new URL("/", self.location.origin);
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clientList) => {
        for (const client of clientList) {
          if (!("url" in client)) continue;
          try {
            const clientUrl = new URL(client.url);
            if (clientUrl.origin !== self.location.origin) continue;
          } catch {
            continue;
          }

          if ("focus" in client) {
            await client.focus();
          }
          if ("navigate" in client) {
            try {
              await client.navigate(targetUrl.href);
              return;
            } catch {
              // Some mobile browsers block navigate; fall through.
            }
          }
          if (self.clients.openWindow) {
            return self.clients.openWindow(targetUrl.href);
          }
          return;
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl.href);
        }
      })
  );
});
