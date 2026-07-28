const DEFAULT_ICON = "/logo-192.png";
const DEFAULT_BADGE = "/logo-96.png";
const DEFAULT_SOUND = "/bell.wav";
// Bump when push behavior changes so installed PWAs pick up the new worker.
const SW_VERSION = "ss-push-v2";

function absoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return undefined;
  try {
    return new URL(pathOrUrl, self.location.origin).href;
  } catch {
    return pathOrUrl;
  }
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      // Touch cache key so browsers treat this as an updated worker.
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

/** Ask open pages to re-save a refreshed push subscription to the server. */
async function notifyClientsSubscriptionChanged(subscription) {
  const clientList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  const payload = {
    type: "PUSH_SUBSCRIPTION_CHANGED",
    subscription: subscription ? subscription.toJSON() : null,
  };
  for (const client of clientList) {
    client.postMessage(payload);
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
    sound: absoluteUrl(payload.sound || DEFAULT_SOUND),
    silent: false,
    tag: payload.tag || "stress-saviors",
    renotify: true,
    vibrate: [120, 60, 120],
    requireInteraction: false,
    data: {
      ...(payload.data || {}),
      url,
      sound: absoluteUrl(payload.sound || DEFAULT_SOUND),
    },
  };

  event.waitUntil(
    (async () => {
      // Always show a tray notification (even if a tab is open) so mobile
      // users get the system chime when the PWA is backgrounded / closed.
      await self.registration.showNotification(title, options);
      // Custom /bell.wav only works while an app window can play audio.
      await notifyClientsToPlaySound();
    })()
  );
});

// Browser may rotate the push endpoint (common on mobile) — keep DB in sync.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const applicationServerKey = event.oldSubscription?.options?.applicationServerKey;
        const subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
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
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clientList) => {
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
        // Fallback: open target in this client context if navigate failed
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
