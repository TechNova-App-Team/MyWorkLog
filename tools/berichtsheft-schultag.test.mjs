// Berufsschultage im Berichtsheft-Generator.
//
// Der Nutzer legt in den Einstellungen fest, welche Wochentage Berufsschule sind.
// Diese Angabe ist auf drei Wegen verlorengegangen, alle drei ohne Fehlermeldung:
//
//   1. Die Cloud-KI hat sich nicht daran gehalten — isSchoolDay:false auf einem
//      gewaehlten Tag, dazu Betriebs-Taetigkeiten im Text. Der Code hat die Antwort
//      ungeprueft uebernommen (`isSchoolDay: !!dayData.isSchoolDay`), der Tag stand
//      danach als normaler Arbeitstag da.
//   2. `_doFillForm()` hat den Schalter `daily_school_<i>` nie gesetzt. Im Bericht
//      sah der Schultag deshalb aus wie jeder andere Tag.
//   3. Stattdessen landete das Schulfach im WOECHENTLICHEN Feld `#reportSchool`,
//      das im Tagesmodus per setMode() ausgeblendet ist — Ergebnis war ein Block
//      "Berufsschule" mit einem einzelnen Satz unter dem Bericht, den im Formular
//      niemand sehen oder aendern konnte.
//
// Punkt 1 laeuft hier echt: generateWithCloud() wird in einem vm-Kontext mit einer
// fetch-Attrappe aufgerufen, die absichtlich eine Antwort liefert, die die
// Schultag-Vorgabe verletzt. Punkt 2 und 3 sind Quelltext-Behauptungen; sie tragen
// jeweils eine Gegenprobe, damit ein leerer Lauf nicht als bestanden durchgeht.

import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

const HTML = readFileSync(new URL('../pages/berichtsheft/index.html', import.meta.url), 'utf8');

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

// ── Kommentare strippen, bevor irgendetwas ueber den Quelltext behauptet wird ──
// Die Dateikoepfe hier erklaeren ausdruecklich, was NICHT mehr drinsteht. Ein
// Test auf den Wortlaut wuerde sonst seine eigene Erklaerung finden.
function ohneKommentare(js) {
    return js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

// ═══════════════════════════════════════════════════════════════════════
// 1. Cloud-Pfad: die Einstellung des Nutzers gewinnt gegen die Antwort
// ═══════════════════════════════════════════════════════════════════════

const src = [
    schnitt('const PROFESSIONS = {', '// ═══════════════════════════════════════\n            // FULL WEEK GENERATION'),
    schnitt('const CLOUD_FORM = {', '// ═══════════════════════════════════════\n            // GENERATE-BUTTON PROGRESS-UI'),
].join('\n');

// Was der Ausschnitt nicht mitbringt. Bewusst duenn: alles, was der Schultag-Pfad
// wirklich braucht, soll aus der Quelle kommen und nicht aus einer Attrappe.
const vorspann = `
    const DAY_STATUS_LABELS = { krank: { short: 'Krank' }, urlaub: { short: 'Urlaub' }, feiertag: { short: 'Feiertag' } };
    const AI_BRAIN = { universalVerbs: ['durchführen', 'bearbeiten', 'vorbereiten', 'kontrollieren', 'dokumentieren'] };
    const CLOUD_PROXY = 'https://example.invalid';
    const RATE_LIMIT_STORAGE_KEY = 'rl';
    const RATE_LIMIT_DAILY = 20;
    const state = { customProfession: '', usedPhrases: new Set(), dayStatus: {} };
    const localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    function bhIcon() { return ''; }
    function getCalendarWeek() { return 35; }
    function _trackingHoursForDay() { return 0; }
    function _loadAufgabenForWeek() { return null; }
    function _buildTrackingPayload() { return null; }
    function _customContextEntries() { return []; }
    function showToast() {}
    function _updateRateLimitUI() {}
    globalThis.__fetchAntwort = null;
    async function fetch() {
        return {
            ok: true,
            status: 200,
            headers: { get: () => null },
            json: async () => globalThis.__fetchAntwort,
            text: async () => JSON.stringify(globalThis.__fetchAntwort),
        };
    }
`;

const ctx = createContext({ console });
runInContext(
    vorspann + src +
    '\n;globalThis.__x = { generateWithCloud, generateDayEntries, CLOUD_FORM, _buildCloudPrompt, PROFESSIONS };',
    ctx
);
const X = ctx.__x;

// Die Attrappe antwortet im Gemini-Umschlag; so kommt sie auch vom Worker zurueck.
function antwortMit(daysData) {
    ctx.__fetchAntwort = {
        candidates: [{ content: { parts: [{ text: JSON.stringify(daysData) }] } }],
    };
}

const BASIS = {
    yearNum: 2,
    umfang: 'mittel',
    form: 'stichpunkte',
    selectedDays: [0, 1, 2, 3, 4],
    schoolDayIndices: [3, 4],          // Donnerstag + Freitag, wie in der Meldung
    department: 'IT',
    calendarWeek: 35,
    customPrompt: '',
    dayStatus: {},
};

const BETRIEB = ['Serverschrank verkabelt', 'Netzwerkdose gepatcht', 'Störungsmeldung dokumentiert'];

gruppe('Cloud-KI ignoriert die Schultag-Vorgabe');

// Genau der gemeldete Fall: das Modell liefert fuenf ganz normale Betriebstage.
antwortMit([0, 1, 2, 3, 4].map(i => ({
    day: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'][i],
    entries: [...BETRIEB],
    hours: 8,
    isSchoolDay: false,
    schoolTopic: null,
})));

const woche = await X.generateWithCloud('sysadmin', { ...BASIS });
const tag = (i) => woche.days.find(d => d.index === i);

ok(woche.days.length === 5, 'alle fünf Tage kommen zurück', 'sind ' + woche.days.length);
ok(tag(3) && tag(3).isSchoolDay === true, 'Donnerstag ist Schultag, obwohl das Modell false lieferte');
ok(tag(4) && tag(4).isSchoolDay === true, 'Freitag ist Schultag, obwohl das Modell false lieferte');
ok(tag(0) && tag(0).isSchoolDay === false, 'Montag bleibt Betriebstag');

ok(!!(tag(3) && tag(3).schoolTopic), 'der Schultag trägt ein Fach', JSON.stringify(tag(3)?.schoolTopic));
ok(tag(3) && tag(4) && tag(3).schoolTopic !== null && tag(4).schoolTopic !== null,
    'beide Schultage tragen ein Fach');

// Der gelieferte Betriebstext darf an einem Schultag nicht stehenbleiben — sonst
// stuende "Netzwerkdose gepatcht" unter der Ueberschrift Berufsschule.
const schulText = [...(tag(3)?.entries || []), ...(tag(4)?.entries || [])].join(' ');
ok(!BETRIEB.some(e => schulText.includes(e)),
    'der Betriebstext des Modells steht nicht mehr im Schultag', schulText);
ok(/Berufsschul|Unterricht|Lernstoff|Klassenarbeit|Übungsaufgaben|Schulheft|Mitschül/i.test(schulText),
    'der Schultag trägt Unterrichtsinhalte', schulText);

// Gegenprobe: der Betriebstext MUSS an den Betriebstagen ankommen, sonst prüft
// die Zeile darüber nur einen leeren Tag.
const betriebText = [...(tag(0)?.entries || []), ...(tag(1)?.entries || [])].join(' ');
ok(BETRIEB.some(e => betriebText.includes(e)),
    'an Betriebstagen bleibt der Text der Cloud-KI stehen', betriebText);

ok(woche.source === 'cloud+local',
    'die Quellenangabe behauptet nicht "Cloud KI", wo lokaler Text steht', woche.source);

gruppe('Cloud-KI erfindet einen Schultag, den niemand gewählt hat');

antwortMit([0, 1, 2, 3, 4].map(i => ({
    day: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'][i],
    entries: i === 1 ? ['Netzwerktechnik im Unterricht behandelt'] : [...BETRIEB],
    hours: 8,
    isSchoolDay: i === 1,
    schoolTopic: i === 1 ? 'Netzwerktechnik' : null,
})));

const woche2 = await X.generateWithCloud('sysadmin', { ...BASIS, schoolDayIndices: [] });
ok(woche2.days.every(d => d.isSchoolDay === false),
    'kein Tag ist Schultag, wenn keiner gewählt wurde',
    JSON.stringify(woche2.days.map(d => [d.name, d.isSchoolDay])));
ok(woche2.days.every(d => d.schoolTopic === null), 'kein Tag trägt ein Fach');
const di = woche2.days.find(d => d.index === 1);
ok(di && !di.entries.join(' ').includes('im Unterricht behandelt'),
    'der erfundene Unterrichtstext wurde ersetzt', JSON.stringify(di?.entries));

gruppe('Modell liefert Schulstoff, vergisst nur das Flag');

antwortMit([3].map(() => ({
    day: 'Donnerstag',
    entries: ['Lernfeld 7 im Unterricht behandelt', 'Übungsaufgaben zur Subnetzberechnung bearbeitet'],
    hours: 8,
    isSchoolDay: false,          // Flag fehlt …
    schoolTopic: 'Netzwerktechnik', // … aber das Fach steht da
})));

const woche3 = await X.generateWithCloud('sysadmin', {
    ...BASIS, selectedDays: [3], schoolDayIndices: [3],
});
const nur = woche3.days[0];
ok(nur && nur.isSchoolDay === true, 'der Tag gilt als Schultag');
ok(nur && nur.entries.join(' ').includes('Lernfeld 7'),
    'guter Schultext bleibt erhalten statt lokal überschrieben zu werden',
    JSON.stringify(nur?.entries));
ok(nur && nur.schoolTopic === 'Netzwerktechnik', 'das Fach des Modells bleibt stehen');

gruppe('Eigener Beruf (Freitext) verliert seine Schultage nicht');
// PROFESSIONS kennt nur die 20 vorgegebenen Berufe. Wer im Profil einen eigenen
// eintraegt, lief frueher in generateGenericDayEntries() — und die Funktion kennt
// keinen Schultag. Ergebnis waren allgemeine Betriebs-Floskeln an einem Tag, der
// laut Einstellung Berufsschule war, und isSchoolDay:false obendrein.
const eigenSchule = X.generateDayEntries('bestatterin', {
    yearNum: 2, umfang: 'mittel', form: 'stichpunkte', dayIndex: 3,
    isSchoolDay: true, excludePhrases: [],
});
ok(X.PROFESSIONS['bestatterin'] === undefined,
    'der Testberuf steht wirklich nicht in PROFESSIONS');
ok(eigenSchule.isSchoolDay === true, 'der Tag kommt als Schultag zurück');
ok(!!eigenSchule.schoolTopic, 'er trägt ein Fach', JSON.stringify(eigenSchule.schoolTopic));
ok(/Berufsschul|Unterricht|Lernstoff|Klassenarbeit|Übungsaufgaben|Schulheft|Mitschül/i
    .test(eigenSchule.entries.join(' ')),
    'die Einträge handeln von der Schule', eigenSchule.entries.join(' | '));

// Gegenprobe: derselbe Beruf an einem Betriebstag laeuft weiter ueber den
// generischen Pool — sonst prueft die Gruppe oben nur einen kaputten Aufruf.
const eigenBetrieb = X.generateDayEntries('bestatterin', {
    yearNum: 2, umfang: 'mittel', form: 'stichpunkte', dayIndex: 0,
    isSchoolDay: false, excludePhrases: [],
});
ok(eigenBetrieb.isSchoolDay === false, 'ein Betriebstag bleibt ein Betriebstag');
ok(eigenBetrieb.entries.length > 0, 'und ist nicht leer', JSON.stringify(eigenBetrieb.entries));

gruppe('Prompt nennt den Schultag im Beispiel');
// Das JSON-Beispiel wiegt schwerer als jede Regel darueber (siehe Gebiets-Notiz).
// Ohne ein Schultag-Objekt darin richtet sich das Modell nach dem einen Betriebstag.
const prompt = X._buildCloudPrompt('sysadmin', { ...BASIS, selectedDays: [0, 1, 2, 3, 4] });
const beispielBlock = prompt.slice(prompt.indexOf('✓ RICHTIG'), prompt.indexOf('✗ VERBOTEN'));
ok(beispielBlock.includes('"isSchoolDay":true'),
    'das Beispiel enthält ein Schultag-Objekt');
ok(beispielBlock.includes('"day":"Donnerstag"'),
    'das Beispiel benutzt einen wirklich gewählten Schultag');
const promptOhneSchule = X._buildCloudPrompt('sysadmin', { ...BASIS, schoolDayIndices: [] });
ok(!promptOhneSchule.slice(promptOhneSchule.indexOf('✓ RICHTIG'), promptOhneSchule.indexOf('✗ VERBOTEN'))
    .includes('"isSchoolDay":true'),
    'ohne gewählten Schultag steht auch kein Schultag im Beispiel');

// Jede Schreibform braucht ihr eigenes Schultag-Beispiel — sonst faellt der
// Formatblock in dieser Form auf den Betriebs-Beispieltext zurueck.
const ohneSchulBeispiel = Object.entries(X.CLOUD_FORM).filter(([, f]) => !f.schulBeispiel);
ok(ohneSchulBeispiel.length === 0,
    `alle ${Object.keys(X.CLOUD_FORM).length} Schreibformen haben ein Schultag-Beispiel`,
    ohneSchulBeispiel.map(([k]) => k).join(', '));

// ═══════════════════════════════════════════════════════════════════════
// 2. Einfügen ins Berichtsheft: der Schalter je Tag muss mitkommen
// ═══════════════════════════════════════════════════════════════════════

gruppe('Einfügen setzt den Schultag-Schalter des Tages');

const fillForm = ohneKommentare(schnitt('function _doFillForm(week) {', 'function fillSingleDay('));
const fillDay = ohneKommentare(schnitt('function _fillSingleDay(dayData, dayIndex) {', '// ═══════════════════════════════════════\n            // PUBLIC API'));

ok(/daily_school_\$\{day\.index\}/.test(fillForm) && /\.checked = !!day\.isSchoolDay/.test(fillForm),
    '_doFillForm hakt daily_school_<i> nach day.isSchoolDay an');
ok(/daily_school_\$\{dayIndex\}/.test(fillDay) && /\.checked = !!dayData\.isSchoolDay/.test(fillDay),
    '_fillSingleDay tut dasselbe für den Einzeltag');
// Gegenprobe: die Schalter-Id existiert ueberhaupt im Markup, sonst haken die
// Zeilen oben ins Leere — genau die Falle aus CLAUDE.md ("KEIN ELEMENT").
ok(HTML.includes('id="daily_school_${i}"'),
    'renderDailyFields legt daily_school_<i> wirklich an');
ok(/function toggleSchoolDay\(/.test(HTML),
    'toggleSchoolDay existiert (die Klasse is-school-day kommt von dort)');

gruppe('Das ausgeblendete Wochenfeld schreibt nichts mehr in den Bericht');

ok(!fillForm.includes('reportSchool'),
    '_doFillForm fasst #reportSchool nicht mehr an');
// Gegenprobe: das Feld ist im Tagesmodus wirklich ausgeblendet — nur deshalb ist
// ein Schreibzugriff dort ein Fehler.
ok(/schoolGroup\.style\.display = 'none'/.test(ohneKommentare(HTML)),
    'setMode blendet #schoolFieldGroup im Tagesmodus wirklich aus');

const saveReport = ohneKommentare(schnitt('function saveReport(event) {', 'function editReport('));
ok(/school: currentMode === 'daily' \? '' :/.test(saveReport),
    'saveReport übernimmt das Wochenfeld nur im Wochenmodus');
ok(/dailySchool: dailySchool/.test(saveReport),
    'die Schultage je Tag landen weiterhin im Bericht');

gruppe('Entwurf verliert die Schultage nicht');

const draft = ohneKommentare(schnitt('function saveDraft() {', 'function clearDraft()'));
ok(/dailySchool: currentMode === 'daily' \? getDailySchoolFromForm\(\) : null/.test(draft),
    'saveDraft sichert die Schultag-Schalter');
ok(/setDailyFieldsFromData\(draft\.dailyActivities, draft\.dailyHours, draft\.dailySchool\)/.test(draft),
    'restoreDraft gibt sie an setDailyFieldsFromData weiter');
// Gegenprobe: setDailyFieldsFromData wertet das dritte Argument auch aus.
const setFields = ohneKommentare(schnitt('function setDailyFieldsFromData(', 'function combineDailyToWeeklyText'));
ok(/dailySchool\[day\.key\]/.test(setFields) && /toggleSchoolDay\(cb\)/.test(setFields),
    'setDailyFieldsFromData hakt die Schalter an und aktualisiert die Optik');

gruppe('Der Einfüge-Weg erzwingt wirklich den Tagesmodus');
const ensure = ohneKommentare(schnitt('function _ensureModalDailyMode(callback) {', 'function _doFillForm('));
ok(/if \(currentMode !== 'daily'\) setMode\('daily'\)/.test(ensure),
    'die Funktion hält, was ihr Name verspricht');

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen`);
process.exit(fehlgeschlagen > 0 ? 1 : 0);
