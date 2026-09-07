// Die Verdrahtung zwischen den Dateien des Berichtshefts.
//
// Seit v6.5.0 liegt die Seite nicht mehr als eine 18.000-Zeilen-Datei da, sondern
// als 14 Stylesheets und 15 Skripte. Das bringt drei neue Fehlerarten mit, die
// alle STUMM sind — die Seite laedt, sieht richtig aus und tut trotzdem nicht,
// was sie soll:
//
//   1. Ein Name wird aus einem Modul ausgepackt, das ihn gar nicht zurueckgibt.
//      `const { foo } = window.AIS_SPRACHE` ergibt dann `undefined`, kein Fehler.
//      Erst der Aufruf wirft — irgendwann, in einer Generierung, beim Nutzer.
//   2. Die Ladereihenfolge kippt. ais-cloud.js packt beim Laden aus
//      window.AIS_SPRACHE aus; steht es davor, ist das Objekt noch nicht da.
//   3. Der Kern reicht dem Cloud-Zweig nicht mehr alles, was der braucht.
//
// Dazu die Regel, wegen der aufgeteilt wurde: index.html bleibt Markup. Waechst
// dort wieder ein Skript- oder Stilblock heran, faellt dieser Test durch.

import { readFileSync, existsSync } from 'node:fs';
import { Script } from 'node:vm';
import { ladeEngine, pruefrahmen, quelltext, DATEIEN } from './berichtsheft-laden.mjs';

const { gruppe, ok, abschluss } = pruefrahmen();

const WURZEL = new URL('../', import.meta.url);
const HTML = quelltext('index.html');
const E = ladeEngine();

// ── 1. Was ausgepackt wird, muss es auch geben ──────────────────────────────
gruppe('Ausgepackte Namen existieren im Modul');

const MODULE = { AIS_BERUFE: E.BERUFE, AIS_SPRACHE: E.SPRACHE, AIS_CLOUD: E.CLOUD };
let auspackungen = 0;
for (const datei of ['ais-cloud.js', 'ais-studio.js']) {
    const src = quelltext(datei);
    for (const m of src.matchAll(/const \{([^}]+)\} = window\.(AIS_[A-Z]+);/g)) {
        const modul = MODULE[m[2]];
        ok(!!modul, `${datei}: window.${m[2]} gibt es`, 'Modul unbekannt');
        if (!modul) continue;
        const namen = m[1].split(',').map((s) => s.trim()).filter(Boolean);
        const fehlt = namen.filter((n) => modul[n] === undefined);
        auspackungen += namen.length;
        ok(fehlt.length === 0,
            `${datei} packt ${namen.length} Namen aus ${m[2]} aus — alle vorhanden`,
            fehlt.length ? 'NICHT EXPORTIERT: ' + fehlt.join(', ') : '');
    }
}
// Gegenprobe: der Lauf hat ueberhaupt Auspackungen gefunden. Ohne diese Zeile
// waere eine umbenannte Syntax (und damit null Treffer) ein gruener Lauf.
ok(auspackungen > 20, `es wurden ueberhaupt Namen geprueft (${auspackungen})`);

// ── 2. Der Kern reicht dem Cloud-Zweig genau das, was der braucht ────────────
gruppe('Kern und Cloud-Zweig passen zusammen');

const studio = quelltext('ais-studio.js');
const uebergabe = studio.match(/window\.AIS_CLOUD\.verbinde\(\{([^}]+)\}\)/);
ok(!!uebergabe, 'ais-studio.js reicht dem Cloud-Zweig etwas herein');
if (uebergabe) {
    const gereicht = uebergabe[1].split(',').map((s) => s.trim()).filter(Boolean).sort();
    const gebraucht = [...E.CLOUD.GEBRAUCHT].sort();
    ok(gereicht.join() === gebraucht.join(),
        `alle ${gebraucht.length} gebrauchten Namen werden auch gereicht`,
        'gebraucht: ' + gebraucht.join(', ') + '\n        gereicht:  ' + gereicht.join(', '));
    // Und sie sind zur Laufzeit wirklich gesetzt — verbinde() wirft sonst schon
    // beim Laden, aber nur wenn es ueberhaupt aufgerufen wurde.
    ok(typeof E.CLOUD.generateWithCloud === 'function', 'generateWithCloud steht bereit');
    ok(E.CLOUD.GEBRAUCHT.length >= 5, 'die Bedarfsliste ist nicht leer');
}

// ── 3. Ladereihenfolge im HTML ──────────────────────────────────────────────
gruppe('Ladereihenfolge');

const reihe = [...HTML.matchAll(/<script src="\/Assets\/js\/berichtsheft\/([\w.-]+\.js)/g)].map((m) => m[1]);
const pos = (d) => reihe.indexOf(d);
ok(reihe.length >= 15, `alle Skripte sind eingebunden (${reihe.length})`, reihe.join(', '));
ok(pos('bh-basis.js') === reihe.findIndex((d) => d.startsWith('bh-')),
    'bh-basis.js steht vor allen anderen bh-Dateien (haelt den Zustand)');
for (const m of ['ais-berufe.js', 'ais-sprache.js', 'ais-cloud.js']) {
    ok(pos(m) > -1 && pos(m) < pos('ais-studio.js'), `${m} laedt vor ais-studio.js`);
}
ok(pos('ais-berufe.js') < pos('ais-cloud.js') && pos('ais-sprache.js') < pos('ais-cloud.js'),
    'ais-cloud.js laedt nach den beiden Modulen, aus denen es auspackt');
ok(!/<script[^>]+src="\/Assets\/js\/berichtsheft\/(bh|ais)-[^"]*"[^>]*\sdefer/.test(HTML),
    'keine dieser Dateien traegt defer — die Reihenfolge haengt daran');

// Jede eingebundene Datei existiert auch. (asset-pfade.test.mjs prueft das
// repoweit; hier steht es nochmal, weil dieser Test ohne den anderen laufen soll.)
for (const d of DATEIEN) {
    ok(existsSync(new URL('Assets/js/berichtsheft/' + d, WURZEL)), d + ' existiert');
}

// ── 4. index.html bleibt Markup ─────────────────────────────────────────────
gruppe('index.html traegt keinen Code mehr');

ok(!/<style[\s>]/.test(HTML), 'kein <style>-Block in der Seite');

const inline = [...HTML.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
ok(inline.length > 0, 'es gibt ueberhaupt Inline-Skripte zu pruefen (sonst ist die Zeile darunter leer)');

// Jedes Inline-Skript muss uebersetzbar sein. Genau hier fehlte beim Umzug einmal
// die schliessende Zeile eines IIFE — im Browser waere das ein stiller Ausfall
// des Easter Eggs gewesen, in der Konsole eine Meldung, die niemand liest.
const kaputt = [];
inline.forEach((src, i) => {
    try { new Script(src); } catch (e) { kaputt.push('#' + (i + 1) + ': ' + e.message); }
});
ok(kaputt.length === 0, `alle ${inline.length} Inline-Skripte uebersetzen`, kaputt.join('\n        '));

const langsten = Math.max(...inline.map((s) => s.split('\n').length));
ok(langsten <= 45,
    `kein Inline-Skript ist laenger als 45 Zeilen (laengstes: ${langsten})`,
    'Neuer Code gehoert nach Assets/js/berichtsheft/, nicht zurueck in die Seite.');

const zeilen = HTML.split('\n').length;
ok(zeilen < 3000, `die Seite bleibt handhabbar (${zeilen} Zeilen)`,
    'Vor der Aufteilung waren es 17.668. Waechst sie wieder, wurde etwas nicht ausgelagert.');

// ── 5. Stylesheets: Reihenfolge und definierte Tokens ───────────────────────
gruppe('Stylesheets');

const css = [...HTML.matchAll(/<link rel="stylesheet" href="\/Assets\/css\/berichtsheft\/([\w.-]+\.css)/g)].map((m) => m[1]);
ok(css.length >= 14, `alle Stylesheets sind eingebunden (${css.length})`, css.join(', '));
ok(css[0] === 'basis.css', 'basis.css zuerst — dort stehen die Tokens');
ok(css.indexOf('druck-responsive.css') === css.length - 2 || css[css.length - 1] === 'druck-responsive.css'
    || css.indexOf('druck-responsive.css') > css.indexOf('basis.css'),
    'druck-responsive.css steht hinter den Regeln, die es schlagen muss');

// Ein undefiniertes var() ohne Rueckfallwert ist *invalid at computed-value time*:
// die Eigenschaft faellt auf ihren Anfangswert zurueck, `border: 1px solid
// var(--gibtsnicht)` heisst also GAR KEIN Rahmen. Im Screenshot sieht das nach
// Gestaltung aus. Standalone-Seiten erben nichts aus core.css, deshalb muss
// jedes Token hier selbst definiert sein.
let alleCss = '';
for (const d of css) alleCss += readFileSync(new URL('Assets/css/berichtsheft/' + d, WURZEL), 'utf8');
const benutzt = new Set([...alleCss.matchAll(/var\(\s*(--[\w-]+)\s*(?:[,)])/g)].map((m) => m[1]));
const definiert = new Set([...alleCss.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]));
// Diese drei setzt der Theme-Sync am Seitenende zur Laufzeit auf documentElement.
const zurLaufzeit = new Set(['--primary', '--primary-rgb', '--primary-dim']);
const undefiniert = [...benutzt].filter((t) => !definiert.has(t) && !zurLaufzeit.has(t));
ok(undefiniert.length === 0,
    `alle ${benutzt.size} benutzten Tokens sind definiert`,
    undefiniert.length ? 'NICHT DEFINIERT: ' + undefiniert.join(', ') : '');
ok(benutzt.size > 20, 'es werden ueberhaupt Tokens benutzt (sonst prueft die Zeile darueber nichts)');

abschluss('Modul-Verdrahtung');
