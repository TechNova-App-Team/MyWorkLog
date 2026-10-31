// ═══ HALLOWEEN TEST ═══
//
// Die Laternen-Karte (components/halloween/). Im Automations-Browser steht WAAPI
// still (document.hidden), deshalb jsdom.
//
// Geprueft wird:
//   1. Torwaechter im <head>: Fenster 31.10. 0 Uhr – 01.11. 13 Uhr, Test-Schalter,
//      'weg' blendet nur die Karte aus (Marken bleiben)
//   2. Suesses wechselt den Spruch ohne direkte Wiederholung, Saures setzt den
//      Saures-Text, Schliessen speichert 'weg'
//   3. jeder JS-Spruch hat einen englischen Eintrag in i18n-runtime.js
//   4. jede Klasse/Id, die das JS braucht, steht im Markup bzw. CSS
//
// Lauf: node tools/halloween.test.mjs
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FEHLT ' + n)); };
const lf = s => s.split('\r\n').join('\n');

const TEMPLATE = lf(readFileSync('index.template.html', 'utf8'));
const DASH     = lf(readFileSync('components/dashboard/dashboard.html', 'utf8'));
const JS       = lf(readFileSync('components/halloween/halloween.js', 'utf8'));
const CSS      = lf(readFileSync('components/halloween/halloween.css', 'utf8'));
const RUNTIME  = lf(readFileSync('Assets/js/i18n-runtime.js', 'utf8'));

function fixedDateClass(iso) {
    const FIXED = new Date(iso).getTime();
    return class extends Date {
        constructor(...a) { if (a.length === 0) super(FIXED); else super(...a); }
        static now() { return FIXED; }
    };
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n1. Torwaechter im <head>');
const gStart = TEMPLATE.indexOf('<script>(function(){\n  // 1. Sidebar collapse pre-apply');
const gEnd   = TEMPLATE.indexOf('})();</script>', gStart);
ok('Pre-Apply-Skript gefunden', gStart > 0 && gEnd > gStart);
const GATE = TEMPLATE.slice(gStart + '<script>'.length, gEnd + '})();'.length);
ok('Schritt 7 (Halloween) steht im Pre-Apply', GATE.includes('mwl-halloween-karte'));

function gate({ now, ls = {} }) {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/', runScripts: 'outside-only' });
    const w = dom.window;
    for (const k of Object.keys(ls)) w.localStorage.setItem(k, ls[k]);
    w.Date = fixedDateClass(now);
    w.eval(GATE);
    return w.document.documentElement.className.split(/\s+/).filter(Boolean);
}
const an = (c) => c.includes('mwl-halloween') && c.includes('mwl-halloween-karte');
ok('31.10. 0:00: an',           an(gate({ now: '2026-10-31T00:00:00' })));
ok('31.10. 23:59: an',          an(gate({ now: '2026-10-31T23:59:00' })));
ok('01.11. 12:59: noch an',     an(gate({ now: '2026-11-01T12:59:00' })));
ok('01.11. 13:00: aus',         !gate({ now: '2026-11-01T13:00:00' }).includes('mwl-halloween'));
ok('30.10. 23:59: noch nichts', !gate({ now: '2026-10-30T23:59:00' }).includes('mwl-halloween'));
ok('31.12.: nichts',            !gate({ now: '2026-12-31T20:00:00' }).includes('mwl-halloween'));
ok('31.05.: nichts',            !gate({ now: '2026-05-31T20:00:00' }).includes('mwl-halloween'));
ok('Test-Schalter',             an(gate({ now: '2026-03-01T09:30:00', ls: { mwl_halloween_test: '1' } })));
{
    const weg = gate({ now: '2026-10-31T20:00:00', ls: { mwl_halloween_2026: 'weg' } });
    ok("'weg': Marken bleiben, Karte nicht", weg.includes('mwl-halloween') && !weg.includes('mwl-halloween-karte'));
    const vorjahr = gate({ now: '2026-10-31T20:00:00', ls: { mwl_halloween_2025: 'weg' } });
    ok("'weg' vom Vorjahr zaehlt nicht", an(vorjahr));
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n2. Karte');
const kStart = DASH.indexOf('<section id="hwCard"');
const kEnd   = DASH.indexOf('</section>', kStart) + '</section>'.length;
const KARTE  = DASH.slice(kStart, kEnd);
ok('Karten-Markup gefunden', kStart > 0 && KARTE.length > 1000);

const dom = new JSDOM('<!doctype html><html class="mwl-halloween mwl-halloween-karte"><head></head><body>' + KARTE + '</body></html>',
    { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, d = w.document;
w.matchMedia = () => ({ matches: true });   // reduzierte Bewegung: kein WAAPI-Flug in jsdom
const events = [];
w.mwlEvent = (n, p) => events.push(n + ':' + p.aktion);
w.eval(JS);
// jsdom steht hier noch auf readyState 'loading', DOMContentLoaded feuert asynchron
await new Promise(r => setTimeout(r, 30));
const lead = () => d.getElementById('hwLead').textContent;
const start = lead();
const gesehen = [];
for (let i = 0; i < 12; i++) { d.getElementById('hwSuess').click(); gesehen.push(lead()); }
ok('Suesses aendert den Text', gesehen[0] !== start);
ok('nie zweimal derselbe Spruch hintereinander', gesehen.every((t, i) => i === 0 || t !== gesehen[i - 1]));
ok('alle fuenf Sprueche kommen in 12 Klicks vor', new Set(gesehen).size === 5);
d.getElementById('hwSauer').click();
ok('Saures setzt den Abflug-Text', lead().startsWith('Ausgeflogen.'));
d.getElementById('hwClose').click();
ok("Schliessen speichert 'weg'", w.localStorage.getItem('mwl_halloween_' + new Date().getFullYear()) === 'weg');
ok('Schliessen nimmt nur die Karten-Klasse', d.documentElement.classList.contains('mwl-halloween') && !d.documentElement.classList.contains('mwl-halloween-karte'));
ok('Ereignisse ueber mwlEvent', events.includes('halloween:suesses') && events.includes('halloween:saures') && events.includes('halloween:weg'));

// ═════════════════════════════════════════════════════════════════════
console.log('\n3. Englisch');
const strings = [...JS.matchAll(/^\s*'([^']{20,})',?$/gm)].map(m => m[1]);
const saures = (JS.match(/const SAURES = '([^']+)'/) || [])[1];
if (saures) strings.push(saures);
ok('Sprueche im JS gefunden (Gegenprobe)', strings.length === 6);
for (const s of strings) ok('EN fuer: ' + s.slice(0, 40) + '…', RUNTIME.includes("'" + s + "':"));

// ═════════════════════════════════════════════════════════════════════
console.log('\n4. Markup und CSS');
for (const id of ['hwCard', 'hwLaterne', 'hwLead', 'hwSuess', 'hwSauer', 'hwClose', 'hwTitle'])
    ok('#' + id + ' im Markup', KARTE.includes('id="' + id + '"'));
for (const k of ['is-flackert', 'is-neu', 'hw-flug', 'hw-fm', 'hw-fm-fluegel'])
    ok('.' + k + ' im CSS', CSS.includes('.' + k));
ok('CSS + JS im Template', TEMPLATE.includes('/components/halloween/halloween.css') && TEMPLATE.includes('/components/halloween/halloween.js'));

console.log('\n' + pass + ' ok, ' + fail + ' fehlgeschlagen');
process.exit(fail ? 1 : 0);
