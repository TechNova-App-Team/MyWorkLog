// Prueft das Icon-System aus components/core/icons.js.
//
// Was hier NICHT geprueft werden kann: ob ein Pfad ueber seine viewBox
// hinauslaeuft. Dafuer braucht es getBBox(), also eine echte Rendering-Engine.
// Die Messung steht im Kopf von icons.js und laeuft im Browser:
//
//   const b = svg.getBBox(), h = 0.9;
//   [b.x-h, b.y-h, b.x+b.width+h, b.y+b.height+h]   // muss in 0..24 liegen
//
// Hier laufen die Pruefungen, die im Alltag tatsaechlich brechen: ein Tippfehler
// im Icon-Namen (rendert still das Fragezeichen-Icon), eine Bruecke, die ins
// Leere zeigt, und Emojis, die sich wieder ins Markup schleichen.
//
// Lauf: node tools/icons.test.mjs

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { MWL_ICON_PATHS, MWL_EMOJI_ICONS, mwlIcon, mwlIconFromEmoji } = require('../components/core/icons.js');

let pass = 0, fail = 0;
const ok  = (m) => { pass++; console.log('  ok    ' + m); };
const bad = (m) => { fail++; console.log('  FEHLT ' + m); };

function walk(dir, out = []) {
    for (const e of readdirSync(dir)) {
        const p = join(dir, e);
        if (statSync(p).isDirectory()) walk(p, out);
        else if (/\.(js|html)$/.test(p)) out.push(p);
    }
    return out;
}

const files = [...walk('components'), 'index.template.html'];
const sources = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));

console.log('\n▶ Pfad-Sammlung');
{
    const names = Object.keys(MWL_ICON_PATHS);
    names.length > 50 ? ok(`${names.length} Icons definiert`) : bad(`nur ${names.length} Icons`);

    // Jeder Pfad muss aus SVG-Kindelementen bestehen und darf keine Farbe fest verdrahten:
    // die Icons erben ihre Farbe ueber stroke="currentColor" am <svg>.
    const badTag = names.filter((n) => !/^<(path|circle|rect|line|polyline|polygon|ellipse)\b/.test(MWL_ICON_PATHS[n]));
    badTag.length === 0 ? ok('alle Pfade beginnen mit einem SVG-Element') : bad('kein SVG-Element: ' + badTag.join(', '));

    const hardCoded = names.filter((n) => /(stroke|fill)="(?!none|currentColor)/.test(MWL_ICON_PATHS[n]));
    hardCoded.length === 0 ? ok('keine fest verdrahtete Farbe') : bad('feste Farbe in: ' + hardCoded.join(', '));

    // Grobe Bereichspruefung, bewusst grosszuegig und ausdruecklich KEIN Ersatz
    // fuer getBBox: in Pfaddaten sind Zahlen implizit getrennt (`0-.586` sind
    // zwei Werte, `.405` faengt mit dem Punkt an) und relative Kommandos
    // summieren sich erst beim Zeichnen auf. Das faengt hier nur grobe Vertipper
    // — eine 240 statt 24. Die echte Geometrie wird im Browser gemessen; das
    // Rezept steht im Kopf von icons.js.
    const numbers = (d) => (d.match(/-?(?:\d+\.?\d*|\.\d+)/g) || []).map(Number);
    const outOfRange = names.filter((n) => numbers(MWL_ICON_PATHS[n]).some((v) => v < -60 || v > 60));
    outOfRange.length === 0 ? ok('keine Zahl grob ausserhalb des viewBox-Bereichs') : bad('Ausreisser in: ' + outOfRange.join(', '));
}

console.log('\n▶ Bruecke Emoji → Icon');
{
    const dangling = Object.entries(MWL_EMOJI_ICONS).filter(([, n]) => !MWL_ICON_PATHS[n]);
    dangling.length === 0
        ? ok(`${Object.keys(MWL_EMOJI_ICONS).length} Zuordnungen, alle mit Pfad`)
        : bad('zeigt ins Leere: ' + dangling.map(([e, n]) => `${e}→${n}`).join(', '));

    // 🔴 Der Wert kann aus Nutzerdaten kommen (eigene Presets, gespeicherte
    // Alerts) und landet per innerHTML in der Seite.
    const evil = mwlIconFromEmoji('<img src=x onerror=alert(1)>');
    !evil.includes('<img') ? ok('unbekannte Eingabe wird maskiert') : bad('unmaskierte Ausgabe: ' + evil);
    mwlIconFromEmoji('<svg id="x"></svg>') === '<svg id="x"></svg>'
        ? ok('fertiges SVG geht unveraendert durch') : bad('SVG-Durchreichung kaputt');
    mwlIconFromEmoji('') === '' ? ok('leere Eingabe bleibt leer') : bad('leere Eingabe erzeugt Ausgabe');
    // Variantenselektor darf die Zuordnung nicht verhindern
    mwlIconFromEmoji('⚠️').includes('<svg') ? ok('Variantenselektor wird ignoriert') : bad('U+FE0F bricht die Zuordnung');
}

console.log('\n▶ Aufrufstellen');
{
    // 🔴 mwlIcon faellt bei unbekanntem Namen still auf helpCircle zurueck —
    // ein Tippfehler ist im Bild nicht zu sehen. Deshalb hier gegenpruefen.
    const used = new Map();
    for (const [f, src] of sources) {
        for (const m of src.matchAll(/mwlIcon\(\s*['"]([A-Za-z]+)['"]/g)) {
            if (!used.has(m[1])) used.set(m[1], f);
        }
    }
    const unknown = [...used].filter(([n]) => !MWL_ICON_PATHS[n]);
    unknown.length === 0
        ? ok(`${used.size} verschiedene Icon-Namen aufgerufen, alle bekannt`)
        : bad('unbekannter Name: ' + unknown.map(([n, f]) => `${n} (${f})`).join(', '));

    const helper = sources.get('index.template.html') || '';
    /components\/core\/icons\.js/.test(helper) ? ok('icons.js ist eingebunden') : bad('icons.js fehlt im Template');
}

console.log('\n▶ Keine Emojis im Markup');
{
    // Zeichen, die als Icon durchgehen. Pfeile in Fliesstext sind Typografie und
    // bleiben erlaubt.
    const EMO = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
    const offenders = [];
    for (const [f, src] of sources) {
        if (!f.endsWith('.html')) continue;
        // Kommentare vorher ausblanken (Zeilenzahl bleibt erhalten): sie gehen
        // ueber mehrere Zeilen, und eine Pruefung auf fuehrendes `<!--` uebersieht
        // jede Fortsetzungszeile.
        // 🔴 BEIDE Sorten, nicht nur die HTML-Kommentare: in einer .html-Datei
        // stecken auch <style>- und <script>-Bloecke mit /* */ und //. Die
        // Dateikoepfe dieses Projekts markieren ihre Merksaetze mit einem roten
        // Punkt — der zaehlte hier sonst als Emoji im Markup, und der Test
        // pruefte damit seine eigenen Kommentare statt der Seite.
        // `//` nur am Zeilenanfang, sonst faellt jedes `https://` mit.
        const blank = (m) => m.replace(/[^\n]/g, ' ');
        const clean = src
            .replace(/<!--[\s\S]*?-->/g, blank)
            .replace(/\/\*[\s\S]*?\*\//g, blank)
            .replace(/^[ \t]*\/\/.*$/gm, blank);
        clean.split('\n').forEach((line, i) => {
            if (!EMO.test(line)) return;
            if (/setMood\(/.test(line)) return;                 // gespeicherter Wert, kein Icon
            offenders.push(`${f}:${i + 1}`);
        });
    }
    offenders.length === 0
        ? ok('kein Emoji im Komponenten-Markup')
        : bad(`${offenders.length} Stelle(n): ` + offenders.slice(0, 8).join(', '));
}

console.log('\n▶ Ausgabeform');
{
    const svg = mwlIcon('alert', 18);
    /width="18" height="18"/.test(svg) ? ok('Groesse wird durchgereicht') : bad('Groesse fehlt');
    /stroke="currentColor"/.test(svg) ? ok('erbt die Textfarbe') : bad('currentColor fehlt');
    /aria-hidden="true"/.test(svg) ? ok('dekorativ ausgezeichnet') : bad('aria-hidden fehlt');
    /class="mwl-icon"/.test(svg) ? ok('traegt .mwl-icon (flex-shrink im CSS)') : bad('Klasse fehlt');
    const css = readFileSync('components/core/core.css', 'utf8');
    /\.mwl-icon\s*\{[^}]*flex-shrink:\s*0/.test(css)
        ? ok('.mwl-icon hat flex-shrink: 0') : bad('.mwl-icon schrumpft als Flex-Kind');
}

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen\n`);
process.exit(fail ? 1 : 0);
