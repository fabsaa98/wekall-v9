// Service Worker — WeKall Intelligence v24
// Network-first: siempre datos frescos, fallback a caché solo si offline
const CACHE_NAME = 'wekall-intelligence-v24';
const OFFLINE_FALLBACK = '/';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([OFFLINE_FALLBACK, '/manifest.json', '/icon-192.png', '/icon-512.png'])
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // No interceptar llamadas a APIs externas (Supabase, Worker proxy)
  const url = new URL(event.request.url);
  if (url.hostname.includes('supabase') || url.hostname.includes('workers.dev')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Guardar en caché solo respuestas OK
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match(OFFLINE_FALLBACK)))
  );
});
