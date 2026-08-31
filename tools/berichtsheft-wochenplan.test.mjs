// Der Wochenplan aus dem Freitext ("Mo: … Di: … Fr: Berufsschule").
//
// Gemeldet am 2026-08-31 mit einem vollstaendigen Beispiel: fuenf Tage sauber
// beschrieben, und im Bericht stand davon NICHTS — fuenf Tage generischer
// Fuelltext, dazu der Schultag auf dem falschen Tag. Ursache war nicht ein
// Fehler, sondern eine Entwurfsentscheidung: `_customContextEntries()` liess nur
// zwoelf Buero-Begriffe durch (Rechnung, Lieferschein, Lager, Kunde …) und
// verwarf den Rest per `return null`. Gemessen am gemeldeten Text: 8 Fragmente
// rein, 0 raus. Fuer jeden Beruf ausserhalb von Buero und Handel war das Feld
// damit tot — ohne Meldung, ohne Log, und im Screenshot sieht eine generierte
// Woche genauso aus wie eine echte.
//
// Die Tagesmarken wiederum konnte nur der Cloud-Prompt lesen; lokal wurde der
// Text auf zwei ZUFAELLIGE Tage gestreut.
//
// Der Test faehrt die echte `generateWeek()` in einem vm-Kontext. Jede
// Negativ-Pruefung traegt eine Gegenprobe, damit ein leerer Lauf nicht als
// bestanden durchgeht.

import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

// Zeilenenden vereinheitlichen: git liefert die Datei je nach autocrlf mit CRLF
// aus, und die mehrzeiligen Marker unten wuerden dann keinen Treffer finden —
// der Test faellt aus, ohne dass am Code etwas falsch ist.
const HTML = readFileSync(new URL('../pages/berichtsheft/index.html', import.meta.url), 'utf8')
    .split('\r\n').join('\n');

let bestanden = 0, fehlgeschlagen = 0;
const gruppe = (t) => console.log('\n▶ ' + t);
function ok(bed, name, detail) {
    if (bed) { bestanden++; console.log('  ok    ' + name); }
    else { fehlgeschlagen++; console.log('  FEHL  ' + name + (detail ? '\n        ' + detail : '')); }
}

function schnitt(startMarker, endMarker) {
    const i = HTML.indexOf(startMarker);
    if (i < 0) throw new Error('Marker nicht gefunden: ' + startMarker);
    const j = HTML.indexOf(endMarker, i);
    if (j < 0) throw new Error('Endmarker nicht gefunden: ' + endMarker);
    return HTML.slice(i, j);
}

const src = [
    schnitt('const PROFESSIONS = {', '            function getCalendarWeek() {'),
    schnitt('function _kontextTemplate(kw) {', '            function _saveProfile() {'),
].join('\n');

const vorspann = `
    const DAY_STATUS_LABELS = { krank: { short: 'Krank' }, urlaub: { short: 'Urlaub' }, feiertag: { short: 'Feiertag' } };
    const AI_BRAIN = { universalVerbs: ['durchführen', 'bearbeiten', 'vorbereiten', 'kontrollieren', 'dokumentieren'] };
    const state = { customProfession: '', usedPhrases: new Set(), dayStatus: {}, useAufgaben: false, useTracking: false };
    const localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    function bhIcon() { return ''; }
    function _trackingHoursForDay() { return 0; }
    function _loadAufgabenForWeek() { return null; }
    function _buildTrackingPayload() { return null; }
    function getCalendarWeek() { return 35; }
`;

const ctx = createContext({ console });
runInContext(
    vorspann + src +
    '\n;globalThis.__x = { _parseWochenplan, _planStuecke, _planEintrag, generateWeek, _customContextEntries, _kontextTemplate };',
    ctx
);
const X = ctx.__x;

// Der gemeldete Text, unveraendert.
const PROMPT = 'Mo: alte pcs abgebaut, 3 neue aufgebaut und windows 11 draufgemacht. '
    + 'Di: support tickets abgearbeitet, viel passwort resets und active directory zeug. '
    + 'Mi: server updates bei ein paar linux kisten gemacht. '
    + 'Do: neues backup konzept für abteilung x eingerichtet und getestet. '
    + 'Fr: berufsschule, thema subnetting und vlan.';

// ═══════════════════════════════════════════════════════════════════════
gruppe('Der gemeldete Text wird Tag für Tag zugeordnet');

const plan = X._parseWochenplan(PROMPT);
ok(Object.keys(plan.perDay).length === 5, 'alle fünf Tage erkannt',
    JSON.stringify(Object.keys(plan.perDay)));
ok((plan.perDay[0] || []).join(' | ').includes('alte pcs abgebaut'),
    'Montag trägt den Montags-Text', JSON.stringify(plan.perDay[0]));
ok((plan.perDay[1] || []).join(' | ').includes('support tickets abgearbeitet'),
    'Dienstag trägt den Dienstags-Text', JSON.stringify(plan.perDay[1]));
ok((plan.perDay[2] || []).join(' | ').includes('linux kisten'),
    'Mittwoch trägt den Mittwochs-Text', JSON.stringify(plan.perDay[2]));
ok((plan.perDay[3] || []).join(' | ').includes('backup konzept'),
    'Donnerstag trägt den Donnerstags-Text', JSON.stringify(plan.perDay[3]));
ok(plan.schoolDays.join() === '4', 'Freitag ist der Schultag — nicht Donnerstag',
    JSON.stringify(plan.schoolDays));
ok((plan.perDay[4] || []).join(' ').includes('subnetting'),
    'das genannte Fach bleibt erhalten', JSON.stringify(plan.perDay[4]));

// "eingerichtet und getestet" darf nicht zerfallen — "getestet" allein waere ein
// Eintrag, der nichts sagt. Genau daran ist die alte Zerlegung gescheitert.
ok(!(plan.perDay[3] || []).includes('getestet'),
    '"und" zerreißt keinen Satz', JSON.stringify(plan.perDay[3]));

gruppe('Keine falschen Tagesmarken');
// Kuerzel nur als ganzes Wort — sonst wird aus "Montage" ein Montag und aus
// "Die Server" ein Dienstag. Dieselbe Falle wie bei den Kuerzeln im Import.
const falle = [
    ['Montage der Anlage vorbereitet', 'Montage ist kein Montag'],
    ['Die Server wurden geprüft. Mit dem Team besprochen', '"Die"/"Mit" sind keine Wochentage'],
    ['Doku ergänzt. Mittel bestellt', '"Doku"/"Mittel" sind keine Wochentage'],
];
for (const [text, name] of falle) {
    const r = X._parseWochenplan(text);
    ok(Object.keys(r.perDay).length === 0, name, JSON.stringify(r.perDay));
}
// Gegenprobe: die Marken werden ueberhaupt erkannt, sonst prueft die Schleife nichts.
ok(Object.keys(X._parseWochenplan('Mo: etwas getan').perDay).length === 1,
    'es gibt überhaupt erkennbare Marken (sonst ist die Prüfung oben leer)');

ok(!X._parseWochenplan('Schulung zu Arbeitssicherheit besucht').schoolDays.length,
    '"Schulung" macht keinen Berufsschultag');
ok(X._parseWochenplan('Do: Berufsschule').schoolDays.join() === '3',
    'Gegenprobe: "Berufsschule" schon');
ok(X._parseWochenplan('Do: berufschule thema datenbanken').schoolDays.join() === '3',
    'auch mit dem häufigen Tippfehler "Berufschule"');

gruppe('Englisch (die Seite gibt es unter /en/)');
const en = X._parseWochenplan('Monday: replaced switches. Friday: vocational school, topic routing');
ok((en.perDay[0] || []).join().includes('replaced switches'), 'Monday wird erkannt');
ok(en.schoolDays.join() === '4', 'vocational school setzt den Schultag',
    JSON.stringify(en.schoolDays));

// ═══════════════════════════════════════════════════════════════════════
gruppe('Die fertige Woche trägt den Text des Nutzers');

const woche = X.generateWeek('sysadmin', {
    yearNum: 2, umfang: 'mittel', form: 'stichpunkte',
    selectedDays: [0, 1, 2, 3, 4], schoolDayIndices: [4],
    department: 'IT', calendarWeek: 35, customPrompt: PROMPT,
});
const tag = (i) => woche.days.find(d => d.index === i);
const textVon = (i) => (tag(i)?.entries || []).join(' | ').toLowerCase();

ok(textVon(0).includes('alte pcs abgebaut'), 'Montag im Bericht: "alte pcs abgebaut"', textVon(0));
ok(textVon(1).includes('support tickets'), 'Dienstag im Bericht: "support tickets"', textVon(1));
ok(textVon(2).includes('linux kisten'), 'Mittwoch im Bericht: "linux kisten"', textVon(2));
ok(textVon(3).includes('backup konzept'), 'Donnerstag im Bericht: "backup konzept"', textVon(3));

ok(tag(4)?.isSchoolDay === true, 'Freitag ist Berufsschule');
ok(tag(0)?.isSchoolDay === false && tag(3)?.isSchoolDay === false,
    'kein anderer Tag ist Berufsschule');
ok(String(tag(4)?.schoolTopic || '').toLowerCase().includes('subnetting'),
    'das Fach ist das genannte, kein gewürfeltes', JSON.stringify(tag(4)?.schoolTopic));

// Der Text steht als ERSTER Eintrag — er ist die Ansage des Nutzers, nicht Beiwerk.
ok((tag(0)?.entries || [])[0]?.toLowerCase().includes('alte pcs'),
    'die eigene Angabe steht oben', JSON.stringify((tag(0)?.entries || [])[0]));

// Grossschreibung: "• alte pcs abgebaut" saehe im IHK-Heft nach Versehen aus.
ok(/^• [A-ZÄÖÜ0-9]/.test((tag(0)?.entries || [])[0] || ''),
    'der Stichpunkt beginnt groß', JSON.stringify((tag(0)?.entries || [])[0]));

// Aber der Wortlaut bleibt: kein "bearbeitet und dokumentiert" drangehaengt.
ok(!textVon(0).includes('bearbeitet und dokumentiert'),
    'nichts wird an den Wortlaut angehängt', textVon(0));

// Gegenprobe: die Tage sind trotzdem voll — der Plan ersetzt die Engine nicht,
// er steht vor ihr. Sonst haette ein Tag mit einem Stichwort nur einen Eintrag.
const zuDuenn = woche.days.filter(d => d.entries.length < 3).map(d => d.name);
ok(zuDuenn.length === 0, 'jeder Tag hat mindestens drei Einträge', zuDuenn.join(', '));

gruppe('Ohne Wochenplan bleibt alles wie vorher');
const ohne = X.generateWeek('sysadmin', {
    yearNum: 2, umfang: 'mittel', form: 'stichpunkte',
    selectedDays: [0, 1, 2, 3, 4], schoolDayIndices: [], department: '', customPrompt: '',
});
ok(ohne.days.length === 5, 'fünf Tage');
ok(ohne.days.every(d => d.entries.length >= 3), 'alle gefüllt');
ok(ohne.days.every(d => d.isSchoolDay === false), 'kein Schultag ohne Auswahl');

// ═══════════════════════════════════════════════════════════════════════
gruppe('Text ohne Tagesmarke wird nicht mehr verworfen');

const frei = X._customContextEntries('server updates bei ein paar linux kisten gemacht', '');
ok(frei.length > 0, 'unbekannter Fachtext kommt durch', JSON.stringify(frei));
ok(frei.join(' ').toLowerCase().includes('linux kisten'), 'und zwar wörtlich', JSON.stringify(frei));

// Gegenprobe 1: die bekannten Begriffe bekommen weiterhin ihre fertige Formulierung.
const bekannt = X._customContextEntries('rechnungen geprüft', '');
ok(bekannt.join(' ').includes('Rechnungen kontrolliert und gebucht'),
    'bekannte Begriffe behalten ihre IHK-Formulierung', JSON.stringify(bekannt));

// Gegenprobe 2: die Abteilung ist ein ORT, keine Taetigkeit — sie darf nicht als
// "• Frontend-Team" im Heft landen.
const abt = X._customContextEntries('', 'Frontend-Team');
ok(abt.length === 0, 'die Abteilung wird kein Stichpunkt', JSON.stringify(abt));
ok(X._customContextEntries('', 'Lagerlogistik').length === 1,
    'Gegenprobe: eine Abteilung mit bekanntem Begriff schon');

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen`);
process.exit(fehlgeschlagen > 0 ? 1 : 0);
