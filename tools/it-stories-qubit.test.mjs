// Testet die Figuren von /it-stories/qubit/ ohne Browser.
// Animationen lassen sich im Automations-Browser nicht pruefen (dort ist
// document.hidden wahr, also stehen rAF UND IntersectionObserver still).
// Hier stattdessen jsdom + Canvas-Attrappe mit handgesteuerter Bildfolge.
//
// Geprueft wird die PHYSIK, nicht die Optik: Hadamard zweimal muss exakt
// zurueckfuehren, CHSH darf 2√2 nicht ueberschreiten, die Bell-Entropie muss 1
// sein, Grover muss nach dem Optimum wieder schlechter werden. Wenn eine dieser
// Zahlen kippt, ist die Geschichte falsch — und das sieht man einem Screenshot
// nicht an.  Aufruf:  node tools/it-stories-qubit.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const html = fs.readFileSync(path.join(ROOT, 'pages/it-stories/qubit/index.html'), 'utf8');

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://myworklog.de/it-stories/qubit/' });
const { window } = dom;

const texts = [];
function ctxStub() {
    const noop = () => {};
    return new Proxy({
        canvas: null, font: '', fillStyle: '', strokeStyle: '', lineWidth: 1, textAlign: '', textBaseline: '', globalAlpha: 1,
        fillText: (s, x, y) => texts.push({ s: String(s), x, y }),
        measureText: () => ({ width: 10 }),
        createRadialGradient: () => ({ addColorStop: noop }),
        setTransform: noop, clearRect: noop, save: noop, restore: noop, setLineDash: noop,
    }, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
}
window.HTMLCanvasElement.prototype.getContext = function () { if (!this.__c) { this.__c = ctxStub(); this.__c.canvas = this; } return this.__c; };
Object.defineProperty(window.HTMLCanvasElement.prototype, 'clientWidth', { get: () => 900 });
window.ResizeObserver = class { observe() {} disconnect() {} };
window.IntersectionObserver = class { constructor(cb) { this.cb = cb; } observe(el) { this.cb([{ target: el, isIntersecting: true }]); } unobserve() {} disconnect() {} };
window.fetch = () => Promise.reject(new Error('offline'));
window.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });

let queue = [];
window.requestAnimationFrame = (fn) => { queue.push(fn); return queue.length; };
let clock = 0;
function frames(n = 1, stepMs = 16) {
    for (let i = 0; i < n; i++) {
        const q = queue; queue = [];
        clock += stepMs;
        q.forEach((fn) => fn(clock));
    }
}

for (const f of ['Assets/js/it-stories.js', 'Assets/js/it-stories-qubit.js']) {
    window.eval(fs.readFileSync(path.join(ROOT, f), 'utf8'));
}
// jsdom bleibt bei runScripts:'outside-only' dauerhaft auf readyState "loading" —
// die Module warten sonst ewig auf DOMContentLoaded.
window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

const doc = window.document;
const $ = (id) => doc.getElementById(id);
const val = (id) => $(id).textContent.trim();
const num = (id) => parseFloat(val(id).replace(/[^\d,.-]/g, '').replace(',', '.'));
const click = (id) => { $(id).dispatchEvent(new window.Event('click', { bubbles: true })); frames(2); };
const slide = (id, v) => { const r = $(id); r.value = String(v); r.dispatchEvent(new window.Event('input', { bubbles: true })); frames(2); };
const drawn = (re) => texts.filter((t) => re.test(t.s)).map((t) => t.s);

let fails = 0;
function check(name, cond, info) {
    if (cond) { console.log('  ok   ' + name); } else { fails++; console.log('  FAIL ' + name + (info ? '  → ' + info : '')); }
}

// Die Figuren ziehen ihre Werte weich nach; genug Bilder, damit sie ankommen.
function settle() { frames(90); }

// ── Abbildung 1 ───────────────────────────────────────────────────────────────
console.log('\nAbbildung 1 — Muenze gegen Qubit');
frames(3);
check('Start: beide bei 100 %', val('coinCP') === '100,0 %' && val('coinQP') === '100,0 %',
    val('coinCP') + ' | ' + val('coinQP'));
check('Start-Amplituden 1,000 / 0,000', val('coinAmp') === '1,000 / 0,000', val('coinAmp'));

click('coinStep');
check('1× : Muenze 50 %', val('coinCP') === '50,0 %', val('coinCP'));
check('1× : Qubit 50 %', val('coinQP') === '50,0 %', val('coinQP'));
check('1× : Amplituden 0,707 / 0,707', val('coinAmp') === '0,707 / 0,707', val('coinAmp'));

click('coinStep');
// Der Kern der ganzen Geschichte: klassisch bleibt es Zufall, quantenmechanisch
// heben sich die Beitraege exakt auf.
check('2× : Muenze bleibt bei 50 %', val('coinCP') === '50,0 %', val('coinCP'));
check('2× : Qubit wieder GEWISS bei 100 %', val('coinQP') === '100,0 %', val('coinQP'));
check('2× : Amplituden exakt zurueck', val('coinAmp') === '1,000 / 0,000', val('coinAmp'));

click('coinStep');
check('3× : Qubit wieder 50 %', val('coinQP') === '50,0 %', val('coinQP'));
check('Anwendungen werden gezaehlt', val('coinN') === '3', val('coinN'));
click('coinReset');
check('Zuruecksetzen stellt den Startzustand her',
    val('coinN') === '0' && val('coinQP') === '100,0 %' && val('coinAmp') === '1,000 / 0,000');
settle();
check('Amplitude steht auch auf der Leinwand', drawn(/^1,000$/).length > 0);

// ── Abbildung 2 ───────────────────────────────────────────────────────────────
console.log('\nAbbildung 2 — Bloch-Kugel');
slide('blochTheta', 0); settle();
check('θ = 0° → α = 1,000, P(0) = 100 %', val('blochA') === '1,000' && val('blochP0') === '100,0 %',
    val('blochA') + ' | ' + val('blochP0'));
check('ohne β keine Phase (— statt 0°)', val('blochPhase') === '—', val('blochPhase'));

slide('blochTheta', 90); settle();
check('θ = 90° → α = 0,707, P(0) = 50 %', val('blochA') === '0,707' && val('blochP0') === '50,0 %',
    val('blochA') + ' | ' + val('blochP0'));
const p0Equator = val('blochP0');
slide('blochPhi', 200); settle();
check('φ aendert P(0) NICHT (Phase ist unmessbar)', val('blochP0') === p0Equator,
    p0Equator + ' → ' + val('blochP0'));
check('φ steht im Messfeld', val('blochPhase') === '200 °', val('blochPhase'));

slide('blochTheta', 0); slide('blochPhi', 0); settle();
click('blochX');
check('X auf |0⟩ → P(0) = 0 %', val('blochP0') === '0,0 %', val('blochP0'));
click('blochX');
check('X zweimal → wieder P(0) = 100 %', val('blochP0') === '100,0 %', val('blochP0'));
click('blochH');
check('H auf |0⟩ → P(0) = 50 %', val('blochP0') === '50,0 %', val('blochP0'));
click('blochH');
check('H zweimal → wieder P(0) = 100 %', val('blochP0') === '100,0 %', val('blochP0'));
check('Einheiten bleiben nach Interaktion erhalten',
    $('blochP0').querySelector('small') && /%$/.test(val('blochP0')));

// ── Abbildung 3 ───────────────────────────────────────────────────────────────
console.log('\nAbbildung 3 — Mach-Zehnder');
slide('mzPhi', 0); settle();
check('φ = 0° → D₀ 100 %, D₁ 0 %', val('mzD0') === '100,0 %' && val('mzD1') === '0,0 %',
    val('mzD0') + ' | ' + val('mzD1'));
slide('mzPhi', 180); settle();
check('φ = 180° → vollstaendige Ausloeschung in D₀',
    val('mzD0') === '0,0 %' && val('mzD1') === '100,0 %', val('mzD0') + ' | ' + val('mzD1'));
slide('mzPhi', 90); settle();
check('φ = 90° → 50/50', val('mzD0') === '50,0 %' && val('mzD1') === '50,0 %',
    val('mzD0') + ' | ' + val('mzD1'));
check('Sichtbarkeit ohne Beobachter 100 %', val('mzVis') === '100 %', val('mzVis'));

click('mzOn');
check('mit Beobachter: 50/50', val('mzD0') === '50,0 %' && val('mzD1') === '50,0 %');
check('mit Beobachter: Sichtbarkeit 0', val('mzVis') === '0 %', val('mzVis'));
slide('mzPhi', 0); settle();
check('mit Beobachter bleibt es 50/50 bei JEDER Phase',
    val('mzD0') === '50,0 %' && val('mzD1') === '50,0 %', val('mzD0') + ' | ' + val('mzD1'));
check('Summe der Zeiger ist ohne Interferenz nicht definiert', val('mzSum') === '—', val('mzSum'));
click('mzOff');
check('ohne Beobachter kehrt die Interferenz zurueck', val('mzD0') === '100,0 %', val('mzD0'));

// ── Abbildung 4 ───────────────────────────────────────────────────────────────
console.log('\nAbbildung 4 — Messung');
click('measReset');
slide('measTheta', 60); settle();
check('θ = 60° → erwartet 75,0 %', val('measExp') === '75,0 %', val('measExp'));
check('ohne Shots kein Messwert', val('measGot').startsWith('—'), val('measGot'));
click('meas1000');
frames(80);   // die Shots laufen portionsweise ab
check('1000 Shots gezaehlt', val('measN') === '1.000', val('measN'));
const z = Math.abs(num('measErr'));
// p = 0,75, N = 1000 → σ ≈ 1,37 %. Mehr als 5σ waere kein Zufall mehr,
// sondern ein Fehler in der Ziehung.
check('gemessener Anteil liegt innerhalb 5σ', z < 5, val('measErr'));
check('gemessen liegt nahe an erwartet', Math.abs(num('measGot') - 75) < 7,
    val('measGot') + ' vs. ' + val('measExp'));
click('measReset');
check('Leeren setzt zurueck', val('measN') === '0' && val('measGot').startsWith('—'));

// ── Abbildung 5 ───────────────────────────────────────────────────────────────
console.log('\nAbbildung 5 — Bell-Zustand');
click('bellReset'); settle();
check('Start: keine Verschraenkung', val('bellEnt') === '0,00', val('bellEnt'));
check('Start: trennbar', val('bellSep') === '✓', val('bellSep'));
click('bellH'); settle();
check('nach H allein: immer noch trennbar', val('bellSep') === '✓' && val('bellEnt') === '0,00',
    val('bellSep') + ' | ' + val('bellEnt'));
click('bellC'); settle();
check('nach CNOT: Entropie 1,00 (maximal verschraenkt)', val('bellEnt') === '1,00', val('bellEnt'));
check('nach CNOT: NICHT mehr trennbar', val('bellSep') === '✗', val('bellSep'));

let correlated = 0;
for (let i = 0; i < 24; i++) {
    click('bellReset'); click('bellH'); click('bellC'); click('bellMeasure');
    if (val('bellLast') === '|00⟩' || val('bellLast') === '|11⟩') correlated++;
}
check('24 Messungen am Bell-Zustand: IMMER gleich', correlated === 24, correlated + '/24');

click('bellReset'); click('bellH'); click('bellC'); click('bellX'); settle();
check('X auf q₁ dreht die Korrelation um, Entropie bleibt 1,00', val('bellEnt') === '1,00', val('bellEnt'));
let anti = 0;
for (let i = 0; i < 24; i++) {
    click('bellReset'); click('bellH'); click('bellC'); click('bellX'); click('bellMeasure');
    if (val('bellLast') === '|01⟩' || val('bellLast') === '|10⟩') anti++;
}
check('24 Messungen am antikorrelierten Zustand: IMMER verschieden', anti === 24, anti + '/24');

// ── Abbildung 6 ───────────────────────────────────────────────────────────────
console.log('\nAbbildung 6 — CHSH');
slide('chshAngle', 15); settle();
check('Δ = 15° → S = 2,598 (Startwert verletzt die Grenze)', val('chshQ') === '2,598', val('chshQ'));
check('Grenze ueberschritten', val('chshOk') === '✓', val('chshOk'));
click('chshOpt'); settle();
check('bester Winkel → S = 2√2 = 2,828', val('chshQ') === '2,828', val('chshQ'));
check('Verletzung +41,4 %', val('chshV') === '+41,4 %', val('chshV'));
check('klassische Grenze steht fest bei 2,000', val('chshC') === '2,000', val('chshC'));
// Tsirelson: kein Winkel darf 2√2 ueberschreiten. Der ganze Regler wird geprueft.
let over = null;
for (let d = 0; d <= 90; d += 0.5) {
    slide('chshAngle', d);
    if (num('chshQ') > 2.8285) { over = d + '° → ' + val('chshQ'); break; }
}
check('kein Winkel ueberschreitet die Tsirelson-Grenze', over === null, over);
slide('chshAngle', 45); settle();
check('Δ = 45° → S = 0, keine Verletzung', val('chshQ') === '0,000' && val('chshOk') === '✗',
    val('chshQ') + ' | ' + val('chshOk'));

// ── Abbildung 7 ───────────────────────────────────────────────────────────────
console.log('\nAbbildung 7 — Grover');
slide('grovN', 4); settle();
check('n = 4 → N = 16', val('grovNum') === '16', val('grovNum'));
check('Start: P = 1/16 = 6,3 %', val('grovP') === '6,3 %', val('grovP'));
check('Optimum bei ⌊π/4·√16⌋ = 3', val('grovOpt') === '3', val('grovOpt'));

click('grovOracle'); settle();
check('Orakel allein aendert die Wahrscheinlichkeit nicht', val('grovP') === '6,3 %', val('grovP'));
check('Orakel allein zaehlt noch keine Iteration', val('grovIt') === '0', val('grovIt'));
click('grovDiff'); settle();
check('erst die Diffusion zaehlt die Iteration', val('grovIt') === '1', val('grovIt'));
const p1 = num('grovP');
check('nach 1 Iteration deutlich ueber dem Start', p1 > 40, val('grovP'));

click('grovReset');
for (let i = 0; i < 3; i++) click('grovIter');
settle();
const pOpt = num('grovP');
check('nach 3 Iterationen P > 90 %', pOpt > 90, val('grovP'));
for (let i = 0; i < 3; i++) click('grovIter');
settle();
// Der Lehrsatz der Figur: weiterlaufen macht es SCHLECHTER.
check('nach 6 Iterationen faellt P wieder', num('grovP') < pOpt, pOpt + ' → ' + val('grovP'));

slide('grovN', 6); settle();
check('n = 6 → N = 64, Optimum 6', val('grovNum') === '64' && val('grovOpt') === '6',
    val('grovNum') + ' | ' + val('grovOpt'));
check('groesseres N startet niedriger', num('grovP') < 2, val('grovP'));

// ── Sprachneutralitaet der Leinwand ───────────────────────────────────────────
console.log('\nLeinwand');
// Ein per JS gesetztes deutsches Wort landet unuebersetzt auf /en/ — die
// statische Pipeline sieht nur, was im HTML steht.
const words = [...new Set(texts.map((t) => t.s))].filter((s) => /[A-Za-zÄÖÜäöüß]{3,}/.test(s));
check('kein erklaerendes Wort auf der Leinwand', words.length === 0, words.slice(0, 8).join(' | '));

// ── Legende gegen Leinwand ────────────────────────────────────────────────────
// Die Farbfelder der Legende stecken fest im CSS, die Balken werden in JS
// gefaerbt. Laufen beide auseinander, zeigt die Legende Gruen, wo Violett steht —
// und es faellt niemandem auf, weil jede Seite fuer sich stimmig aussieht.
// Genau das war hier der Fall, bevor .sw.p und .sw.n dazukamen.
console.log('\nLegende');
const swClasses = [...doc.querySelectorAll('.fig-foot .sw')].map((i) => i.className);
check('Legende nutzt nur die Klassen dieser Geschichte (p/a/n)',
    swClasses.length > 0 && swClasses.every((c) => /^sw (p|a|n)$/.test(c)),
    [...new Set(swClasses)].join(' | '));
const css = fs.readFileSync(path.join(ROOT, 'Assets/css/it-stories.css'), 'utf8');
check('.sw.p traegt den Theme-Akzent wie die positiven Balken',
    css.includes('.fig-foot .sw.p { background: var(--primary); }'));
check('.sw.a traegt Amber wie die negativen Balken',
    css.includes('--amber:        #f59e0b;') && css.includes('.fig-foot .sw.a { background: var(--amber); }'));
check('.sw.n traegt den Stahlton wie Geisterbalken und Mittelwertlinie',
    css.includes('.fig-foot .sw.n { background: rgba(226,232,240,0.42); }'));

console.log('\n' + (fails ? fails + ' FEHLGESCHLAGEN' : 'alle Pruefungen bestanden') + '\n');
process.exit(fails ? 1 : 0);
