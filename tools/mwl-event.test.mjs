// ═══ MWL-EVENT TEST ═══
// Warum es diesen Test gibt: Bis v6.2.4 hiessen sieben Aufrufstellen `uEvent` —
// einen solchen Helfer gab es nie. Weil jede Stelle korrekt
// `if (typeof uEvent === 'function')` prueft, war die Bedingung einfach immer
// falsch: keine Fehlermeldung, kein Log, die Ereignisse fielen still aus.
// Ein typeof-Guard verbirgt einen Tippfehler im Funktionsnamen vollstaendig,
// deshalb pruefen wir den Namen hier von aussen.
//
// Lauf: node tools/mwl-event.test.mjs
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FEHLT ' + n)); };
const phInit = readFileSync('Assets/js/ph-init.js', 'utf8');

// ── Echte Domain: PostHog wird initialisiert, mwlEvent muss durchreichen ──
// Das <script> braucht der PostHog-Snippet (er haengt sich vor das erste).
const dom = new JSDOM('<!doctype html><html><body><script></script></body></html>', {
  url: 'https://myworklog.de/berichtsheft/', runScripts: 'outside-only', pretendToBeVisual: true,
});
const w = dom.window;
w.eval(phInit);
ok('ph-init.js definiert window.mwlEvent', typeof w.mwlEvent === 'function');

const captured = [];
w.posthog = { capture: (n, p) => captured.push([n, p]) };
w.mwlEvent('foto_import_opened');
w.mwlEvent('foto_import_applied', { rows: 3 });
ok('mwlEvent reicht an posthog.capture durch', captured.length === 2);
ok('Event-Name kommt an',  captured[0]?.[0] === 'foto_import_opened');
ok('Props kommen an',      captured[1]?.[1]?.rows === 3);
ok('fehlende Props -> {}', JSON.stringify(captured[0]?.[1]) === '{}');

// ── Localhost: PostHog startet bewusst nicht — mwlEvent muss trotzdem
//    existieren und still durchfallen, statt die Seite zu kippen. ──
const dl = new JSDOM('<!doctype html><html><body><script></script></body></html>', {
  url: 'http://localhost:5001/', runScripts: 'outside-only',
});
dl.window.eval(phInit);
ok('Localhost: mwlEvent existiert trotzdem', typeof dl.window.mwlEvent === 'function');
ok('Localhost: PostHog wurde nicht geladen', typeof dl.window.posthog === 'undefined');
let threw = false;
try { dl.window.mwlEvent('x', { a: 1 }); } catch (e) { threw = true; }
ok('ohne posthog: kein Absturz', !threw);

// ── Die App hat ihre eigene, inline gesetzte Fassung ──
ok('App definiert mwlEvent inline',
   /window\.mwlEvent\s*=\s*function/.test(readFileSync('index.template.html', 'utf8')));

// ── Die reparierten Aufrufstellen: richtiger Name, richtige Anzahl ──
for (const [f, n] of [['components/ghost/ghost.js', 1],
                      ['components/umfrage/umfrage.js', 3],
                      ['components/urlaubsplaner/urlaubsplaner.js', 1],
                      ['Assets/js/berichtsheft/foto-import.js', 2]]) {
  const src = readFileSync(f, 'utf8');
  ok(`${f}: ${n} Aufruf(e), kein uEvent`,
     (src.match(/[^.\w]mwlEvent\(/g) || []).length === n && !src.includes('uEvent'));
}

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
