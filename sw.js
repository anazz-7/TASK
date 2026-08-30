// Service Worker for BABM TASK / B-INDUSTRIES (PWA Cache & Web Push Notifications)
const CACHE_VERSION = 'v4.8.9';
const CACHE_NAME = `babm-task-app-${CACHE_VERSION}`;
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'manifest.json',
  'sw.js'
];

// Install: Cache core PWA app shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Claim clients and clean old cache versions
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-First / Cache Fallback for always-fresh app updates with bulletproof fallback
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith('http')) return;
  e.respondWith(
    fetch(e.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const resClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(e.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return caches.match('index.html').then((htmlRes) => {
          if (htmlRes) return htmlRes;
          return caches.match('./');
        });
      });
    })
  );
});


// Handle Web Push Notifications when app is closed
self.addEventListener('push', (e) => {
  let data = { title: 'BABM TASK Alert', body: 'You have a new update in BABM TASK.' };
  if (e.data) {
    try {
      data = e.data.json();
    } catch (err) {
      data.body = e.data.text();
    }
  }

  const options = {
    body: data.body || 'New business activity notification.',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  e.waitUntil(
    self.registration.showNotification(data.title || 'BABM TASK Alert', options)
  );
});

// Handle Notification Click Action
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  if (e.action === 'close') return;

  const targetUrl = (e.notification.data && e.notification.data.url) ? e.notification.data.url : '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
