// Service Worker for Filkom Merch Web Push Notifications

self.addEventListener("push", function (event) {
  if (!event.data) return;

  try {
    let data = {};
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: "Filkom Merch Notification",
        body: event.data.text(),
      };
    }

    // Skenario Unsend / Recall Notifikasi (Tarik Notifikasi HP)
    if (data.action === "CANCEL" || data.type === "CANCEL") {
      const tagToCancel = data.tag || (data.notifId ? `notif-${data.notifId}` : null);
      event.waitUntil(
        self.registration.getNotifications().then(function (notifications) {
          notifications.forEach(function (notification) {
            if (!tagToCancel || notification.tag === tagToCancel || notification.data?.notifId === data.notifId) {
              notification.close();
            }
          });
        })
      );
      return;
    }

    const title = data.title || "Filkom Merch Notification";
    const notifTag = data.tag || (data.id ? `notif-${data.id}` : `fm-${Date.now()}`);

    const options = {
      body: data.body || "",
      icon: data.icon || "/logo-fm.png",
      badge: data.badge || "/pwa-192x192.png",
      tag: notifTag,
      renotify: true,
      vibrate: [200, 100, 200],
      data: {
        url: data.data?.url || data.url || "/",
        notifId: data.id,
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("[ServiceWorker] Error receiving push event:", err);
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const rawUrl = event.notification.data?.url || "/";
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // If a window tab with matching origin is already open, focus it and navigate
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      // Otherwise open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
