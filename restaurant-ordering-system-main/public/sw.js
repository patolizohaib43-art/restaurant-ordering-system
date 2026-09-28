/**
 * Restaurant Online Ordering — Service Worker (Phase 6)
 *
 * Scope of this service worker is intentionally narrow:
 *  - It ONLY caches safe, public, static assets (app shell CSS/JS chunks,
 *    icons, the manifest, fonts).
 *  - It NEVER caches admin routes, admin API responses, order data,
 *    notifications, or authentication responses.
 *  - It does NOT make the ordering system appear to work offline. If a
 *    navigation request fails while offline, we show a clear, honest
 *    offline fallback page instead of a stale/broken screen.
 *
 * Bump CACHE_VERSION whenever the caching strategy changes so old
 * caches are cleaned up on activate.
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `restaurant-static-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Never touch these paths — always go straight to the network.
const NEVER_CACHE_PREFIXES = ['/api/', '/admin', '/sw.js'];

const PRECACHE_URLS = [OFFLINE_URL, '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

function isNeverCached(pathname) {
  return NEVER_CACHE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/icons/') ||
    pathname === '/manifest.json'
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isNeverCached(url.pathname)) return; // let the network handle it, no SW interference

  // Page navigations: try the network first (always fresh menu/prices/
  // order status), fall back to a clear offline page only if the
  // network is genuinely unreachable.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Static, immutable-ish assets: cache-first for speed, refreshed in
  // the background (stale-while-revalidate).
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request)
            .then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
            .catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
  }
});

/**
 * Web Push (Phase 11) — real background notifications for new orders.
 *
 * This fires whenever a push message arrives from the server, INCLUDING
 * when no admin tab is open at all — this is the actual mechanism that
 * makes a browser-closed Android notification possible. A plain
 * `new Notification(...)` call from page JavaScript cannot do this; it
 * requires nothing be running except the browser's own push service.
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Zaiqa-e-Sindh', body: event.data.text() };
  }

  const title = payload.title || 'Zaiqa-e-Sindh';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag || 'new-order',
    // A fresh order notification should always be seen even if an
    // identical-tag one is still showing, but shouldn't re-vibrate on
    // every single poll — renotify + tag together achieve that.
    renotify: true,
    data: payload.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/** Tapping the notification focuses an existing admin tab if one is open
 * (navigating it to the order), or opens a new one if not. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/admin/orders';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

/** If the push service invalidates a subscription (device unsubscribed,
 * browser data cleared, etc.), it fires this instead of a push — clean
 * up server-side too so we stop trying to send to a dead endpoint. */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        await fetch('/api/admin/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: event.oldSubscription ? event.oldSubscription.endpoint : null }),
        });
      } catch {
        // Best-effort — nothing more we can do from here.
      }
    })()
  );
});
