// sw.js — Service Worker Tracker de Hábitos Biohacker v5
// Cachea la app para que abra sin internet, SIN interferir con la sincronización.
const CACHE = 'bh-tracker-v5';

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // NUNCA tocar sincronización/backend ni servicios externos (QR, fuentes):
  // van SIEMPRE a la red, sin caché.
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
    return;
  }

  if (req.method !== 'GET') return;

  // Navegación: red primero; si no hay internet, servir index cacheado.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('/index.html').then(r => r || caches.match('/')))
    );
    return;
  }

  // Resto de recursos propios: caché primero, si no está, red (y se guarda).
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
        }
        return resp;
      }).catch(() => cached);
    })
  );
});

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

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});

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
