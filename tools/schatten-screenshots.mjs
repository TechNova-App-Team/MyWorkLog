#!/usr/bin/env node
// ═══ DIE AUFNAHMEN AUF /schatten-berichtsheft/ NEU MACHEN ═══
//
// Drei Bilder unter /Grafiken/schatten/ (Tresor 1440 x 900, Dialoge 960 x 900, 2x, WebP): der
// entsperrte Tresor mit Eintraegen, ein neuer Eintrag im Formular, und das
// IHK-Beschwerde-Protokoll in der Vorschau. Braucht Portman (5001).
//
//   node tools/schatten-screenshots.mjs   → Grafiken/schatten/*.webp, danach bumpen (?v=)
//
// Jede Aufnahme laeuft in einem FRISCHEN headless Profil (screenshot.mjs legt
// es an und loescht es): dort wird ein Tresor mit einem erfundenen Passwort
// angelegt und ueber die eigenen Funktionen der Seite befuellt — handleSetup,
// openNewEntry, saveEntry, openExportModal, generatePreview. Kein echter
// Tresor, keine echten Vorfaelle. Die Eintraege sind erfunden, aber so
// gewaehlt, wie die Seite sie beschreibt: Ueberstunden, ausbildungsfremde
// Arbeit, verweigerte Schulfreistellung, fehlende Betreuung.
// Aendern sich die Formularfelder (entryDate, entryTime, entryCategory,
// entryText, entryWitnesses, entryStatus, selectSeverity), muss das hier mit.

import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const URL_SB = 'http://localhost:5001/schatten-berichtsheft/';
const OUT = join(ROOT, 'Grafiken', 'schatten');

// Tage relativ zu heute, damit die Liste nie „vor einem Jahr" zeigt.
const heute = new Date(); heute.setHours(12, 0, 0, 0);
const tag = (n) => { const d = new Date(heute); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const EINTRAEGE = [
    { d: tag(58), t: '16:45', sev: 'medium', cat: 'overtime', st: 'raised', text: 'Bis 18:30 geblieben, weil die Inventur nicht fertig war. Angeordnet von der Schichtleitung, keine Erfassung im Stundenzettel.', w: 'Jonas K.' },
    { d: tag(44), t: '08:10', sev: 'high', cat: 'unrelated', st: 'open', text: 'Dritter Tag in Folge nur Paletten umgeräumt im Außenlager. Kein Bezug zum Ausbildungsplan, niemand aus der IT-Abteilung erreichbar.', w: '' },
    { d: tag(31), t: '07:30', sev: 'critical', cat: 'schoolBlocked', st: 'escalated', text: 'Berufsschultag gestrichen: sollte wegen Krankheitsausfall im Betrieb bleiben. Freistellung ausdrücklich verweigert.', w: 'Mira Ö., Frau Brandt (Klassenlehrerin informiert)' },
    { d: tag(19), t: '12:05', sev: 'medium', cat: 'breaks', st: 'open', text: 'Mittagspause nach zehn Minuten abgebrochen, Kundentermin vorgezogen. Pause nicht nachgeholt.', w: '' },
    { d: tag(9), t: '15:20', sev: 'low', cat: 'noTrainer', st: 'open', text: 'Ganze Woche ohne Ansprechpartner, Ausbilder im Urlaub, keine Vertretung benannt.', w: '' },
    { d: tag(3), t: '17:10', sev: 'high', cat: 'overtime', st: 'open', text: 'Zweiter Samstag im Monat eingeplant, ohne Ausgleichstag. Unter 18 — nach Jugendarbeitsschutz nicht zulässig.', w: 'Jonas K.' },
];

const PASSWORT = 'Beispiel-Tresor-2026!';
const EINRICHTEN = `
function warte(ms){return new Promise(function(r){setTimeout(r,ms);});}
async function einrichten(){
  document.getElementById('newPwInput').value=${JSON.stringify(PASSWORT)};
  document.getElementById('confirmPwInput').value=${JSON.stringify(PASSWORT)};
  await handleSetup();
  // Zeitachse „Passiert": sonst tragen alle Beispiel-Eintraege den
  // Erfassungszeitpunkt der Aufnahme (heute, dieselbe Minute), der Zeitraum
  // stuende auf „1d" und das Protokoll liefe vom Aufnahmetag bis zum Aufnahmetag.
  await setTimeBasis('occurred');
  var E=${JSON.stringify(EINTRAEGE)};
  for (var i=0;i<E.length;i++){
    var e=E[i];
    openNewEntry();
    document.getElementById('entryDate').value=e.d;
    document.getElementById('entryTime').value=e.t;
    selectSeverity(e.sev);
    document.getElementById('entryCategory').value=e.cat;
    document.getElementById('entryStatus').value=e.st;
    document.getElementById('entryText').value=e.text;
    document.getElementById('entryWitnesses').value=e.w;
    await saveEntry();
    await warte(150);
  }
  document.querySelectorAll('.modal-overlay.active').forEach(function(m){m.classList.remove('active');});
  document.body.style.overflow='';
  var t=document.getElementById('toast'); if(t) t.classList.remove('show');
  await warte(400);
}`;
const lauf = (body) => `(async function(){${EINRICHTEN}await warte(600);await einrichten();${body}})()`;

// Formular und Protokoll sind Dialoge mit ~780 px Breite: auf 1440 px fuellen
// sie nur die Mitte und waeren im Rahmen auf der Seite kaum lesbar. Deshalb
// 960 x 900 — die <img> auf der Seite tragen dafuer width=1920 height=1800.
const shots = [
    ['tresor.webp', 1440, lauf(`window.scrollTo(0,0);await warte(500);return document.querySelectorAll('#entriesList > *').length+' Eintraege';`)],
    ['eintrag.webp', 960, lauf(`openNewEntry();document.getElementById('entryDate').value=${JSON.stringify(tag(1))};document.getElementById('entryTime').value='16:40';selectSeverity('high');document.getElementById('entryCategory').value='unrelated';document.getElementById('entryText').value='Wieder den ganzen Tag Firmenwagen gereinigt und Getränke eingekauft. Laut Ausbildungsplan wäre diese Woche Netzwerkverkabelung dran.';await warte(700);return 'Formular offen: '+document.getElementById('entryModal').classList.contains('active');`)],
    ['protokoll.webp', 960, lauf(`openExportModal();generatePreview();await warte(900);var p=document.getElementById('exportPreview');return 'Protokoll: '+p.textContent.length+' Zeichen';`)],
];

mkdirSync(OUT, { recursive: true });
let fehler = 0;
for (const [datei, breite, js] of shots) {
    const r = spawnSync(process.execPath, [join(HERE, 'screenshot.mjs'), URL_SB, join(OUT, datei), '--w', String(breite), '--h', '900', '--dpr', '2', '--quality', '88', '--wait', '2500', '--js', js], { cwd: ROOT, encoding: 'utf8' });
    process.stdout.write(r.stdout); process.stderr.write(r.stderr);
    if (r.status !== 0) fehler++;
}
console.log(fehler ? `${fehler} Aufnahme(n) fehlgeschlagen` : 'Drei Aufnahmen unter Grafiken/schatten/ — danach bumpen, damit die ?v= wechseln.');
process.exit(fehler ? 1 : 0);
