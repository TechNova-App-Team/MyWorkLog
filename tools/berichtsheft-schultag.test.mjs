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

import { ladeEngine, pruefrahmen, quelltext, funktion, ohneKommentare } from './berichtsheft-laden.mjs';

const { gruppe, ok, abschluss } = pruefrahmen();

// ═══════════════════════════════════════════════════════════════════════
// 1. Cloud-Pfad: die Einstellung des Nutzers gewinnt gegen die Antwort
// ═══════════════════════════════════════════════════════════════════════

// Die Attrappe antwortet im Gemini-Umschlag; so kommt sie auch vom Worker zurueck.
let fetchAntwort = null;
function antwortMit(daysData) {
    fetchAntwort = { candidates: [{ content: { parts: [{ text: JSON.stringify(daysData) }] } }] };
}

const E = ladeEngine({
    fetchImpl: async () => ({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => fetchAntwort,
        text: async () => JSON.stringify(fetchAntwort),
    }),
});

const X = {
    ...E.CLOUD,          // generateWithCloud, _buildCloudPrompt, CLOUD_FORM
    ...E.intern,         // generateDayEntries
    PROFESSIONS: E.BERUFE.PROFESSIONS,
    // Die Zielsprache haengt an document.documentElement.lang; der Sprachtest
    // unten schaltet sie um.
    doc: E.sandbox.document,
};

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

const fillForm = ohneKommentare(funktion('ais-studio.js', '_doFillForm'));
const fillDay = ohneKommentare(funktion('ais-studio.js', '_fillSingleDay'));
const tagesmodus = ohneKommentare(quelltext('bh-tagesmodus.js'));

ok(/daily_school_\$\{day\.index\}/.test(fillForm) && /\.checked = !!day\.isSchoolDay/.test(fillForm),
    '_doFillForm hakt daily_school_<i> nach day.isSchoolDay an');
ok(/daily_school_\$\{dayIndex\}/.test(fillDay) && /\.checked = !!dayData\.isSchoolDay/.test(fillDay),
    '_fillSingleDay tut dasselbe für den Einzeltag');
// Gegenprobe: die Schalter-Id existiert ueberhaupt im Markup, sonst haken die
// Zeilen oben ins Leere — genau die Falle aus CLAUDE.md ("KEIN ELEMENT").
ok(tagesmodus.includes('id="daily_school_${i}"'),
    'renderDailyFields legt daily_school_<i> wirklich an');
ok(/function toggleSchoolDay\(/.test(tagesmodus),
    'toggleSchoolDay existiert (die Klasse is-school-day kommt von dort)');

gruppe('Das ausgeblendete Wochenfeld schreibt nichts mehr in den Bericht');

ok(!fillForm.includes('reportSchool'),
    '_doFillForm fasst #reportSchool nicht mehr an');
// Gegenprobe: das Feld ist im Tagesmodus wirklich ausgeblendet — nur deshalb ist
// ein Schreibzugriff dort ein Fehler.
ok(/schoolGroup\.style\.display = 'none'/.test(tagesmodus),
    'setMode blendet #schoolFieldGroup im Tagesmodus wirklich aus');

const saveReport = ohneKommentare(funktion('bh-bericht.js', 'saveReport'));
ok(/school: currentMode === 'daily' \? '' :/.test(saveReport),
    'saveReport übernimmt das Wochenfeld nur im Wochenmodus');
ok(/dailySchool: dailySchool/.test(saveReport),
    'die Schultage je Tag landen weiterhin im Bericht');

gruppe('Entwurf verliert die Schultage nicht');

const draft = ohneKommentare(funktion('bh-ui-helfer.js', 'saveDraft'));
const restore = ohneKommentare(funktion('bh-ui-helfer.js', 'restoreDraft'));
ok(/dailySchool: currentMode === 'daily' \? getDailySchoolFromForm\(\) : null/.test(draft),
    'saveDraft sichert die Schultag-Schalter');
ok(/setDailyFieldsFromData\(draft\.dailyActivities, draft\.dailyHours, draft\.dailySchool\)/.test(restore),
    'restoreDraft gibt sie an setDailyFieldsFromData weiter');
// Gegenprobe: setDailyFieldsFromData wertet das dritte Argument auch aus.
const setFields = ohneKommentare(funktion('bh-tagesmodus.js', 'setDailyFieldsFromData'));
ok(/dailySchool\[day\.key\]/.test(setFields) && /toggleSchoolDay\(cb\)/.test(setFields),
    'setDailyFieldsFromData hakt die Schalter an und aktualisiert die Optik');

gruppe('Der Einfüge-Weg erzwingt wirklich den Tagesmodus');
const ensure = ohneKommentare(funktion('ais-studio.js', '_ensureModalDailyMode'));
ok(/if \(currentMode !== 'daily'\) setMode\('daily'\)/.test(ensure),
    'die Funktion hält, was ihr Name verspricht');

gruppe('Der Prompt legt die Sprache fest');
// 🔴 Ohne diese Angabe hat ein freies Modell einen deutschen Wochenplan wortweise
// ins Englische uebersetzt und einen englischen Ausbildungsnachweis geliefert —
// ein Dokument nach §14 BBiG, das in dieser Form wertlos ist. Der Prompt war
// komplett auf Deutsch; das allein reicht nachweislich nicht.
const pDe = X._buildCloudPrompt('sysadmin', { ...BASIS });
ok(pDe.includes('[SPRACHE'), 'es gibt überhaupt einen Sprachblock');
ok(/entries-Eintrag und jedes schoolTopic ist auf DEUTSCH/.test(pDe),
    'auf der deutschen Seite steht DEUTSCH im Prompt');
ok(!/ist auf ENGLISCH/.test(pDe), 'und nicht gleichzeitig ENGLISCH');

// Jede Schreibform muss die Sprache mitbekommen — der gemeldete Fall lief über
// "stichpunkte", und genau diese Form nannte vorher als einzige gar keine.
for (const form of ['stichpunkte', 'saetze', 'ichform', 'fliesstext']) {
    const p = X._buildCloudPrompt('sysadmin', { ...BASIS, form });
    ok(/ist auf DEUTSCH/.test(p), `Schreibform "${form}" bekommt die Sprache mit`);
}
// Gegenprobe: der alte Widerspruch ist weg. "vollständiger deutscher Satz" stand
// fest in der Satz-Form und haette auf /en/ gegen den Sprachblock gearbeitet.
ok(!/vollständiger deutscher Satz/.test(X._buildCloudPrompt('sysadmin', { ...BASIS, form: 'saetze' })),
    'die Satz-Form schreibt die Sprache nicht mehr selbst fest');

// Der Wortlaut des Users darf nicht übersetzt werden — auch nicht innerhalb
// derselben Sprache umgedeutet ("Active Directory" bleibt stehen).
ok(/Übersetze es NIEMALS/.test(pDe), 'der Prompt verbietet das Übersetzen der Nutzer-Vorgaben');

// Auf /en/ dreht sich die Sprache, der day-Schlüssel aber NICHT: er wird gegen
// die deutsche Namensliste aufgelöst.
X.doc.documentElement.lang = 'en';
const pEn = X._buildCloudPrompt('sysadmin', { ...BASIS });
X.doc.documentElement.lang = 'de';
ok(/ist auf ENGLISCH/.test(pEn), 'auf /en/ steht ENGLISCH im Prompt');
ok(/"day" bleibt trotzdem der deutsche Wochentagsname/.test(pEn),
    'der day-Schlüssel bleibt deutsch — sonst findet der Parser den Tag nicht');

gruppe('Englischer Wochentagsname wirft den Tag nicht weg');
// Der Selbstschuss, der ohne diese Zeile entstuende: sobald der Prompt "antworte
// auf ENGLISCH" sagt, liefert ein Modell irgendwann auch "Monday" im day-Feld.
// DAY_NAMES.indexOf('Monday') ist -1 — der Tag waere still verschwunden und
// lokal nachgefuellt worden. Aus einem Sprachfehler waere Datenverlust geworden.
antwortMit([
    { day: 'Monday', entries: ['Switches getauscht'], hours: 8, isSchoolDay: false, schoolTopic: null },
    { day: 'Tuesday', entries: ['Tickets bearbeitet'], hours: 8, isSchoolDay: false, schoolTopic: null },
]);
const wEn = await X.generateWithCloud('sysadmin', {
    ...BASIS, selectedDays: [0, 1], schoolDayIndices: [],
});
ok(wEn.days.length === 2, 'beide Tage kommen an', JSON.stringify(wEn.days.map(d => d.name)));
ok(wEn.days.some(d => d.index === 0 && d.entries.join().includes('Switches')),
    '"Monday" landet auf Montag', JSON.stringify(wEn.days.find(d => d.index === 0)));
ok(wEn.source === 'cloud', 'nichts musste lokal nachgefüllt werden', wEn.source);

// Gegenprobe: ein echter Unsinns-Tagesname wird weiterhin verworfen, sonst
// prueft die Zeile oben nur, dass irgendetwas durchkommt. Bleibt danach kein
// gueltiger Tag uebrig, ist das ein Fehler und keine leere Woche — der Aufrufer
// faellt dann auf die lokale Engine zurueck, statt dem Nutzer nichts zu zeigen.
antwortMit([{ day: 'Blursday', entries: ['x y z'], hours: 8, isSchoolDay: false, schoolTopic: null }]);
let muellFehler = null;
try {
    await X.generateWithCloud('sysadmin', { ...BASIS, selectedDays: [0], schoolDayIndices: [] });
} catch (e) { muellFehler = e.message; }
ok(muellFehler !== null, 'ein unbekannter Tagesname wird nicht geraten', 'kein Fehler geworfen');
ok(/Keine gültigen Tage/.test(muellFehler || ''),
    'und der Fehler sagt, was los ist', String(muellFehler));

abschluss('Berufsschultage');
