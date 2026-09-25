// Haelt die "Aktuelle Serie" der Support-Seite gegen die Dashboard-Kachel.
// Anlass (v7.5.5): Dashboard 280, /support/ 19 — fuer dieselben Daten. Die
// Support-Seite hatte eine eigene Rechnung (nur Arbeit/Schule, Wochenenden
// mitgezaehlt). Dieser Test laedt die ECHTEN Funktionen beider Seiten.
//   node tools/support-zahlen.test.mjs
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

// ── Feedback-Bericht (Modus "Vollstaendig") gegen die Regeln der App ──
// Gelesen wird die Datenvorschau der Seite, also genau das, was gesendet wuerde.
const vh = read('components/core/vacation-holidays.js');
const charts = read('components/core/charts.js');
function appVacationUsed(data) {
    const f = new Function('data', [funktion(vh, 'getVacationMode'), funktion(vh, 'recalculateVacationUsed')].join('\n')
        + '\nrecalculateVacationUsed(); return data.settings.vacation.used;');
    return f(JSON.parse(JSON.stringify(data)));
}
function appWeekly(data) {
    return new Function('data', funktion(charts, 'weeklyTargetHours') + '\nreturn weeklyTargetHours();')(data);
}
async function bericht(data) {
    const dom = new JSDOM(html, { url: 'http://localhost/support/', runScripts: 'outside-only' });
    const w = dom.window;
    w.localStorage.setItem('tg_pro_data', JSON.stringify(data));
    w.fetch = () => Promise.reject(new Error('kein Netz im Test'));
    w.eval(supportJs);
    if (w.document.readyState === 'loading') await new Promise(r => w.document.addEventListener('DOMContentLoaded', r));
    w.document.querySelector('[data-mode="full"]').click();
    w.document.getElementById('spPreviewBtn').click();
    const map = {};
    w.document.querySelectorAll('.fdp-table tbody tr').forEach(tr => { map[tr.children[0].textContent] = tr.children[1].textContent; });
    const mine = {};
    w.document.querySelectorAll('.sp-mine-row').forEach(r => { mine[r.querySelector('.sp-mine-key').textContent] = r.querySelector('.sp-mine-val').textContent; });
    return { map, mine };
}
const Y = new Date().getFullYear();
const fixture = {
    settings: { hours: [0, 8, 8, 8, 8, 8, 0], vacation: { mode: 'hours', total: 240, carriedOver: 9.4, usedManual: 1.5 } },
    entries: [
        { date: `${Y}-01-05`, type: 'work', worked: 4, diff: -2 },            // geteilte Schicht, Teil 1
        { date: `${Y}-01-05`, type: 'work', worked: 4.5, diff: 0.5 },         // Teil 2 — derselbe Tag
        { date: `${Y}-01-06`, type: 'school', worked: 6, expected: 8, diff: 0 },
        { date: `${Y}-01-07`, type: 'vacation', worked: 8, expected: 8, diff: 0 },
        { date: `${Y}-01-08`, type: 'sick', worked: 8, expected: 8, diff: 0 },
        { date: `${Y}-01-09`, type: 'homeoffice', worked: 7, diff: -1 },      // eigene Art zaehlt als Arbeit
        { date: `${Y}-01-09`, type: 'korrektur', worked: 0, diff: 10 },       // nur Saldo
        { date: `${Y}-01-12`, type: 'gleittag', worked: 0, expected: 8, diff: -8 },
        { date: `${Y - 1}-12-15`, type: 'vacation', worked: 8, expected: 8, diff: 0 }  // Vorjahr: kein Urlaubsverbrauch
    ]
};
console.log('── Feedback-Bericht == Zahlen der App');
const { map: b, mine } = await bericht(fixture);
const used = appVacationUsed(fixture), total = 240 + 9.4;
ok(Object.keys(b).length > 20, 'Datenvorschau hat ueberhaupt Felder (' + Object.keys(b).length + ')');
ok(b['Saldo gesamt'] === '-0.50', 'Saldo = Summe aller diff inkl. Korrektur, wie "Gleitzeit"', b['Saldo gesamt']);
ok(b['Stunden gesamt'] === '23.5', 'Stunden = Arbeit + eigene Arten + Schule mit Soll, ohne Urlaub/Krank/Gleittag', b['Stunden gesamt']);
ok(b['Arbeitstage'] === '2', 'Arbeitstage zaehlen Kalendertage (geteilte Schicht = 1), ohne Korrektur', b['Arbeitstage']);
ok(b['Stunden pro Tag'] === '5.8', 'Durchschnitt wie valAvg (40,5 h / 7 Eintraege)', b['Stunden pro Tag']);
ok(b['Urlaub verbraucht'] === used + ' h', 'Urlaub genommen = recalculateVacationUsed() der App (' + used + ' h)', b['Urlaub verbraucht']);
ok(b['Urlaub gesamt'] === total + ' h', 'Urlaubsanspruch = total + carriedOver, in Stunden', b['Urlaub gesamt']);
ok(b['Urlaub übrig'] === (Math.round((total - used) * 10) / 10) + ' h', 'Urlaub uebrig = Anspruch − genommen', b['Urlaub übrig']);
ok(b['Wöchentliches Soll'] === appWeekly(fixture).toFixed(1), 'Wochensoll = weeklyTargetHours()', b['Wöchentliches Soll']);
ok(b['Serie'] === String(dashboardStreak(fixture.entries)), 'Serie im Bericht = Dashboard-Serie', b['Serie']);
ok(mine['Stunden gearbeitet'] === '24 h', '"Dein Stand" rechnet Stunden wie der Bericht (23,5 → 24 h)', mine['Stunden gearbeitet']);

console.log(fails ? `\n✗ ${fails} von ${checks} fehlgeschlagen` : `\n✓ ${checks}/${checks}`);
process.exit(fails ? 1 : 0);
