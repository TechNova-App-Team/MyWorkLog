/**
 * ============================================================
 * TimeTracker Service Worker — v5.0.0
 * ============================================================
 * Philosophie: KEIN Asset-Caching.
 * Alle JS/CSS/HTML kommen immer frisch vom Server.
 * SW existiert nur für:
 *   - PWA-Installierbarkeit
 *   - Offline-Fallback (nur wenn Server komplett weg)
 *   - Push Notifications
 * ============================================================
 */

'use strict';

const SW_VERSION  = 'v5.0.0';
const CACHE_NAME  = `tt-offline-${SW_VERSION}`;
const OFFLINE_URL = './Pages/Info/offline.html';
const DEBUG       = true;

const log  = (...a) => DEBUG && console.log('[SW]', ...a);
const warn = (...a) => DEBUG && console.warn('[SW]', ...a);

// ─────────────────────────────────────────────
// INSTALL — nur Offline-Page cachen
// ─────────────────────────────────────────────

self.addEventListener('install', event => {
  log('Install', SW_VERSION);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.add(OFFLINE_URL).catch(() => {}))
      .then(() => self.skipWaiting()) // Sofort aktiv — kein Warten nötig
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
          .map(key => {
            log('Delete old cache:', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────
// FETCH — alles direkt vom Netzwerk, kein Caching
// ─────────────────────────────────────────────

self.addEventListener('fetch', event => {
  const { request } = event;

  // Nur GET behandeln
  if (request.method !== 'GET') return;

  // HTML-Navigation: Network, bei Fehler → Offline-Page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(OFFLINE_URL))
          ?? new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  // ALLES ANDERE (JS, CSS, Bilder etc.):
  // SW greift NICHT ein → Browser-natives HTTP-Caching greift
  // → Ctrl+Shift+R lädt alles frisch, normaler Reload nutzt Browser-Cache (HTTP ETag/304)
  // → Kein SW-Cache der Probleme macht
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