// Minimal service worker — only exists so the browser will let this app show
// notifications on mobile (Android Chrome requires a registered service worker
// for the Notifications API to work; it silently fails without one).
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { self.clients.claim(); });
