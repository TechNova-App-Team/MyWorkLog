// KI-Tageskontingent, Browser-Seite (ais-cloud.js, seit v8.1.16).
// Der Server zaehlt (workers/ai-proxy, eigener Test dort, gitignored); hier
// wird geprueft, dass der Browser
//   • jede Anfrage mit einer gueltigen Geraete-ID schickt,
//   • den gemeldeten Stand (X-MWL-Kontingent) uebernimmt und daraus sperrt,
//   • einen 429 mit kontingent:true als Tageskontingent erkennt (err.grund),
//   • die alten browserseitigen Zaehler nicht mehr liest.
//
//   node tools/ki-kontingent.test.mjs

import { ladeEngine } from './berichtsheft-laden.mjs';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  OK    ' + m); } else { fail++; console.log('  FAIL  ' + m); } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tagBerlin = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' });

const WOCHE = JSON.stringify([{ day: 'Montag', entries: ['Server eingerichtet'] }]);
const antwort = (status, body, kopf = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...kopf } });
const geminiOk = { candidates: [{ content: { parts: [{ text: WOCHE }] } }] };
const optionen = { yearNum: 2, umfang: 'mittel', form: 'stichpunkte', selectedDays: [0], schoolDayIndices: [], dayStatus: {} };

function engine(fetchImpl, speicher = {}) {
  const e = ladeEngine({ fetchImpl, speicher });
  e.sandbox.crypto = globalThis.crypto;   // die Attrappe bringt kein crypto mit
  return e;
}

console.log('── Altbestand ──');
{
  const e = engine(async () => antwort(200, geminiOk), { tg_ai_rl: '{"count":20}', bh_chat_rl: '{"n":60}' });
  const s = e.sandbox.localStorage;
  ok(s.getItem('tg_ai_rl') === null && s.getItem('bh_chat_rl') === null, 'alte Zaehler (20/Tag, 60/Tag) werden beim Laden entfernt');
  ok(e.CLOUD.RATE_LIMIT_DAILY === undefined, 'RATE_LIMIT_DAILY gibt es nicht mehr');
  const st = e.CLOUD.RateLimit.status();
  ok(st.bekannt === false && st.erschoepft === false && st.rest === null, 'ohne Serverstand: unbekannt, nicht gesperrt, keine erfundene Zahl');
}

console.log('── Anfrage und Kopf ──');
{
  let gesendet = null;
  const e = engine(async (url, opt) => { gesendet = opt.headers; return antwort(200, geminiOk, { 'X-MWL-Kontingent': '30000/100000' }); });
  await e.CLOUD.generateWithCloud('software', optionen);
  const id = gesendet && gesendet['X-MWL-Geraet'];
  ok(UUID.test(id || ''), `Geraete-ID im Kopf: ${id}`);
  ok(e.sandbox.localStorage.getItem('mwl_ki_geraet') === id, 'Geraete-ID bleibt gespeichert');
  ok(e.CLOUD.geraetId() === id, 'zweiter Aufruf liefert dieselbe ID');
  const st = e.CLOUD.RateLimit.status();
  ok(st.bekannt && Math.abs(st.rest - 0.7) < 1e-9, `Stand vom Server uebernommen: rest=${st.rest}`);
  const k = e.CLOUD.Kontingent.stand();
  ok(k.tag === tagBerlin(), `Tag in Berliner Zeit: ${k.tag}`);
}
{
  const e = engine(async () => antwort(200, geminiOk), { mwl_ki_geraet: 'kaputt' });
  ok(UUID.test(e.CLOUD.geraetId()), 'kaputte gespeicherte ID wird ersetzt');
}

console.log('── Sperre ──');
{
  const e = engine(async () => antwort(200, geminiOk, { 'X-MWL-Kontingent': '100000/100000' }));
  await e.CLOUD.generateWithCloud('software', optionen);
  const c = e.CLOUD.RateLimit.check();
  ok(c.ok === false && c.reason === 'daily', `voll verbraucht → check() sperrt: ${c.reason}`);
}
{
  const gestern = JSON.stringify({ tag: '2000-01-01', verbraucht: 100000, limit: 100000, erschoepft: true });
  const e = engine(async () => antwort(200, geminiOk), { mwl_ki_kontingent: gestern });
  ok(e.CLOUD.RateLimit.check().ok === true, 'Stand von gestern sperrt heute nicht');
}
{
  const e = engine(async () => antwort(200, geminiOk));
  e.CLOUD.RateLimit.increment();
  const c = e.CLOUD.RateLimit.check();
  ok(c.reason === 'cooldown', 'Doppelklick-Schutz greift weiterhin');
  ok(e.CLOUD.RateLimit.status().bekannt === false, 'increment() zaehlt kein Kontingent mehr');
}

console.log('── 429 vom Server ──');
{
  const e = engine(async () => antwort(429, { error: 'aufgebraucht', kontingent: true }, { 'Retry-After': '40000', 'X-MWL-Kontingent': '100000/100000' }));
  let err = null;
  try { await e.CLOUD.generateWithCloud('software', optionen); } catch (x) { err = x; }
  ok(err && err.grund === 'tageslimit', `Fehler traegt grund=tageslimit: ${err && err.grund}`);
  ok(e.CLOUD.RateLimit.status().erschoepft === true, 'Stand danach erschoepft');
}
{
  const e = engine(async () => antwort(429, { error: 'zu schnell' }, { 'Retry-After': '120' }), {});
  let err = null;
  try { await e.CLOUD.generateWithCloud('software', optionen); } catch (x) { err = x; }
  ok(err && err.grund === 'burst_limit', `429 ohne kontingent (WAF) → burst_limit: ${err && err.grund}`);
  ok(e.CLOUD.RateLimit.status().erschoepft === false, 'WAF-Bremse sperrt das Tageskontingent NICHT');
}
{
  const e = engine(async () => antwort(403, { error: 'Forbidden origin' }));
  let err = null;
  try { await e.CLOUD.generateWithCloud('software', optionen); } catch (x) { err = x; }
  ok(err && err.grund === 'proxy_offline', `403 → proxy_offline: ${err && err.grund}`);
}

console.log('── Abruf beim Oeffnen ──');
{
  let url = null;
  const e = engine(async (u, opt) => { url = u; return antwort(200, { verbraucht: 12000, limit: 100000, erschoepft: false, tag: tagBerlin() }); });
  const st = await e.CLOUD.Kontingent.abrufen();
  ok(/\/kontingent$/.test(url), `fragt /kontingent: ${url}`);
  ok(st && st.verbraucht === 12000, 'Stand uebernommen');
  const e2 = engine(async () => { throw new Error('offline'); });
  ok(await e2.CLOUD.Kontingent.abrufen() === null, 'offline → null, kein Wurf');
}

console.log(`\nKI-Kontingent (Browser): ${pass} ok, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
