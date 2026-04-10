// ===== SERVICE WORKER FOR PWA =====
// Cache-First Strategy für Assets, Network-First für API/Data
// VERSION BUMP: Force cache invalidation

const CACHE_NAME = 'timetracker-v1.13.3';
const RUNTIME_CACHE = 'timetracker-runtime-v1.13.3';
const SW_DEBUG = false;
const OFFLINE_PAGE = './Pages/Info/offline.html';

// Listen for SKIP_WAITING message from Update Manager
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
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
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        if(SW_DEBUG) console.warn('[SW] Cache partial fail:', err);
        return Promise.resolve();
      });
    }).then(() => self.skipWaiting())
  );
});

// ===== ACTIVATE EVENT =====
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ===== FETCH EVENT =====
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Externe URLs (CDN, externe APIs) → Network-First
  if (url.origin !== location.origin) {
    return event.respondWith(networkFirst(request));
  }

  // HTML → Network-First (für Updates)
  if (request.mode === 'navigate') {
    return event.respondWith(networkFirst(request));
  }

  // Cloud/Config JS → Network-First (OAuth etc. muss aktuell sein)
  if (url.pathname.includes('/Cloud/') || url.pathname.includes('/config/')) {
    return event.respondWith(networkFirst(request));
  }

  // Statische Assets (CSS, JS, bilder) → Cache-First
  if (isStaticAsset(request.url)) {
    return event.respondWith(cacheFirst(request));
  }

  // Standard: Cache mit Network Fallback
  event.respondWith(cacheFirst(request));
});

// ===== CACHE STRATEGIES =====

// Cache-First: Schneller, aber möglicherweise veraltet
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    
    if (response.ok && request.method === 'GET' && isCacheableRequest(request)) {
      const cloned = response.clone();
      cache.put(request, cloned).catch(() => {});
    }
    
    return response;
  } catch (err) {
    return getOfflineResponse(request);
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok && request.method === 'GET' && isCacheableRequest(request)) {
      const cache = await caches.open(RUNTIME_CACHE);
      const cloned = response.clone();
      cache.put(request, cloned).catch(() => {});
    }
    
    return response;
  } catch (err) {
    
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }

    return getOfflineResponse(request);
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


