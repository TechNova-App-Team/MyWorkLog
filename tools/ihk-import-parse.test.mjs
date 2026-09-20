#!/usr/bin/env node
// ═══ TEST: IHK-PDF-Import — Tages- UND Wochenbasis ═══
//
// Anlass (2026-09-20): der Import las nur Seiten mit „Ausbildungsnachweis auf
// Tagesbasis" und meldete bei einem Wochen-Export „keine auswertbaren
// Tagesberichte" — obwohl das Portal beide Formen anbietet und die Woche
// dieselbe Kopfzeile traegt. Seit v7.4.4 werden Wochenbasis-Seiten als
// Wochenbericht (mode 'weekly') uebernommen.
//
// 🔴 Die Seitentexte hier sind SYNTHETISCH: nach dem Zeilenformat, das der
// Tages-Parser von einem echten Export kennt („Label | Wert | …", pdf.js-Text
// nach Zeilen sortiert), und nach der Feldliste des IHK-Nutzerhandbuchs fuer
// Wochen-Eintraege (Ort: Schule / Betrieb / Unterweisung / Schule/Betrieb,
// Freitext, Anwesenheit je Tag, optional Qualifikation und Ausbildungsstunden).
// Ein echter Wochen-Export lag beim Schreiben nicht vor. Wer einen hat: die
// Seite als Text hier ablegen und die Erwartungen nachschaerfen.
//
// Das Wichtigste, was der Test absichert, ist unabhaengig vom exakten Layout:
// (1) eine Wochenbasis-Seite wird nicht mehr uebersprungen, (2) ihr Text
// kommt vollstaendig an, (3) der Tages-Parser liefert nach dem Umbau exakt
// dasselbe wie vorher (Gegenprobe ueber eine feste Erwartung).
//
// Aufruf: node tools/ihk-import-parse.test.mjs

import { readFileSync } from 'node:fs';

let okCount = 0, fehlerCount = 0;
function ist(bedingung, name, detail = '') {
    if (bedingung) { okCount++; console.log('  ok    ' + name); }
    else { fehlerCount++; console.log('  FEHLT ' + name + (detail ? '   → ' + detail : '')); }
}

const lies = (p) => readFileSync(p, 'utf8').split('\r\n').join('\n');
const basisSrc = lies('Assets/js/berichtsheft/bh-basis.js');
const uebersichtSrc = lies('Assets/js/berichtsheft/bh-uebersicht.js');
const importSrc = lies('Assets/js/berichtsheft/bh-ihk-import.js');
// getWeekNumber (KW) lebt in bh-bericht.js — nur diese eine Funktion holen, die Datei haengt sonst am DOM
const berichtSrc = lies('Assets/js/berichtsheft/bh-bericht.js');
const gwStart = berichtSrc.indexOf('function getWeekNumber(');
const gwEnd = berichtSrc.indexOf(String.fromCharCode(10) + '}' + String.fromCharCode(10), gwStart) + 3;   // erste Zeile, die nur aus } besteht (Einrueckung 0)
const getWeekNumberSrc = berichtSrc.slice(gwStart, gwEnd);

// ── Browser-Attrappe: der Parser fasst am Ende ein paar DOM-Knoten an ──
const localStorageStore = new Map();
globalThis.localStorage = {
    getItem: (k) => localStorageStore.get(k) || null,
    setItem: (k, v) => localStorageStore.set(k, String(v)),
    removeItem: (k) => localStorageStore.delete(k),
};
const fehlerMeldungen = [];
const dummy = () => ({ style: {}, textContent: '', innerHTML: '', classList: { add() {}, remove() {} }, addEventListener() {}, querySelectorAll: () => [], querySelector: () => ({ addEventListener() {} }), appendChild() {} });
globalThis.document = {
    documentElement: { lang: 'de' },
    addEventListener: () => {},
    getElementById: (id) => { const d = dummy(); if (id === 'ihkError') { Object.defineProperty(d, 'textContent', { set(v) { fehlerMeldungen.push(v); }, get() { return ''; } }); } return d; },
    createElement: () => dummy(),
};
globalThis.window = globalThis;
globalThis.setTimeout = () => 0;   // ihkShowResult (DOM) gar nicht erst anstossen
globalThis.L = (de) => de;

const fnCode = `
${basisSrc}
${uebersichtSrc}
${getWeekNumberSrc}
${importSrc}
return {
  parse: (pages) => { ihkParsedWeeks = []; ihkParsedMeta = null; ihkProcessExtractedText(pages); return { weeks: ihkParsedWeeks, meta: ihkParsedMeta }; }
};
`;
const { parse } = new Function(fnCode)();

// ── Seite 1: Deckblatt, wie ihn der Export zeigt (Anleitung der IHK, Screenshot) ──
const DECKBLATT = 'IHK Ausbildungsnachweis | Name, Vorname | Bildungskette, Anna | Geburtstag | 01.01.1980 | Anschrift | Alter Markt 8 | Magdeburg | Ausbildungsberuf | Kaufmann / Kauffrau für Büromanagement | Ausbildungsbetrieb | Industrie- und Handelskammer | Alter Markt 8 | Magdeburg | Ausbildungsbeginn | 01.08.2024 | Ausbildungsende | 31.07.2027 | Exportzeitraum | 15.07.2024 bis 21.06.2026 | Datum des Exports: 17.06.2026';

// ── Tagesbasis-Seite: das Format, das der Parser seit v6.9.7 kennt ──
const TAG_SEITE = 'Ausbildungsnachweis auf Tagesbasis | Status | freigegeben | Ausbildungswoche | 08.09.2025 bis 14.09.2025 | 2. Ausbildungsjahr'
    + ' | Mo | 08.09.2025 | Betrieb | anwesend | 08:00 | • | Kundenanfragen im Ticketsystem bearbeitet | • | Netzwerkdose im Büro 3 geprüft und Patchkabel getauscht | Qualifikationen: | - | Kundenkommunikation'
    + ' | Di | 09.09.2025 | Schule | anwesend | 06:00 | • | Berufsschule: Datenbanken, SQL-Grundlagen | • | Wirtschaftskunde'
    + ' | Mi | 10.09.2025 | Betrieb | anwesend | 08:15 | • | Backup-Konzept dokumentiert'
    + ' | Do | 11.09.2025 | Betrieb | abwesend | 00:00'
    + ' | Fr | 12.09.2025 | Betrieb | anwesend | 07:45 | • | Wochenbericht geschrieben'
    + ' | Dauer gesamt: | 30:00 | Auszubildende/r | Ausbilder | Eingereicht am 14.09.2025 | Seite 6';

// ── Wochenbasis-Seite A: Ort Betrieb, Freitext mit Aufzaehlung, Anwesenheit je Tag, Stunden ──
const WOCHE_SEITE_A = 'Ausbildungsnachweis auf Wochenbasis | Status | freigegeben | Ausbildungswoche | 15.09.2025 bis 21.09.2025 | 2. Ausbildungsjahr | Ort | Betrieb'
    + ' | • | Einarbeitung in das Ticketsystem, erste Kundenanfragen selbstständig beantwortet | • | Mit dem Ausbilder die Netzwerkstruktur des Standorts besprochen | • | Dokumentation der Patchfelder begonnen'
    + ' | Qualifikationen: | - | Kundenkommunikation | - | Netzwerktechnik'
    + ' | Anwesenheit | Mo | 15.09.2025 | anwesend | Di | 16.09.2025 | anwesend | Mi | 17.09.2025 | anwesend | Do | 18.09.2025 | abwesend | Fr | 19.09.2025 | anwesend'
    + ' | Ausbildungsstunden | 32:00 | Auszubildende/r | Ausbilder | Eingereicht am 21.09.2025 | Seite 7';

// ── Wochenbasis-Seite B: Ort Schule/Betrieb — zwei Freitexte, nichts abgezeichnet ──
const WOCHE_SEITE_B = 'Ausbildungsnachweis auf Wochenbasis | Status | eingereicht | Ausbildungswoche | 22.09.2025 bis 28.09.2025 | Ort | Schule/Betrieb'
    + ' | Schule | • | Datenbanken: Normalformen und SQL-Joins | • | Wirtschaft: Kaufvertrag'
    + ' | Betrieb | • | Server-Update auf dem Testsystem eingespielt | • | Monitoring-Alarme ausgewertet'
    + ' | Mo | 22.09.2025 | anwesend | Di | 23.09.2025 | anwesend | Mi | 24.09.2025 | anwesend | Do | 25.09.2025 | anwesend | Fr | 26.09.2025 | anwesend'
    + ' | Dauer gesamt: | 38:30 | Auszubildende/r | Ausbilder | Eingereicht am 28.09.2025 | Seite 8';

// ── Wochenbasis-Seite C: ohne jede Struktur ausser Kopf und Fliesstext (Notnagel: Text darf nicht verloren gehen) ──
const WOCHE_SEITE_C = 'Ausbildungsnachweis auf Wochenbasis | Status | in Bearbeitung | Ausbildungswoche | 29.09.2025 bis 05.10.2025 | Ort | Unterweisung'
    + ' | Sicherheitsunterweisung Elektro, danach Begleitung des Technikers bei drei Kundenterminen. Am Freitag Nachbereitung und Ablage der Protokolle.'
    + ' | Auszubildende/r | Ausbilder | Seite 9';

console.log('\n▶ 1. Tagesbasis: der Parser liefert nach dem Umbau dasselbe wie vorher');
{
    const { weeks, meta } = parse([DECKBLATT, TAG_SEITE]);
    ist(weeks.length === 1, 'eine Woche erkannt', String(weeks.length));
    const w = weeks[0] || {};
    ist(w.mode === 'daily', 'Modus daily', w.mode);
    ist(w.dateFrom === '2025-09-08' && w.dateTo === '2025-09-14', 'Zeitraum', w.dateFrom + '…' + w.dateTo);
    ist(w.week === 37, 'KW 37', String(w.week));
    ist(w.year === 2, 'Ausbildungsjahr aus der Seite (2)', String(w.year));
    ist(w.status === 'signed' && w.ihkSigned === true, 'freigegeben → signed', w.status);
    ist(w.source === 'ihk-import', 'Herkunft ihk-import');
    ist(w.dailyActivities.monday === '• Kundenanfragen im Ticketsystem bearbeitet\n• Netzwerkdose im Büro 3 geprüft und Patchkabel getauscht', 'Montag: zwei Aufzaehlungspunkte', JSON.stringify(w.dailyActivities.monday));
    ist(w.dailyActivities.tuesday === '• Berufsschule: Datenbanken, SQL-Grundlagen\n• Wirtschaftskunde', 'Dienstag: Schultext', JSON.stringify(w.dailyActivities.tuesday));
    ist(w.dailySchool.tuesday === true && w.dailySchool.monday === false, 'Dienstag als Schultag');
    ist(Math.abs(w.dailyHours.monday - 8) < 1e-9 && Math.abs(w.dailyHours.wednesday - 8.25) < 1e-9, 'Stunden je Tag (8, 8.25)', JSON.stringify(w.dailyHours));
    ist(w.dailyActivities.thursday === '• Betrieb', 'abwesender Tag traegt den Ort als Vermerk', JSON.stringify(w.dailyActivities.thursday));
    ist(w.instruction === 'Kundenkommunikation', 'Qualifikationen → instruction', JSON.stringify(w.instruction));
    ist(w.hours === 30, 'Dauer gesamt 30:00', String(w.hours));
    ist(meta.name === 'Bildungskette, Anna' && meta.beruf === 'Kaufmann / Kauffrau für Büromanagement' && meta.start === '01.08.2024', 'Deckblatt gelesen', JSON.stringify(meta));
}

console.log('\n▶ 2. Wochenbasis: Seiten werden nicht mehr uebersprungen');
{
    fehlerMeldungen.length = 0;
    const { weeks } = parse([DECKBLATT, WOCHE_SEITE_A, WOCHE_SEITE_B, WOCHE_SEITE_C]);
    ist(fehlerMeldungen.length === 0, 'keine Fehlermeldung „keine auswertbaren Tagesberichte"', fehlerMeldungen.join(' / '));
    ist(weeks.length === 3, 'drei Wochen erkannt', String(weeks.length));
    ist(weeks.every((w) => w.mode === 'weekly'), 'alle im Modus weekly', weeks.map((w) => w.mode).join(','));
    ist(weeks.every((w) => w.source === 'ihk-import'), 'Herkunft ihk-import');

    const a = weeks.find((w) => w.dateFrom === '2025-09-15') || {};
    ist(!!a.dateFrom, 'Woche A gefunden');
    ist(a.activities === '• Einarbeitung in das Ticketsystem, erste Kundenanfragen selbstständig beantwortet\n• Mit dem Ausbilder die Netzwerkstruktur des Standorts besprochen\n• Dokumentation der Patchfelder begonnen', 'A: Freitext als Aufzaehlung', JSON.stringify(a.activities));
    ist(a.instruction === 'Kundenkommunikation, Netzwerktechnik', 'A: Qualifikationen → instruction', JSON.stringify(a.instruction));
    ist(a.hours === 32, 'A: Ausbildungsstunden 32:00', String(a.hours));
    ist(a.status === 'signed' && a.ihkSigned === true, 'A: freigegeben → signed', a.status);
    ist(a.year === 2, 'A: Ausbildungsjahr aus der Seite', String(a.year));
    ist(a.school === '', 'A: kein Schultext (Ort Betrieb)', JSON.stringify(a.school));
    ist(!/Anwesenheit|anwesend|Mo\b/.test(a.activities), 'A: Anwesenheitszeilen nicht im Text');

    const b = weeks.find((w) => w.dateFrom === '2025-09-22') || {};
    ist(!!b.dateFrom, 'Woche B gefunden');
    ist(b.school === '• Datenbanken: Normalformen und SQL-Joins\n• Wirtschaft: Kaufvertrag', 'B: Schule/Betrieb — Schultext ins Schulfeld', JSON.stringify(b.school));
    ist(b.activities === '• Server-Update auf dem Testsystem eingespielt\n• Monitoring-Alarme ausgewertet', 'B: Schule/Betrieb — Betriebstext in die Taetigkeiten', JSON.stringify(b.activities));
    ist(b.hours === 38.5, 'B: Dauer gesamt 38:30', String(b.hours));
    ist(b.status === 'complete' && b.ihkSigned === false, 'B: nur eingereicht → complete', b.status);

    const c = weeks.find((w) => w.dateFrom === '2025-09-29') || {};
    ist(!!c.dateFrom, 'Woche C gefunden');
    ist(c.activities.includes('Sicherheitsunterweisung Elektro') && c.activities.includes('Ablage der Protokolle'), 'C: Fliesstext ohne Struktur kommt vollstaendig an', JSON.stringify(c.activities));
    ist(!/Auszubildende|Ausbilder|Seite 9|^Ort|Unterweisung$/.test(c.activities), 'C: keine Kopf- und Fusszeilen-Reste im Text', JSON.stringify(c.activities));
}

console.log('\n▶ 3. Gemischter Export: Tages- und Wochenseiten in einer Datei');
{
    const { weeks } = parse([DECKBLATT, TAG_SEITE, WOCHE_SEITE_A]);
    ist(weeks.length === 2, 'beide Wochen', String(weeks.length));
    ist(weeks.some((w) => w.mode === 'daily') && weeks.some((w) => w.mode === 'weekly'), 'je eine daily und weekly');
}

console.log('\n▶ 4. Gegenprobe: eine Seite ohne Nachweis-Kopf wird weiterhin ignoriert');
{
    fehlerMeldungen.length = 0;
    const { weeks } = parse([DECKBLATT, 'Inhaltsverzeichnis | KW 37 | KW 38 | Seite 2']);
    ist(weeks.length === 0, 'keine Woche aus dem Inhaltsverzeichnis', String(weeks.length));
    ist(fehlerMeldungen.length === 1, 'dann kommt die Fehlermeldung', fehlerMeldungen.join(' / '));
}

console.log(`\n${okCount} ok, ${fehlerCount} fehlgeschlagen`);
process.exit(fehlerCount ? 1 : 0);
