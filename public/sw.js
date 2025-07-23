// public/sw.js
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('selfpay-cache-v1').then(cache => {
      return cache.addAll([
        '/',
        '/splashscreen.jsx',
        '/manifest.json',
        '/icons/icon-192.png',
        '/icons/icon-512.png',
        // Ajoute ici les autres fichiers nécessaires
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
