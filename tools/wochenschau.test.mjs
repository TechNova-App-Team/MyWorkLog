// Wochenschau ("Alle Wochen", Assets/js/berichtsheft/bh-wochenschau.js):
// die drei Kosten pro Bild, die am Handy das Drehen bremsten (16.10.2026).
//   1. Abdunkel-Schicht ohne eigene Ebene -> jedes Bild alle Blaetter neu rastern
//   2. Regel auf Nachfahren von body.hf-schau-offen -> Oeffnen rechnet ~7.500 Elemente neu
//   3. Gleiche Werte je Bild neu zuweisen -> Stil + PrePaint fuer nichts
// Lauf: node tools/wochenschau.test.mjs
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let fehler = 0;
const ok = (b, msg) => { console.log((b ? '  ok   ' : '  FAIL ') + msg); if (!b) fehler++; };
const lies = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8').split('\r\n').join('\n');
const ohneKommentare = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

// ── 1 + 2: CSS ──
const css = ohneKommentare(lies('Assets/css/berichtsheft/uebersicht.css'));
const regeln = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ sel: m[1].trim(), body: m[2] }));
ok(regeln.length > 50, 'Stylesheet hat Regeln (' + regeln.length + ')');
const dunkel = regeln.filter(r => r.sel.split(',').some(s => s.trim() === '.hf-schau-dunkel'));
ok(dunkel.length > 0, '.hf-schau-dunkel hat eine Regel');
ok(dunkel.some(r => /will-change:\s*opacity/.test(r.body)), '.hf-schau-dunkel hat will-change: opacity (eigene Ebene, kein Neu-Rastern)');
const offen = regeln.filter(r => r.sel.includes('hf-schau-offen'));
ok(offen.length > 0, 'es gibt Regeln mit body.hf-schau-offen');
ok(offen.every(r => r.sel.split(',').every(s => /hf-schau-offen\s*$/.test(s.trim()))),
    'keine Regel trifft Nachfahren von body.hf-schau-offen');

// ── 3: JS in jsdom ──
const dom = new JSDOM('<!doctype html><body></body>', { pretendToBeVisual: true, runScripts: 'outside-only' });
const w = dom.window;
w.matchMedia = () => ({ matches: false });
w.L = (de) => de;
w.escapeHtml = (s) => String(s);
w.hfAusDatum = (s) => new w.Date(s + 'T00:00:00');
w.hfMontag = (d) => d;
w.hfZeitraumText = () => 'x';
w.hfBlattInnen = () => '<p>Blatt</p>';
w.viewReport = () => {};
const reports = [];
for (let i = 0; i < 40; i++) {
    const d = new Date(2025, 0, 6 + i * 7);
    reports.push({ id: 'r' + i, week: i + 1, dateFrom: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, status: 'complete' });
}
w.eval('var reports = ' + JSON.stringify(reports) + ';');
w.eval(lies('Assets/js/berichtsheft/bh-wochenschau.js'));
const WS = w.BHWochenschau;
WS.oeffnen();
const blaetter = () => [...w.document.querySelectorAll('.hf-schau-blatt')];
ok(blaetter().length > 0 && blaetter().length <= 5, 'am Ende: hoechstens Mitte + 4 Blaetter im DOM (' + blaetter().length + ')');
WS._intern.gehe(20);
await new Promise(r => setTimeout(r, 3000));     // Feder + Einflug ausklingen lassen
ok(WS._intern.idx() === 20, 'Trommel steht auf Woche 21');
ok(blaetter().length === 9, 'in der Mitte: 4 + 1 + 4 Blaetter im DOM (' + blaetter().length + ')');
const strich = w.document.querySelectorAll('#hfSchauStriche .hf-strich.is-jetzt');
ok(strich.length === 1 && [...w.document.querySelectorAll('#hfSchauStriche .hf-strich')].indexOf(strich[0]) === 20,
    'genau ein Zeitstrahl-Strich ist "jetzt", und zwar Woche 21');

// Ruhende Trommel: ein weiterer Durchlauf darf nichts zuweisen
let schreibt = 0;
blaetter().forEach(el => {
    for (const ziel of [el.style, el.lastElementChild.style]) {
        for (const k of ['transform', 'opacity', 'zIndex', 'visibility']) {
            let wert = ziel[k];
            Object.defineProperty(ziel, k, { get: () => wert, set: (v) => { schreibt++; wert = v; }, configurable: true });
        }
    }
});
WS._intern.gehe(20);
await new Promise(r => setTimeout(r, 200));
ok(schreibt === 0, 'gleiche Lage -> keine Stilzuweisung (' + schreibt + ')');
WS._intern.gehe(21);
await new Promise(r => setTimeout(r, 200));
ok(schreibt > 0, 'Gegenprobe: Bewegung weist zu (' + schreibt + ')');

WS.schliessen();
w.close();
console.log(fehler ? `\n${fehler} Fehler` : '\nalles gruen');
process.exit(fehler ? 1 : 0);
