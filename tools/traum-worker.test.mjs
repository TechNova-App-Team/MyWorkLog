// Testet handleTraum() aus workers/ai-proxy/worker.js gegen einen KV-Mock —
// die Ja/Nein-Frage auf /traum/. Der Worker ist gitignored und wird von Hand
// deployed; das hier ist die Absicherung davor.
// Aufruf:  node tools/traum-worker.test.mjs
import fs from 'fs';

const WORKER = 'workers/ai-proxy/worker.js';
if (!fs.existsSync(WORKER)) {
  if (process.env.CI) {
    console.log(`  --   uebersprungen: ${WORKER} ist gitignored, auf dem Runner nicht vorhanden.`);
    process.exit(2);
  }
  console.error(`✗ ${WORKER} fehlt. Der Worker ist gitignored und liegt nur lokal.`);
  process.exit(1);
}

const src = fs.readFileSync(WORKER, 'utf8');
const start = src.indexOf('async function handleTraum');
const end   = src.indexOf('// ── Worker Entry Point');
if (start < 0 || end < 0 || end < start) { console.error('✗ handleTraum nicht im Worker gefunden'); process.exit(1); }
const tmp = new URL('./.traum.generated.mjs', import.meta.url);
fs.writeFileSync(tmp, src.slice(start, end) + '\nexport { handleTraum };');
const { handleTraum } = await import(tmp.href);
fs.unlinkSync(tmp);

let fails = 0, n = 0;
const ok = (c, msg) => { n++; if (c) console.log('  ✓ ' + msg); else { fails++; console.log('  ✗ ' + msg); } };

// Ohne Route prueft der Test eine Funktion, die nie aufgerufen wird.
ok(/pathname === '\/traum'[\s\S]{0,80}handleTraum\(/.test(src), '/traum ist im Entry Point geroutet');

function makeKV() {
  const store = new Map();
  return {
    _store: store,
    async get(k) { return store.has(k) ? store.get(k).value : null; },
    async put(k, value, opts = {}) { store.set(k, { value, metadata: opts.metadata }); },
    async list({ prefix = '', cursor, limit = 1000 } = {}) {
      const all = [...store.entries()].filter(([k]) => k.startsWith(prefix));
      const from = cursor ? parseInt(cursor, 10) : 0;
      const next = from + limit;
      return { keys: all.slice(from, next).map(([name, v]) => ({ name, metadata: v.metadata })),
        list_complete: next >= all.length, cursor: String(next) };
    },
  };
}

const URL_ = 'https://x/traum';
const post = (body) => new Request(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const get = (headers = {}) => new Request(URL_, { method: 'GET', headers });
const call = (env, req) => handleTraum(req, env, new URL(req.url), { 'X-Test': '1' });

const env = { UMFRAGE: makeKV(), UMFRAGE_SECRET: 'geheim' };
const A = 'aaaaaaaa-1111', B = 'bbbbbbbb-2222', C = 'cccccccc-3333';

ok((await call(env, post({ id: A, antwort: 'ja' }))).status === 200, 'Ja wird angenommen');
ok((await call(env, post({ id: B, antwort: 'nein', lang: 'en' }))).status === 200, 'Nein wird angenommen');
ok((await call(env, post({ id: C, antwort: 'ja' }))).status === 200, 'zweites Ja wird angenommen');
ok((await call(env, post({ id: A, antwort: 'nein' }))).status === 200, 'Umentscheiden wird angenommen');
ok(env.UMFRAGE._store.size === 3, 'Umentscheiden ersetzt statt zu verdoppeln (3 Keys)');

ok((await call(env, post({ id: 'kurz', antwort: 'ja' }))).status === 400, 'zu kurze Id → 400');
ok((await call(env, post({ id: 'dddddddd-4444', antwort: 'vielleicht' }))).status === 400, 'unbekannte Antwort → 400');
ok((await call(env, post({ id: 'eeeeeeee-5555', antwort: 'ja', name: 'x', ip: '1.2.3.4' }))).status === 200, 'Zusatzfelder stoeren nicht');
const meta = env.UMFRAGE._store.get('traum:eeeeeeee-5555').metadata;
ok(Object.keys(meta).sort().join() === 'a,l,t', 'gespeichert wird nur Antwort, Sprache, Zeit — kein Name, keine IP');
ok((await call(env, new Request(URL_, { method: 'POST', body: '{kaputt' }))).status === 400, 'kaputter Body → 400');

ok((await call(env, get())).status === 401, 'Abruf ohne Secret → 401');
ok((await call(env, get({ 'X-Umfrage-Secret': 'falsch' }))).status === 401, 'Abruf mit falschem Secret → 401');
const r = await call(env, get({ 'X-Umfrage-Secret': 'geheim' }));
const d = await r.json();
ok(r.status === 200 && d.ja === 2 && d.nein === 2 && d.total === 4, `Zaehlung stimmt (ja ${d.ja}, nein ${d.nein})`);
ok(typeof d.zuletzt === 'string', 'letzte Antwort hat einen Zeitstempel');
ok(r.headers.get('X-Test') === '1', 'CORS-Header werden durchgereicht');

// Fremde Praefixe im selben KV duerfen nicht mitgezaehlt werden.
await env.UMFRAGE.put('wunsch:2026:x', 'hallo', { metadata: { a: 'ja' } });
const d2 = await (await call(env, get({ 'X-Umfrage-Secret': 'geheim' }))).json();
ok(d2.total === 4, 'Wuensche/Umfrage im selben KV zaehlen nicht mit');

ok((await call({ UMFRAGE_SECRET: 'geheim' }, post({ id: A, antwort: 'ja' }))).status === 500, 'fehlendes KV-Binding → 500');

console.log(`\n${n - fails}/${n} bestanden`);
if (n < 10) { console.log('✗ zu wenige Pruefungen gelaufen'); process.exit(1); }
process.exit(fails ? 1 : 0);
