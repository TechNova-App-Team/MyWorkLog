// Haelt die "Aktuelle Serie" der Support-Seite gegen die Dashboard-Kachel.
// Anlass (v7.5.5): Dashboard 280, /support/ 19 — fuer dieselben Daten. Die
// Support-Seite hatte eine eigene Rechnung (nur Arbeit/Schule, Wochenenden
// mitgezaehlt). Dieser Test laedt die ECHTEN Funktionen beider Seiten.
//   node tools/support-streak.test.mjs
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let fails = 0, checks = 0;
const ok = (c, msg, extra) => { checks++; if (c) console.log('  OK   ' + msg); else { fails++; console.log('  FAIL ' + msg + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); } };
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8').split('\r\n').join('\n');

// Top-Level-Funktion mit 4 Leerzeichen Einrueckung bis zur ersten Zeile "    }".
function funktion(src, name) {
    const start = src.indexOf('    function ' + name + '(');
    if (start < 0) throw new Error('Funktion nicht gefunden: ' + name);
    const end = src.indexOf('\n    }\n', start);
    return src.slice(start, end + 6);
}
const dash = read('components/dashboard/dashboard.js');
const extras = read('components/core/dashboard-extras.js');
const dashSrc = [funktion(extras, 'getLastWorkday'), funktion(extras, 'isConsecutiveWorkDay'), funktion(dash, 'calculateStreak')].join('\n');

function dashboardStreak(entries) {
    const f = new Function('data', dashSrc + '\nreturn calculateStreak();');
    return f({ entries }).current;
}

const html = read('pages/support/index.html');
const supportJs = read('Assets/js/support.js');
async function supportStreak(entries) {
    const dom = new JSDOM(html, { url: 'http://localhost/support/', runScripts: 'outside-only' });
    const w = dom.window;
    w.localStorage.setItem('tg_pro_data', JSON.stringify({ entries, settings: {} }));
    w.fetch = () => Promise.reject(new Error('kein Netz im Test'));
    w.eval(supportJs);
    // jsdom steht direkt nach dem Parsen noch auf "loading"; support.js wartet auf DOMContentLoaded.
    if (w.document.readyState === 'loading') await new Promise(r => w.document.addEventListener('DOMContentLoaded', r));
    const row = [...w.document.querySelectorAll('.sp-mine-row')].find(r => /Serie/.test(r.textContent));
    if (!row) return entries.length ? 'KEINE ZEILE' : 0;
    return parseInt(row.querySelector('.sp-mine-val').textContent.replace(/\./g, ''), 10);
}

// Daten relativ zu heute, lokal formatiert (nie toISOString, CLAUDE.md).
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const tage = (n, from = new Date()) => { const d = new Date(from); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d; };
const TYPES = ['work', 'work', 'work', 'school', 'vacation', 'sick', 'holiday'];
function reihe(anzahlKalendertage, startVersatz = 0, mitWochenende = true) {
    const out = [];
    for (let i = startVersatz; i < startVersatz + anzahlKalendertage; i++) {
        const d = tage(i), dow = d.getDay();
        if ((dow === 0 || dow === 6) && !mitWochenende) continue;
        out.push({ date: iso(d), type: TYPES[i % TYPES.length], worked: 8 });
    }
    return out;
}

const faelle = [
    ['lange Serie aus allen Eintragsarten (der gemeldete Fall)', reihe(400)],
    ['nur Mo–Fr erfasst', reihe(120, 0, false)],
    ['mit geplantem Urlaub in der Zukunft', [...reihe(60), { date: iso(tage(-5)), type: 'vacation' }, { date: iso(tage(-6)), type: 'vacation' }]],
    ['Luecke in der Mitte', [...reihe(10), ...reihe(30, 25)]],
    ['letzter Eintrag vor zwei Wochen', reihe(30, 14)],
    ['doppelte Eintraege am selben Tag', [...reihe(20), ...reihe(20)]],
];

console.log('── Support-Serie == Dashboard-Serie');
let groesser = 0;
for (const [name, entries] of faelle) {
    const a = dashboardStreak(entries), b = await supportStreak(entries);
    ok(a === b, name + ' (Dashboard ' + a + ', Support ' + b + ')', { a, b });
    if (a > 20) groesser++;
}
console.log('── Gegenprobe');
ok(groesser > 0, 'mindestens ein Fall hat eine lange Serie (sonst prueft der Vergleich nur Nullen)');
ok((await supportStreak([])) === 0 && dashboardStreak([]) === 0, 'leere Daten: beide 0');

console.log(fails ? `\n✗ ${fails} von ${checks} fehlgeschlagen` : `\n✓ ${checks}/${checks}`);
process.exit(fails ? 1 : 0);
