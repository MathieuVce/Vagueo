const CACHE = 'vagueo-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Push notifications (triggered from main thread or future server push)
self.addEventListener('push', (e) => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Vaguéo', {
      body: data.body || "C'est votre tour — approchez-vous du stand !",
      icon: '/icon-192.png',
      tag: 'vagueo-turn',
      renotify: true,
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then((wins) => {
      const open = wins.find((w) => w.url.includes(self.location.origin));
      return open ? open.focus() : clients.openWindow('/');
    })
  );
});
