/**
 * ============================================================
 * TimeTracker Service Worker — Version aus ?v=<version.json> (siehe SW_VERSION unten)
 * ============================================================
 * Strategie:
 * → HTML-Navigation: Network-First (cache:'reload') — die Seite muss die neuen
 *   ?v=-Nummern mitbringen, sonst greift unten nie ein Miss.
 * → Eigene Assets (JS/CSS/Bilder/Medien): Cache-First. Die Referenzen tragen
 *   ?v=<version> (tools/stamp-assets.js), eine neue Version ist also eine neue URL
 *   und im versionsgebundenen CACHE_NAME zwangsläufig ein Miss.
 * → /config/ und /pages/: nie aus dem Cache (siehe Begründung am Fetch-Handler)
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
                                 'json', 'txt',
                                 // Medien laufen mit durch den Cache-First-Zweig unten.
                                 // /Grafiken/*.mp4|webm bekommt von stamp-assets.js ein ?v=,
                                 // ist also genauso versioniert wie JS/CSS.
                                 'mp4', 'webm', 'm4v', 'mov', 'ogg', 'mp3', 'wav']);

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
  // und zeigt sich nach jedem Apply wieder an (Endlosloop). Ein Version-Mismatch droht
  // dadurch nicht: der alte SW bedient weiter seinen alten CACHE_NAME, und die
  // Asset-Adressen darin tragen die alten ?v=-Nummern — alt zu alt, neu zu neu.
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
// FETCH — Network-First für HTML, Cache-First für eigene Assets
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

  const pfad = new URL(request.url).pathname;

  // /pages/-Pfade nie cachen (werden von Cloudflare umgeschrieben)
  if (pfad.startsWith('/pages/')) return;

  // 🔴 /config/ ist die EINZIGE Stelle, an der sich Inhalt ohne Adresswechsel
  // aendert — Cache-First waere hier kein veralteter Treffer, sondern eine
  // Sackgasse:
  //   • version.json ist die Quelle des Cache-Busters, mit dem onboarding.js
  //     `service-worker.js?v=<version>` registriert. Aus dem Cache beantwortet
  //     bliebe die Registrierungs-URL fuer immer die alte, es kaeme nie wieder
  //     ein neuer SW an, und damit auch nie ein neuer CACHE_NAME. Ein einziger
  //     Treffer wuerde jedes weitere Update abschneiden.
  //   • maintenance.json haengt ein ?t=Date.now() an: jeder Seitenaufruf waere
  //     ein neuer Cache-Eintrag, der nie wieder gelesen wird.
  // Beide rufen bewusst mit cache:'no-store' — das gilt fuer den HTTP-Cache,
  // nicht fuer uns. Der Ausstieg muss hier stehen.
  if (pfad.startsWith('/config/')) return;

  // Range-Anfragen (das <video> stellt sie beim Puffern und beim Springen) nicht
  // aus dem Cache beantworten: cache.match() ignoriert den Range-Header und gaebe
  // die volle 200er-Antwort auf eine 206er-Frage zurueck — Chrome verkraftet das,
  // Safari bricht die Wiedergabe ab. Der Film landet trotzdem im Cache, weil
  // landing.js ihn per fetch() am Stueck holt (200, kein Range) und von der
  // Blob-Fassung scrubbt.
  if (request.headers.has('range')) return;

  // Eigene Assets: Cache-First.
  // Jede Referenz traegt ?v=<version> (stamp-assets.js) und CACHE_NAME haengt an
  // derselben Version — ein Treffer kann deshalb nicht veraltet sein, und ein
  // Deploy ist automatisch ein Miss. Netz-Antworten mit Status 200 wandern in den
  // Cache, alles andere (206, 3xx, 404, Opaque) wird nur durchgereicht.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    const treffer = await cache.match(request);
    if (treffer) return treffer;

    try {
      const response = await fetch(request);
      if (response.status === 200) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch (e) {
      return new Response('', { status: 503 });
    }
  })());
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
