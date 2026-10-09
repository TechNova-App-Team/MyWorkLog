// Testet die Modell-Kette aus workers/ai-proxy/worker.js gegen eine fetch-Attrappe:
// haengt ein Modell im Body-Stream, muss die Kette nach MODEL_TIMEOUT_MS weiter-
// ruecken statt ewig zu warten (v3.8 — vorher gab es keinen Timeout, weder hier
// noch im Client). Der Worker ist gitignored und wird von Hand deployed; das hier
// ist die Absicherung davor.
// Aufruf:  node tools/ai-proxy-kette.test.mjs
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

let src = fs.readFileSync(WORKER, 'utf8');

// Der echte Wert ist 60 s; fuer den Test auf 300 ms drehen. Der Test faellt
// durch, wenn die Konstante nicht mehr so heisst — dann ist auch der Timeout weg.
const TIMEOUT_ZEILE = /const MODEL_TIMEOUT_MS = \d+;/;
if (!TIMEOUT_ZEILE.test(src)) { console.error('✗ MODEL_TIMEOUT_MS fehlt im Worker'); process.exit(1); }
src = src.replace(TIMEOUT_ZEILE, 'const MODEL_TIMEOUT_MS = 300;')
         .replace(/^export default \{/m, 'export const MODELS_EXPORT = MODELS;\nexport { rennen };\nexport default {');

const tmp = new URL('./.ai-proxy-kette.generated.mjs', import.meta.url);
fs.writeFileSync(tmp, src);
const worker = (await import(tmp.href)).default;
const { MODELS_EXPORT: MODELS, rennen } = await import(tmp.href);
fs.unlinkSync(tmp);

let ok = 0, fail = 0;
const pruefe = (bedingung, text) => {
  if (bedingung) { ok++; console.log('  OK   ' + text); }
  else { fail++; console.log('  FAIL ' + text); }
};

const WOCHE = JSON.stringify([
  { day: 'Montag', entries: ['Server gewartet', 'Tickets bearbeitet'], hours: 8, isSchoolDay: false, schoolTopic: null },
]);

// Antwort im OpenRouter-Format
const antwort = (text) => JSON.stringify({ choices: [{ message: { content: text } }], usage: {} });

// Ein Body, der nie fertig wird — aber das Abort-Signal respektiert, wie ein
// echter Stream: ReadableStream, der nie schliesst; res.text() haengt, bis
// fetch abgebrochen wird.
function haengenderBody(signal) {
  return new ReadableStream({
    start(ctrl) {
      ctrl.enqueue(new TextEncoder().encode('{"choices":[{"message":{"content":"['));
      signal.addEventListener('abort', () => ctrl.error(new DOMException('aborted', 'AbortError')));
    },
  });
}

const aufrufe = [];
globalThis.fetch = async (url, init) => {
  const model = JSON.parse(init.body).model;
  aufrufe.push(model);
  if (init.signal?.aborted) throw new DOMException('aborted', 'AbortError');
  if (model === MODELS[0]) {
    // Header sofort, Body haengt — genau der Fall "200 und dann Stille".
    return new Response(haengenderBody(init.signal), { status: 200 });
  }
  if (model === MODELS[1]) return new Response(antwort(WOCHE), { status: 200 });
  return new Response('sollte nie erreicht werden', { status: 500 });
};

const env = { OPENROUTER_API_KEY: 'test' };
const neueAnfrage = () => new Request('https://ai-proxy.myworklog.de/', {
  method: 'POST',
  headers: { Origin: 'https://myworklog.de', 'Content-Type': 'application/json' },
  body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Schreib eine Woche' }] }] }),
});

console.log('Kette: erstes Modell haengt im Stream, zweites antwortet');
const t0 = Date.now();
const res = await worker.fetch(neueAnfrage(), env);
const dauer = Date.now() - t0;
const body = await res.json();

pruefe(res.status === 200, `Antwort 200 (war ${res.status})`);
pruefe(res.headers.get('X-MWL-Model') === MODELS[1], `Antwort kam vom zweiten Modell (${res.headers.get('X-MWL-Model')})`);
pruefe(aufrufe.length === 2, `genau zwei Modelle angefasst (${aufrufe.join(' → ')})`);
pruefe(dauer >= 250 && dauer < 5000, `Kette ist nach dem Timeout weitergerueckt (${dauer} ms)`);
pruefe(JSON.stringify(body).includes('Server gewartet'), 'Inhalt der Woche kommt beim Client an');

// Gegenprobe: ohne Haenger wird das erste Modell genommen und das zweite nie gerufen.
aufrufe.length = 0;
globalThis.fetch = async (url, init) => {
  aufrufe.push(JSON.parse(init.body).model);
  return new Response(antwort(WOCHE), { status: 200 });
};
const res2 = await worker.fetch(neueAnfrage(), env);
pruefe(res2.headers.get('X-MWL-Model') === MODELS[0] && aufrufe.length === 1,
  `Gegenprobe: ohne Haenger antwortet das erste Modell (${aufrufe.join(' → ')})`);

// Die Kette selbst: kein Eintrag doppelt, keiner der fuenf Rausgeflogenen drin.
const verboten = ['minimax/minimax-m3:free', 'minimax/minimax-m2.7:free', 'nvidia/nemotron-3.5-lightning:free',
  'google/gemma-4-31b-it:free', 'google/gemma-4-26b-a4b-it:free',
  // 19.09. abends: 403 "only available on agentic harnesses" bzw. Klassifikator
  'thinkingmachines/inkling:free', 'thinkingmachines/inkling-small:free', 'nvidia/nemotron-3.5-content-safety:free'];
pruefe(new Set(MODELS).size === MODELS.length, `kein Modell doppelt (${MODELS.length} Eintraege)`);
pruefe(!MODELS.some(m => verboten.includes(m)), 'keiner der am 19.09.2026 rausgeflogenen Eintraege ist zurueck');
// openrouter/free (v4.5) ist der Router auf freie Modelle: Preis 0, aber ohne Endung.
pruefe(MODELS.length > 0 && MODELS.every(m => m.endsWith(':free') || m === 'openrouter/free'), 'nur kostenlose Modelle in der Kette');

// ── Chat-Assistent (App v8.0.0) ueber "/" ─────────────────────────────
// Der Chat schickt seinen Wochenentwurf ueber den Wochen-Pfad und bekommt
// { antwort, einstellungen, days:[…] } zurueck — mit LEEREN Tagen, weil nichts
// erfunden wird. looksLikeWeek muss das annehmen, sonst probiert jede
// Chat-Nachricht alle Modelle durch.
console.log('\nChat-Entwurf { antwort, days } auf "/"');
const ENTWURF = JSON.stringify({
  antwort: 'Mittwoch steht drin.',
  einstellungen: {},
  days: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'].map(d => ({
    day: d, entries: d === 'Mittwoch' ? ['Der erste Schultag in der 11c wurde absolviert.'] : [], schule: d === 'Mittwoch', thema: '', status: '',
  })),
});
aufrufe.length = 0;
globalThis.fetch = async (url, init) => {
  aufrufe.push(JSON.parse(init.body).model);
  return new Response(antwort('```json\n' + ENTWURF + '\n```'), { status: 200 });
};
const re = await worker.fetch(neueAnfrage(), env);
const be = await re.json();
pruefe(re.status === 200 && aufrufe.length === 1 && !re.headers.get('X-MWL-Salvage'),
  `Entwurf mit vier leeren Tagen reicht dem ersten Modell (${aufrufe.length} Aufruf/e)`);
pruefe(JSON.stringify(be).includes('erste Schultag'), 'Entwurf kommt beim Client an');

// Gegenprobe: ein Objekt OHNE days ist auf "/" unbrauchbar — sonst prueft die
// Zeile oben nichts.
aufrufe.length = 0;
globalThis.fetch = async (url, init) => {
  aufrufe.push(JSON.parse(init.body).model);
  return new Response(antwort(JSON.stringify({ antwort: 'Hallo', einstellungen: {} })), { status: 200 });
};
const rg = await worker.fetch(neueAnfrage(), env);
pruefe(aufrufe.length === MODELS.length && rg.headers.get('X-MWL-Salvage') === '1',
  `Gegenprobe: ohne days alle ${MODELS.length} Modelle probiert (${aufrufe.length})`);

// ── /verstehen ist raus (v4.3) ────────────────────────────────────────
// 410 sofort, ohne ein Modell anzufassen: eine alte, gecachte App faellt so
// auf ihren Notweg, statt jede Nachricht durch die ganze Kette zu schicken.
console.log('\n/verstehen: entfernt');
aufrufe.length = 0;
const rv = await worker.fetch(new Request('https://ai-proxy.myworklog.de/verstehen', {
  method: 'POST',
  headers: { Origin: 'https://myworklog.de', 'Content-Type': 'application/json' },
  body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Bin Bäcker, 1. Jahr' }] }] }),
}), env);
pruefe(rv.status === 410, `/verstehen antwortet 410 (war ${rv.status})`);
pruefe(aufrufe.length === 0, `kein Modell angefasst (${aufrufe.length})`);
pruefe(rv.headers.get('Access-Control-Allow-Origin') === 'https://myworklog.de', 'mit CORS-Kopf, sonst sieht die alte App nur "Netzwerkfehler"');

// ── Gestaffeltes Rennen (v4.6) ───────────────────────────────────────
// Direkt an rennen(), mit Attrappe statt fetch und Staffel 100 ms statt 12 s.
console.log('\nRennen: gestaffelt statt strenger Reihe');
const schlaf = ms => new Promise(r => setTimeout(r, ms));
const KETTE = ['a', 'b', 'c', 'd'];
function attrappe(plan) {
  const log = { start: [], abgebrochen: [], gleichzeitig: 0, max: 0 };
  const fn = (model, payload, key, ref, signal) => {
    log.start.push(model);
    log.gleichzeitig++; log.max = Math.max(log.max, log.gleichzeitig);
    const schritt = plan[model].shift();
    return new Promise(resolve => {
      const t = setTimeout(() => { log.gleichzeitig--; resolve(schritt.r); }, schritt.ms);
      signal.addEventListener('abort', () => {
        clearTimeout(t); log.gleichzeitig--; log.abgebrochen.push(model);
        resolve({ ok: false, code: 'zeit' });
      }, { once: true });
    });
  };
  return { fn, log };
}
const WIN = { ok: true, data: { usage: {} } };

// 1. Erstes Modell haengt, zweites ist schnell: nach der Staffel startet b parallel und gewinnt.
{
  const { fn, log } = attrappe({ a: [{ ms: 5000, r: WIN }], b: [{ ms: 50, r: WIN }], c: [], d: [] });
  const f = [], t0 = Date.now();
  const e = await rennen(KETTE, {}, 'k', 'r', f, { staffelMs: 100, versuch: fn });
  const dauer = Date.now() - t0;
  pruefe(e.gewinner && e.gewinner.model === 'b', `langsames a, schnelles b → b gewinnt (${e.gewinner && e.gewinner.model})`);
  pruefe(dauer >= 140 && dauer < 1000, `nach Staffel + Antwortzeit fertig, nicht nach 5 s (${dauer} ms)`);
  pruefe(log.abgebrochen.includes('a'), 'der Verlierer a wird abgebrochen');
  pruefe(f.length === 0, `Abbruch des Verlierers zaehlt nicht als Fehlversuch (${f.join(',') || 'leer'})`);
}

// 2. Leere Antwort des ersten Modells: einmal wiederholen, dann weiter.
{
  const LEER = { ok: false, code: 'leer' };
  const { fn, log } = attrappe({ a: [{ ms: 10, r: LEER }, { ms: 10, r: WIN }], b: [], c: [], d: [] });
  const f = [];
  const e = await rennen(KETTE, {}, 'k', 'r', f, { staffelMs: 1000, versuch: fn });
  pruefe(e.gewinner && e.gewinner.model === 'a' && log.start.join() === 'a,a', `a leer → a noch einmal → geliefert (${log.start.join(' → ')})`);
  pruefe(f.join() === '0:leer', `Fehlversuch mit Kettenplatz protokolliert (${f.join()})`);
}
{
  const LEER = { ok: false, code: 'leer' };
  const { fn, log } = attrappe({ a: [{ ms: 10, r: LEER }, { ms: 10, r: LEER }], b: [{ ms: 10, r: WIN }], c: [], d: [] });
  const f = [];
  const e = await rennen(KETTE, {}, 'k', 'r', f, { staffelMs: 1000, versuch: fn });
  pruefe(e.gewinner && e.gewinner.model === 'b' && log.start.join() === 'a,a,b', `zweimal leer → nur EINE Wiederholung, dann b (${log.start.join(' → ')})`);
  pruefe(f.join() === '0:leer,0:leer', `beide Versuche stehen im Protokoll (${f.join()})`);
}

// 3. Nie mehr als RENNEN_PARALLEL (2) gleichzeitig, auch wenn alle haengen.
{
  const H = { ms: 400, r: { ok: false, code: '429' } };
  const { fn, log } = attrappe({ a: [H], b: [H], c: [H], d: [H] });
  const f = [];
  const e = await rennen(KETTE, {}, 'k', 'r', f, { staffelMs: 20, versuch: fn });
  pruefe(log.max === 2, `hoechstens 2 gleichzeitig (${log.max})`);
  pruefe(e.gewinner === null && log.start.length === 4, `alle scheitern → kein Gewinner, alle 4 probiert (${log.start.length})`);
  pruefe(f.length === 4 && f.every(x => /^\d:429$/.test(x)), `vier Eintraege "<platz>:429" (${f.join()})`);
  pruefe(f.length > 0, 'Gegenprobe: es gibt ueberhaupt Eintraege');
}

// 4. Unbrauchbare Form wird als Rettung gemerkt, die Kette laeuft weiter.
{
  const FORM = { ok: false, code: 'form', data: { x: 1 } };
  const { fn } = attrappe({ a: [{ ms: 10, r: FORM }], b: [{ ms: 10, r: WIN }], c: [], d: [] });
  const f = [];
  const e = await rennen(KETTE, {}, 'k', 'r', f, { staffelMs: 1000, versuch: fn });
  pruefe(e.gewinner && e.gewinner.model === 'b' && e.salvage && e.salvage.model === 'a', 'Form-Fehler von a gemerkt, b liefert');
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
