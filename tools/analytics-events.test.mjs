// ═══ ANALYTICS-EVENTS TEST ═══
// Prueft die Kette von der Aufrufstelle bis zur Zeile in /analytics/ ("Funktionen in der App"):
//  1. Jeder Event-Name, den der Quelltext feuert, hat eine Beschriftung in insights.js —
//     sonst steht im Dashboard ein roher Schluessel ("Rechte checker: fall geoeffnet").
//  2. Jede feste Unterart (aktion/grund als Literal) hat eine Beschriftung.
//  3. Der Fehlerzaehler (index.template.html + ph-init.js) schickt KEINE Fehlermeldung
//     (die kann Nutzerdaten zitieren), filtert "Script error." und hoert nach 5 auf.
//  4. Die Reiter-Zuordnung: problem_* → Probleme, reine Ansicht → Ansichten, Rest → Aktionen.
//
// Lauf: node tools/analytics-events.test.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FEHLT ' + n)); };
const lf = p => readFileSync(p, 'utf8').split('\r\n').join('\n');

// ── Beschriftungen aus der echten insights.js holen ──
const ins = lf('Assets/js/insights/insights.js');
const a = ins.indexOf('var EVENT_LABELS = {');
const b = ins.indexOf('// ─── Kennzahlen');
ok('Label-Block in insights.js gefunden', a > 0 && b > a);
const api = new Function('T', ins.slice(a, b) +
  '\nreturn { EVENT_LABELS: EVENT_LABELS, SUB_LABELS: SUB_LABELS, eventLabel: eventLabel, eventGroup: eventGroup };')
  ((de) => de);

// ── Aufrufstellen einsammeln ──
const ROOTS = ['components', 'Assets/js', 'pages', 'index.template.html'];
const files = [];
(function walk(p) {
  const st = statSync(p);
  if (st.isDirectory()) {
    if (/vendor|[\\/]en$|node_modules/.test(p)) return;
    for (const f of readdirSync(p)) walk(join(p, f));
  } else if (/\.(js|html)$/.test(p) && !/insights\.js$/.test(p)) files.push(p);
})('.');
const quellen = files.filter(f => ROOTS.some(r => f.replace(/\\/g, '/').startsWith(r)));

const namen = new Map();      // name → Datei
const unterarten = [];        // [name, unterart, datei]
for (const f of quellen) {
  const s = lf(f);
  for (const m of s.matchAll(/mwlEvent\(\s*'([a-z0-9_]+)'/g)) {
    const name = m[1];
    if (!namen.has(name)) namen.set(name, f);
    // Props-Objekt bis zur schliessenden Klammer des Aufrufs (Tiefe zaehlen)
    let i = s.indexOf('(', m.index), tiefe = 0, j = i;
    for (; j < s.length; j++) { if (s[j] === '(') tiefe++; else if (s[j] === ')' && --tiefe === 0) break; }
    const props = s.slice(i, j);
    // Nur der Wert hinter aktion:/grund: bis zum naechsten Schluessel oder Objektende
    for (const k of props.matchAll(/\b(aktion|grund)\s*:([^}]*?)(?=,\s*[a-z_]+\s*:|\}|$)/gs)) {
      for (const lit of k[2].matchAll(/'([a-z0-9_]+)'/g)) {
        // Vergleichswert einer Bedingung ("result.outcome === 'accepted' ? …"), kein Ergebnis
        if (/[=!]==\s*$/.test(k[2].slice(0, lit.index))) continue;
        unterarten.push([name, lit[1], f]);
      }
    }
  }
}
// Test-Attrappen und das Beispiel aus dem Kommentar zaehlen nicht
namen.delete('x');

ok('es gibt ueberhaupt Event-Namen (Gegenprobe)', namen.size > 40);
ok('es gibt ueberhaupt feste Unterarten (Gegenprobe)', unterarten.length > 40);

const ohneLabel = [...namen.keys()].filter(n => n !== 'feature_genutzt' && !api.EVENT_LABELS[n]);
ok('jeder gefeuerte Event-Name hat eine Beschriftung' + (ohneLabel.length ? ': ' + ohneLabel.join(', ') : ''), ohneLabel.length === 0);

const ohneSub = unterarten.filter(([n, u]) => !api.SUB_LABELS[n + '::' + u] && !api.SUB_LABELS[u]
  && !(n === 'feature_genutzt'))   // dort ist die Unterart der Bereich ('aufgaben')
  .map(([n, u]) => n + '::' + u);
ok('jede feste Unterart hat eine Beschriftung' + (ohneSub.length ? ': ' + [...new Set(ohneSub)].join(', ') : ''), ohneSub.length === 0);

// ── Reiter-Zuordnung + Beschriftung ──
ok('problem_* → Probleme', api.eventGroup('problem_ki::tageslimit') === 'problems');
ok('reine Ansicht → Ansichten', api.eventGroup('feature_genutzt::dashboard') === 'views');
ok('Ansicht mit Unteraktion → Aktionen', api.eventGroup('feature_genutzt::aufgaben::erledigt') === 'actions');
ok('sonstiges → Aktionen', api.eventGroup('backup::verschluesselt_exportiert') === 'actions');
ok('Label mit Unterart', api.eventLabel('problem_ki::tageslimit') === 'KI nicht verfügbar: Tageslimit');
ok('Label einer Ansicht ohne Praefix', api.eventLabel('feature_genutzt::weekview') === 'Wochenansicht');
ok('Label Aufgaben-Aktion', api.eventLabel('feature_genutzt::aufgaben::erledigt') === 'Aufgaben: Aufgabe erledigt');
ok('Dateiname bleibt Dateiname', api.eventLabel('problem_js_fehler::history.js') === 'Skriptfehler: history.js');
ok('Altdaten ohne Unterart bleiben lesbar', api.eventLabel('timer_action') === 'Timer');

// ── Fehlerzaehler, beide Fassungen ──
const tpl = lf('index.template.html');
const s0 = tpl.indexOf('/* Unbehandelte Fehler zaehlen');
const s1 = tpl.indexOf('})();', s0) + 5;
const app = tpl.slice(tpl.indexOf('(function', s0), s1);
const ph = lf('Assets/js/ph-init.js');
const p0 = ph.indexOf('/* Unbehandelte Fehler zaehlen');
const p1 = ph.indexOf('})();', p0) + 5;
const sa = ph.slice(ph.indexOf('(function', p0), p1);

for (const [name, code] of [['App', app], ['ph-init', sa]]) {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://myworklog.de/', runScripts: 'outside-only' });
  const w = dom.window, got = [];
  w.mwlEvent = (n, p) => got.push([n, p]);
  w.eval(code);
  const geheim = new SyntaxError('Unexpected token \'M\', "Max Muster" is not valid JSON');
  w.dispatchEvent(new w.ErrorEvent('error', { message: geheim.message, error: geheim, filename: 'https://myworklog.de/components/history/history.js?v=8.0.9', lineno: 42 }));
  w.dispatchEvent(new w.ErrorEvent('error', { message: 'Script error.' }));
  w.dispatchEvent(new w.ErrorEvent('error', { message: 'ResizeObserver loop limit exceeded' }));
  ok(name + ': ein echter Fehler wird gezaehlt, Rauschen nicht', got.length === 1);
  ok(name + ': Datei ohne Pfad und Query', got[0]?.[1]?.datei === 'history.js');
  ok(name + ': Zeile und Typ kommen an', got[0]?.[1]?.zeile === 42 && got[0]?.[1]?.typ === 'SyntaxError');
  ok(name + ': die Fehlermeldung geht NICHT raus', !JSON.stringify(got).includes('Muster'));
  // Promise-Ablehnung: Datei aus dem Stack
  const r = new Error('x'); r.stack = 'Error: x\n    at f (https://myworklog.de/Assets/js/aufgaben.js?v=1:120:7)';
  const ev = new w.Event('unhandledrejection'); ev.reason = r; w.dispatchEvent(ev);
  ok(name + ': Promise-Fehler mit Datei und Zeile', got[1]?.[1]?.datei === 'aufgaben.js' && got[1]?.[1]?.zeile === 120 && got[1]?.[1]?.art === 'promise');
  for (let i = 0; i < 10; i++) w.dispatchEvent(new w.ErrorEvent('error', { message: 'm', error: new TypeError('m'), filename: 'a.js', lineno: i }));
  ok(name + ': hoechstens 5 je Seitenaufruf', got.length === 5);
}
ok('beide Fassungen des Fehlerzaehlers sind gleich (bis auf Einrueckung)',
  app.replace(/\s+/g, ' ').replace(/\/\/[^\n]*/g, '') !== '' &&
  app.split('\n').map(l => l.trim()).filter(l => !l.startsWith('//')).join('|').replace(/\s*\/\/.*?(?=\||$)/g, '') ===
  sa.split('\n').map(l => l.trim()).filter(l => !l.startsWith('//')).join('|').replace(/\s*\/\/.*?(?=\||$)/g, ''));

console.log('\n' + pass + ' bestanden, ' + fail + ' fehlgeschlagen');
process.exit(fail ? 1 : 0);
