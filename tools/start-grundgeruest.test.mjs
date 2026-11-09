// ═══ START MIT UNVOLLSTÄNDIGEN DATEN ═══
//
// Warum es diesen Test gibt: Beim Start laufen zwei Routinen am DOMContentLoaded. initializeApp()
// (app-startup.js) ist zuerst registriert und ruft sofort recalculateVacationUsed(); das Auffüllen
// fehlender Einstellungen in init-app.js kam erst danach. Gespeicherte Daten ohne settings.vacation
// (Import, alte Sicherung, Fremddaten) warfen deshalb „reading 'usedManual'“ und die App zeigte nur
// die Fehlerseite (09.11.2026). Seit dem Fix füllt loadPersistedData() das Grundgerüst selbst auf.
//
// Lauf: node tools/start-grundgeruest.test.mjs
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FEHLT ' + n)); };

const lf = (s) => s.split('\r\n').join('\n');
const STATE = lf(readFileSync('components/core/state-config.js', 'utf8'));
const URLAUB = lf(readFileSync('components/core/vacation-holidays.js', 'utf8'));

// Beide Dateien in EINEM Skript: ihre Top-Level-`let`/`function` müssen sich sehen wie im Browser.
function lauf(gespeichert, nachher) {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window;
    if (gespeichert !== undefined) w.localStorage.setItem('tg_pro_data', gespeichert);
    w.mwlLocale = () => 'de-DE';
    w.eval(STATE + '\n' + URLAUB + '\n;window.__ergebnis = (function(){' + nachher + '})();');
    return w.__ergebnis;
}

const STARTE = `
    const saved = loadPersistedData();
    if (saved) data = saved;
    try { recalculateVacationUsed(); } catch (e) { return { fehler: String(e) }; }
    return { fehler: null, vac: data.settings.vacation, eintraege: data.entries.length, name: data.settings.name };`;

// 1. Der gemeldete Fall: Einstellungen ohne vacation
const ohneUrlaub = JSON.stringify({ entries: [{ id: 'a', date: new Date().getFullYear() + '-03-02', type: 'vacation', expected: 8 }], settings: { name: 'Lena', hours: [8, 8, 8, 8, 8, 0, 0] } });
let r = lauf(ohneUrlaub, STARTE);
ok('ohne settings.vacation: kein Absturz (' + r.fehler + ')', r.fehler === null);
ok('Urlaub wird gezählt (1 Tag)', r.vac && r.vac.used === 1);
ok('Name des Nutzers bleibt', r.name === 'Lena');

// 2. Ganz ohne settings
r = lauf(JSON.stringify({ entries: [] }), STARTE);
ok('ohne settings: kein Absturz (' + r.fehler + ')', r.fehler === null);

// 3. Ohne entries
r = lauf(JSON.stringify({ settings: {} }), STARTE);
ok('ohne entries: kein Absturz (' + r.fehler + ')', r.fehler === null);

// 4. Vorhandene Urlaubswerte werden NICHT überschrieben
r = lauf(JSON.stringify({ entries: [], settings: { vacation: { total: 25, used: 0, usedManual: 3, mode: 'days' } } }), STARTE);
ok('eigener Anspruch bleibt 25', r.vac.total === 25);
ok('manuelle Tage zählen weiter (3)', r.vac.used === 3);

// 5. Gegenprobe: ohne das Grundgerüst stürzt genau dieser Ablauf ab — sonst prüft Fall 1 nichts.
r = lauf(ohneUrlaub, `
    data = JSON.parse(localStorage.getItem('tg_pro_data'));
    try { recalculateVacationUsed(); } catch (e) { return { fehler: String(e) }; }
    return { fehler: null };`);
ok('Gegenprobe: roh geladen wirft weiterhin (' + r.fehler + ')', !!r.fehler && r.fehler.includes('usedManual'));

// 6. Kein Datenobjekt („null“) -> Wiederherstellung aus Sicherung statt Absturz
r = lauf('null', `
    localStorage.setItem('tg_pro_data_backups', JSON.stringify([{ ts: 1, data: { entries: [{ id: 'b' }], settings: {} } }]));
    const saved = loadPersistedData();
    return { eintraege: saved ? saved.entries.length : -1, vac: saved && saved.settings.vacation };`);
ok('„null“ gespeichert: Sicherung mit 1 Eintrag geladen', r.eintraege === 1);
ok('auch die Sicherung bekommt das Grundgerüst', !!r.vac);

console.log('\n' + pass + ' OK, ' + fail + ' FAIL');
if (fail || pass === 0) process.exit(1);
