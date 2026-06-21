const CACHE_NAME = 'gallamitra-cache-v2';
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
    pathname.startsWith('/__vite') ||      // Vite internal endpoints
    pathname.startsWith('/node_modules') ||
    searchParams.has('t') ||               // Vite HMR timestamp query (?t=...)
    searchParams.has('import') ||          // ES module imports
    url.protocol === 'ws:' ||              // WebSocket connections
    url.protocol === 'wss:'
  );
};

// Installation event: Pre-cache core shell resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 PWA Service Worker caching core assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activation event: Purge old cache instances
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('🧹 Removing stale cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch intercept: Cache-first/Stale-while-revalidate for static assets
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip: non-GET, non-HTTP/HTTPS, API routes, and ALL Vite dev-server internal requests
  // Returning without respondWith() lets the browser handle natively
  if (
    event.request.method !== 'GET' ||
    !requestUrl.protocol.startsWith('http') ||
    requestUrl.pathname.startsWith('/api') ||
    isViteDevRequest(requestUrl)
  ) {
    return;
  }

  // Assets & Web Content: Stale-While-Revalidate caching pipeline
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch updated version in the background to sync for next load
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Ignore bg fetch fail */});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback for navigation requests only
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
