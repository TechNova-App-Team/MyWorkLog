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
         .replace(/^export default \{/m, 'export const MODELS_EXPORT = MODELS;\nexport default {');

const tmp = new URL('./.ai-proxy-kette.generated.mjs', import.meta.url);
fs.writeFileSync(tmp, src);
const worker = (await import(tmp.href)).default;
const { MODELS_EXPORT: MODELS } = await import(tmp.href);
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
pruefe(MODELS.length > 0 && MODELS.every(m => m.endsWith(':free')), 'nur :free-Modelle in der Kette');

// ── /verstehen (Chat-Assistent, v4.2) ─────────────────────────────────
// Der Chat bekommt ein OBJEKT zurueck, keine Woche. Auf "/" waere das
// unbrauchbar (naechstes Modell), auf "/verstehen" ist es das Ergebnis.
console.log('\n/verstehen: Antwort-Objekt statt Woche');
const OBJEKT = JSON.stringify({ antwort: 'Alles klar, Bäcker im 1. Lehrjahr.', einstellungen: { lehrjahr: 1 }, erzeugen: false });
const verstehAnfrage = () => new Request('https://ai-proxy.myworklog.de/verstehen', {
  method: 'POST',
  headers: { Origin: 'https://myworklog.de', 'Content-Type': 'application/json' },
  body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Bin Bäcker, 1. Jahr' }] }],
                         generationConfig: { maxOutputTokens: 4096 } }),
});

aufrufe.length = 0;
const gesendet = [];
globalThis.fetch = async (url, init) => {
  const b = JSON.parse(init.body);
  aufrufe.push(b.model); gesendet.push(b);
  return new Response(antwort('```json\n' + OBJEKT + '\n```'), { status: 200 });
};
const rv = await worker.fetch(verstehAnfrage(), env);
const bv = await rv.json();
pruefe(rv.status === 200 && aufrufe.length === 1, `ein Objekt mit "antwort" reicht dem ersten Modell (${aufrufe.length} Aufruf/e)`);
pruefe(JSON.stringify(bv).includes('Bäcker im 1. Lehrjahr'), 'Antwort kommt beim Client an (auch mit ```json drumherum)');
pruefe(gesendet[0].max_tokens <= 900, `Laenge gedeckelt (${gesendet[0].max_tokens} statt 4096)`);

// Gegenprobe: dieselbe Antwort ist auf dem WOCHEN-Weg unbrauchbar — sonst
// haette die Weiche nichts geaendert und der Test oben prueft nichts.
aufrufe.length = 0;
const rw = await worker.fetch(neueAnfrage(), env);
pruefe(aufrufe.length === MODELS.length && rw.headers.get('X-MWL-Salvage') === '1',
  `Gegenprobe: auf "/" wird das Objekt verworfen, alle ${MODELS.length} Modelle probiert (${aufrufe.length})`);

// Ein Objekt OHNE Text in "antwort" taugt auch auf /verstehen nicht.
aufrufe.length = 0;
globalThis.fetch = async (url, init) => {
  const m = JSON.parse(init.body).model;
  aufrufe.push(m);
  return new Response(antwort(m === MODELS[0] ? '{"antwort":"  "}' : OBJEKT), { status: 200 });
};
const rl = await worker.fetch(verstehAnfrage(), env);
pruefe(rl.headers.get('X-MWL-Model') === MODELS[1] && aufrufe.length === 2,
  `leere "antwort" → naechstes Modell (${aufrufe.join(' → ')})`);

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
