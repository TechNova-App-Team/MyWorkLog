// Testet die Figuren von /it-stories/arbeitsspeicher/ ohne Browser.
// Animationen lassen sich im Automations-Browser nicht pruefen (dort ist
// document.hidden wahr, also stehen rAF UND IntersectionObserver still).
// Hier stattdessen jsdom + Canvas-Attrappe, die jede Textausgabe mitschreibt.
// Aufruf:  node tools/it-stories-ram.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const html = fs.readFileSync(path.join(ROOT, 'pages/it-stories/arbeitsspeicher/index.html'), 'utf8');

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://myworklog.de/it-stories/arbeitsspeicher/' });
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
window.HTMLCanvasElement.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 900, height: 400 }; };
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

for (const f of ['Assets/js/it-stories.js', 'Assets/js/it-stories-arbeitsspeicher.js']) {
    window.eval(fs.readFileSync(path.join(ROOT, f), 'utf8'));
}
// jsdom bleibt bei runScripts:'outside-only' auf readyState "loading" — die
// Module warten sonst ewig auf DOMContentLoaded und alles wirkt faelschlich gruen.
window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

const doc = window.document;
const $ = (id) => doc.getElementById(id);
const val = (id) => $(id).textContent.trim();
const num = (id) => Number(val(id).replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
const setRange = (id, v) => { $(id).value = String(v); $(id).dispatchEvent(new window.Event('input')); };
const click = (sel) => doc.querySelector(sel).click();

let fails = 0;
function check(name, cond, info) {
    if (cond) console.log('  ok   ' + name);
    else { fails++; console.log('  FAIL ' + name + (info ? '  → ' + info : '')); }
}

console.log('\nAbbildung 1 — DRAM-Zelle und Refresh');
frames(2);
check('Startladung dicht an Q = C · U = 74.898 e⁻', num('cellCharge') > 74800 && num('cellCharge') <= 74898, val('cellCharge'));
check('Leseschwelle 46.811 e⁻', val('cellFloor').startsWith('46.811'), val('cellFloor'));
for (const [t, exp] of [[85, '64 ms'], [95, '32 ms'], [45, '1,02 s'], [25, '4,10 s']]) {
    setRange('ramTemp', t); frames(2);
    check(`${t} °C → Retention ${exp}`, val('cellRetention') === exp, val('cellRetention'));
}
setRange('ramTemp', 85);
// Retention halbiert sich je 10 K
setRange('ramTemp', 65); frames(2); const r65 = num('cellRetention');
setRange('ramTemp', 75); frames(2); const r75 = num('cellRetention');
check('Retention halbiert sich je 10 Kelvin', Math.abs(r65 / r75 - 2) < 0.02, `${r65} / ${r75}`);
// Ohne Refresh muss die Ladung unter die Leseschwelle fallen
setRange('ramTemp', 95);
click('[data-refresh="0"]');
// Die Zeitachse laeuft im Kreis — pruefen, ob die Ladung UNTERWEGS stirbt,
// nicht wie sie am Ende des Durchlaufs zufaellig gerade dasteht.
let died = false;
for (let i = 0; i < 400; i++) { frames(1, 20); if ($('cellCharge').className === 'no') died = true; }
check('ohne Refresh faellt die Ladung unter die Schwelle', died, val('cellCharge') + ' [' + $('cellCharge').className + ']');
click('[data-refresh="32"]'); frames(2);
check('Refresh setzt die Ladung zurueck', $('cellCharge').className === 'ok', val('cellCharge'));
let ok32 = true;
for (let i = 0; i < 300; i++) { frames(1, 20); if ($('cellCharge').className !== 'ok') ok32 = false; }
check('32 ms Refresh haelt das Bit auch bei 95 °C', ok32, val('cellCharge'));
setRange('ramTemp', 95); click('[data-refresh="64"]');
let broke64 = false;
for (let i = 0; i < 400; i++) { frames(1, 20); if ($('cellCharge').className === 'no') broke64 = true; }
check('64 ms reichen bei 95 °C nicht mehr', broke64, val('cellCharge'));

console.log('\nAbbildung 2 — Leseverstaerker');
setRange('senseRange', 512); frames(2);
check('512 Zellen → 69 mV Signal', val('senseDv') === '69 mV', val('senseDv'));
check('Kapazitaet der Bitleitung 77 fF', val('senseCbl') === '77 fF', val('senseCbl'));
check('Stoerabstand 54 mV', val('senseMargin') === '54 mV', val('senseMargin'));
setRange('senseRange', 128); frames(2); const dvSmall = num('senseDv');
setRange('senseRange', 1024); frames(2); const dvBig = num('senseDv');
check('mehr Zellen an der Bitleitung → weniger Signal', dvBig < dvSmall / 4, `${dvSmall} mV → ${dvBig} mV`);
check('1024 Zellen bleiben knapp ueber dem Offset', $('senseMargin').className === 'warn' || $('senseMargin').className === 'ok', val('senseMargin') + ' [' + $('senseMargin').className + ']');
setRange('senseRange', 512);

console.log('\nAbbildung 3 — Zeilenpuffer');
click('#bankReset'); click('[data-pat="seq"]');
frames(2000, 30);
const seqHit = num('bankHit'), seqAvg = num('bankAvg');
click('[data-pat="rand"]');
frames(2000, 30);
const rndHit = num('bankHit'), rndAvg = num('bankAvg');
console.log(`       sequenziell ${seqHit} % / ${seqAvg} ns   ·   zufaellig ${rndHit} % / ${rndAvg} ns`);
check('sequenziell trifft die offene Zeile fast immer', seqHit >= 90, seqHit + ' %');
check('zufaellig trifft sie so gut wie nie', rndHit <= 10, rndHit + ' %');
check('mittlere Latenz sequenziell nahe tCL', seqAvg > 13 && seqAvg < 17, seqAvg + ' ns');
check('mittlere Latenz zufaellig nahe tRP+tRCD+tCL', rndAvg > 38 && rndAvg < 42, rndAvg + ' ns');
check('Faktor zwischen den Mustern rund drei', rndAvg / seqAvg > 2.5 && rndAvg / seqAvg < 3.0, (rndAvg / seqAvg).toFixed(2) + '×');

console.log('\nAbbildung 4 — SECDED');
click('#eccReset'); frames(2);
check('unversehrtes Codewort: Syndrom 0x00', val('eccSyndrome') === '0x00' && val('eccPos') === '—' && val('eccFlips') === '0',
    [val('eccSyndrome'), val('eccPos'), val('eccFlips')].join(' | '));
// Klick auf die Leinwand: gleiche Rasterrechnung wie in place()
const eccCanvas = doc.querySelector('#fig-ecc canvas');
{
    const w = 900, h = 900 / 2.4, cols = 12, gap = 5;
    const cw = Math.min((w - 80 - gap * (cols - 1)) / cols, 52);
    const ch = Math.min(cw * 0.78, (h - 78) / 6 - gap);
    const ox = (w - (cw * cols + gap * (cols - 1))) / 2;
    const cell = (i) => ({ x: ox + (i % cols) * (cw + gap) + cw / 2, y: 44 + Math.floor(i / cols) * (ch + gap) + ch / 2 });
    click('#eccReset'); frames(1);
    const c17 = cell(17);
    eccCanvas.dispatchEvent(new window.MouseEvent('click', { clientX: c17.x, clientY: c17.y }));
    frames(1);
    check('Klick auf eine Zelle kippt genau dieses Bit', val('eccFlips') === '1' && val('eccPos') === '17',
        [val('eccFlips'), val('eccPos')].join(' | '));
}
click('#eccReset');
click('#eccFlip'); frames(2);
check('ein Fehler wird korrigiert', $('eccPos').className === 'ok' && val('eccPos') !== '—' && val('eccFlips') === '1',
    [val('eccFlips'), val('eccSyndrome'), val('eccPos'), $('eccPos').className].join(' | '));
click('#eccFlip'); frames(2);
check('zwei Fehler werden erkannt, nicht repariert', $('eccPos').className === 'warn' && val('eccPos') === '—' && val('eccFlips') === '2',
    [val('eccFlips'), val('eccSyndrome'), val('eccPos'), $('eccPos').className].join(' | '));
click('#eccFlip'); frames(2);
check('drei Fehler werden nie korrigiert', ['no', 'warn'].includes($('eccPos').className) && val('eccFlips') === '3',
    [val('eccFlips'), val('eccSyndrome'), val('eccPos'), $('eccPos').className].join(' | '));
// Das Syndrom ist 8 Bit breit, das Codewort 72 Bit lang: bei drei Fehlern kann
// es auf eine Position ausserhalb zeigen. Frueher stuerzte das Zeichnen daran ab.
let out = 0, silent = 0, det = 0;
for (let i = 0; i < 400; i++) {
    click('#eccReset');
    click('#eccFlip'); click('#eccFlip'); click('#eccFlip');
    frames(2);
    const p = val('eccPos');
    if (p === '—') det++; else if (Number(p) >= 72) out++; else silent++;
}
console.log(`       400× Dreifachfehler: ${silent} still verfaelscht, ${det} erkannt, ${out} ausserhalb des Codeworts`);
check('drei Fehler ergeben nie eine Position ausserhalb des Codeworts', out === 0, out + ' Faelle');
check('drei Fehler werden meistens still falsch korrigiert', silent > det, `${silent} vs ${det}`);
check('drei Fehler werden nie als korrigierbar gemeldet', (() => {
    for (let i = 0; i < 200; i++) {
        click('#eccReset'); click('#eccFlip'); click('#eccFlip'); click('#eccFlip'); frames(1);
        if ($('eccPos').className === 'ok') return false;
    }
    return true;
})());
// 100 Durchlaeufe: ein Fehler muss IMMER korrigiert, zwei IMMER erkannt werden
let bad1 = 0, bad2 = 0;
for (let i = 0; i < 100; i++) {
    click('#eccReset'); click('#eccFlip'); frames(1);
    if ($('eccPos').className !== 'ok' || val('eccPos') === '—') bad1++;
    click('#eccFlip'); frames(1);
    if ($('eccPos').className !== 'warn' || val('eccPos') !== '—') bad2++;
}
check('100× Einzelfehler: immer korrigiert', bad1 === 0, bad1 + ' Ausreisser');
check('100× Doppelfehler: immer erkannt', bad2 === 0, bad2 + ' Ausreisser');
check('Zuruecksetzen stellt das Codewort wieder her', (click('#eccReset'), frames(1), val('eccSyndrome') === '0x00' && val('eccFlips') === '0'));


console.log('\nAbbildung 5 — Rowhammer');
function hammer(patSel, trrSel, steps) {
    click(patSel); click(trrSel); frames(steps, 25);
    return { acts: num('hamActs'), flips: Number(val('hamFlips')), first: val('hamFirst'), ms: num('hamTime') };
}
const dOff = hammer('[data-hpat="double"]', '[data-trr="0"]', 260);
console.log(`       doppelseitig ohne TRR: ${dOff.flips} Flips, erster nach ${dOff.first}`);
check('doppelseitig ohne TRR kippt Bits', dOff.flips > 0, JSON.stringify(dOff));
check('erster Flip weit innerhalb des 64-ms-Fensters', dOff.ms < 64 && dOff.ms > 0, dOff.ms + ' ms');
const sOff = hammer('[data-hpat="single"]', '[data-trr="0"]', 260);
check('einseitig ohne TRR kippt ebenfalls', sOff.flips > 0, JSON.stringify(sOff));
check('doppelseitig braucht weniger Aktivierungen als einseitig',
    Number(dOff.first.replace(/[^\d]/g, '')) < Number(sOff.first.replace(/[^\d]/g, '')),
    `doppelseitig ${dOff.first} vs einseitig ${sOff.first}`);
const sOn = hammer('[data-hpat="single"]', '[data-trr="1"]', 400);
check('TRR stoppt einseitiges Haemmern', sOn.flips === 0, JSON.stringify(sOn));
const dOn = hammer('[data-hpat="double"]', '[data-trr="1"]', 400);
check('TRR stoppt doppelseitiges Haemmern', dOn.flips === 0, JSON.stringify(dOn));
const mOn = hammer('[data-hpat="many"]', '[data-trr="1"]', 700);
console.log(`       vielseitig mit TRR: ${mOn.flips} Flips nach ${mOn.first}`);
check('vielseitiges Haemmern laeuft an TRR vorbei', mOn.flips > 0, JSON.stringify(mOn));

console.log('\nSprachneutralitaet');
const german = texts.map((t) => t.s).filter((s) => /[a-zäöüß]{4,}/.test(s) && !/^(t(RCD|RAS|RP|SH|REF|ACC)|ms|mV|fF|ns|bit)$/.test(s));
check('kein deutsches Wort auf der Leinwand', german.length === 0, [...new Set(german)].slice(0, 8).join(', '));
const wordy = [...doc.querySelectorAll('.readout dd')].map((d) => d.textContent.trim()).filter((s) => /[a-zäöüß]{4,}/i.test(s));
check('keine Woerter in den Messfeldern', wordy.length === 0, wordy.join(' | '));

console.log(fails ? `\n${fails} Pruefung(en) fehlgeschlagen\n` : '\nAlle Pruefungen bestanden\n');
process.exit(fails ? 1 : 0);
