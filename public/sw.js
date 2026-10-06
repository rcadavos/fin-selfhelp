/* OmniTrak service worker — makes the PWA installable and shows reminder push
   notifications. All requests go to the network. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

/* Payload shape: { title, body, url, tag, icon } — built by src/lib/push.ts. */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const tag = typeof data.tag === "string" && data.tag ? data.tag : undefined;
  event.waitUntil(
    self.registration.showNotification(data.title || "OmniTrak", {
      body: data.body || "",
      icon: data.icon || "/favicon.png",
      tag,
      // A push that replaces one with the same tag still buzzes the device.
      renotify: Boolean(tag),
      data: { url: data.url || "/account/notifications" },
    })
  );
});

/* Opens the page the push points at — reusing an open OmniTrak window if there is one. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const origin = self.location.origin;
  let target = new URL("/", origin);
  try {
    const candidate = new URL(event.notification.data?.url || "/", origin);
    if (candidate.origin === origin) target = candidate;
  } catch {
    /* keep the home page */
  }

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = windows.find((client) => new URL(client.url).origin === origin);
      if (existing) {
        await existing.focus();
        if ("navigate" in existing) {
          try {
            await existing.navigate(target.href);
            return;
          } catch {
            /* an uncontrolled window cannot be navigated from here; open a new one */
          }
        } else {
          return;
        }
      }
      await self.clients.openWindow(target.href);
    })()
  );
});
