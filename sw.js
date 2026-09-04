// Service Worker for BABM TASK / B-INDUSTRIES (PWA Cache & Web Push Notifications)
const CACHE_VERSION = 'v5.0.3';
const CACHE_NAME = `babm-task-app-${CACHE_VERSION}`;
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'manifest.json',
  'sw.js',
  'css/styles.css',
  'js/core.js',
  'js/tabs/dashboard.js',
  'js/tabs/work.js',
  'js/tabs/sales.js',
  'js/tabs/admin.js',
  'js/tabs/projects.js'
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
    }).catch(() => caches.match(e.request))
  );
});
