const DEFAULT_ICON = "/logo-192.png";
const DEFAULT_BADGE = "/logo-96.png";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

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
  const url = payload.url || "/";
  const options = {
    body: payload.body || "You have a new notification.",
    icon: payload.icon || DEFAULT_ICON,
    badge: payload.badge || DEFAULT_BADGE,
    tag: payload.tag || "stress-saviors",
    renotify: true,
    vibrate: [120, 60, 120],
    // Keep visible a bit longer on desktop; mobile OS still controls tray behavior.
    requireInteraction: false,
    data: {
      ...(payload.data || {}),
      url,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
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
      // Prefer focusing an existing tab on the same origin (desktop + mobile PWA).
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
          } catch {
            // Some mobile browsers block navigate; fall through to openWindow.
          }
        }
        return;
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl.href);
      }
    })
  );
});
