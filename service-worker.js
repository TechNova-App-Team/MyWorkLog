/**
 * ============================================================
 * TimeTracker Service Worker — Version aus ?v=<version.json> (siehe SW_VERSION unten)
 * ============================================================
 * Strategie:
 * → HTML-Navigation: Network-First (cache:'reload') — die Seite muss die neuen
 *   ?v=-Nummern mitbringen, sonst greift unten nie ein Miss.
 * → Eigene Assets (JS/CSS/Bilder/Medien): Cache-First. Die Referenzen tragen
 *   ?v=<inhalts-hash> (tools/stamp-assets.js), eine geänderte Datei ist also eine
 *   neue URL und zwangsläufig ein Miss; unveränderte überleben den Release in
 *   ASSET_CACHE.
 * → Die vier Dateien ohne ?v= (version.json, supabase-config.js, footer.html,
 *   manifest.json): Stale-While-Revalidate — sofort aus dem Cache, Auffrischung
 *   im Hintergrund. Damit sind auch sie offline da.
 * → maintenance.json (Wartungs-Schalter) und der Rest von /pages/: nie aus dem Cache
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
// Alles mit ?v=<inhalts-hash> liegt in einem Cache, der KEINEN Release-Namen
// traegt und deshalb einen Bump ueberlebt. Bis v8.1.10 lag es im versions-
// gebundenen CACHE_NAME: jeder Bump warf alle 87 App-Dateien weg, auch die
// 85 unveraenderten. Ein Treffer kann nicht veraltet sein — die Adresse
// enthaelt den Hash des Inhalts. Aufgeraeumt wird je Pfad (legeAssetAb):
// kommt eine neue Fassung, fliegt die alte. Die Ziffer am Ende ist der
// Notschalter: hochzaehlen wirft den ganzen Bestand einmal weg.
const ASSET_CACHE = 'tt-assets-1';
const OFFLINE_URL = './offline/';
const DEBUG       = true;

const log  = (...a) => DEBUG && console.log('[SW]', ...a);

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

// Nur eigener Origin: ein CDN-?v= ist kein Hash von uns.
function istGestempelt(url) {
  const u = new URL(url);
  return u.origin === new URL(self.location.href).origin && u.searchParams.has('v');
}

// Legt eine gestempelte Datei ab und loescht jede andere Fassung desselben
// Pfads. Damit waechst der Cache nicht ueber die Releases hinweg, und ein
// Pfad hat nie zwei Eintraege. Preis: eine Seite, die waehrend eines Deploys
// noch offen ist, und eine frische wechseln sich bei einer Datei ab — zwei
// Netzabrufe, kein falscher Inhalt.
async function legeAssetAb(cache, url, response) {
  await cache.put(url, response);
  const pfad = new URL(url).pathname;
  const alle = await cache.keys();
  await Promise.all(alle
    .filter(r => r.url !== url && new URL(r.url).pathname === pfad)
    .map(r => cache.delete(r)));
}

function isCacheable(url) {
  const u = new URL(url);
  if (NO_CACHE_ORIGINS.some(d => u.hostname.includes(d))) return false;
  const ext = u.pathname.split('.').pop().toLowerCase();
  return CACHEABLE_EXTS.has(ext);
}

// ─────────────────────────────────────────────
// STALE-WHILE-REVALIDATE — die vier Dateien ohne ?v=
// ─────────────────────────────────────────────
//
// Alles andere traegt ?v=<version> (stamp-assets.js): neue Fassung = neue Adresse,
// Cache-First kann dort nichts Veraltetes liefern. Diese vier aendern ihren Inhalt
// unter GLEICHER Adresse. Sie hart auszunehmen hiesse: bei jedem Seitenaufruf ans
// Netz, und offline gar nicht da. Deshalb SWR — sofort aus dem Cache antworten und
// im Hintergrund auffrischen. Preis ist eine Runde Verzoegerung, die hier nichts
// kostet (Begruendung am SWR-Zweig unten).
const SWR_PFADE = new Set([
  '/config/version.json',        // Versionsnummer + Changelog, 3 Abrufe je Seitenaufruf
  '/config/supabase-config.js',  // ohne die Datei startet die Cloud-Anbindung offline nicht
  '/pages/footer/footer.html',   // gemeinsamer Footer aller Standalone-Seiten
  '/manifest.json',              // PWA-Manifest
]);

// Cache-Buster fragen denselben Inhalt unter immer neuer Adresse an
// (`version-loader.js` haengt ?cb= an, der Wartungs-Torwaechter ?t=). Fuer den
// Cache muessen sie weg, sonst legt jeder Seitenaufruf einen neuen Eintrag an,
// der nie wieder gelesen wird — und die drei Abrufe von version.json waeren drei
// verschiedene Schluessel statt einem.
const BUSTER_PARAMS = ['cb', 't', '_'];

function cacheSchluessel(url) {
  const u = new URL(url);
  for (const p of BUSTER_PARAMS) u.searchParams.delete(p);
  return u.toString();
}

// Seiten ohne Query ablegen und nachschlagen. Die installierte App startet ueber
// die start_url '/?utm_source=pwa&utm_medium=homescreen', der Knopf "App oeffnen"
// der Offline-Seite geht auf '/' — mit der vollen URL als Schluessel waren das
// zwei Eintraege, und '/' lag in der installierten App nie im Cache: offline kam
// man von der Offline-Seite nicht mehr zurueck (gemeldet 11.10.2026). Das HTML
// haengt an keinem Query-Parameter, die App wertet ?cloud= usw. per JS aus.
function seitenSchluessel(url) {
  const u = new URL(url);
  return u.origin + u.pathname;
}

// 🔴 SWR frischt per Definition bei JEDEM Treffer auf — ohne Fenster waeren das
// hier drei Abrufe von version.json pro Seitenaufruf (onboarding.js,
// version-loader.js, /support/), also gut 1 MB, nur eben im Hintergrund statt
// blockierend. Am Netzverkehr aendert das nichts, und genau der war der Anlass.
// Mit Fenster: hoechstens EIN Abruf je Datei und Fenster, die anderen sehen einen
// frischen Eintrag und ruehren das Netz nicht an. Fuenf Minuten liegen deutlich
// unter dem 15-Minuten-Takt, in dem onboarding.js ohnehin registration.update()
// ruft — die Update-Erkennung wird dadurch also nicht langsamer.
const SWR_FENSTER_MS = 5 * 60 * 1000;
const ZEITSTEMPEL = 'x-mwl-gecacht';

function istFrisch(response) {
  const t = Number(response.headers.get(ZEITSTEMPEL));
  return t > 0 && (Date.now() - t) < SWR_FENSTER_MS;
}

// Der Zeitpunkt muss AM EINTRAG haengen, nicht in einer Variablen: der Worker wird
// zwischen zwei Seitenaufrufen beendet, jede Merkliste im Speicher waere dann weg
// und das Fenster wirkungslos.
async function legeAb(cache, schluessel, response) {
  const kopf = new Headers(response.headers);
  kopf.set(ZEITSTEMPEL, String(Date.now()));
  const koerper = await response.blob();
  await cache.put(schluessel, new Response(koerper, {
    status: response.status, statusText: response.statusText, headers: kopf,
  }));
}

// ─────────────────────────────────────────────
// TEILANTWORTEN (206) AUS DEM CACHE
// ─────────────────────────────────────────────
//
// Ein <video> fragt beim Puffern und bei jedem Sprung mit `Range: bytes=…`.
// `cache.match()` ignoriert diesen Kopf und liefert die VOLLE Antwort — Chrome
// verkraftet das, Safari bricht die Wiedergabe ab. Deshalb wird hier aus dem
// gecachten Ganzen ein echtes 206 geschnitten. Das ist der Unterschied zwischen
// "Medien am Cache vorbei" (jede Anfrage ans Netz, offline kein Film) und einem
// Intro, das offline laeuft.
//
// Gibt null zurueck, wenn der Kopf nicht zu bedienen ist — dann uebernimmt das Netz.
async function teilAntwort(volleAntwort, bereichsKopf) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(bereichsKopf).trim());
  if (!m) return null;

  const koerper = await volleAntwort.blob();
  const gesamt = koerper.size;
  let von, bis;

  if (m[1] === '') {
    if (m[2] === '') return null;          // "bytes=-" ist ungueltig
    von = Math.max(0, gesamt - Number(m[2]));   // "bytes=-500": die letzten 500
    bis = gesamt - 1;
  } else {
    von = Number(m[1]);
    bis = m[2] === '' ? gesamt - 1 : Math.min(Number(m[2]), gesamt - 1);
  }
  if (!(von >= 0 && von <= bis && bis < gesamt)) return null;

  const kopf = new Headers(volleAntwort.headers);
  kopf.set('Content-Range', `bytes ${von}-${bis}/${gesamt}`);
  kopf.set('Content-Length', String(bis - von + 1));
  kopf.set('Accept-Ranges', 'bytes');

  return new Response(koerper.slice(von, bis + 1), {
    status: 206, statusText: 'Partial Content', headers: kopf,
  });
}

// Entdoppelt zusaetzlich die gleichzeitigen Auffrischungen desselben Schluessels.
const laufendeAuffrischung = new Map();

function frischeNach(cache, schluessel, request) {
  if (laufendeAuffrischung.has(schluessel)) return laufendeAuffrischung.get(schluessel);

  const lauf = fetch(request)
    .then(res => (res.status === 200 ? legeAb(cache, schluessel, res) : undefined))
    .catch(() => {})   // offline ist kein Fehler: der Cache-Eintrag bleibt einfach stehen
    .then(() => laufendeAuffrischung.delete(schluessel));

  laufendeAuffrischung.set(schluessel, lauf);
  return lauf;
}

// ─────────────────────────────────────────────
// INSTALL — Offline-Page vorab cachen
// ─────────────────────────────────────────────

self.addEventListener('install', event => {
  log('Install', SW_VERSION);
  // KEIN skipWaiting() hier: ob der neue Worker sofort übernehmen darf, weiß nur die
  // Seite — er darf es nur, wenn ihr Code schon dieselbe Version ist (updateManager in
  // onboarding.js schickt dann SKIP_WAITING). Eine ältere, noch offene Seite würde
  // sonst ihren Cache verlieren und nachgeladene Ansichten mit neuem Code bekommen.
  // Ohne Auslöser aktiviert der Browser ihn, sobald alle Tabs der App zu sind.
  // Die App-Huelle ('./') kommt mit: activate/SKIP_WAITING werfen den alten
  // Versions-Cache samt der zuletzt gesehenen Seite weg. Wer nach einem Update
  // offline ging, bevor er einmal neu navigiert hatte, bekam sonst nur noch die
  // Offline-Seite.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all([OFFLINE_URL, './'].map(u =>
        cache.add(new Request(u, { cache: 'reload' })).catch(() => {}))))
      .then(() => huelleVorladen())
  );
});

// 🔴 Die Huelle allein reicht offline nicht: ihre ~105 Stylesheets und Skripte
// lagen bis v8.3.2 nur im Cache, wenn eine KONTROLLIERTE Seite sie einmal
// angefragt hatte. Beim ersten Aufruf kontrolliert der Worker die Seite aber
// noch nicht — alles ist schon geladen, bevor er aktiv ist. Gemessen nach dem
// ersten Oeffnen: 0 von 30 Stylesheets im Cache, offline kam die nackte Seite
// ohne CSS und JS (gemeldet 11.10.2026 als „grauer Bildschirm“ in der Android-App).
// Dasselbe nach jedem Update: install legt die NEUE Huelle ab, deren neue
// Hashes noch nie angefragt wurden. Deshalb hier alles holen, was die Huelle
// referenziert. Nur put, kein legeAssetAb: die alte Fassung gehoert noch der
// offenen Seite des alten Workers — aufgeraeumt wird in activate.
async function huelleRefs(cache) {
  const huelle = await cache.match('./');
  if (!huelle) return [];
  const html = await huelle.clone().text();
  const basis = new URL('./', self.location.href);
  return [...new Set([...html.matchAll(/(?:src|href)="(\/[^"]+\?v=[^"]+)"/g)]
    .map(m => new URL(m[1], basis).toString()))];
}

async function huelleVorladen() {
  try {
    const refs = await huelleRefs(await caches.open(CACHE_NAME));
    const assets = await caches.open(ASSET_CACHE);
    await Promise.all(refs.map(async url => {
      if (await assets.match(url)) return;
      try {
        const res = await fetch(url, { credentials: 'same-origin' });
        if (res.status === 200) await assets.put(url, res);
      } catch (e) { /* einzelne Datei fehlt — holt der fetch-Zweig spaeter */ }
    }));
    // supabase-config.js traegt kein ?v= und steht damit nicht in refs; ohne sie
    // meldet die App offline beim ersten Start einen Ladefehler. version.json
    // (334 KB) bewusst nicht: die holt onboarding.js ohnehin bei jedem Start.
    const swr = await caches.open(CACHE_NAME);
    const cfg = cacheSchluessel(new URL('/config/supabase-config.js', self.location.href).toString());
    if (!(await swr.match(cfg))) {
      try {
        const res = await fetch(cfg);
        if (res.status === 200) await legeAb(swr, cfg, res);
      } catch (e) { /* offline beim Install — der SWR-Zweig holt sie spaeter */ }
    }
    log('Huelle vorgeladen:', refs.length);
  } catch (e) { log('Vorladen fehlgeschlagen', e); }
}

// Gegenstueck zu huelleVorladen: je Pfad bleibt die Fassung, die die aktuelle
// Huelle referenziert. Pfade ohne Referenz (Nachlade-Ansichten) raeumt
// legeAssetAb beim naechsten Abruf.
async function alteAssetsRaeumen() {
  const refs = new Set(await huelleRefs(await caches.open(CACHE_NAME)));
  if (!refs.size) return;
  const gewollt = new Set([...refs].map(u => new URL(u).pathname));
  const assets = await caches.open(ASSET_CACHE);
  await Promise.all((await assets.keys())
    .filter(r => gewollt.has(new URL(r.url).pathname) && !refs.has(r.url))
    .map(r => assets.delete(r)));
}

// ─────────────────────────────────────────────
// ACTIVATE — alte Caches löschen, sofort übernehmen
// ─────────────────────────────────────────────

self.addEventListener('activate', event => {
  log('Activate', SW_VERSION);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== ASSET_CACHE)
          .map(key => { log('Delete old cache:', key); return caches.delete(key); })
      ))
      .then(async () => {
        // Gecachte URLs mit /pages/ löschen (alte Pfade die nie mehr gültig sind).
        // Ausgenommen, was bewusst dort gecacht wird (Footer) — sonst raeumt jeder
        // Aktivierungslauf den Eintrag weg, den der SWR-Zweig gerade pflegt.
        const cache = await caches.open(CACHE_NAME);
        const requests = await cache.keys();
        await Promise.all(
          requests
            .filter(req => req.url.includes('/pages/')
                        && !SWR_PFADE.has(new URL(req.url).pathname))
            .map(req => { log('Purge stale pages/ URL:', req.url); return cache.delete(req); })
        );
      })
      .then(() => alteAssetsRaeumen().catch(() => {}))
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
            caches.open(CACHE_NAME).then(c => c.put(seitenSchluessel(request.url), clone)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(seitenSchluessel(request.url)))
            ?? (await cache.match(OFFLINE_URL))
            ?? new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // CDN und nicht-cacheable: direkt ans Netz
  if (!isCacheable(request.url)) return;

  const pfad = new URL(request.url).pathname;

  // ── Stale-While-Revalidate ─────────────────────────────────────────────────
  // Sofort aus dem Cache antworten, im Hintergrund auffrischen. Damit sind diese
  // vier Dateien offline verfuegbar UND kosten im Normalfall keine blockierende
  // Anfrage. Sie rufen teils mit cache:'no-store' — das gilt dem HTTP-Cache des
  // Browsers, der SW sitzt davor und entscheidet hier selbst.
  //
  // 🔴 Warum die eine Runde Verzoegerung bei version.json ungefaehrlich ist:
  // Die Datei steuert NICHT, welche Assets geladen werden — das macht die
  // ?v=-Nummer im HTML, und das HTML kommt oben Network-First frisch. Nach einem
  // Deploy hat der Nutzer also sofort die richtigen Assets, egal was hier im
  // Cache liegt. version.json entscheidet nur, wann die Cache-GENERATION wechselt
  // (`service-worker.js?v=` → neuer SW → neuer CACHE_NAME). Das passiert einen
  // Seitenaufruf spaeter, und die Auffrischung laeuft bei jedem Treffer erneut —
  // haengenbleiben kann es also nicht. Ein harter Ausstieg waere die schlechtere
  // Wahl: er kostet 334 KB mal drei bei JEDEM Aufruf und laesst die Seite offline
  // ohne Versionsnummer und ohne Changelog stehen.
  if (SWR_PFADE.has(pfad)) {
    const schluessel = cacheSchluessel(request.url);
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const treffer = await cache.match(schluessel);

      if (treffer) {
        // Innerhalb des Fensters gar nicht erst ans Netz — sonst kostet SWR
        // denselben Verkehr wie Network-First, nur unsichtbar.
        if (istFrisch(treffer)) return treffer;

        // waitUntil haelt den Worker fuer die Auffrischung am Leben. Nach einem
        // await kann das Event schon abgeschlossen sein — dann wirft waitUntil,
        // der Abruf laeuft aber trotzdem. Deshalb nur absichern, nicht abbrechen.
        try { event.waitUntil(frischeNach(cache, schluessel, request)); }
        catch (e) { frischeNach(cache, schluessel, request); }
        return treffer;
      }

      try {
        const response = await fetch(request);
        if (response.status === 200) {
          await legeAb(cache, schluessel, response.clone());
        }
        return response;
      } catch (e) {
        return new Response('', { status: 503 });
      }
    })());
    return;
  }

  // Der Rest von /config/ bleibt am Netz. Praktisch ist das nur maintenance.json:
  // der Wartungs-Schalter, der die App wegschaltet. Ein Schalter, der eine Runde
  // hinterherhinkt, ist kein Schalter — und zu holen gibt es nichts, die Datei ist
  // 1 KB. Offline faellt sie ohnehin sauber aus (der Torwaechter in
  // index.template.html gibt die Seite im .catch() frei).
  if (pfad.startsWith('/config/')) return;

  // Andere /pages/-Pfade nicht cachen: Cloudflare schreibt Klartext-URLs dorthin
  // um, gecachte Eintraege waeren Interna, die der activate-Zweig gleich wieder
  // wegraeumt. Der gemeinsame Footer oben ist die begruendete Ausnahme — er wird
  // als echte Unterressource geholt, nicht als Navigation.
  if (pfad.startsWith('/pages/')) return;

  // Range-Anfragen: aus dem gecachten Ganzen ein echtes 206 schneiden (siehe
  // teilAntwort). Liegt nichts im Cache oder ist der Kopf nicht zu bedienen, holt
  // das Netz — die 206er-Antwort von dort wandert NICHT in den Cache, dort gehoert
  // nur das Ganze hin (das legt der Zweig darunter ab, wenn landing.js den Film
  // am Stueck holt).
  const gestempelt = istGestempelt(request.url);
  const bereich = request.headers.get('range');
  if (bereich) {
    event.respondWith((async () => {
      const cache = await caches.open(gestempelt ? ASSET_CACHE : CACHE_NAME);
      let voll = await cache.match(request.url);

      // 🔴 Beim Miss das GANZE holen, nicht den erfragten Schnipsel. Eine Datei,
      // die ausschliesslich per Range angefragt wird, kaeme sonst NIE in den Cache:
      // `<video preload="metadata">` fragt immer mit Range, und landing.js holt den
      // Film nur am Stueck, wenn das Intro auch laeuft (`pro_intro_seen`). Bei einem
      // Bestandsnutzer nach einem Versions-Bump traf beides nicht zu — der Film war
      // offline nicht da und kostete bei JEDEM Aufruf eine Netz-Anfrage.
      // Preis: einmal je Version die volle Datei statt nur der Kopfdaten.
      if (!voll) {
        try {
          const ganz = await fetch(request.url, { credentials: 'same-origin' });
          if (ganz.status === 200) {
            if (gestempelt) await legeAssetAb(cache, request.url, ganz.clone());
            else await cache.put(request.url, ganz.clone());
            voll = ganz;
          } else {
            return ganz;   // 404/403 gehoert dem Server, nicht uns
          }
        } catch (e) { /* offline — faellt unten auf 503 */ }
      }

      if (voll) {
        const teil = await teilAntwort(voll, bereich);
        if (teil) return teil;
      }
      try { return await fetch(request); }
      catch (e) { return new Response('', { status: 503 }); }
    })());
    return;
  }

  // Eigene Assets: Cache-First.
  // Gestempelte Referenzen (?v=<inhalts-hash>, stamp-assets.js) liegen in
  // ASSET_CACHE — ein Treffer kann nicht veraltet sein, eine geaenderte Datei
  // ist eine neue Adresse und damit ein Miss. Ungestempeltes (Schriften, Bilder
  // ohne ?v=) bleibt im versionsgebundenen CACHE_NAME und wird je Release neu
  // geholt — dort gibt es keinen Hash, der sagen koennte, ob es noch stimmt.
  // Netz-Antworten mit Status 200 wandern in den Cache, alles andere (206, 3xx,
  // 404, Opaque) wird nur durchgereicht.
  const ablegen = (cache, response) => gestempelt
    ? legeAssetAb(cache, request.url, response)
    : cache.put(request, response);
  event.respondWith((async () => {
    const cache = await caches.open(gestempelt ? ASSET_CACHE : CACHE_NAME);

    // Auf Localhost/127.0.0.1 immer Netzwerk zuerst, damit lokale Änderungen
    // sofort ohne Version-Bump wirksam werden und Entwickler nicht im Cache festsitzen.
    const isLocal = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
    if (isLocal) {
      try {
        const netResp = await fetch(request);
        if (netResp.status === 200) {
          ablegen(cache, netResp.clone()).catch(() => {});
        }
        return netResp;
      } catch (e) {
        const treffer = await cache.match(request);
        if (treffer) return treffer;
        return new Response('', { status: 503 });
      }
    }

    const treffer = await cache.match(request);
    if (treffer) return treffer;

    try {
      const response = await fetch(request);
      if (response.status === 200) {
        ablegen(cache, response.clone()).catch(() => {});
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
      // ASSET_CACHE bleibt: seine Schlüssel enthalten den Inhalts-Hash, er kann
      // keinem Release-Wechsel hinterherhinken.
      caches.keys()
        .then(keys => Promise.all(
          keys.filter(k => k !== CACHE_NAME && k !== ASSET_CACHE).map(k => caches.delete(k))
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
