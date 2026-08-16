// Testet die Figuren von /it-stories/ssd-speicher/ ohne Browser.
// Animationen lassen sich im Automations-Browser nicht pruefen (dort ist
// document.hidden wahr, also stehen rAF UND IntersectionObserver still).
// Hier stattdessen jsdom + Canvas-Attrappe: die Attrappe schreibt jede
// Textausgabe mit, damit sich pruefen laesst, ob Leinwand und Messfeld
// dieselbe Zahl zeigen.  Aufruf:  node tools/it-stories-ssd.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const html = fs.readFileSync(path.join(ROOT, 'pages/it-stories/ssd-speicher/index.html'), 'utf8');

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://myworklog.de/it-stories/ssd-speicher/' });
const { window } = dom;

const texts = [];
function ctxStub() {
    const noop = () => {};
    return new Proxy({
        canvas: null, font: '', fillStyle: '', strokeStyle: '', lineWidth: 1, textAlign: '', textBaseline: '', globalAlpha: 1,
        fillText: (s, x, y) => texts.push({ s: String(s), x, y }),
        measureText: () => ({ width: 10 }),
        createRadialGradient: () => ({ addColorStop: noop }),
        setTransform: noop, clearRect: noop, save: noop, restore: noop,
    }, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
}
window.HTMLCanvasElement.prototype.getContext = function () { if (!this.__c) { this.__c = ctxStub(); this.__c.canvas = this; } return this.__c; };
Object.defineProperty(window.HTMLCanvasElement.prototype, 'clientWidth', { get: () => 900 });
window.ResizeObserver = class { observe() {} disconnect() {} };
window.IntersectionObserver = class { constructor(cb) { this.cb = cb; } observe(el) { this.cb([{ target: el, isIntersecting: true }]); } unobserve() {} disconnect() {} };
window.fetch = () => Promise.reject(new Error('offline'));
window.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });

// rAF von Hand takten: jeder Aufruf = ein Bild
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

for (const f of ['Assets/js/it-stories.js', 'Assets/js/it-stories-ssd-speicher.js']) {
    window.eval(fs.readFileSync(path.join(ROOT, f), 'utf8'));
}
// jsdom meldet waehrend runScripts:'outside-only' dauerhaft readyState "loading" —
// die Module warten deshalb auf DOMContentLoaded. Von Hand ausloesen.
window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

const doc = window.document;
const $ = (id) => doc.getElementById(id);
const val = (id) => $(id).textContent.trim();
const drawn = (re) => texts.filter((t) => re.test(t.s)).map((t) => t.s);

let fails = 0;
function check(name, cond, info) {
    if (cond) { console.log('  ok   ' + name); } else { fails++; console.log('  FAIL ' + name + (info ? '  → ' + info : '')); }
}

console.log('\nAbbildung 1 — Zelle');
frames(3);
check('Startzustand 00 / 1,8 V / 432 e⁻',
    val('cellState') === '00' && val('cellThreshold') === '1,8 V' && val('cellElectrons') === '432 e⁻',
    [val('cellState'), val('cellThreshold'), val('cellElectrons')].join(' | '));
for (const [v, code, vth, e] of [[0, '11', '-1,8 V', '0 e⁻'], [1, '10', '0,4 V', '264 e⁻'], [3, '01', '3,2 V', '600 e⁻']]) {
    const r = $('cellRange'); r.value = String(v); r.dispatchEvent(new window.Event('input'));
    frames(3);
    check(`Stufe ${v} → ${code} / ${vth} / ${e}`,
        val('cellState') === code && val('cellThreshold') === vth && val('cellElectrons') === e,
        [val('cellState'), val('cellThreshold'), val('cellElectrons')].join(' | '));
}
check('Einheiten bleiben nach Interaktion erhalten', /V$/.test(val('cellThreshold')) && $('cellThreshold').querySelector('small'));
check('alle vier MLC-Codes auf der Leinwand', ['11', '10', '00', '01'].every((c) => drawn(/^(11|10|00|01)$/).includes(c)));

console.log('\nAbbildung 2 — Seiten und Bloecke');
const sum = () => Number(val('nandValid').split('/')[0]) + Number(val('nandInvalid')) + Number(val('nandFree'));
check('Start 2 gueltig / 0 ungueltig / 6 frei', val('nandValid') === '2 / 8' && val('nandInvalid') === '0' && val('nandFree') === '6');
$('nandWrite').click(); frames(2);
check('schreiben belegt eine freie Seite', val('nandValid') === '3 / 8' && val('nandFree') === '5');
$('nandRewrite').click(); frames(2);
check('aendern: alte Seite ungueltig, neue gueltig', val('nandValid') === '3 / 8' && val('nandInvalid') === '1' && val('nandFree') === '4');
for (let i = 0; i < 12; i++) { $('nandWrite').click(); }
frames(2);
check('Block laeuft nicht ueber (Summe bleibt 8)', sum() === 8, 'Summe ' + sum() + ' | ' + [val('nandValid'), val('nandInvalid'), val('nandFree')].join(' '));
check('voller Block → 0 frei', val('nandFree') === '0');
$('nandRewrite').click(); frames(2);
check('aendern ohne freie Seite veraendert nichts', sum() === 8 && val('nandFree') === '0');
$('nandErase').click(); frames(2);
check('loeschen leert den Block und zaehlt hoch', val('nandValid') === '0 / 8' && val('nandInvalid') === '0' && val('nandFree') === '8' && val('nandErases') === '1');
check('Zeiten tR < tPROG < tERS auf der Leinwand', ['tR', 'tPROG', 'tERS'].every((s) => drawn(/^t(R|PROG|ERS)$/).includes(s)));

console.log('\nAbbildung 3 — FTL');
check('WA 1,72x bei 42 % Fuellstand', val('ftlWa') === '1,72×', val('ftlWa'));
for (const [f, wa] of [['10', '1,11×'], ['75', '4,00×'], ['95', '20,00×']]) {
    const r = $('ftlRange'); r.value = f; r.dispatchEvent(new window.Event('input')); frames(2);
    check(`Fuellstand ${f} % → WA ${wa}`, val('ftlWa') === wa, val('ftlWa'));
}
$('ftlRange').value = '42'; $('ftlRange').dispatchEvent(new window.Event('input')); frames(2);
const before = val('ftlPba');
let moved = 0;
for (let i = 0; i < 6; i++) {
    const p = val('ftlPba');
    $('ftlWrite').click(); frames(2);
    if (val('ftlPba') !== p) moved++;
    check(`Schreibvorgang ${i + 1}: Leinwand und Messfeld zeigen dieselbe Seite`,
        texts.slice(-40).some((t) => t.s === val('ftlPba')),
        'Messfeld ' + val('ftlPba') + ' | zuletzt gezeichnet: ' + texts.slice(-40).filter((t) => /^B\d · P\d\d$/.test(t.s)).map((t) => t.s).join(', '));
}
check('LBA bleibt konstant', val('ftlLba') === '42');
check('physische Seite wandert', moved >= 5, moved + ' von 6');
check('Startseite wurde verlassen', val('ftlPba') !== before);

console.log('\nAbbildung 4 — Vergleich');
frames(40, 50);
check('SSD-Zugriffszeit 0,09 ms', val('cmpSsd') === '0,09 ms', val('cmpSsd'));
const factor = Number(val('cmpFactor').replace('×', '').replace(/\./g, ''));
check('Faktor zufaellig 4 KiB zwischen 60 und 200', factor > 60 && factor < 200, val('cmpFactor'));
const hddMs = Number(val('cmpHdd').replace(' ms', '').replace(',', '.'));
check('HDD-Zeit laeuft hoch und bleibt plausibel', hddMs > 0 && hddMs < 20, val('cmpHdd'));
check('SSD-Zaehler laeuft mit', Number(val('cmpCount').replace(/\./g, '')) > 0, val('cmpCount'));
doc.querySelector('[data-mode="seq"]').click(); frames(10, 50);
check('sequenziell: SSD 1,99 ms', val('cmpSsd') === '1,99 ms', val('cmpSsd'));
const fSeq = Number(val('cmpFactor').replace('×', '').replace(',', '.'));
check('sequenziell: Faktor unter 3', fSeq > 2 && fSeq < 3, val('cmpFactor'));

console.log('\nAbbildung 5 — Verschleiss');
check('TLC frisch: 750 mV, RBER 1,2e-5', val('wearGap') === '750 mV' && val('wearRber') === '1,2 · 10⁻⁵', [val('wearGap'), val('wearRber')].join(' | '));
const rows = [];
for (const ty of ['SLC', 'MLC', 'TLC', 'QLC']) {
    doc.querySelector(`[data-type="${ty}"]`).click(); frames(2);
    rows.push([ty, val('wearBits'), val('wearGap'), val('wearCycles'), val('wearRber'), $('wearRber').className]);
}
rows.forEach((r) => console.log('       ' + r.join('  |  ')));
check('Pegelabstand halbiert sich je Bit', rows.map((r) => r[2]) .join() === '3.000 mV,1.500 mV,750 mV,375 mV', rows.map((r) => r[2]).join());
check('QLC frisch schon im Warnbereich', rows[3][5] === 'warn', rows[3][4] + ' ' + rows[3][5]);
check('SLC frisch praktisch fehlerfrei', rows[0][4] === '< 10⁻⁹', rows[0][4]);
doc.querySelector('[data-type="TLC"]').click();
const fresh = val('wearRber');
$('wearRange').value = '100'; $('wearRange').dispatchEvent(new window.Event('input')); frames(2);
const exp = (s) => Number(s.replace(/.*10/, '').replace('⁻', '-').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)));
check('Abnutzung verschlechtert TLC um Groessenordnungen',
    exp(val('wearRber')) - exp(fresh) >= 2 && ['warn', 'no'].includes($('wearRber').className),
    fresh + ' → ' + val('wearRber') + ' [' + $('wearRber').className + ']');
check('P/E-Zyklen zeigen 3.000 / 3.000', val('wearCycles') === '3.000 / 3.000', val('wearCycles'));

console.log('\nSprachneutralitaet der Leinwand');
const german = texts.map((t) => t.s).filter((s) => /[a-zäöüß]{4,}/.test(s) && !/^(t(R|PROG|ERS)|ms|mV|bit)$/.test(s));
check('kein deutsches Wort auf der Leinwand', german.length === 0, [...new Set(german)].join(', '));
const dds = [...doc.querySelectorAll('.readout dd')].map((d) => d.textContent.trim());
const wordy = dds.filter((s) => /[a-zäöüß]{4,}/i.test(s));
check('keine Woerter in den Messfeldern', wordy.length === 0, wordy.join(' | '));

console.log(fails ? `\n${fails} Pruefung(en) fehlgeschlagen\n` : '\nAlle Pruefungen bestanden\n');
process.exit(fails ? 1 : 0);
