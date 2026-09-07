// ═══ SERVICE-WORKER CACHE-STRATEGIE TEST ═══
//
// Prueft den fetch-Handler aus service-worker.js gegen eine Attrappe von
// self/caches/fetch. Interessant sind nicht die Kopien der Antworten, sondern
// die ENTSCHEIDUNGEN: was wird abgefangen, was durchgereicht, was gecacht.
//
// Warum ueberhaupt: seit dem Umbau auf Cache-First ist ein Treffer
// bindend — es gibt kein Netz mehr, das einen falschen Cache-Eintrag korrigiert.
// Die beiden Ausstiege (/config/, Range) sind deshalb keine Feinheit, sondern
// die Bedingung dafuer, dass die App sich ueberhaupt noch aktualisieren kann.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// CRLF normalisieren: der Arbeitsbaum liegt wegen core.autocrlf=true mit CRLF da.
const QUELLE = readFileSync(join(ROOT, 'service-worker.js'), 'utf8').split('\r\n').join('\n');

// Inhalt einer Antwort, egal ob der Koerper noch die Zeichenkette ist oder
// schon durch blob() gelaufen (legeAb baut die Antwort daraus neu auf).
const inhaltVon = res => (res && typeof res.body === 'object' && res.body !== null)
  ? res.body.text : (res ? res.body : undefined);

let fehler = 0, geprueft = 0;
const ok = (bedingung, was) => {
  geprueft++;
  if (bedingung) { console.log('  ok   ' + was); return; }
  fehler++; console.log('  FAIL ' + was);
};

// ── Attrappen ────────────────────────────────────────────────────────────────

class FakeHeaders {
  constructor(init = {}) { this.m = new Map(Object.entries(init).map(([k, v]) => [k.toLowerCase(), v])); }
  get(k) { return this.m.get(k.toLowerCase()) ?? null; }
  set(k, v) { this.m.set(k.toLowerCase(), v); }
  has(k) { return this.m.has(k.toLowerCase()); }
}

class FakeRequest {
  constructor(url, opt = {}) {
    this.url = url;
    this.method = opt.method || 'GET';
    this.mode = opt.mode || 'no-cors';
    this.cache = opt.cache || 'default';
    this.headers = new FakeHeaders(opt.headers || {});
  }
}

class FakeResponse {
  constructor(body, opt = {}) {
    this.body = body;
    this.status = opt.status ?? 200;
    this.statusText = opt.statusText || '';
    this.marke = opt.marke;
    this.headers = opt.headers instanceof FakeHeaders ? opt.headers : new FakeHeaders(opt.headers || {});
  }
  clone() {
    return new FakeResponse(this.body, { status: this.status, marke: this.marke,
                                         headers: new FakeHeaders(Object.fromEntries(this.headers.m)) });
  }
  // legeAb() liest den Koerper als blob und baut die Antwort neu auf.
  async blob() {
    const b = this.body;
    if (b && typeof b.slice === 'function' && typeof b.size === 'number') return b;
    // Zeichenkette als Ersatz-Blob: size + slice reichen teilAntwort() aus.
    const txt = String(b ?? '');
    return { size: txt.length, slice: (a, e) => txt.slice(a, e), text: txt };
  }
}

class FakeCache {
  constructor() { this.eintraege = new Map(); }
  async match(req) { return this.eintraege.get(typeof req === 'string' ? req : req.url) ?? null; }
  async put(req, res) { this.eintraege.set(typeof req === 'string' ? req : req.url, res); }
  async add() {}
  async keys() { return [...this.eintraege.keys()].map(u => new FakeRequest(u)); }
  async delete(req) { return this.eintraege.delete(typeof req === 'string' ? req : req.url); }
}

/**
 * Laedt service-worker.js in eine frische Attrappen-Umgebung und gibt einen
 * Treiber zurueck, der EINEN fetch-Event durchspielt.
 */
function ladeSW({ netz, cacheVorbelegt = {} } = {}) {
  const hoerer = {};
  const cache = new FakeCache();
  for (const [u, r] of Object.entries(cacheVorbelegt)) cache.eintraege.set(u, r);

  const caches = {
    open: async () => cache,
    keys: async () => ['tt-cache-6.5.3'],
    delete: async () => true,
  };

  const self = {
    location: { href: 'https://myworklog.de/service-worker.js?v=6.5.3' },
    addEventListener: (name, fn) => { hoerer[name] = fn; },
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
  };

  const fn = new Function(
    'self', 'caches', 'fetch', 'Request', 'Response', 'Headers', 'URL', 'console',
    QUELLE + '\n//# sourceURL=service-worker.js'
  );
  fn(self, caches, netz, FakeRequest, FakeResponse, FakeHeaders, URL,
     { log() {}, warn() {}, error() {} });

  return { hoerer, cache };
}

/** Spielt einen fetch-Event durch. Gibt zurueck, ob abgefangen wurde und was rauskam. */
async function anfrage(url, opt = {}, umgebung = {}) {
  let netzAufrufe = [];
  const netz = umgebung.netz || (async (req) => {
    netzAufrufe.push(typeof req === 'string' ? req : req.url);
    return new FakeResponse(umgebung.koerper ?? 'inhalt',
                            { status: umgebung.status ?? 200, marke: 'netz' });
  });

  const { hoerer, cache } = ladeSW({ netz, cacheVorbelegt: umgebung.cacheVorbelegt });

  let antwort, abgefangen = false;
  const event = {
    request: new FakeRequest(url, opt),
    respondWith: (p) => { abgefangen = true; antwort = p; },
    waitUntil: () => {},
  };
  hoerer.fetch(event);
  const res = abgefangen ? await antwort : null;
  return { abgefangen, res, cache, netzAufrufe };
}

// ── 1. Quelltext-Behauptungen ────────────────────────────────────────────────
// Kommentare vorher strippen: die Dateikoepfe erklaeren genau das, was NICHT
// mehr drinsteht ("Network-First", "cache:'reload'"), ein Negativ-Grep auf die
// rohe Datei wuerde also seine eigenen Kommentare pruefen.
console.log('\n1. Quelltext');
const ohneKommentar = QUELLE
  .split('\n').map(z => z.replace(/^\s*\/\/.*$/, '')).join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');

const reloadStellen = [...ohneKommentar.matchAll(/cache:\s*'reload'/g)].length;
ok(reloadStellen === 1, `cache:'reload' nur noch im navigate-Zweig (gefunden: ${reloadStellen})`);
ok(/request\.mode === 'navigate'/.test(ohneKommentar), 'navigate-Zweig steht noch');
ok(!/\(mp4\|webm\|m4v/.test(ohneKommentar), 'Medien-Ausnahme-Regex ist raus');
// Gegenprobe zur Negativ-Behauptung: es gibt ueberhaupt etwas zu pruefen.
ok(ohneKommentar.length > 2000, 'gestrippte Quelle ist nicht leer');
ok(/mp4/.test(ohneKommentar), 'mp4 kommt noch vor — jetzt in CACHEABLE_EXTS');

// ── 2. Cache-First fuer eigene Assets ────────────────────────────────────────
console.log('\n2. Cache-First');
{
  const treffer = new FakeResponse('alt', { marke: 'cache' });
  const a = await anfrage('https://myworklog.de/Assets/js/landing.js?v=6.5.3', {}, {
    cacheVorbelegt: { 'https://myworklog.de/Assets/js/landing.js?v=6.5.3': treffer },
  });
  ok(a.abgefangen, 'Asset wird abgefangen');
  ok(a.res?.marke === 'cache', 'Treffer kommt aus dem Cache');
  ok(a.netzAufrufe.length === 0, 'kein Netz-Request bei Treffer (das war der Zweck)');
}
{
  const a = await anfrage('https://myworklog.de/Assets/css/core.css?v=6.5.3');
  ok(a.res?.marke === 'netz', 'Miss geht ans Netz');
  ok(a.netzAufrufe.length === 1, 'genau ein Netz-Request');
  await new Promise(r => setImmediate(r));
  ok(a.cache.eintraege.has('https://myworklog.de/Assets/css/core.css?v=6.5.3'),
     '200er-Antwort wird gecacht');
}
{
  const a = await anfrage('https://myworklog.de/Assets/js/weg.js?v=6.5.3', {}, { status: 404 });
  await new Promise(r => setImmediate(r));
  ok(a.res?.status === 404, '404 wird durchgereicht');
  ok(!a.cache.eintraege.has('https://myworklog.de/Assets/js/weg.js?v=6.5.3'),
     '404 landet NICHT im Cache');
}
{
  const a = await anfrage('https://myworklog.de/Assets/js/landing.js?v=6.5.3', {}, {
    netz: async () => { throw new Error('offline'); },
  });
  ok(a.res?.status === 503, 'Offline ohne Cache-Treffer → 503');
}

// ── 3. Medien ────────────────────────────────────────────────────────────────
console.log('\n3. Medien');
{
  const a = await anfrage('https://myworklog.de/Grafiken/intro.mp4?v=6.5.3');
  await new Promise(r => setImmediate(r));
  ok(a.abgefangen, 'intro.mp4 wird jetzt abgefangen (Ausnahme-Block ist raus)');
  ok(a.cache.eintraege.has('https://myworklog.de/Grafiken/intro.mp4?v=6.5.3'),
     'intro.mp4 landet im Cache — landing.js holt ihn per fetch() am Stueck');
}
{
  // Nichts im Cache: der SW holt das GANZE, legt es ab und schneidet daraus.
  // Ohne diesen Zweig kaeme eine nur-per-Range angefragte Datei nie in den Cache.
  const a = await anfrage('https://myworklog.de/Grafiken/intro.mp4?v=6.5.3',
                          { headers: { Range: 'bytes=0-' } }, { koerper: '0123456789' });
  ok(a.netzAufrufe.length === 1, 'Range ohne Cache-Treffer holt einmal vom Netz');
  ok(a.netzAufrufe[0] === 'https://myworklog.de/Grafiken/intro.mp4?v=6.5.3',
     'und zwar OHNE Range — die ganze Datei');
  ok(a.cache.eintraege.has('https://myworklog.de/Grafiken/intro.mp4?v=6.5.3'),
     'das Ganze landet im Cache, nicht der Schnipsel');
  ok(a.res?.status === 206 && a.res?.body === '0123456789',
     'die Antwort ist trotzdem eine 206-Teilantwort');
}
{
  // Der zweite Aufruf darf das Netz nicht mehr anfassen.
  const film = new FakeResponse('0123456789', { marke: 'cache' });
  const a = await anfrage('https://myworklog.de/Grafiken/intro.mp4?v=6.5.3',
                          { headers: { Range: 'bytes=0-' } }, {
    cacheVorbelegt: { 'https://myworklog.de/Grafiken/intro.mp4?v=6.5.3': film },
  });
  ok(a.netzAufrufe.length === 0, 'ab dem zweiten Mal kein Netz mehr — das war der Zweck');
}
{
  // Was der Server ablehnt, gehoert ihm: nicht cachen, nicht erfinden.
  const a = await anfrage('https://myworklog.de/Grafiken/weg.mp4?v=6.5.3',
                          { headers: { Range: 'bytes=0-' } }, { status: 404 });
  ok(a.res?.status === 404, 'ein 404 beim Nachladen wird durchgereicht');
  ok(!a.cache.eintraege.has('https://myworklog.de/Grafiken/weg.mp4?v=6.5.3'),
     '404 landet nicht im Cache');
}
{
  // Mit Cache-Treffer: echte 206-Teilantwort, KEIN Netz. Das ist der Unterschied
  // zwischen "Video offline nicht abspielbar" und "laeuft".
  const film = new FakeResponse('0123456789', { marke: 'cache' });
  const a = await anfrage('https://myworklog.de/Grafiken/intro.mp4?v=6.5.3',
                          { headers: { Range: 'bytes=2-5' } }, {
    cacheVorbelegt: { 'https://myworklog.de/Grafiken/intro.mp4?v=6.5.3': film },
  });
  ok(a.res?.status === 206, 'Range mit Cache-Treffer liefert 206, nicht 200');
  ok(a.res?.body === '2345', 'der geschnittene Bereich stimmt');
  ok(a.res?.headers.get('content-range') === 'bytes 2-5/10', 'Content-Range ist korrekt');
  ok(a.res?.headers.get('content-length') === '4', 'Content-Length ist korrekt');
  ok(a.netzAufrufe.length === 0, 'kein Netz — das Video kommt offline aus dem Cache');
}
{
  // Offenes Ende, wie es <video preload="metadata"> stellt.
  const film = new FakeResponse('0123456789', { marke: 'cache' });
  const a = await anfrage('https://myworklog.de/Grafiken/intro.mp4?v=6.5.3',
                          { headers: { Range: 'bytes=7-' } }, {
    cacheVorbelegt: { 'https://myworklog.de/Grafiken/intro.mp4?v=6.5.3': film },
  });
  ok(a.res?.body === '789' && a.res?.headers.get('content-range') === 'bytes 7-9/10',
     'offenes Ende (bytes=7-) wird bis zum Dateiende bedient');
}
{
  // Suffix-Form.
  const film = new FakeResponse('0123456789', { marke: 'cache' });
  const a = await anfrage('https://myworklog.de/Grafiken/intro.mp4?v=6.5.3',
                          { headers: { Range: 'bytes=-3' } }, {
    cacheVorbelegt: { 'https://myworklog.de/Grafiken/intro.mp4?v=6.5.3': film },
  });
  ok(a.res?.body === '789', 'Suffix-Form (bytes=-3) liefert die letzten Bytes');
}
{
  // Unsinniger Kopf: nicht raten, ans Netz geben.
  const film = new FakeResponse('0123456789', { marke: 'cache' });
  const a = await anfrage('https://myworklog.de/Grafiken/intro.mp4?v=6.5.3',
                          { headers: { Range: 'bytes=50-99' } }, {
    cacheVorbelegt: { 'https://myworklog.de/Grafiken/intro.mp4?v=6.5.3': film },
  });
  ok(a.netzAufrufe.length === 1 && a.res?.status !== 206,
     'Bereich ausserhalb der Datei wird nicht erfunden, sondern ans Netz gegeben');
}
{
  const a = await anfrage('https://myworklog.de/Grafiken/intro.mp4?v=6.5.3',
                          { headers: { Range: 'bytes=0-' } },
                          { netz: async () => { throw new Error('offline'); } });
  ok(a.res?.status === 503, 'Range offline ohne Cache → 503 statt haengender Abruf');
}

// ── 4. Stale-While-Revalidate fuer die Dateien ohne ?v= ──────────────────────
console.log('\n4. Stale-While-Revalidate');
{
  // Der Kern: Treffer kommt SOFORT aus dem Cache, das Netz laeuft daneben.
  const alt = new FakeResponse('{"version":"6.5.2"}', { marke: 'cache' });
  const a = await anfrage('https://myworklog.de/config/version.json', { cache: 'no-store' }, {
    cacheVorbelegt: { 'https://myworklog.de/config/version.json': alt },
  });
  ok(a.abgefangen, 'version.json wird abgefangen');
  ok(a.res?.marke === 'cache', 'Antwort kommt sofort aus dem Cache (offline-fest)');
  await new Promise(r => setTimeout(r, 10));
  ok(a.netzAufrufe.length === 1, 'im Hintergrund wird genau einmal aufgefrischt');
  ok(inhaltVon(a.cache.eintraege.get('https://myworklog.de/config/version.json')) === 'inhalt',
     'die frische Fassung liegt danach im Cache — naechster Aufruf sieht die neue Version');
}
{
  // Ohne Cache-Buster-Strippen waeren das drei Schluessel und drei Downloads
  // derselben 334-KB-Datei pro Seitenaufruf.
  const a = await anfrage('https://myworklog.de/config/version.json?cb=99887766');
  await new Promise(r => setTimeout(r, 10));
  ok([...a.cache.eintraege.keys()].includes('https://myworklog.de/config/version.json'),
     '?cb= wird aus dem Cache-Schluessel gestrippt (version-loader.js)');
  ok(![...a.cache.eintraege.keys()].some(k => k.includes('cb=')),
     'kein Eintrag mit Buster im Schluessel');
}
{
  // Offline mit Cache-Treffer: muss die alte Fassung liefern, nicht 503.
  const alt = new FakeResponse('{"version":"6.5.2"}', { marke: 'cache' });
  const a = await anfrage('https://myworklog.de/config/version.json', {}, {
    netz: async () => { throw new Error('offline'); },
    cacheVorbelegt: { 'https://myworklog.de/config/version.json': alt },
  });
  ok(a.res?.marke === 'cache', 'offline: version.json kommt aus dem Cache');
  await new Promise(r => setTimeout(r, 10));
  ok(inhaltVon(a.cache.eintraege.get('https://myworklog.de/config/version.json')) === '{"version":"6.5.2"}',
     'gescheiterte Auffrischung laesst den Cache-Eintrag stehen (kein Datenverlust)');
}
{
  const a = await anfrage('https://myworklog.de/pages/footer/footer.html');
  await new Promise(r => setTimeout(r, 10));
  ok(a.abgefangen, 'footer.html wird trotz /pages/ abgefangen');
  ok(a.cache.eintraege.has('https://myworklog.de/pages/footer/footer.html'),
     'footer.html liegt im Cache — die Standalone-Seiten haben ihn offline');
}
{
  const a = await anfrage('https://myworklog.de/config/supabase-config.js');
  await new Promise(r => setTimeout(r, 10));
  ok(a.cache.eintraege.has('https://myworklog.de/config/supabase-config.js'),
     'supabase-config.js wird gecacht');
}
{
  const a = await anfrage('https://myworklog.de/manifest.json');
  ok(a.abgefangen, 'manifest.json wird abgefangen');
}
{
  // Miss + offline: hier ist 503 richtig, es gibt nichts auszuliefern.
  const a = await anfrage('https://myworklog.de/config/version.json', {}, {
    netz: async () => { throw new Error('offline'); },
  });
  ok(a.res?.status === 503, 'SWR ohne Cache-Treffer und ohne Netz → 503');
}

// -- 4b. Das Auffrisch-Fenster: der eigentliche Traffic-Gewinn ---------------
console.log('\n4b. Auffrisch-Fenster');
{
  // Frischer Eintrag (gerade eben gecacht): darf das Netz NICHT anfassen.
  const frisch = new FakeResponse('{"version":"6.5.2"}', {
    marke: 'cache', headers: { 'x-mwl-gecacht': String(Date.now()) } });
  const a = await anfrage('https://myworklog.de/config/version.json', {}, {
    cacheVorbelegt: { 'https://myworklog.de/config/version.json': frisch },
  });
  ok(a.res?.marke === 'cache', 'frischer Eintrag kommt aus dem Cache');
  await new Promise(r => setTimeout(r, 15));
  ok(a.netzAufrufe.length === 0,
     'im Fenster KEINE Hintergrund-Anfrage — das spart die 334 KB mal drei');
}
{
  // Abgelaufener Eintrag (6 Minuten alt): muss auffrischen.
  const alt = new FakeResponse('{"version":"6.5.2"}', {
    marke: 'cache', headers: { 'x-mwl-gecacht': String(Date.now() - 6 * 60 * 1000) } });
  const a = await anfrage('https://myworklog.de/config/version.json', {}, {
    cacheVorbelegt: { 'https://myworklog.de/config/version.json': alt },
  });
  ok(a.res?.marke === 'cache', 'abgelaufener Eintrag wird trotzdem sofort geliefert');
  await new Promise(r => setTimeout(r, 15));
  ok(a.netzAufrufe.length === 1, 'nach Ablauf des Fensters wird aufgefrischt');
}
{
  // Ein Eintrag ohne Zeitstempel (z. B. aus einer aelteren Fassung) gilt als alt.
  const ohne = new FakeResponse('{"version":"6.5.2"}', { marke: 'cache' });
  const a = await anfrage('https://myworklog.de/config/version.json', {}, {
    cacheVorbelegt: { 'https://myworklog.de/config/version.json': ohne },
  });
  await new Promise(r => setTimeout(r, 15));
  ok(a.netzAufrufe.length === 1, 'Eintrag ohne Zeitstempel wird aufgefrischt, nicht ewig behalten');
}
{
  // Frisch gecachter Miss traegt den Zeitstempel, sonst greift das Fenster nie.
  const a = await anfrage('https://myworklog.de/config/version.json');
  await new Promise(r => setTimeout(r, 15));
  const e = a.cache.eintraege.get('https://myworklog.de/config/version.json');
  ok(!!e && Number(e.headers.get('x-mwl-gecacht')) > 0,
     'neu gecachter Eintrag bekommt einen Zeitstempel');
}

// ── 5. Was bewusst NICHT gecacht wird ────────────────────────────────────────
console.log('\n5. Ausstiege');
{
  // Der Wartungs-Schalter. Ein Schalter, der eine Runde hinterherhinkt, waere
  // keiner — und zu sparen gibt es bei 1 KB nichts.
  const alt = new FakeResponse('{"active":false}', { marke: 'cache' });
  const a = await anfrage('https://myworklog.de/config/maintenance.json?t=1757000000000',
                          { cache: 'no-store' },
                          { cacheVorbelegt: { 'https://myworklog.de/config/maintenance.json': alt } });
  ok(!a.abgefangen, 'maintenance.json laeuft immer ans Netz, auch mit Cache-Eintrag');
}
{
  const a = await anfrage('https://myworklog.de/pages/berichtsheft/index.html');
  ok(!a.abgefangen, 'andere /pages/-Pfade bleiben ausgenommen');
}
{
  const a = await anfrage('https://static.cloudflareinsights.com/beacon.min.js');
  ok(!a.abgefangen, 'NO_CACHE_ORIGINS bleiben ausgenommen');
}
{
  const a = await anfrage('chrome-extension://abcdef/inject.js');
  ok(!a.abgefangen, 'nicht-http(s) laeuft vorbei');
}
{
  const a = await anfrage('https://myworklog.de/Assets/js/landing.js?v=6.5.3', { method: 'POST' });
  ok(!a.abgefangen, 'POST laeuft vorbei');
}

// ── 6. navigate bleibt Network-First ─────────────────────────────────────────
console.log('\n6. Navigation');
{
  const alt = new FakeResponse('<html>alt</html>', { marke: 'cache' });
  const a = await anfrage('https://myworklog.de/', { mode: 'navigate' }, {
    cacheVorbelegt: { 'https://myworklog.de/': alt },
  });
  ok(a.abgefangen, 'Navigation wird abgefangen');
  ok(a.res?.marke === 'netz', 'HTML kommt trotz Cache-Treffer aus dem Netz');
  ok(a.netzAufrufe.length === 1, 'Navigation fragt das Netz');
}
{
  const a = await anfrage('https://myworklog.de/', { mode: 'navigate' }, {
    netz: async () => { throw new Error('offline'); },
    cacheVorbelegt: { 'https://myworklog.de/': new FakeResponse('<html>alt</html>', { marke: 'cache' }) },
  });
  ok(a.res?.marke === 'cache', 'Navigation faellt offline auf den Cache zurueck');
}

// ── Ergebnis ─────────────────────────────────────────────────────────────────
console.log(`\n${geprueft - fehler}/${geprueft} bestanden`);
if (geprueft < 58) { console.log('ZU WENIG PRUEFUNGEN — der Lauf hat nichts getan'); process.exit(1); }
process.exit(fehler ? 1 : 0);
