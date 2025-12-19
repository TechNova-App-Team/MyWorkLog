// ===== SERVICE WORKER FOR PWA =====
// Cache-First Strategy für Assets, Network-First für API/Data

const CACHE_NAME = 'timetracker-v1';
const RUNTIME_CACHE = 'timetracker-runtime-v1';
const OFFLINE_PAGE = './Pages/Info/offline.html';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './Config/manifest.json',
  './Assets/js/icons.js',
  './Assets/js/shortcuts.js',
  './Assets/js/touch-mobile-optimizations.js',
  './Pages/Info/offline.html'
];

// ===== INSTALL EVENT =====
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[Service Worker] Some assets could not be cached:', err);
        // Teilweises Caching erlauben (nicht alle Assets müssen sofort verfügbar sein)
        return Promise.resolve();
      });
    }).then(() => {
      console.log('[Service Worker] Install complete');
      return self.skipWaiting(); // Alte Worker sofort ersetzen
    })
  );
});

// ===== ACTIVATE EVENT =====
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Activation complete');
      return self.clients.claim(); // Neuer Worker übernimmt alle Clients
    })
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
    console.log('[Cache] HIT:', request.url);
    return cached;
  }

  try {
    console.log('[Cache] MISS, fetching from network:', request.url);
    const response = await fetch(request);
    
    if (response.ok && request.method === 'GET') {
      const cloned = response.clone();
      cache.put(request, cloned);
    }
    
    return response;
  } catch (err) {
    console.error('[Cache] Network failed:', err);
    return getOfflineResponse(request);
  }
}

// Network-First: Immer aktuell, Fallback auf Cache
async function networkFirst(request) {
  try {
    console.log('[Network] Fetching:', request.url);
    const response = await fetch(request);
    
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(RUNTIME_CACHE);
      const cloned = response.clone();
      cache.put(request, cloned);
    }
    
    return response;
  } catch (err) {
    console.warn('[Network] Failed, using cache:', request.url);
    
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
  console.log('[Push] Received notification');
  
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'TimeTracker Benachrichtigung',
    icon: './manifest.json', // Wird durch PWA-Icon ersetzt
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
  console.log('[Notification] Clicked:', event.notification.tag);
  
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

// ===== LOGGING =====
console.log('[Service Worker] Loaded and ready!');
