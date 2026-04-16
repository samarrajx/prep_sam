/* ══════════════════════════════════════════════
   Samar Raj — MMA Prep Plan · service-worker.js
   Network-First Strategy · High-Availability Auto-Update
════════════════════════════════════════════════ */

'use strict';

const CACHE_NAME = 'mma-prep-v2';

// Essential files for offline fallback
const PRECACHE_URLS = [
  './',
  './index.html',
  './script.js',
  './style-extra.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* ── INSTALL: Pre-cache & Immediate Activation ── */
self.addEventListener('install', event => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .catch(err => console.warn('[SW] Pre-cache error (non-fatal):', err))
  );
});

/* ── ACTIVATE: Clean up old caches immediately ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim())  // Take control of all open clients immediately
  );
});

/* ── FETCH: Network-First with Cache Fallback ── */
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and non-http(s) requests
  if (!request.url.startsWith('http')) return;

  // STRATEGY: Network First
  event.respondWith(
    fetch(request)
      .then(networkResponse => {
        // If network succeeds, cache it for future offline use
        if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
        }
        return networkResponse;
      })
      .catch(async () => {
        // Network failed (offline) — return from cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;

        // If not in cache and it's a page request, return index as fallback
        if (request.mode === 'navigate') {
          return await caches.match('./index.html');
        }

        return new Response('Offline — please reconnect.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});
