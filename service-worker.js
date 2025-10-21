// Minimal service worker to make the PWA installable
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  self.skipWaiting(); // activate immediately
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  clients.claim();
});

// A fetch event is REQUIRED for installability in Chrome
self.addEventListener('fetch', (event) => {
  // For now, just let network requests pass through
});
