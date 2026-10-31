// ═══ VORSCHLAEGE IM ASSISTENTEN (vorschlaegeFuer in ais-chat.js, CHAT_SAETZE in ais-berufe.js) ═══
//
// Warum es diesen Test gibt: bis 31.10.2026 bekam JEDER Beruf dieselben drei
// IT-Saetze („Rechner aufgesetzt") als Vorschlag — ein Kaufmann sah IT-Arbeit
// (Meldung des Nutzers mit Bildschirmfoto). Der Test haelt fest:
// 1. jeder Beruf der Liste hat eigene Saetze, ohne IT-Woerter ausserhalb der IT;
// 2. je Kalenderwoche eine andere Auswahl, dieselbe Woche bleibt gleich;
// 3. eigene Taetigkeiten (Lernprofil) gehen vor, ein frei eingetragener Beruf und
//    /en/ bekommen die neutralen Saetze.
//
// Lauf: node tools/ais-vorschlaege.test.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { funktion } from './berichtsheft-laden.mjs';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FEHLT ' + n)); };
const eq = (n, a, b) => ok(n + '  (' + JSON.stringify(a) + ' = ' + JSON.stringify(b) + ')', JSON.stringify(a) === JSON.stringify(b));

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync('Assets/js/berichtsheft/ais-berufe.js', 'utf8'), ctx);
vm.runInContext("const TAG_DE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];\n" +
    funktion('ais-chat.js', 'vorschlaegeFuer') + '\nthis.f = vorschlaegeFuer;', ctx);
const B = ctx.window.AIS_BERUFE, f = ctx.f;

console.log('\nSatz-Vorrat je Beruf');
const ids = Object.keys(B.PROFESSIONS);
ok('es gibt Berufe (' + ids.length + ')', ids.length >= 20);
ids.forEach(id => ok(id + ': mindestens 6 Saetze', (B.CHAT_SAETZE[id] || []).length >= 6));
const alle = Object.values(B.CHAT_SAETZE).flat();
eq('keine Dubletten ueber alle Berufe', alle.length, new Set(alle).size);
eq('keine Saetze fuer Berufe, die es nicht gibt', Object.keys(B.CHAT_SAETZE).filter(k => !B.PROFESSIONS[k]), []);
const IT = /\b(rechner|ticket|server|switch|firewall|api|code|bug|netzwerk)/i;
const itAusserhalb = Object.entries(B.CHAT_SAETZE).filter(([k]) => k !== 'software' && k !== 'sysadmin').flatMap(([k, l]) => l.filter(s => IT.test(s)).map(s => k + ': ' + s));
eq('keine IT-Woerter ausserhalb der IT-Berufe', itAusserhalb, []);
ok('Gegenprobe: die IT-Berufe haben IT-Woerter', B.CHAT_SAETZE.sysadmin.some(s => IT.test(s)));
ok('kein Satz endet mit Punkt (Knopf, kein Fliesstext)', alle.every(s => !/\.$/.test(s)));

console.log('\nAuswahl');
const kauf = { beruf: 'kaufmann', berufName: 'Kaufmann/-frau', schultage: [] };
const v44 = f(kauf, 44, null, false), v45 = f(kauf, 45, null, false);
eq('drei Vorschlaege', v44.length, 3);
ok('Kaufmann bekommt Kaufmann-Saetze', v44.every(s => B.CHAT_SAETZE.kaufmann.includes(s)));
ok('naechste Woche andere Auswahl', JSON.stringify(v44) !== JSON.stringify(v45));
// „mal neue": zwei aufeinanderfolgende Wochen teilen hoechstens einen Satz (an der
// Grenze eines Durchlaufs), meist keinen — ueber ein ganzes Jahr gemessen.
let geteilt = 0, schlecht = 0, kombis = new Set();
for (let w = 1; w <= 52; w++) {
    const a = f(kauf, w, null, false), b = f(kauf, w + 1, null, false);
    const n = a.filter(x => b.includes(x)).length;
    geteilt += n; if (n > 1) schlecht++;
    kombis.add([...a].sort().join('|'));
}
eq('nie mehr als ein Satz wie in der Vorwoche', schlecht, 0);
ok('im Schnitt fast nur neue Saetze (' + (geteilt / 52).toFixed(2) + ' gleiche je Woche)', geteilt / 52 < 0.5);
ok('viele verschiedene Dreiergruppen im Jahr (' + kombis.size + ')', kombis.size >= 8);
eq('dieselbe Woche bleibt gleich (kein Flackern)', f(kauf, 44, null, false), v44);
const baecker = { beruf: 'gastronomie', berufName: 'Bäcker/in', schultage: [] };
ok('frei eingetragener Beruf → neutral, nicht „kalte Küche"', f(baecker, 44, null, false).every(s => B.CHAT_SAETZE_NEUTRAL.de.includes(s)));
ok('Englisch → neutrale englische Saetze', f(kauf, 44, null, true).every(s => B.CHAT_SAETZE_NEUTRAL.en.includes(s)));

console.log('\nEigene Taetigkeiten gehen vor');
const lp = { taetigkeiten: [{ text: 'Rechnungen in DATEV gebucht' }, { text: 'Lieferantenanfragen beantwortet' }, { text: 'Kassenbuch geführt' }, { text: '- Unterpunkt' }] };
const e = f(Object.assign({}, kauf, { schultage: [2] }), 44, lp, false);
eq('drei eigene', e.length, 3);
ok('mit Schultag aus den Einstellungen', /, Mittwoch Berufsschule$/.test(e[0]));
ok('nur eigene Taetigkeiten, keine Unterpunkte', e.every(s => /DATEV|Lieferanten|Kassenbuch/.test(s)) && !e.some(s => /Unterpunkt/.test(s)));
ok('Schultag Mo/Di wird nicht neben „Montag und Dienstag" gesetzt', !/Berufsschule/.test(f(Object.assign({}, kauf, { schultage: [0] }), 44, lp, false)[0]));
ok('unter 3 eigenen: Berufssaetze', f(kauf, 44, { taetigkeiten: lp.taetigkeiten.slice(0, 2) }, false).every(s => B.CHAT_SAETZE.kaufmann.includes(s)));

console.log('\n' + pass + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
