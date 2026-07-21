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
  const options = {
    body: payload.body || "You have a new notification.",
    icon: payload.icon || DEFAULT_ICON,
    badge: payload.badge || DEFAULT_BADGE,
    tag: payload.tag,
    renotify: Boolean(payload.tag),
    data: {
      ...payload.data,
      url: payload.url || "/",
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
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clientList) => {
        for (const client of clientList) {
          if ("navigate" in client) {
            await client.navigate(targetUrl.href);
          }
          if ("focus" in client) return client.focus();
        }
        return self.clients.openWindow(targetUrl.href);
      })
  );
});
