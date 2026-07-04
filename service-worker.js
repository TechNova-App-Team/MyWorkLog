/**
 * ============================================================
 * TimeTracker Service Worker — Version aus ?v=<version.json> (siehe SW_VERSION unten)
 * ============================================================
 * Strategie: Network-First für alle eigenen Assets (JS/CSS/HTML).
 * → Immer frisch vom Server (ETag-Prüfung via cache:'no-cache')
 * → SW-Cache nur als Offline-Fallback
 * → CDN-Scripts (supabase, emailjs etc.): nicht cachen
 * ============================================================
 */

'use strict';

// SW-Version wird aus dem Registrierungs-Query gelesen (`service-worker.js?v=<version>`),
// den onboarding.js aus config/version.json füllt. So gibt es EINE Quelle der Wahrheit:
// nur version.json bumpen → Registrierungs-URL ändert sich → neuer SW installiert sich →
// liest hier automatisch dieselbe Version. Kein manueller SW-Bump mehr nötig.
const SW_VERSION  = (function () {
  try { return new URL(self.location.href).searchParams.get('v') || 'dev'; }
  catch (e) { return 'dev'; }
})();
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
  'static.cloudflareinsights.com',
  'cloudflareinsights.com',
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
  // KEIN skipWaiting() hier — würde sonst jeden neuen SW automatisch aktivieren,
  // controllerchange feuert, der Update-Banner erkennt das fälschlich als "neues Update"
  // und zeigt sich nach jedem Apply wieder an (Endlosloop). Cache-Strategie ist sowieso
  // cache:'reload' → bypassed Browser-Cache komplett, also keine Version-Mismatch-Gefahr.
  // skipWaiting wird vom Banner-Apply-Flow via postMessage SKIP_WAITING getriggert.
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
// FETCH — Network-First für alle eigenen Assets
// ─────────────────────────────────────────────

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Nur http/https verarbeiten. chrome-extension://, data:, blob:, ws: etc. lassen sich
  // nicht in die Cache API legen → c.put() wirft "Request scheme ... is unsupported".
  // Solche Requests (z.B. von Browser-Extensions) einfach durchreichen.
  if (!/^https?:$/.test(new URL(request.url).protocol)) return;

  // HTML-Navigation: Network-First mit cache:'reload' → bypassed Browser-HTTP-Cache komplett.
  // Verhindert, dass bei Cloudflare-Deployments ein 304-Hit alten HTML-Content liefert.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(new Request(request, { cache: 'reload' }))
        .then(response => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone)).catch(() => {});
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

  // Eigene Assets: Network-First, Browser-HTTP-Cache komplett umgehen.
  // cache:'reload' = ignoriert HTTP-Cache total → holt immer frisch vom Netz/CDN.
  // Wichtig: Bisheriger 'no-cache' respektiert "immutable"-Header in einigen Browsern
  // und liefert dann jahrelang Stale-Content. 'reload' bricht das auf.
  // SW-Cache wird nur als Offline-Fallback genutzt.
  event.respondWith(
    fetch(new Request(request, { cache: 'reload' }))
      .then(response => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request)) ?? new Response('', { status: 503 });
      })
  );
});

// ─────────────────────────────────────────────
// MESSAGES
// ─────────────────────────────────────────────

self.addEventListener('message', event => {
  switch (event.data?.type) {
    case 'SKIP_WAITING':
      // Erst alle alten Caches löschen, DANN aktivieren.
      // Selbst wenn der alte apply()-Code sofort location.reload() aufruft (Race Condition),
      // findet der alte SW beim Reload leere Caches → holt alles frisch vom Netz.
      caches.keys()
        .then(keys => Promise.all(
          keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        ))
        .then(() => self.skipWaiting());
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
      icon:               './Grafiken/icon-192.png',
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
