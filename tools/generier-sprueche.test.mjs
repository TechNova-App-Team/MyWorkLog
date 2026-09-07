// ═══ GENERIER-SPRUECHE TEST ═══
//
// Prueft die Wartemeldungen im Generier-Knopf (ais-studio.js) und das
// aufgeraeumte Stylesheet (ai-studio-generieren.css).
//
// Warum das ueberhaupt einen Test braucht: die Sprueche laufen nur waehrend
// eines echten Modell-Aufrufs, also 5 bis 45 Sekunden lang und nie im
// Screenshot. Ein fehlendes englisches Gegenstueck oder ein Beutel, der
// denselben Spruch zweimal zieht, faellt beim Draufschauen nicht auf.
//
// Aufruf:  node tools/generier-sprueche.test.mjs

import fs from 'node:fs';
import path from 'node:path';
import { funktion, quelltext, ohneKommentare } from './berichtsheft-laden.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const lies = p => fs.readFileSync(path.join(ROOT, p), 'utf8').split('\r\n').join('\n');

let fehler = 0, geprueft = 0;
const ok = (name, b, detail = '') => {
    geprueft++;
    if (!b) fehler++;
    console.log(`  ${b ? 'ok  ' : 'FAIL'}  ${name}${detail ? '   → ' + detail : ''}`);
};

const JS = quelltext('ais-studio.js');

// Die Listen und die Beutel-Logik aus der Quelle holen und in einem eigenen
// Rahmen ausfuehren — so laeuft der ECHTE Code, nicht eine Nachbildung.
// Je Konstante ein eigenes Muster: die beiden Listen enden auf einer Zeile
// "];", BTN_GEDULD_AB_MS steht einzeilig. Ein gemeinsames, nicht-gieriges
// Muster lief ueber die einzeilige Konstante hinweg und zog zwei Bloecke in
// einen — die zweite Konstante war dann doppelt deklariert und der Rahmen
// stuerzte ab, NACHDEM "alle drei Bloecke gefunden" gruen gemeldet hatte.
const bloecke = [
    (JS.match(/const BTN_SPRUECHE = \[[\s\S]*?\n\];/) || [null])[0],
    (JS.match(/const BTN_GEDULD_AB_MS = \d+;/) || [null])[0],
    (JS.match(/const BTN_GEDULD = \[[\s\S]*?\n\];/) || [null])[0],
];
const rahmen = bloecke.join('\n')
    + '\n' + funktion('ais-studio.js', '_beutelFuellen')
    + '\nlet _spruchBeutel = [];\n'
    + funktion('ais-studio.js', 'naechsterSpruch');

console.log('\n1. Die Listen');
{
    ok('alle drei Bloecke gefunden', bloecke.every(Boolean),
       bloecke.map((b, i) => (b ? 'ok' : 'FEHLT ' + i)).join(' '));

    const lade = (lang) => {
        const f = new Function('L', rahmen + '; return { naechsterSpruch, BTN_SPRUECHE, BTN_GEDULD, BTN_GEDULD_AB_MS };');
        return f((de, en) => (lang === 'en' ? en : de));
    };
    const de = lade('de');

    ok('genug Sprueche fuer Abwechslung', de.BTN_SPRUECHE.length >= 20, de.BTN_SPRUECHE.length + ' Stueck');
    ok('jeder Spruch hat eine englische Fassung',
       de.BTN_SPRUECHE.every(p => Array.isArray(p) && p.length === 2 && p[0] && p[1]));
    ok('Geduld-Sprueche ebenfalls zweisprachig',
       de.BTN_GEDULD.every(p => p.length === 2 && p[0] && p[1]));
    ok('keine Dubletten', new Set(de.BTN_SPRUECHE.map(p => p[0])).size === de.BTN_SPRUECHE.length);
    ok('deutsch und englisch unterscheiden sich wirklich',
       de.BTN_SPRUECHE.every(p => p[0] !== p[1]),
       de.BTN_SPRUECHE.filter(p => p[0] === p[1]).map(p => p[0]).join(', ') || 'alle uebersetzt');

    // 🔴 Der Knopf darf keinen Zustand BEHAUPTEN. Die ehrliche Angabe ist die
    // Prozentzahl daneben; ein Spruch wie "Schritt 3 von 5" oder "fast fertig"
    // waere erfunden, weil die Antwortzeit des Modells nicht vorhersagbar ist.
    const luegen = de.BTN_SPRUECHE.filter(p =>
        /\d+\s*(von|of)\s*\d+|fast fertig|almost done|gleich fertig|Schritt|step \d/i.test(p[0] + ' ' + p[1]));
    ok('kein Spruch behauptet einen Fortschritt', luegen.length === 0, luegen.map(p => p[0]).join(', '));
    ok('Gegenprobe — es gibt ueberhaupt Sprueche zu pruefen', de.BTN_SPRUECHE.length > 0);
}

console.log('\n2. Der Beutel');
{
    const lade = (lang) => {
        const f = new Function('L', rahmen + '; return { naechsterSpruch, BTN_SPRUECHE, BTN_GEDULD_AB_MS };');
        return f((de, en) => (lang === 'en' ? en : de));
    };

    // Ohne Beutel zieht Math.random irgendwann denselben Spruch zweimal
    // hintereinander — und genau das faellt einem Nutzer auf.
    const m = lade('de');
    const gezogen = [];
    for (let i = 0; i < m.BTN_SPRUECHE.length; i++) gezogen.push(m.naechsterSpruch(0));
    ok('eine volle Runde ohne Wiederholung',
       new Set(gezogen).size === m.BTN_SPRUECHE.length,
       gezogen.length + ' gezogen, ' + new Set(gezogen).size + ' verschieden');

    let direkteWdh = 0;
    const lang = [];
    for (let i = 0; i < 200; i++) lang.push(m.naechsterSpruch(0));
    for (let i = 1; i < lang.length; i++) if (lang[i] === lang[i - 1]) direkteWdh++;
    ok('auch ueber mehrere Runden kaum direkte Wiederholung', direkteWdh <= 8,
       direkteWdh + ' von 199 Uebergaengen');

    // Nach der Schwelle wird zugegeben, dass es dauert — das ist die einzige
    // Stelle, die etwas behaupten darf, und dort stimmt es.
    const spaet = new Set();
    for (let i = 0; i < 40; i++) spaet.add(m.naechsterSpruch(m.BTN_GEDULD_AB_MS + 1000));
    ok('nach der Schwelle nur noch Geduld-Sprueche', spaet.size <= 3, [...spaet].join(' | '));

    const en = lade('en');
    const enSpruch = en.naechsterSpruch(0);
    ok('auf /en/ kommt Englisch', !/[äöüß]/.test(enSpruch) && enSpruch.length > 2, enSpruch);
}

console.log('\n3. Das Stylesheet');
{
    const css = ohneKommentare(lies('Assets/css/berichtsheft/ai-studio-generieren.css'));
    const basis = lies('Assets/css/berichtsheft/basis.css');

    // Projektregel: keine festen Hexwerte, alles ueber Tokens.
    // Ein Hexwert INNERHALB von var(--x, #hex) ist der erlaubte Rueckfall und
    // kein Verstoss — deshalb werden die var()-Aufrufe vorher entfernt.
    const ohneFallbacks = css.replace(/var\(\s*--[\w-]+\s*,\s*[^)]*\)/g, 'var()');
    const hex = [...ohneFallbacks.matchAll(/#[0-9a-f]{6}\b/gi)].map(m => m[0].toLowerCase())
                  .filter(c => c !== '#ffffff' && c !== '#000000');
    ok('keine nackten Marken-Hexwerte', hex.length === 0, hex.join(', ') || 'keine');
    // Gegenprobe: das Strippen hat nicht einfach alles weggeputzt.
    ok('Gegenprobe — es gibt noch Farbangaben zu pruefen',
       /color|background/.test(ohneFallbacks), ohneFallbacks.length + ' Zeichen');

    const rgbaHart = [...css.matchAll(/rgba\((\d+),\s*(\d+),\s*(\d+)/g)]
        .filter(m => !(m[1] === '255' && m[2] === '255' && m[3] === '255') && !(m[1] === '0' && m[2] === '0' && m[3] === '0'));
    ok('keine hart kodierten Farbkanaele', rgbaHart.length === 0,
       rgbaHart.map(m => m[0]).join(', ') || 'nur Schwarz/Weiss-Schleier');

    // Jedes benutzte Token muss es auch geben — ein ungueltiges var() faellt
    // auf den Initialwert zurueck, also z.B. gar kein Hintergrund.
    const benutzt = new Set([...css.matchAll(/var\(\s*(--[\w-]+)/g)].map(m => m[1]));
    const definiert = new Set([...basis.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map(m => m[1]));
    const unbekannt = [...benutzt].filter(t => !definiert.has(t));
    ok('alle benutzten Tokens sind definiert', unbekannt.length === 0, unbekannt.join(', ') || benutzt.size + ' Tokens');
    ok('Gegenprobe — es werden ueberhaupt Tokens benutzt', benutzt.size >= 5, benutzt.size + '');

    // Projektregel: beim Hover bewegt sich nichts.
    const hoverBlock = css.match(/\.ais-mega-btn:hover\s*\{[^}]*\}/);
    ok('Hover-Block gefunden', !!hoverBlock);
    if (hoverBlock) ok('Hover bewegt den Knopf nicht', !/transform/.test(hoverBlock[0]), hoverBlock[0].replace(/\s+/g, ' '));
    ok('Bewegung sitzt im :active', /\.ais-mega-btn:active\s*\{[^}]*transform/.test(css));

    // backdrop-filter in einem Element, das waehrend des Ladens dauernd
    // repaintet, ist eine unsichtbare GPU-Bremse (CLAUDE.md).
    ok('kein backdrop-filter im Knopf', !/backdrop-filter/.test(css));

    // "Cleaner" hiess konkret: keine mehrstufigen Verlaeufe mehr auf Flaechen.
    const verlaeufe = [...css.matchAll(/linear-gradient\([^)]*\)/g)]
        .filter(g => (g[0].match(/%/g) || []).length > 2 && !/transparent/.test(g[0]));
    ok('keine mehrstufigen Farbverlaeufe auf Flaechen', verlaeufe.length === 0,
       verlaeufe.map(g => g[0].slice(0, 50)).join(' | ') || 'nur der Shimmer-Streifen');
}

console.log(`\n${geprueft - fehler}/${geprueft} bestanden`);
if (geprueft < 20) { console.log('ZU WENIG PRUEFUNGEN — der Lauf hat nichts getan'); process.exit(1); }
process.exit(fehler ? 1 : 0);
