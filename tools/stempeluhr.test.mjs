// Stempeluhr: Laufzeit und Pause beim Stoppen (v9.3.0).
//   node tools/stempeluhr.test.mjs
// timer.paused ist die LAUFZEIT der abgeschlossenen Abschnitte, breakTime die
// gemessene Pause. Bis v9.3.0 zog jede Netto-Rechnung breakTime noch einmal ab
// (8–12, Pause bis 12:30, dann bis 16 Uhr → 7,0 statt 7,5 h), und Stop buchte
// die Zahl als „Manuell" ohne die Uhr zurueckzusetzen.
// Geladen werden die ECHTEN Funktionen timerAction (dashboard.js) und
// logTimerAction (timer.js); ausgeschnitten bis zur ersten Zeile "    }".
import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

let pass = 0, fail = 0;
const ok = (b, n) => { if (b) { pass++; console.log('  OK    ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const lies = p => readFileSync(p, 'utf8').split('\r\n').join('\n');
const funktion = (src, name) => {
    const a = src.indexOf('    function ' + name + '(');
    return a < 0 ? '' : src.slice(a, src.indexOf('\n    }\n', a) + 6);
};
const ohneKommentare = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\/\/.*$/gm, '');

const dash = lies('components/dashboard/dashboard.js'), tim = lies('components/core/timer.js');
const ta = funktion(dash, 'timerAction'), lt = funktion(tim, 'logTimerAction');
ok(ta.includes("act === 'stop'") && lt.includes('timer.breakTime +='), 'Gegenprobe: beide Funktionen ausgeschnitten');

const w = new JSDOM('<!doctype html><body><div id="timerBox"></div><input id="inpStart" value="09:00"><input id="inpEnd"><input id="inpHours" value="3">' +
    '<select id="inpType"><option value="work">w</option></select><input id="inpDate" type="date"></body>', { runScripts: 'outside-only' }).window;
w.eval('var jetzt = 0; Date.now = function () { return jetzt; };\n' +
    'var timer = { id: null, start: 0, paused: 0, running: false, log: [], breakTime: 0 };\n' +
    'var gebucht = null, bestaetigen = true;\n' +
    'function showCustomConfirm(t, text, ja, nein) { window.__text = text; bestaetigen ? ja() : nein(); }\n' +
    'function handleEntry() { gebucht = { paused: timer.paused, breakTime: timer.breakTime, running: timer.running, felder: ["inpStart","inpEnd","inpHours"].map(function (i) { return document.getElementById(i).value; }) }; timer = { id: null, start: 0, paused: 0, running: false, log: [], breakTime: 0 }; }\n' +
    'function saveTimerState() {}\nfunction renderTimerLogBar() {}\nfunction timerRun() {}\nfunction displayTimerTime() {}\n' +
    lt + '\n' + ta + '\nwindow.__t = function (c) { return eval(c); };');
const T = c => w.__t(c);
const um = (h, m) => Date.UTC(2026, 9, 20, h, m || 0);
const tue = (h, m, act) => { T('jetzt = ' + um(h, m)); T('timerAction("' + act + '")'); };

tue(8, 0, 'start'); tue(12, 0, 'pause'); tue(12, 30, 'start');
T('bestaetigen = false'); tue(16, 0, 'stop');
ok(T('timer.running') === true && T('gebucht') === null, 'Abbrechen beim Stoppen aendert nichts, die Uhr laeuft weiter');
T('bestaetigen = true'); tue(16, 0, 'stop');
const g = T('gebucht');
ok(g && g.paused === 7.5 * 36e5, 'Laufzeit 7,5 h (nicht 7,0 — die Pause ist nicht darin)');
ok(g.breakTime === 30 * 6e4 && g.running === false, 'Pause 30 min gemessen, Uhr steht');
ok(g.felder.join('|') === '||', 'Start/Ende/Stunden leer → handleEntry() nimmt den Tracker-Zweig');
ok(/7\.50h/.test(T('window.__text')), 'Rueckfrage zeigt 7,50 h');

// Stop waehrend einer Pause: die laufende Pause zaehlt mit, nichts an Laufzeit
T('timer = { id: null, start: 0, paused: 0, running: false, log: [], breakTime: 0 }; gebucht = null');
tue(8, 0, 'start'); tue(12, 0, 'pause'); tue(12, 45, 'stop');
ok(T('gebucht').paused === 4 * 36e5 && T('gebucht').breakTime === 45 * 6e4, 'Stop in der Pause: 4 h Laufzeit, 45 min Pause');

// handleEntry(): der Tracker-Zweig zieht breakTime nicht noch einmal ab
const he = ohneKommentare(dash.slice(dash.indexOf('else if (timer.paused > 0 || timer.running)'), dash.indexOf('// Timer zurücksetzen')));
ok(he.includes('let h = totalMs / 3.6e6') && !/h\s*-=\s*\(timer\.breakTime/.test(he), 'handleEntry: kein zweiter Abzug der gemessenen Pause');
ok(he.includes('timerBreakMinutes < minBreakRequired'), 'Gegenprobe: Mindestpausen-Regel steht noch drin');
// Anzeige der laufenden Uhr: ebenfalls ohne zweiten Abzug
const anzeigen = [
    [funktion(tim, 'timerRun'), 'timerRun'],
    [lies('components/dashboard/dashboard-neu.js').match(/function dnTimerH\(\) \{[\s\S]*?\n\}/)[0], 'dnTimerH'],
];
anzeigen.forEach(([src, n]) => ok(src.length > 20 && !/breakTime/.test(ohneKommentare(src)), n + ': Anzeige ohne breakTime-Abzug'));

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
if (pass < 8) { console.log('Gegenprobe: zu wenige Pruefungen'); process.exit(1); }
process.exit(fail ? 1 : 0);
