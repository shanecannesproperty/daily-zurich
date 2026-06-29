// Minimal service worker for browser push / local breaking-news notifications.
// We do NOT register a web-push subscription here — there is no VAPID/FCM
// backend wired up. This worker exists so the page can call
// `registration.showNotification(...)` for in-session breaking alerts, and so
// future server-driven push can be added without changing the client.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Breaking news", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Breaking news";
  const options = {
    body: data.body || "",
    icon: data.icon || "/favicon-192.png",
    badge: data.badge || "/favicon-96.png",
    tag: data.tag || "dc-breaking",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
