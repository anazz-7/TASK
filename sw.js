// Service Worker for BABM TASK / B-INDUSTRIES (Web Push Notifications)
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { self.clients.claim(); });

// Handle Web Push Notifications when the app/site is closed
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
