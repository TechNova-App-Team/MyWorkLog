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
  constructor(body, opt = {}) { this.body = body; this.status = opt.status ?? 200; this.marke = opt.marke; }
  clone() { return new FakeResponse(this.body, { status: this.status, marke: this.marke }); }
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
    return new FakeResponse('inhalt', { status: umgebung.status ?? 200, marke: 'netz' });
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
  const a = await anfrage('https://myworklog.de/Grafiken/intro.mp4?v=6.5.3',
                          { headers: { Range: 'bytes=0-' } });
  ok(!a.abgefangen, 'Range-Anfrage laeuft am SW vorbei (sonst 200 auf 206-Frage)');
}

// ── 4. Die Ausstiege, ohne die sich die App nicht mehr aktualisiert ──────────
console.log('\n4. Ausstiege');
{
  // Der harte Fall: version.json liegt bereits im Cache. Wuerde der SW ihn
  // ausliefern, bliebe die SW-Registrierungs-URL fuer immer auf der alten
  // Version — es kaeme nie wieder ein neuer Worker an.
  const alt = new FakeResponse('{"version":"6.5.2"}', { marke: 'cache' });
  const a = await anfrage('https://myworklog.de/config/version.json', { cache: 'no-store' }, {
    cacheVorbelegt: { 'https://myworklog.de/config/version.json': alt },
  });
  ok(!a.abgefangen, 'version.json wird NIE aus dem Cache beantwortet');
}
{
  const a = await anfrage('https://myworklog.de/config/maintenance.json?t=1757000000000',
                          { cache: 'no-store' });
  ok(!a.abgefangen, 'maintenance.json (?t=…) laeuft vorbei, statt den Cache vollzuschreiben');
}
{
  const a = await anfrage('https://myworklog.de/pages/footer/footer.html');
  ok(!a.abgefangen, '/pages/ bleibt ausgenommen');
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

// ── 5. navigate bleibt Network-First ─────────────────────────────────────────
console.log('\n5. Navigation');
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
if (geprueft < 20) { console.log('ZU WENIG PRUEFUNGEN — der Lauf hat nichts getan'); process.exit(1); }
process.exit(fehler ? 1 : 0);
