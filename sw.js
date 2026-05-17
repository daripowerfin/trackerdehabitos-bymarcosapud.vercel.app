// sw.js — Service Worker Tracker de Hábitos Biohacker v4
const CACHE = 'bh-tracker-v4';

// ─── Install & cache ────────────────────────────────────────────
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// ─── Notification from page ─────────────────────────────────────
// Page sends {type:'SHOW_NOTIF', title, body} via postMessage
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SHOW_NOTIF') {
    const { title, body } = e.data;
    e.waitUntil(
      self.registration.showNotification(title || 'Tracker de Hábitos Biohacker', {
        body: body || '¡Es hora de tus hábitos!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'bh-daily-reminder',
        renotify: true,
        requireInteraction: false,
        vibrate: [200, 100, 200],
        actions: [
          { action: 'open', title: '⚡ Abrir app' },
          { action: 'dismiss', title: 'Cerrar' }
        ]
      })
    );
  }
});

// ─── Notification click ─────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Focus existing window if open
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      return clients.openWindow('/');
    })
  );
});

// ─── Push event (for future server-side push) ───────────────────
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Tracker de Hábitos Biohacker', {
      body: data.body || '¡Es hora de tus hábitos!',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'bh-push',
      renotify: true,
      vibrate: [200, 100, 200]
    })
  );
});
