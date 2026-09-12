// Testet handleWunsch() aus workers/ai-proxy/worker.js gegen einen KV-Mock —
// der Geburtstags-Wunsch (12.09., components/geburtstag/). Der Worker ist
// gitignored und wird von Hand deployed; das hier ist die Absicherung davor.
// Aufruf:  node tools/wunsch-worker.test.mjs
import fs from 'fs';

// Dieselbe Regel wie in umfrage-worker.test.mjs: auf einem CI-Runner gibt es
// die Datei nicht (Exit 2 = uebersprungen), lokal MUSS sie da sein.
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
const start = src.indexOf('const WUNSCH_MAX');
const end   = src.indexOf('// ── Worker Entry Point');
if (start < 0 || end < 0 || end < start) { console.error('✗ handleWunsch nicht im Worker gefunden'); process.exit(1); }
const mod = src.slice(start, end) + '\nexport { handleWunsch, WUNSCH_MAX };';
const tmp = new URL('./.wunsch.generated.mjs', import.meta.url);
fs.writeFileSync(tmp, mod);
const { handleWunsch, WUNSCH_MAX } = await import(tmp.href);
fs.unlinkSync(tmp);

// Der Entry Point muss den Pfad auch wirklich routen — sonst prueft dieser
// Test eine Funktion, die nie aufgerufen wird.
if (!/pathname === '\/wunsch'[\s\S]{0,80}handleWunsch\(/.test(src)) {
  console.error('✗ /wunsch ist im Entry Point nicht geroutet'); process.exit(1);
}

function makeKV() {
  const store = new Map();
  return {
    _store: store,
    async get(k) { return store.has(k) ? store.get(k).value : null; },
    async put(k, value, opts = {}) { store.set(k, { value, metadata: opts.metadata }); },
    async list({ prefix = '', cursor, limit = 1000 } = {}) {
      const all = [...store.entries()].filter(([k]) => k.startsWith(prefix));
      const from = cursor ? parseInt(cursor, 10) : 0;
      const page = all.slice(from, from + limit);
      const next = from + limit;
      return {
        keys: page.map(([name, v]) => ({ name, metadata: v.metadata })),
        list_complete: next >= all.length,
        cursor: String(next),
      };
    },
  };
}

const cors = { 'X-Test': '1' };
const post = (body) => new Request('https://x/wunsch', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const get = (headers = {}) => new Request('https://x/wunsch', { method: 'GET', headers });
const call = async (env, req, urlStr = 'https://x/wunsch') => handleWunsch(req, env, new URL(urlStr), cors);

let pass = 0, fail = 0;
const check = async (name, fn) => {
  try { await fn(); console.log('  OK   ' + name); pass++; }
  catch (e) { console.log('  FAIL ' + name + ' :: ' + e.message); fail++; }
};
const eq = (a, b, m) => { const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error((m || '') + ' erwartet ' + B + ', bekam ' + A); };

console.log('\n=== Wunsch-Worker ===');

await check('fehlendes KV-Binding -> 500', async () => {
  eq((await call({}, post({ id: 'abcdefgh', text: 'Dunkelmodus fuer alles' }))).status, 500);
});

await check('gueltiger Wunsch -> 200, Text im VALUE, Metadata ohne Text', async () => {
  const env = { UMFRAGE: makeKV() };
  const r = await call(env, post({ id: 'abcdefgh12', text: 'Eine Wochenansicht fuer Schichten', lang: 'de', jahr: '2026' }));
  eq(r.status, 200);
  eq((await r.json()).ok, true);
  const e = env.UMFRAGE._store.get('wunsch:2026:abcdefgh12');
  eq(e.value, 'Eine Wochenansicht fuer Schichten');
  eq(e.metadata.l, 'de');
  eq(e.metadata.n, 33);
  eq('text' in e.metadata, false, 'Text gehoert nicht ins Metadata: ');
});

await check('zweiter Wunsch derselben ID ERSETZT den ersten (kein Zaehler)', async () => {
  const env = { UMFRAGE: makeKV() };
  await call(env, post({ id: 'gleicheid1', text: 'erster Versuch', jahr: '2026' }));
  const r = await call(env, post({ id: 'gleicheid1', text: 'besser formuliert', jahr: '2026' }));
  eq(r.status, 200);
  eq(env.UMFRAGE._store.size, 1);
  eq(env.UMFRAGE._store.get('wunsch:2026:gleicheid1').value, 'besser formuliert');
});

await check('Steuerzeichen raus, Whitespace geglaettet, Laenge gedeckelt', async () => {
  const env = { UMFRAGE: makeKV() };
  const lang = 'x'.repeat(WUNSCH_MAX + 50);
  await call(env, post({ id: 'saubermach', text: '  Bitte\x00 mehr\t\n  Ruhe\x1f ' + lang, jahr: '2026' }));
  const v = env.UMFRAGE._store.get('wunsch:2026:saubermach').value;
  eq(v.startsWith('Bitte mehr Ruhe x'), true, 'Anfang: ' + v.slice(0, 20));
  eq(/[\x00-\x1f\x7f]/.test(v), false, 'keine Steuerzeichen');
  eq(v.length, WUNSCH_MAX);
});

await check('Umlaute und Emoji bleiben erhalten', async () => {
  const env = { UMFRAGE: makeKV() };
  await call(env, post({ id: 'umlaute123', text: 'Größere Schrift für Berichte ✨', jahr: '2026' }));
  eq(env.UMFRAGE._store.get('wunsch:2026:umlaute123').value, 'Größere Schrift für Berichte ✨');
});

await check('leerer / einbuchstabiger Wunsch -> 400', async () => {
  const env = { UMFRAGE: makeKV() };
  eq((await call(env, post({ id: 'leerwunsch', text: '   ' }))).status, 400);
  eq((await call(env, post({ id: 'leerwunsch', text: 'x' }))).status, 400);
  eq((await call(env, post({ id: 'leerwunsch' }))).status, 400);
  eq(env.UMFRAGE._store.size, 0);
});

await check('ungueltige ID -> 400 (zu kurz, Sonderzeichen)', async () => {
  const env = { UMFRAGE: makeKV() };
  eq((await call(env, post({ id: 'kurz', text: 'Wunsch' }))).status, 400);
  eq((await call(env, post({ id: 'a b c d e f g h', text: 'Wunsch' }))).status, 400);
  eq((await call(env, post({ id: '../../etc', text: 'Wunsch' }))).status, 400);
  eq(env.UMFRAGE._store.size, 0);
});

await check('lang: nur de/en, alles andere wird de; jahr: nur vierstellig', async () => {
  const env = { UMFRAGE: makeKV() };
  await call(env, post({ id: 'sprachtest', text: 'Dark mode everywhere', lang: 'en', jahr: '2026' }));
  eq(env.UMFRAGE._store.get('wunsch:2026:sprachtest').metadata.l, 'en');
  await call(env, post({ id: 'sprachtes2', text: 'Wunsch', lang: 'fr', jahr: 'boese' }));
  const k = [...env.UMFRAGE._store.keys()].find(x => x.endsWith('sprachtes2'));
  eq(/^wunsch:\d{4}:sprachtes2$/.test(k), true, 'Key: ' + k);
  eq(env.UMFRAGE._store.get(k).metadata.l, 'de');
});

await check('kaputter Body -> 400', async () => {
  const env = { UMFRAGE: makeKV() };
  const req = new Request('https://x/wunsch', { method: 'POST', body: '{nope' });
  eq((await call(env, req)).status, 400);
});

await check('GET ohne Secret -> 401, ohne gesetztes Secret -> 401', async () => {
  const env = { UMFRAGE: makeKV(), UMFRAGE_SECRET: 'geheim' };
  eq((await call(env, get())).status, 401);
  eq((await call(env, get({ 'X-Umfrage-Secret': 'falsch' }))).status, 401);
  eq((await call({ UMFRAGE: makeKV() }, get({ 'X-Umfrage-Secret': 'geheim' }))).status, 401);
});

await check('GET mit Secret liefert alle Wuensche, Filter nach Jahr', async () => {
  const env = { UMFRAGE: makeKV(), UMFRAGE_SECRET: 'geheim' };
  await call(env, post({ id: 'wunsch0001', text: 'Erster', jahr: '2026' }));
  await call(env, post({ id: 'wunsch0002', text: 'Second', lang: 'en', jahr: '2026' }));
  await call(env, post({ id: 'wunsch0003', text: 'Altlast', jahr: '2025' }));
  const alle = await (await call(env, get({ 'X-Umfrage-Secret': 'geheim' }))).json();
  eq(alle.total, 3);
  eq(alle.wuensche.map(w => w.text).sort(), ['Altlast', 'Erster', 'Second']);
  const nur26 = await (await call(env, get({ 'X-Umfrage-Secret': 'geheim' }), 'https://x/wunsch?jahr=2026')).json();
  eq(nur26.total, 2);
  eq(nur26.wuensche.every(w => w.text !== 'Altlast'), true);
  eq(nur26.wuensche.find(w => w.text === 'Second').lang, 'en');
});

await check('GET sieht die Umfrage-Stimmen NICHT (anderer Prefix)', async () => {
  const env = { UMFRAGE: makeKV(), UMFRAGE_SECRET: 'geheim' };
  await env.UMFRAGE.put('vote:abcdefghij', '1', { metadata: { f: ['ki_stark'] } });
  await call(env, post({ id: 'wunsch0001', text: 'Nur ich', jahr: '2026' }));
  const r = await (await call(env, get({ 'X-Umfrage-Secret': 'geheim' }))).json();
  eq(r.total, 1);
  eq(r.wuensche[0].text, 'Nur ich');
});

await check('PUT/DELETE -> 405', async () => {
  const env = { UMFRAGE: makeKV() };
  eq((await call(env, new Request('https://x/wunsch', { method: 'PUT' }))).status, 405);
});

console.log(`\n${pass} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
