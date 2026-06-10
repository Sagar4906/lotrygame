const CACHE_NAME = 'number-guesser-v1';
const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'icon.svg'
];

self.addEventListener('install', event => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', event => {
  // Take control of uncontrolled clients immediately
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  
  // Exclude API requests from SW cache
  const url = new URL(event.request.url);
  if (url.pathname.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Return cached version immediately for instant loads
        // Fetch new version in background to update cache (stale-while-revalidate)
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {
          // Ignore network errors in background revalidation
        });
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(event.request).catch(err => {
        // If navigation request fails (e.g. PC server is offline), fall back to cached index.html
        if (event.request.mode === 'navigate') {
          return caches.match('index.html') || caches.match('./') || caches.match('/');
        }
        throw err;
      });
    })
  );
});
