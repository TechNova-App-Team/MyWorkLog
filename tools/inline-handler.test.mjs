// Prueft, dass jede Funktion, die aus einem Inline-Handler aufgerufen wird,
// im Projekt auch existiert.
//
// Warum das einen eigenen Test verdient: diese Fehlerklasse ist SYMPTOMLOS.
// Die Verdrahtung dieser App laeuft ueber onclick/onchange-Attribute, teils in
// .html, teils in innerHTML-Strings. Zeigt so ein Attribut auf einen Namen, den
// es nicht gibt, passiert beim Laden nichts — kein Fehler, kein Log. Erst wer
// draufklickt, merkt es, und im Screenshot sieht alles richtig aus.
// Zweimal hier passiert:
//   - `uEvent(...)` an sieben Stellen; die Funktion hiess immer `mwlEvent`.
//     Weil die Aufrufstellen `if (typeof uEvent === 'function')` prueften, war
//     die Bedingung schlicht immer falsch. Jahrelang still ausgefallen.
//   - `openQuickHelp('global')` — beim Entfernen des Seitentitels ging der
//     einzige Aufruf mit, rund hundert Zeilen Hilfe blieben unerreichbar.
//
// Was hier NICHT geprueft werden kann:
//   - ob die Funktion zur Laufzeit auch GELADEN ist (Reihenfolge der Skripte,
//     bedingte Einbindung). Der Test sagt nur: es gibt sie im Quelltext.
//   - Aufrufe, die erst zur Laufzeit aus Variablen zusammengesetzt werden.
//   - ob die Funktion das Richtige tut.
//
// Lauf: node tools/inline-handler.test.mjs

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

let pass = 0, fail = 0;
const ok  = (m) => { pass++; console.log('  ok    ' + m); };
const bad = (m) => { fail++; console.log('  FEHLT ' + m); };
const norm = (p) => p.split(sep).join('/');

function walk(dir, out = []) {
    for (const e of readdirSync(dir)) {
        if (/^(node_modules|\.git|graphify-out)$/.test(e)) continue;
        const p = join(dir, e);
        if (statSync(p).isDirectory()) { if (norm(p).includes('pages/en')) continue; walk(p, out); }
        else if (/\.(js|html)$/.test(p) && !/\.min\.js$/.test(p)) out.push(norm(p));
    }
    return out;
}

// index.html und pages/en/ sind generiert — sie wuerden dieselben Treffer
// doppelt melden und beim Umbenennen einer Funktion veraltet danebenliegen.
const dateien = [...walk('components'), ...walk('pages'), ...walk('Assets'), 'index.template.html']
    .filter((f) => f !== 'index.html');
const quellen = new Map(dateien.map((f) => [f, readFileSync(f, 'utf8')]));

// ── 1) Was ist definiert? ────────────────────────────────────────────────
// Bewusst grosszuegig: lieber ein Name zu viel als ein Fehlalarm. Der Test
// soll den Tippfehler finden, nicht die Codebasis erziehen.
const browserGlobals = new Set([
    'alert', 'confirm', 'prompt', 'print', 'open', 'close', 'fetch', 'event', 'require',
    'Number', 'String', 'Boolean', 'Array', 'Object', 'Date', 'JSON', 'Math', 'RegExp',
    'parseInt', 'parseFloat', 'isNaN', 'encodeURIComponent', 'decodeURIComponent',
    'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'requestAnimationFrame',
    'Promise', 'Set', 'Map', 'Error', 'Intl', 'URL', 'Blob', 'FormData', 'structuredClone'
]);
const definiert = new Set(browserGlobals);
const MUSTER = [
    /function\s+([A-Za-z_$][\w$]*)/g,                                        // function foo()
    /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/g, // const foo = () =>
    /window\.([A-Za-z_$][\w$]*)\s*=/g,                                       // window.foo =
    /^\s*([A-Za-z_$][\w$]*)\s*[:(]/gm                                        // Objekt-Methoden
];
for (const s of quellen.values())
    for (const re of MUSTER) { let m; while ((m = re.exec(s))) definiert.add(m[1]); }

// ── 2) Was wird aus Attributen aufgerufen? ───────────────────────────────
const HANDLER = /\bon(?:click|change|input|submit|keyup|keydown|keypress|focus|blur|mouseover|mouseout|mousedown|mouseup|toggle)\s*=\s*(["'])([\s\S]*?)\1/g;
const SCHLUESSELWORT = /^(if|else|for|while|do|switch|case|return|typeof|instanceof|new|try|catch|finally|function|this|void|delete|in|of|await|async|yield)$/;

const aufrufe = new Map();          // Name -> ["datei:zeile", …]
for (const [f, s] of quellen) {
    if (!/\.html$/.test(f)) continue;
    s.split('\n').forEach((zeile, i) => {
        let h;
        HANDLER.lastIndex = 0;
        while ((h = HANDLER.exec(zeile))) {
            // Zeichenketten im Handler entfernen — sonst zaehlt `translateY(-2px)`
            // aus `this.style.transform='translateY(-2px)'` als Funktionsaufruf.
            const rumpf = h[2]
                .replace(/'[^']*'/g, "''")
                .replace(/&quot;[\s\S]*?&quot;/g, '')
                .replace(/&#39;[\s\S]*?&#39;/g, '')
                .replace(/\x27[\s\S]*?\x27/g, '');
            const CALL = /(?:^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g;
            let c;
            while ((c = CALL.exec(rumpf))) {
                const n = c[1];
                if (SCHLUESSELWORT.test(n)) continue;
                if (!aufrufe.has(n)) aufrufe.set(n, []);
                aufrufe.get(n).push(f + ':' + (i + 1));
            }
        }
    });
}

console.log('\n▶ Inline-Handler');
const gesamt = [...aufrufe.values()].reduce((a, b) => a + b.length, 0);
gesamt > 300
    ? ok(`${gesamt} Aufrufe an ${aufrufe.size} Namen eingesammelt`)
    : bad(`nur ${gesamt} Aufrufe gefunden — greift das Muster noch?`);

const tot = [...aufrufe].filter(([n]) => !definiert.has(n));
if (tot.length === 0) {
    ok('jeder aufgerufene Name existiert im Quelltext');
} else {
    for (const [n, wo] of tot.sort((a, b) => b[1].length - a[1].length))
        bad(`${n}() gibt es nicht — ${wo.length}x, u.a. ${wo.slice(0, 3).join(', ')}`);
}

console.log('\n▶ Regressionsschutz fuer die beiden bekannten Faelle');
{
    const alleQuellen = [...quellen.values()].join('\n');
    !/\buEvent\s*\(/.test(alleQuellen)
        ? ok('kein uEvent( — der Helfer heisst mwlEvent')
        : bad('uEvent( ist zurueck — der Helfer heisst mwlEvent');
    (aufrufe.has('openQuickHelp') || !/function\s+openQuickHelp/.test(alleQuellen))
        ? ok('openQuickHelp ist erreichbar oder ganz weg')
        : bad('openQuickHelp existiert, wird aber von keinem Handler mehr gerufen');
}

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen\n`);
process.exit(fail ? 1 : 0);
