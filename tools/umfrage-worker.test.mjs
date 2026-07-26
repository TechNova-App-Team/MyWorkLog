// Testet handleUmfrage() aus workers/ai-proxy/worker.js gegen einen KV-Mock.
// Der Worker ist gitignored und wird von Hand deployed — diese Tests sind die
// einzige Absicherung vor dem Deploy. Aufruf:  node tools/umfrage-worker.test.mjs
import fs from 'fs';

const src = fs.readFileSync('workers/ai-proxy/worker.js', 'utf8');
// Nur den Umfrage-Teil isolieren (der Rest braucht fetch/OpenRouter)
const start = src.indexOf('const UMF_FEATURES');
const end   = src.indexOf('// ── Worker Entry Point');
const mod   = src.slice(start, end) + '\nexport { handleUmfrage, UMF_FEATURES, UMF_PRICES };';
const tmp = new URL('./.umf.generated.mjs', import.meta.url);
fs.writeFileSync(tmp, mod);
const { handleUmfrage } = await import(tmp.href);

// ── KV-Mock: put/get/list mit Metadata und Cursor ──
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
const post = (body) => new Request('https://x/umfrage', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const call = async (env, req, urlStr = 'https://x/umfrage') =>
  handleUmfrage(req, env, new URL(urlStr), cors);

let pass = 0, fail = 0;
const check = async (name, fn) => {
  try { await fn(); console.log('  OK   ' + name); pass++; }
  catch (e) { console.log('  FAIL ' + name + ' :: ' + e.message); fail++; }
};
const eq = (a, b, m) => { const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error((m || '') + ' erwartet ' + B + ', bekam ' + A); };

console.log('\n=== Umfrage-Worker ===');

await check('fehlendes KV-Binding -> 500', async () => {
  const r = await call({}, post({ id: 'abcdefgh', price: '0' }));
  eq(r.status, 500);
});

await check('gueltige Stimme -> 200 ok', async () => {
  const env = { UMFRAGE: makeKV() };
  const r = await call(env, post({ id: 'abcdefgh12', features: ['ki_stark'], price: '3_5' }));
  eq(r.status, 200);
  eq((await r.json()).ok, true);
  eq(env.UMFRAGE._store.get('vote:abcdefgh12').metadata.f, ['ki_stark']);
});

await check('zweite Stimme derselben ID zaehlt NICHT doppelt', async () => {
  const env = { UMFRAGE: makeKV() };
  await call(env, post({ id: 'gleicheid1', features: ['ki_stark'], price: '1_3' }));
  const r = await call(env, post({ id: 'gleicheid1', features: ['ki_stil'], price: '5_10' }));
  eq((await r.json()).doppelt, true);
  eq(env.UMFRAGE._store.size, 1);
  eq(env.UMFRAGE._store.get('vote:gleicheid1').metadata.f, ['ki_stark'], 'erste Stimme bleibt: ');
});

await check('erfundene Feature-Keys werden verworfen', async () => {
  const env = { UMFRAGE: makeKV() };
  await call(env, post({ id: 'boesewicht', features: ['ki_stark', 'hack', '__proto__', 'ki_stil'], price: '1_3' }));
  eq(env.UMFRAGE._store.get('vote:boesewicht').metadata.f, ['ki_stark', 'ki_stil']);
});

await check('doppelte Features werden entdupliziert', async () => {
  const env = { UMFRAGE: makeKV() };
  await call(env, post({ id: 'doppelfeat', features: ['ki_stark', 'ki_stark', 'ki_stark'], price: '0' }));
  eq(env.UMFRAGE._store.get('vote:doppelfeat').metadata.f, ['ki_stark']);
});

await check('ungueltiger Preis wird zu null', async () => {
  const env = { UMFRAGE: makeKV() };
  await call(env, post({ id: 'preisfalsch', features: ['ki_stark'], price: '999_euro' }));
  eq(env.UMFRAGE._store.get('vote:preisfalsch').metadata.p, null);
});

await check('zu kurze ID -> 400', async () => {
  const env = { UMFRAGE: makeKV() };
  eq((await call(env, post({ id: 'ab', price: '0' }))).status, 400);
});

await check('ID mit Sonderzeichen -> 400', async () => {
  const env = { UMFRAGE: makeKV() };
  eq((await call(env, post({ id: 'vote:../../etc', price: '0' }))).status, 400);
});

await check('leere Stimme -> 400', async () => {
  const env = { UMFRAGE: makeKV() };
  eq((await call(env, post({ id: 'leerleerleer', features: [], price: null }))).status, 400);
});

await check('kaputter JSON-Body -> 400', async () => {
  const env = { UMFRAGE: makeKV() };
  const req = new Request('https://x/umfrage', { method: 'POST', body: '{kaputt' });
  eq((await call(env, req)).status, 400);
});

await check('Ergebnisse ohne Secret -> 401', async () => {
  const env = { UMFRAGE: makeKV(), UMFRAGE_SECRET: 'geheim' };
  const req = new Request('https://x/umfrage', { method: 'GET' });
  eq((await call(env, req)).status, 401);
});

await check('Ergebnisse mit falschem Secret -> 401', async () => {
  const env = { UMFRAGE: makeKV(), UMFRAGE_SECRET: 'geheim' };
  const req = new Request('https://x/umfrage?results=falsch', { method: 'GET' });
  eq((await call(env, req, 'https://x/umfrage?results=falsch')).status, 401);
});

await check('kein Secret gesetzt -> 401 (nichts rausgeben)', async () => {
  const env = { UMFRAGE: makeKV() };
  const req = new Request('https://x/umfrage?results=', { method: 'GET' });
  eq((await call(env, req, 'https://x/umfrage?results=')).status, 401);
});

await check('Auswertung zaehlt korrekt', async () => {
  const env = { UMFRAGE: makeKV(), UMFRAGE_SECRET: 'geheim' };
  await call(env, post({ id: 'stimme0001', features: ['ki_stark', 'ki_stil'], price: '3_5' }));
  await call(env, post({ id: 'stimme0002', features: ['ki_stark'],          price: '3_5' }));
  await call(env, post({ id: 'stimme0003', features: ['keine'],       price: '0'   }));
  const req = new Request('https://x/umfrage?results=geheim', { method: 'GET' });
  const j = await (await call(env, req, 'https://x/umfrage?results=geheim')).json();
  eq(j.total, 3);
  eq(j.features.ki_stark, 2); eq(j.features.ki_stil, 1); eq(j.features.keine, 1);
  eq(j.features.ki_limit, 0);
  eq(j.prices['3_5'], 2); eq(j.prices['0'], 1);
});

await check('Auswertung blaettert ueber 1000 Stimmen hinaus', async () => {
  const env = { UMFRAGE: makeKV(), UMFRAGE_SECRET: 'geheim' };
  for (let i = 0; i < 1234; i++) {
    await call(env, post({ id: 'id' + String(i).padStart(8, '0'), features: ['ki_stark'], price: '1_3' }));
  }
  const req = new Request('https://x/umfrage?results=geheim', { method: 'GET' });
  const j = await (await call(env, req, 'https://x/umfrage?results=geheim')).json();
  eq(j.total, 1234, 'Cursor-Paginierung: ');
  eq(j.features.ki_stark, 1234);
});

await check('falsche Methode -> 405', async () => {
  const env = { UMFRAGE: makeKV() };
  const req = new Request('https://x/umfrage', { method: 'DELETE' });
  eq((await call(env, req)).status, 405);
});

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen\n`);
fs.unlinkSync(tmp);
process.exit(fail ? 1 : 0);
