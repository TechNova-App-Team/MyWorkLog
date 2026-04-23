// ===== SERVICE WORKER FOR PWA =====
// Stale-While-Revalidate + Cache-First mit aggressiver Cache-Invalidation
// Mobile-optimiert: Updates ohne Hard Refresh

const CACHE_NAME = 'timetracker-v3.5.2';
const RUNTIME_CACHE = 'timetracker-runtime-v3.5.2';
const VERSION_CACHE = 'timetracker-version-v1.1.1';
const SW_DEBUG = true;
const OFFLINE_PAGE = './Pages/Info/offline.html';
const FETCH_TIMEOUT = 8000; // 8s timeout für Netzwerk
const CACHE_MAX_AGE = 86400000; // 1 Tag

// Listen for SKIP_WAITING message + Update checks
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_OLD_CACHES') {
    cleanOldCaches();
  }
  if (event.data?.type === 'CHECK_UPDATE') {
    checkForUpdates();
  }
});

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './Assets/js/icons.js',
  './Assets/js/shortcuts.js',
  './Assets/js/touch-mobile-optimizations.js',
  './Pages/Info/offline.html'
];

// ===== INSTALL EVENT =====
self.addEventListener('install', event => {
  if(SW_DEBUG) console.log('[SW] Installing version:', CACHE_NAME);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Versuche alle Assets zu cachen, Fehler sind OK (z.B. offline während Install)
        return cache.addAll(ASSETS_TO_CACHE)
          .catch(err => {
            if(SW_DEBUG) console.warn('[SW] Partial cache fail (OK):', err.message);
            // Cache mindestens index.html
            return fetch('./index.html').then(r => {
              if(r.ok) return cache.put('./index.html', r);
            }).catch(() => {});
          });
      })
      .then(() => {
        // Sofort aktivieren für schnellere Updates auf Mobile
        return self.skipWaiting();
      })
  );
});

// ===== ACTIVATE EVENT =====
self.addEventListener('activate', event => {
  if(SW_DEBUG) console.log('[SW] Activating, cleaning old caches');

  event.waitUntil(
    cleanOldCaches()
      .then(() => self.clients.claim())
      .then(() => {
        // Benachrichtige Clients über Update
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_ACTIVATED',
              version: CACHE_NAME
            });
          });
        });
      })
  );
});

// ===== FETCH EVENT =====
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip für non-GET Requests
  if (request.method !== 'GET') return;

  // Externe URLs (CDN, externe APIs) → Stale-While-Revalidate
  if (url.origin !== location.origin) {
    return event.respondWith(staleWhileRevalidate(request));
  }

  // HTML/Navigation → Network-First mit Timeout (kritisch für Mobile)
  if (request.mode === 'navigate') {
    return event.respondWith(networkFirstWithTimeout(request, FETCH_TIMEOUT));
  }

  // Cloud/Config JS → Network-First (OAuth/Auth muss aktuell sein)
  if (url.pathname.includes('/Cloud/') || url.pathname.includes('/config/')) {
    return event.respondWith(networkFirstWithTimeout(request, 6000));
  }

  // Statische Assets → Stale-While-Revalidate (schnell + aktuell)
  if (isStaticAsset(request.url)) {
    return event.respondWith(staleWhileRevalidate(request));
  }

  // Standard: Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ===== CACHE STRATEGIES =====

// Stale-While-Revalidate: Beste für PWA - schnell UND aktuell
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // Sofort gecachte Version zurückgeben (Schnelligkeit für Mobile)
  if (cached && isCacheFresh(cached)) {
    // Im Hintergrund neu fetchen
    updateCacheInBackground(request, cache).catch(() => {});
    return cached;
  }

  // Fallback: Versuche Netzwerk, dann Cache
  try {
    const response = await fetchWithTimeout(request, FETCH_TIMEOUT);
    if (response.ok && isCacheableRequest(request)) {
      const cloned = response.clone();
      cache.put(request, cloned).catch(() => {});
    }
    return response;
  } catch (err) {
    // Selbst wenn Cache alt ist, nutzen wir ihn lieber als offline zu gehen
    if (cached) return cached;
    return getOfflineResponse(request);
  }
}

// Network-First mit Timeout für kritische Dateien
async function networkFirstWithTimeout(request, timeout) {
  try {
    const response = await fetchWithTimeout(request, timeout);

    if (response.ok && isCacheableRequest(request)) {
      const cache = await caches.open(RUNTIME_CACHE);
      const cloned = response.clone();
      cache.put(request, cloned).catch(() => {});
    }

    return response;
  } catch (err) {
    if(SW_DEBUG) console.warn('[SW] Network timeout/fail, using cache:', request.url);

    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);

    if (cached) return cached;

    // Fallback zu CACHE_NAME für wichtige Dateien
    const mainCache = await caches.open(CACHE_NAME);
    const mainCached = await mainCache.match(request);
    if (mainCached) return mainCached;

    return getOfflineResponse(request);
  }
}

// Background Cache Update
async function updateCacheInBackground(request, cache) {
  try {
    const response = await fetchWithTimeout(request, FETCH_TIMEOUT);
    if (response.ok && isCacheableRequest(request)) {
      const cloned = response.clone();
      await cache.put(request, cloned);
    }
  } catch (err) {
    if(SW_DEBUG) console.log('[SW] Background update failed (OK):', request.url);
  }
}

// ===== OFFLINE RESPONSE =====
async function getOfflineResponse(request) {
  // Für Navigation (HTML): Offline-Page
  if (request.mode === 'navigate') {
    const cache = await caches.open(CACHE_NAME);
    return cache.match(OFFLINE_PAGE) || new Response('Offline', { status: 503 });
  }

  // Für andere Requests: Generic Offline Response
  return new Response('Offline - Bitte überprüfe deine Verbindung', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: new Headers({
      'Content-Type': 'text/plain'
    })
  });
}

// ===== UTILITIES =====
function isStaticAsset(url) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/.test(url);
}

// Check ob Request gecacht werden kann (nur http/https, nicht chrome-extension, etc.)
function isCacheableRequest(request) {
  try {
    const url = new URL(request.url);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (err) {
    return false;
  }
}

// ===== MESSAGE HANDLING (für Client-Communication) =====
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        caches.delete(cacheName);
      });
    });
  }
});

// ===== PUSH NOTIFICATIONS (Optional) =====
self.addEventListener('push', event => {
  
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'TimeTracker Benachrichtigung',
    icon: './Grafiken/icon-192.svg',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%23a855f7" width="192" height="192"/><text x="96" y="96" font-size="120" fill="%23fff" text-anchor="middle" dominant-baseline="middle">⏱️</text></svg>',
    tag: data.tag || 'timetracker-notification',
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'TimeTracker', options)
  );
});

// ===== NOTIFICATION CLICK =====
self.addEventListener('notificationclick', event => {
  
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Nutzer-Fenster bringen in den Vordergrund
      for (let i = 0; i < clientList.length; i++) {
        if (clientList[i].url === '/' && 'focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }
      // Fallback: App neu öffnen
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});


