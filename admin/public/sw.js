const CACHE_NAME = 'gallamitra-admin-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/logo.png',
  '/logo-192.png',
  '/logo-512.png',
  '/logo-maskable.png',
  '/manifest.json'
];

// URLs/patterns that must NEVER be intercepted by the SW
const isViteDevRequest = (url) => {
  const { pathname, searchParams } = url;
  return (
    pathname.startsWith('/@') ||           // Vite virtual modules
    pathname.startsWith('/__vite') ||      // Vite internal
    pathname.startsWith('/node_modules') ||
    searchParams.has('t') ||               // Vite HMR timestamp query (?t=...)
    searchParams.has('import') ||          // ES module imports
    url.protocol === 'ws:' ||              // WebSocket
    url.protocol === 'wss:'
  );
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Admin Service Worker caching assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('🧹 Removing old admin cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip non-GET, non-HTTP/HTTPS, API routes, and ALL Vite dev-server requests
  if (
    event.request.method !== 'GET' ||
    !requestUrl.protocol.startsWith('http') ||
    requestUrl.pathname.startsWith('/api') ||
    isViteDevRequest(requestUrl)
  ) {
    return; // Let browser handle natively — do NOT call event.respondWith()
  }

  // Cache-first with background update for other GET requests
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Background revalidation
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback — only for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
