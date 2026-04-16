/* ══════════════════════════════════════════════
   Samar Raj — MMA Prep Plan · service-worker.js
   Cache-first strategy · Offline after first load
════════════════════════════════════════════════ */

'use strict';

const CACHE_NAME = 'samar-mma-v1';

// All assets to pre-cache on install
const PRECACHE_URLS = [
  './',
  './index.html',
  './script.js',
  './style-extra.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Google Fonts — cached on first use (see fetch handler)
];

/* ── INSTALL: Pre-cache core assets ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())   // Activate immediately
      .catch(err => console.warn('[SW] Pre-cache error (non-fatal):', err))
  );
});

/* ── ACTIVATE: Clean up old caches ── */
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
      .then(() => self.clients.claim())  // Take control of all open clients
  );
});

/* ── FETCH: Cache-first with network fallback ── */
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and non-http(s) requests
  if (!request.url.startsWith('http')) return;

  // For Google Fonts — stale-while-revalidate (fonts don't change)
  if (
    request.url.includes('fonts.googleapis.com') ||
    request.url.includes('fonts.gstatic.com')
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // For all other requests — cache-first
  event.respondWith(cacheFirst(request));
});

/* ── STRATEGY: Cache-first ── */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;

  try {
    const networkResponse = await fetch(request);
    // Only cache valid responses
    if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (_) {
    // Network failed — return offline fallback if available
    const fallback = await caches.match('./index.html');
    return fallback || new Response('Offline — please reload when connected.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/* ── STRATEGY: Stale-while-revalidate (for fonts) ── */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse && networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);  // If network fails, cached is fine

  return cachedResponse || fetchPromise;
}
