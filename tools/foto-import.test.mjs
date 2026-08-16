// Prueft das Deuten des erkannten Textes aus Assets/js/berichtsheft/foto-import.js.
//
// Die Texterkennung selbst laesst sich hier nicht pruefen (WASM + Sprachmodell
// aus dem Netz). Pruefbar — und der eigentlich fehleranfaellige Teil — ist,
// was danach passiert: aus einer Wand OCR-Text die fuenf Tage herauszuloesen,
// ohne den Formularrahmen mitzunehmen und ohne bei einem verlesenen Buchstaben
// den ganzen Tag zu verlieren.
//
// Aufruf:  node tools/foto-import.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const src = fs.readFileSync(path.join(ROOT, 'Assets/js/berichtsheft/foto-import.js'), 'utf8');

const dom = new JSDOM('<!doctype html><body>', { runScripts: 'outside-only' });
dom.window.eval(src);
const W = dom.window;

let fails = 0;
function check(name, ok, detail = '') {
    if (!ok) fails++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? '   → ' + detail : ''}`);
}
const eq = (name, got, want) => check(name, got === want, `${JSON.stringify(got)} statt ${JSON.stringify(want)}`);

// ═══ 1. Wochentag trotz Lesefehlern ═════════════════════════════════════
console.log('\nWochentage (die Erkennung verliest sich)');
eq('sauber', W.mwlFotoTagAusZeile('Montag'), 'monday');
eq('mit Doppelpunkt', W.mwlFotoTagAusZeile('Dienstag:'), 'tuesday');
eq('g als q gelesen', W.mwlFotoTagAusZeile('Montaq'), 'monday');
eq('Buchstabe fehlt', W.mwlFotoTagAusZeile('Donnerstg'), 'thursday');
eq('Kürzel', W.mwlFotoTagAusZeile('Mi'), 'wednesday');
eq('Aufzählungszeichen davor', W.mwlFotoTagAusZeile('- Freitag'), 'friday');
// Ein laengeres Wort, das mit dem Tagesnamen anfaengt, ist ein anderes Wort.
// Ueber die reine Editierdistanz sieht "Montage" aus wie ein verlesener Montag.
eq('Montage ist kein Montag', W.mwlFotoTagAusZeile('Montage von Baugruppen'), null);
eq('Freitagsarbeit ist kein Freitag', W.mwlFotoTagAusZeile('Freitagsdienst geleistet'), null);
eq('montags gilt trotzdem', W.mwlFotoTagAusZeile('Montags'), 'monday');
eq('leere Zeile', W.mwlFotoTagAusZeile(''), null);
// Zwei Daten in EINER Zeile — "vom … bis …" steht auf dem Vordruck nebeneinander.
check('beide Daten einer Zeile', W.mwlFotoDaten('vom: 03.08.2026 bis: 07.08.2026').join() === '2026-08-03,2026-08-07',
    W.mwlFotoDaten('vom: 03.08.2026 bis: 07.08.2026').join());

console.log('\nDatum und Stunden');
eq('Datum', W.mwlFotoDatum('Woche vom 03.08.2026'), '2026-08-03');
eq('Leerzeichen im Datum', W.mwlFotoDatum('03. 08. 2026'), '2026-08-03');
eq('Unsinniges Datum', W.mwlFotoDatum('45.13.2026'), null);
eq('Stunden am Zeilenende', (W.mwlFotoStundenAmEnde('Server installiert  8') || {}).stunden, 8);
eq('mit Einheit', (W.mwlFotoStundenAmEnde('Doku 7,5 h') || {}).stunden, 7.5);
eq('Rest ohne Stundenzahl', (W.mwlFotoStundenAmEnde('Server installiert 8') || {}).rest, 'Server installiert');
eq('nackte Zahl ist keine Stundenzahl', W.mwlFotoStundenAmEnde('12'), null);

// ═══ 2. Ein ganzes Blatt ════════════════════════════════════════════════
console.log('\nEin abfotografiertes Blatt');
const ocr = `Ausbildungsnachweis (wöchentlich)
Name des/der Auszubildenden: Max Mustermann
Ausbildungswoche vom: 03.08.2026   bis: 07.08.2026
KW 32

Betriebliche Tätigkeiten                     Stunden
Montag
- Testumgebung aufgesetzt
- Docker-Compose angepasst          8
Dienstaq
Datenbankmigration durchgeführt      8
Mittwoch
Berufsschule
Donnerstag, 06.08. Ticket 4711 analysiert
- Fehler behoben                     8
Freitag
Dokumentation erweitert              4
Datum, Unterschrift Auszubildende/r`;

const v = W.mwlFotoParse(ocr);
eq('Zeitraum von', v.dateFrom, '2026-08-03');
eq('Zeitraum bis', v.dateTo, '2026-08-07');
eq('Kalenderwoche', v.week, 32);
eq('alle fünf Tage gefunden', v.gefundeneTage, 5);

eq('Montag Zeile 1', v.dailyActivities.monday.split('\n')[0], 'Testumgebung aufgesetzt');
eq('Montag Zeile 2', v.dailyActivities.monday.split('\n')[1], 'Docker-Compose angepasst');
eq('Montag Stunden', v.dailyHours.monday, 8);
eq('verlesener Dienstag trotzdem zugeordnet', v.dailyActivities.tuesday, 'Datenbankmigration durchgeführt');
eq('Mittwoch', v.dailyActivities.wednesday, 'Berufsschule');
// "Donnerstag, 06.08. Ticket 4711 …" — der Inhalt steht in derselben Zeile
// wie der Tagesname und darf nicht mit ihm verschluckt werden.
check('Inhalt hinter dem Tagesnamen bleibt erhalten',
    v.dailyActivities.thursday.startsWith('Ticket 4711 analysiert'), v.dailyActivities.thursday);
eq('Donnerstag zweite Zeile', v.dailyActivities.thursday.split('\n')[1], 'Fehler behoben');
eq('Freitag Stunden', v.dailyHours.friday, 4);

console.log('\nFormularrahmen fliegt raus');
const alles = Object.values(v.dailyActivities).join('\n');
['Ausbildungsnachweis', 'Name des/der', 'Unterschrift', 'Betriebliche Tätigkeiten', 'Ausbildungswoche']
    .forEach(w => check(`„${w}" steht nicht im Bericht`, !alles.includes(w), alles.slice(0, 80)));

// Kopfzeilen VOR dem ersten Wochentag duerfen ohnehin nicht landen.
check('Name des Azubis ist nirgends gelandet', !alles.includes('Max Mustermann'), alles);

console.log('\nUnbrauchbares Foto');
const leer = W.mwlFotoParse('~~~ ### ??? \n \n 123');
eq('kein Tag gefunden', leer.gefundeneTage, 0);
eq('kein Datum erfunden', leer.dateFrom, null);
eq('keine Woche erfunden', leer.week, null);
check('alle Tagesfelder leer', Object.values(leer.dailyActivities).every(t => t === ''));

console.log('\nNur ein Tag auf dem Bild');
const einer = W.mwlFotoParse('Freitag\nInventur unterstützt\nLager aufgeräumt');
eq('ein Tag', einer.gefundeneTage, 1);
eq('Inhalt am richtigen Tag', einer.dailyActivities.friday, 'Inventur unterstützt\nLager aufgeräumt');
eq('andere Tage bleiben leer', einer.dailyActivities.monday, '');

console.log(fails ? `\n${fails} Pruefung(en) fehlgeschlagen\n` : '\nAlle Pruefungen bestanden\n');
process.exit(fails ? 1 : 0);
