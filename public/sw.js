/* Build_PRO_MAX_1 Service Worker
   Cache-first strategy for offline support */

const CACHE_NAME = 'build-pro-max-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/liquid_glass.png',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Some assets may not exist yet (e.g., built JS/CSS)
        // That's OK — they'll be cached on first fetch
      });
    })
  );
  self.skipWaiting();
});

// Activate: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first for static, network-first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external API calls (OpenRouter, Google, fonts, etc.)
  if (
    url.hostname.includes('openrouter.ai') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('allorigins.win') ||
    url.hostname.includes('corsproxy.io')
  ) {
    return;
  }

  // Cache-first for static assets and app shell
  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.json') ||
    url.pathname === '/' ||
    url.pathname === '/index.html'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        }).catch(() => {
          // Fallback to app shell for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }

  // Network-first for everything else
  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clone);
        });
      }
      return response;
    }).catch(() => {
      return caches.match(request);
    })
  );
});

// Background sync for offline actions (future)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-state') {
    event.waitUntil(syncState());
  }
});

async function syncState() {
  // Placeholder for future cross-device sync
  // Would read from IndexedDB and push to server
}
