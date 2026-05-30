/**
 * ============================================================
 * TimeTracker Service Worker — v5.4.5
 * ============================================================
 * Strategie: Stale-While-Revalidate für eigene JS/CSS/Assets.
 * → Erster Aufruf: aus Cache (instant) + Hintergrund-Update
 * → Neuer SW: alten Cache löschen → Update-Toast zeigen
 * → CDN-Scripts (supabase, emailjs etc.): nicht cachen
 * ============================================================
 */

'use strict';

const SW_VERSION  = 'v5.4.5';
const CACHE_NAME  = `tt-cache-${SW_VERSION}`;
const OFFLINE_URL = './offline/';
const DEBUG       = true;

const log  = (...a) => DEBUG && console.log('[SW]', ...a);
const warn = (...a) => DEBUG && console.warn('[SW]', ...a);

// Dateitypen die gecacht werden (nur eigener Origin)
const CACHEABLE_EXTS = new Set(['js', 'css', 'html', 'png', 'svg', 'jpg',
                                 'jpeg', 'webp', 'ico', 'woff', 'woff2',
                                 'json', 'mp4', 'txt']);

// Analytics/Tracking-Domains NICHT cachen (dynamische Responses)
// Versioned CDN-Libraries (jsdelivr, cdnjs) werden gecacht — sie ändern sich nie
const NO_CACHE_ORIGINS = [
  'cloud.umami.is',
  'api-gateway.umami.dev',
  'fonts.googleapis.com',   // dynamische Font-CSS, nicht cachen
];

function isCacheable(url) {
  const u = new URL(url);
  if (NO_CACHE_ORIGINS.some(d => u.hostname.includes(d))) return false;
  const ext = u.pathname.split('.').pop().toLowerCase();
  return CACHEABLE_EXTS.has(ext);
}

// ─────────────────────────────────────────────
// INSTALL — Offline-Page vorab cachen
// ─────────────────────────────────────────────

self.addEventListener('install', event => {
  log('Install', SW_VERSION);
  // Kein skipWaiting() hier — der SW wartet, bis apply() ihn via SKIP_WAITING-Message aktiviert.
  // Dadurch ist der neue SW garantiert aktiv, bevor location.reload() ausgelöst wird.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.add(OFFLINE_URL).catch(() => {}))
  );
});

// ─────────────────────────────────────────────
// ACTIVATE — alte Caches löschen, sofort übernehmen
// ─────────────────────────────────────────────

self.addEventListener('activate', event => {
  log('Activate', SW_VERSION);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => { log('Delete old cache:', key); return caches.delete(key); })
      ))
      .then(async () => {
        // Gecachte URLs mit /pages/ löschen (alte Pfade die nie mehr gültig sind)
        const cache = await caches.open(CACHE_NAME);
        const requests = await cache.keys();
        await Promise.all(
          requests
            .filter(req => req.url.includes('/pages/'))
            .map(req => { log('Purge stale pages/ URL:', req.url); return cache.delete(req); })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────
// FETCH — Stale-While-Revalidate für eigene Assets
// ─────────────────────────────────────────────

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // HTML-Navigation: Network-First mit cache:'no-store' → bypassed Browser-HTTP-Cache komplett.
  // Verhindert, dass bei Cloudflare-Deployments ein 304-Hit alten HTML-Content liefert.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(new Request(request, { cache: 'no-store' }))
        .then(response => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(request))
            ?? (await cache.match(OFFLINE_URL))
            ?? new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // CDN und nicht-cacheable: direkt ans Netz
  if (!isCacheable(request.url)) return;
  // /pages/-Pfade nie cachen (werden von Cloudflare umgeschrieben)
  if (new URL(request.url).pathname.startsWith('/pages/')) return;

  // Eigene Assets: Stale-While-Revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(request);

      const fetchPromise = fetch(request).then(response => {
        if (response.status === 200) cache.put(request, response.clone());
        return response;
      }).catch(() => null);

      // Sofort aus Cache antworten, im Hintergrund updaten
      return cached ?? await fetchPromise;
    })
  );
});

// ─────────────────────────────────────────────
// MESSAGES
// ─────────────────────────────────────────────

self.addEventListener('message', event => {
  switch (event.data?.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_VERSION':
      event.source?.postMessage({ type: 'VERSION_INFO', version: SW_VERSION });
      break;
  }
});

// ─────────────────────────────────────────────
// PUSH NOTIFICATIONS
// ─────────────────────────────────────────────

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() ?? {}; } catch { data = { body: event.data?.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'TimeTracker', {
      body:               data.body ?? 'Neue Benachrichtigung',
      icon:               './Grafiken/icon-192.svg',
      tag:                data.tag  ?? 'timetracker',
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(list => list[0] ? list[0].focus() : self.clients.openWindow('/'))
  );
});
