// Laedt die Engine des Berichtsheft-Generators ohne Browser in einen vm-Kontext.
//
// Bis v6.5.0 schnitt jeder Test seine Bausteine per Textmarke aus
// pages/berichtsheft/index.html heraus. Das war aus zwei Gruenden fragil:
// ein mehrzeiliger Marker findet bei CRLF gar nichts (der Test faellt aus, ohne
// dass am Code etwas falsch ist), und jede Umformatierung verschob die Grenzen.
// Seit die Engine in eigenen Dateien liegt, werden die Dateien geladen — was
// hier laeuft, ist genau das, was der Browser laedt.
//
// Was NICHT aus der Quelle kommt, steht unten als Attrappe und ist bewusst duenn:
// alles, was mit der Fachlichkeit zu tun hat, soll echt sein.

import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

const JS = new URL('../Assets/js/berichtsheft/', import.meta.url);
const lies = (d) => readFileSync(new URL(d, JS), 'utf8').split('\r\n').join('\n');

// Reihenfolge wie im HTML: die drei Module vor dem Kern.
export const DATEIEN = ['bh-basis.js', 'ais-berufe.js', 'ais-sprache.js', 'ais-cloud.js', 'ais-studio.js'];

/**
 * @param {object} opts
 *   lang        — 'de' | 'en' fuer document.documentElement.lang
 *   fetchImpl   — Attrappe fuer den Cloud-Aufruf
 *   deterministisch — Math.random festnageln, damit pickRandom immer das erste
 *                     Element liefert (fuer Formpruefungen noetig)
 *   speicher    — Vorbelegung fuer localStorage
 */
export function ladeEngine(opts = {}) {
    const speicher = new Map(Object.entries(opts.speicher || {}));
    const sandbox = {
        console,
        localStorage: {
            getItem: (k) => (speicher.has(k) ? speicher.get(k) : null),
            setItem: (k, v) => speicher.set(k, String(v)),
            removeItem: (k) => speicher.delete(k),
        },
        document: {
            documentElement: { lang: opts.lang || 'de' },
            // Der Engine-Pfad fasst das DOM nicht an; wer es doch tut, soll hier
            // sichtbar scheitern statt still `undefined` weiterzureichen.
            getElementById: () => null,
            querySelector: () => null,
            querySelectorAll: () => [],
            addEventListener: () => { },
        },
        navigator: { language: 'de-DE' },
        fetch: opts.fetchImpl || (async () => { throw new Error('kein fetch in diesem Test erlaubt'); }),
        setTimeout, clearTimeout, setInterval, clearInterval,
        // Aus den Dateien, die dieser Kontext nicht laedt (sie fassen das DOM an).
        showToast: () => { },
        showNotification: () => { },
        bhIcon: () => '',
        escapeHtml: (t) => String(t ?? ''),
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    createContext(sandbox);

    // Math.random festnageln: pickRandom liefert dann immer das erste Element.
    // Genau das taten die alten Tests mit einer eigenen pickRandom-Attrappe —
    // nur pruefen sie so jetzt die ECHTE Funktion.
    if (opts.deterministisch) runInContext('Math.random = () => 0;', sandbox);

    const quelle = DATEIEN.map(lies).join('\n;\n') +
        '\n;window.__AIStudio = AIStudio;';
    runInContext(quelle, sandbox, { filename: 'berichtsheft-engine.js' });

    const AIStudio = sandbox.__AIStudio;
    return {
        sandbox,
        AIStudio,
        BERUFE: sandbox.AIS_BERUFE,
        SPRACHE: sandbox.AIS_SPRACHE,
        CLOUD: sandbox.AIS_CLOUD,
        intern: AIStudio._intern,
    };
}

// ── Quelltext-Zugriff fuer Behauptungen ueber den Code selbst ───────────────
// Alle Engine-Dateien stehen mit Einrueckung 0 — eine Funktion endet damit an
// der ersten Zeile, die nur aus `}` besteht. Das ersetzt die frueheren
// mehrzeiligen Textmarken, die bei CRLF gar nicht trafen und sich bei jeder
// Umformatierung verschoben.
export function quelltext(datei) {
    return datei === 'index.html'
        ? readFileSync(new URL('../pages/berichtsheft/index.html', import.meta.url), 'utf8').split('\r\n').join('\n')
        : lies(datei);
}

export function funktion(datei, name) {
    const src = quelltext(datei);
    const re = new RegExp('^(?:async )?function ' + name + '\\s*\\(', 'm');
    const t = src.match(re);
    if (!t) throw new Error(`Funktion ${name} nicht in ${datei} gefunden`);
    const von = t.index;
    const bis = src.indexOf('\n}\n', von);
    if (bis < 0) throw new Error(`Ende von ${name} in ${datei} nicht gefunden`);
    return src.slice(von, bis + 3);
}

// Kommentare strippen, BEVOR ueber den Quelltext etwas behauptet wird: die
// Dateikoepfe hier erklaeren ausdruecklich, was NICHT mehr drinsteht — ein Test
// auf den Wortlaut faende sonst seine eigene Erklaerung.
export function ohneKommentare(js) {
    return js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

// ── Kleiner gemeinsamer Pruefrahmen, damit die Tests gleich aussehen ─────────
export function pruefrahmen() {
    let bestanden = 0, fehlgeschlagen = 0;
    return {
        gruppe: (t) => console.log('\n▶ ' + t),
        ok(bed, name, detail) {
            if (bed) { bestanden++; console.log('  ok    ' + name); }
            else { fehlgeschlagen++; console.log('  FEHL  ' + name + (detail ? '\n        ' + detail : '')); }
        },
        abschluss(titel) {
            console.log(`\n${titel}: ${bestanden} ok, ${fehlgeschlagen} fehlgeschlagen`);
            process.exit(fehlgeschlagen ? 1 : 0);
        },
    };
}
