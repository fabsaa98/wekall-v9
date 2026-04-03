// Service Worker limpio — sin caché de rutas hardcodeadas
const CACHE_NAME = 'wekall-intelligence-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Eliminar todos los caches viejos (wekall-v9, v1, v2...)
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[SW] Eliminando cache viejo:', k);
        return caches.delete(k);
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Network-first: siempre pedir al servidor, fallback a caché solo si offline
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
