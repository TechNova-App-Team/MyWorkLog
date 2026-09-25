// Nachgeladene Ansichts-Skripte (VIEW_SCRIPTS in components/core/tab-navigation.js).
// Seit v7.5.8 laden Performance, Historie, Jahr/Monat, Woche, Urlaubsplaner und
// Analytics Pro ihr JS erst beim ersten Oeffnen. Zwei Dinge duerfen nie passieren:
//   1. Eine dieser Dateien steht doch wieder als <script defer> in der index.html
//      (dann laedt sie doppelt, und der Gewinn ist weg).
//   2. Eine sofort geladene Datei ruft eine ihrer Funktionen OHNE typeof-Guard —
//      das wirft ReferenceError, solange die Ansicht nie offen war (z. B. beim
//      Speichern eines Eintrags auf dem Dashboard).
//   node tools/lazy-views.test.mjs
import { readFileSync, existsSync } from 'node:fs';
import * as acorn from 'acorn';

let fails = 0, checks = 0;
const ok = (c, msg, extra) => { checks++; if (c) console.log('  OK   ' + msg); else { fails++; console.log('  FAIL ' + msg + (extra !== undefined ? '\n       ' + [].concat(extra).join('\n       ') : '')); } };
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8').split('\r\n').join('\n');

const tn = read('components/core/tab-navigation.js');
const block = tn.slice(tn.indexOf('const VIEW_SCRIPTS'), tn.indexOf('})();', tn.indexOf('const VIEW_SCRIPTS')));
const lazy = [...new Set([...block.matchAll(/'\/([^']+\.js)'/g)].map(m => m[1]))];
const tpl = read('index.template.html');
const eager = [...tpl.matchAll(/<script[^>]*src="\/([^"?]+)/g)].map(m => m[1]).filter(f => existsSync(new URL('../' + f, import.meta.url)));
const includes = [...tpl.matchAll(/@include ([^ ]+)/g)].map(m => m[1]);

console.log('── Liste und Einbindung');
ok(lazy.length >= 9, 'VIEW_SCRIPTS gefunden (' + lazy.length + ' Dateien)', lazy);
ok(lazy.every(f => existsSync(new URL('../' + f, import.meta.url))), 'jede nachgeladene Datei existiert');
const doppelt = lazy.filter(f => eager.includes(f));
ok(doppelt.length === 0, 'keine nachgeladene Datei steht als <script> in index.template.html', doppelt);

console.log('── Aufrufe von aussen haben einen typeof-Guard');
const names = new Set();
for (const f of lazy) {
    const ast = acorn.parse(read(f), { ecmaVersion: 'latest' });
    for (const n of ast.body) {
        if (n.type === 'FunctionDeclaration') names.add(n.id.name);
        if (n.type === 'VariableDeclaration') n.declarations.forEach(d => d.id.type === 'Identifier' && names.add(d.id.name));
    }
    for (const m of read(f).matchAll(/window\.([A-Za-z_$][\w$]*)\s*=[^=]/g)) names.add(m[1]);
}
ok(names.size > 50, 'Top-Level-Namen der nachgeladenen Dateien gesammelt (' + names.size + ')');

// Eigene Markup-Datei der Ansicht darf ihre Funktionen rufen — sie ist nur sichtbar, wenn geladen.
const ownHtml = new Set(lazy.map(f => f.replace(/[^/]+\.js$/, '')).map(d => includes.find(i => i.startsWith(d))).filter(Boolean));
// renderTab() in tab-navigation.js laeuft erst NACH loadViewScripts().
const renderTabStart = tn.indexOf('    function renderTab(');
const renderTabEnd = tn.indexOf('\n    }\n', renderTabStart);
const tnLineOk = i => { const off = tn.split('\n').slice(0, i).join('\n').length; return off >= renderTabStart && off <= renderTabEnd; };

// Nur erreichbar, wenn die Datei schon laeuft — mit Begruendung, sonst nichts hier eintragen.
const ERLAUBT = {
    // Die Detailschublade oeffnet ausschliesslich openEntryDetail() aus einer
    // Zeile der Historie; ihr Schliessen-Knopf ist vorher unsichtbar.
    closeEntryDetail: 'nur nach openEntryDetail() aus history.js'
};
const strip = l => l.replace(/\/\/.*$/, '');
const verstoesse = [];
let aufrufe = 0;
for (const f of [...eager, ...includes, 'index.template.html']) {
    if (lazy.includes(f) || ownHtml.has(f)) continue;
    const lines = read(f).split('\n');
    lines.forEach((raw, i) => {
        const l = strip(raw);
        if (/^\s*\*/.test(l)) return;
        for (const n of names) {
            if (n.length < 5) continue;
            if (!new RegExp('(^|[^\\w$.])' + n.replace(/\$/g, '\\$') + '\\s*\\(').test(l)) continue;
            if (new RegExp('function\\s+' + n + '\\b').test(l)) continue;
            aufrufe++;
            const umfeld = lines.slice(Math.max(0, i - 2), i + 1).join('\n');
            // Ein Guard auf einen Namen derselben Datei deckt den ganzen Ausdruck
            // (typeof renderPerformanceView === 'function' && renderPerformanceView(calculatePerformanceData())).
            if ([...names].some(m => umfeld.includes('typeof ' + m + ' ==='))) continue;
            if (ERLAUBT[n]) continue;
            if (f === 'components/core/tab-navigation.js' && tnLineOk(i)) continue;
            verstoesse.push(f + ':' + (i + 1) + '  ' + raw.trim().slice(0, 110));
        }
    });
}
ok(verstoesse.length === 0, 'kein ungeschuetzter Aufruf aus sofort geladenem Code', verstoesse);
ok(aufrufe > 5, 'es gibt ueberhaupt Aufrufe von aussen zu pruefen (' + aufrufe + ')');

console.log(fails ? `\n✗ ${fails} von ${checks} fehlgeschlagen` : `\n✓ ${checks}/${checks}`);
process.exit(fails ? 1 : 0);
