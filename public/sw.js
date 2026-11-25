// Service worker for push notifications. It runs even when the app is closed or in the background.
// Bump this when the file changes so browsers pick up the new version promptly.
const SW_VERSION = '2026-11-26';
const APP_NAME = 'Fitness With Oliul Azim';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: APP_NAME, body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || APP_NAME;
  // Every push must show a notification: iOS and Chrome penalise silent pushes.
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      icon: payload.icon || '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: payload.tag,
      renotify: Boolean(payload.tag),
      timestamp: Date.now(),
      vibrate: [80, 40, 80],
      data: { url: payload.url || '/', notificationId: payload.notificationId, v: SW_VERSION }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          client.postMessage({ type: 'open-notification', notificationId: event.notification.data?.notificationId });
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

// Browsers occasionally rotate push subscriptions. Re-subscribe with the same key straight away;
// the app saves the new subscription to the server the next time it opens (refreshPushSubscription).
self.addEventListener('pushsubscriptionchange', (event) => {
  const key = event.oldSubscription?.options?.applicationServerKey;
  if (!key) return;
  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey: key })
      .then(() =>
        self.clients.matchAll({ type: 'window' }).then((windows) =>
          windows.forEach((client) => client.postMessage({ type: 'push-subscription-changed' }))
        )
      )
      .catch(() => undefined)
  );
});
