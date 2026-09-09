#!/usr/bin/env node
// ═══ TEST: IHK-Import Ausbildungsjahr-Berechnung & Korrektur ═══
//
// Prueft, dass das Ausbildungsjahr beim IHK-PDF-Import stichtagsgenau berechnet
// wird (z. B. Beginn 01.09.2025 -> August 2026 ist noch 1. Lehrjahr, September 2026 2. Lehrjahr).
// Prueft ausserdem die Auto-Reparatur fuer bestehende Bestandsdaten und den Duplikatsabgleich.

import { readFileSync } from 'node:fs';

let okCount = 0, fehlerCount = 0;
function ist(bedingung, name) {
  if (bedingung) { okCount++; console.log('  ok    ' + name); }
  else { fehlerCount++; console.log('  FEHLT ' + name); }
}

const basisSrc = readFileSync('Assets/js/berichtsheft/bh-basis.js', 'utf8').split('\r\n').join('\n');
const uebersichtSrc = readFileSync('Assets/js/berichtsheft/bh-uebersicht.js', 'utf8').split('\r\n').join('\n');
const importSrc = readFileSync('Assets/js/berichtsheft/bh-ihk-import.js', 'utf8').split('\r\n').join('\n');

// Simuliere Browser-Umgebung
const localStorageStore = new Map();
globalThis.localStorage = {
  getItem: (k) => localStorageStore.get(k) || null,
  setItem: (k, v) => localStorageStore.set(k, String(v)),
  removeItem: (k) => localStorageStore.delete(k),
};
globalThis.document = {
  documentElement: { lang: 'de' },
  addEventListener: () => {},
  getElementById: () => null,
};

// Lade Funktionen
const fnCode = `
${basisSrc}
${uebersichtSrc}
${importSrc}
return { ihkCalculateAusbildungsjahr, ihkAutoRepairReportYears, ihkFindReportIndex };
`;

const { ihkCalculateAusbildungsjahr, ihkAutoRepairReportYears, ihkFindReportIndex } =
  new Function(fnCode)();

console.log('\n▶ 1. Stichtagsgenaue Berechnung bei Ausbildungsbeginn 01.09.2025');
const startSep = new Date(2025, 8, 1); // 01.09.2025

// KW 31 (27.07.2026 - 02.08.2026) -> Donnerstag ist 30.07.2026
const dKW31 = new Date(2026, 6, 30);
ist(ihkCalculateAusbildungsjahr(dKW31, startSep) === 1, 'KW 31 (Juli 2026) ist 1. Ausbildungsjahr');

// KW 32 (03.08.2026 - 09.08.2026) -> Donnerstag ist 06.08.2026
const dKW32 = new Date(2026, 7, 6);
ist(ihkCalculateAusbildungsjahr(dKW32, startSep) === 1, 'KW 32 (Anfang August 2026) ist NOCH 1. Ausbildungsjahr');

// KW 35 (24.08.2026 - 30.08.2026) -> Donnerstag ist 27.08.2026
const dKW35 = new Date(2026, 7, 27);
ist(ihkCalculateAusbildungsjahr(dKW35, startSep) === 1, 'KW 35 (Ende August 2026) ist NOCH 1. Ausbildungsjahr');

// KW 36 (31.08.2026 - 06.09.2026) -> Donnerstag ist 03.09.2026
const dKW36 = new Date(2026, 8, 3);
ist(ihkCalculateAusbildungsjahr(dKW36, startSep) === 2, 'KW 36 (September 2026) ist 2. Ausbildungsjahr');

console.log('\n▶ 2. Stichtagsgenaue Berechnung bei Ausbildungsbeginn 01.08.2025');
const startAug = new Date(2025, 7, 1); // 01.08.2025
ist(ihkCalculateAusbildungsjahr(dKW31, startAug) === 1, 'Start 1.8.: KW 31 (Juli) ist 1. Ausbildungsjahr');
ist(ihkCalculateAusbildungsjahr(dKW32, startAug) === 2, 'Start 1.8.: KW 32 (August) ist 2. Ausbildungsjahr');

console.log('\n▶ 3. Duplikatsabgleich (ihkFindReportIndex)');
const existingReports = [
  { id: 'rep_1', dateFrom: '2026-08-03', dateTo: '2026-08-09', week: 32, year: 2, source: 'ihk-import' },
  { id: 'rep_2', dateFrom: '2026-08-31', dateTo: '2026-09-06', week: 36, year: 2, source: 'ihk-import' }
];

// Neues Parsing liefert week 32 mit korrigiertem year: 1
const newParsedWeek32 = { dateFrom: '2026-08-03', dateTo: '2026-08-09', week: 32, year: 1 };
const foundIdx = ihkFindReportIndex(existingReports, newParsedWeek32);
ist(foundIdx === 0, 'Findet bestehende Woche ueber dateFrom auch wenn altes year: 2 abweicht');

console.log('\n▶ 4. Auto-Reparatur fehlerhafter Bestandsdaten (ihkAutoRepairReportYears)');
const testData = [
  { id: 'r1', dateFrom: '2025-09-08', week: 37, year: 1, source: 'ihk-import' },
  { id: 'r2', dateFrom: '2026-07-27', week: 31, year: 1, source: 'ihk-import' },
  { id: 'r3', dateFrom: '2026-08-03', week: 32, year: 2, source: 'ihk-import' }, // falsch durch August-Heuristik
  { id: 'r4', dateFrom: '2026-08-24', week: 35, year: 2, source: 'ihk-import' }, // falsch durch August-Heuristik
  { id: 'r5', dateFrom: '2026-08-31', week: 36, year: 2, source: 'ihk-import' }, // korrekt (Donnerstag = 3.9.)
];

const repaired = ihkAutoRepairReportYears(testData);
ist(repaired === true, 'Auto-Reparatur meldet Aenderung');
ist(testData[2].year === 1, 'KW 32 wurde von 2 auf 1 korrigiert');
ist(testData[3].year === 1, 'KW 35 wurde von 2 auf 1 korrigiert');
ist(testData[4].year === 2, 'KW 36 bleibt 2');

console.log(`\nErgebnis: ${okCount} bestanden, ${fehlerCount} fehlgeschlagen.`);
if (fehlerCount > 0) process.exit(1);
