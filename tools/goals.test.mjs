// Ziele: Rechenlogik aus components/goals/goals.js gegen die Fälle, an denen
// die alte Seite falsch lag. Lädt die echte Datei in jsdom, Datum gestellt.
// Aufruf: node tools/goals.test.mjs
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const GOALS = readFileSync(new URL('../components/goals/goals.js', import.meta.url), 'utf8');
const HTML = readFileSync(new URL('../components/goals/goals.html', import.meta.url), 'utf8');
const UTILS = readFileSync(new URL('../components/core/utils.js', import.meta.url), 'utf8').split('\r\n').join('\n');
// Nur getWeek aus utils.js; die Datei hat Einrückung 4, die Funktion endet an der ersten "    }".
const gw = UTILS.slice(UTILS.indexOf('    function getWeek('), UTILS.indexOf('\n    }\n', UTILS.indexOf('    function getWeek(')) + 6);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  FAIL ' + m); } };

function setup(entries, goals, hours, today) {
    const dom = new JSDOM('<!doctype html><html lang="de"><body>' + HTML + '</body></html>', { runScripts: 'outside-only' });
    const w = dom.window;
    // Datum stellen: new Date() ohne Argument liefert `today`.
    w.eval(`(function(){ const R = Date, T = new R(${JSON.stringify(today)} + 'T12:00:00').getTime();
        function D(...a){ return a.length ? new R(...a) : new R(T); } D.prototype = R.prototype; D.now = () => T; D.UTC = R.UTC; D.parse = R.parse; window.Date = D; })();`);
    w.eval(gw);
    w.eval(`var data = { entries: ${JSON.stringify(entries)}, settings: { goals: ${JSON.stringify(goals)}, hours: ${JSON.stringify(hours)} } };
        function getJobs(){ return [{ id: 'primary', primary: true }]; }
        function getJobHours(id, d){ return data.settings.hours[d] || 0; }
        function save(){ window.__saved = (window.__saved || 0) + 1; }`);
    w.eval(GOALS);
    return w;
}
const e = (date, worked, diff, type) => ({ id: date + worked, date, worked, diff, type: type || 'work' });
const HOURS = [0, 8, 8, 8, 8, 7.5, 0];   // So..Sa, Freitag kürzer

console.log('Ziele');
{
    // Montag, 28.09.2026. Ein Eintrag am Sonntag davor darf NICHT in die Woche.
    const w = setup([e('2026-09-27', 5, 5), e('2026-09-28', 9, 1)], [], HOURS, '2026-09-28');
    w.eval('glRenderWeek()');
    const txt = w.document.getElementById('glWeek').textContent;
    ok(/9,0\s*h/.test(txt) && !/14,0/.test(txt), 'Woche beginnt am lokalen Montag (Sonntag davor zählt nicht): ' + (txt.match(/[\d,]+\s*h/) || [''])[0]);
    ok(txt.includes('39,5 h Soll'), 'Wochensoll aus den Einstellungen (39,5 h, nicht fest 40)');
    ok(txt.includes('/ 5'), 'Arbeitstage = Tage mit Soll > 0 (5)');
}
{
    // ISO-Jahr: 29.12.2025 und 02.01.2026 liegen in derselben KW 1/2026.
    const w = setup([e('2025-12-29', 8.4, 0.4), e('2026-01-02', 8.3, 0.3)], [], HOURS, '2026-01-05');
    const n = w.eval("glCurrent(glSeries('POSITIVE_WEEKS'))");
    ok(n === 1, 'Woche über den Jahreswechsel zählt einmal (0,7 h > 0,5): ' + n);
    ok(w.eval("glWeekKey(glParse('2025-12-29'))") === '2026-W01', 'Wochenschlüssel trägt das ISO-Jahr');
}
{
    // Saldo steigt über das Ziel und fällt wieder darunter: nicht erreicht.
    const w = setup([e('2026-09-01', 10, 6), e('2026-09-02', 4, -4)], [{ id: 1, title: '', type: 'TOTAL_DIFF_HOURS', target: 5 }], HOURS, '2026-09-10');
    const p = w.eval("glProgress(data.settings.goals[0])");
    ok(p.cur === 2 && p.reachedOn === null, 'zurückgefallener Saldo gilt nicht als erreicht (aktuell ' + p.cur + ')');
    const neg = setup([e('2026-09-01', 4, -4)], [{ id: 1, title: '', type: 'TOTAL_DIFF_HOURS', target: 5 }], HOURS, '2026-09-10').eval("glProgress(data.settings.goals[0])");
    ok(neg.pct === 0, 'negativer Saldo ergibt 0 %, keinen negativen Fortschritt');
}
{
    // Erreicht-Datum = Tag, an dem die Summe das Ziel überschritt.
    const w = setup([e('2026-08-03', 40, 0), e('2026-08-10', 40, 0), e('2026-08-17', 40, 0)], [{ id: 1, title: '', type: 'TOTAL_WORKED_HOURS', target: 100 }], HOURS, '2026-09-01');
    ok(w.eval("glProgress(data.settings.goals[0]).reachedOn") === '2026-08-17', 'Erreicht-Datum ist der Tag des Überschreitens');
}
{
    // Hochrechnung: unter 14 Tagen Verlauf keine Aussage; sonst Tempo je Woche.
    const short = setup([e('2026-09-25', 8, 0)], [{ id: 1, title: '', type: 'TOTAL_WORKED_HOURS', target: 500 }], HOURS, '2026-09-28');
    ok(short.eval("glPace(glSeries('TOTAL_WORKED_HOURS'))") === null, 'unter 14 Tagen: keine Hochrechnung');
    const ents = []; for (let i = 0; i < 56; i++) { const d = new Date(Date.UTC(2026, 7, 3 + i)); ents.push(e(d.toISOString().slice(0, 10), 5, 0)); }
    const w = setup(ents, [], HOURS, '2026-09-28');
    const pace = w.eval("glPace(glSeries('TOTAL_WORKED_HOURS'))");
    ok(pace && Math.abs(pace.perWeek - 35) < 5.1, 'Tempo aus 8 Wochen, 5 h/Tag ergibt rund 35 h pro Woche: ' + (pace && pace.perWeek.toFixed(1)));
}
{
    // Meilensteine kommen aus den Daten: ohne Einträge ist keiner freigeschaltet.
    const empty = setup([], [], HOURS, '2026-09-28');
    empty.eval('glRenderMilestones()');
    const got = empty.document.querySelectorAll('.gl-mile.is-got').length;
    const all = empty.document.querySelectorAll('.gl-mile').length;
    ok(all > 0, 'es gibt überhaupt Meilensteine (' + all + ')');
    ok(got === 0, 'ohne Einträge ist kein Meilenstein freigeschaltet (früher: "Marathon-Start" fest im Markup)');
    // Kommentare strippen: der Dateikopf ERKLÄRT, dass „Marathon-Start" wegkam.
    const markup = HTML.replace(/<!--[\s\S]*?-->/g, '');
    ok(HTML.includes('Marathon'), 'Gegenprobe: das Wort steht im Kommentar (sonst prüft die nächste Zeile nichts)');
    ok(!/Marathon/.test(markup), 'kein fest eingebauter Erfolg im Markup');
}
{
    // Anlegen: Validierung, Speichern, kein Emoji in der Oberfläche.
    const w = setup([e('2026-09-28', 8, 0)], [], HOURS, '2026-09-28');
    w.Element.prototype.scrollIntoView = function () {};   // fehlt in jsdom
    w.eval('renderGoalsView(); glOpenComposer(); glSaveGoal();');
    ok(w.eval('data.settings.goals.length') === 0 && !w.document.getElementById('glTargetErr').hidden, 'leerer Zielwert: nichts gespeichert, Fehler sichtbar');
    w.eval("glDraft.target = '40'; glSaveGoal();");
    ok(w.eval('data.settings.goals.length') === 1 && w.eval('window.__saved') === 1, 'gültiger Zielwert wird gespeichert');
    w.eval('renderGoalsView()');
    ok(!/\p{Extended_Pictographic}/u.test(w.document.getElementById('view-goals').innerHTML), 'keine Emojis in der Ansicht');
}

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail || pass === 0 ? 1 : 0);
