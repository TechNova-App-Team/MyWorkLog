// Eine per Link/QR angenommene Einladung darf NICHT automatisch synchronisieren.
// Anlass (Audit 2026-09-24): Jeder kann einen p2p-Link schicken. Schickt das
// Opfer den Antwort-Code zurueck, gingen mit Auto-Sync (Voreinstellung an) alle
// Eintraege raus, bevor jemand die Pruefziffer verglichen hat.
// Statisch gegen die Quelle, Kommentare vorher gestrippt (sonst prueft der Test
// seine eigenen Erklaerungen, siehe CLAUDE.md).
// Aufruf: node tools/p2p-link.test.mjs
import { readFileSync } from 'node:fs';

const roh = readFileSync('components/core/p2p-sync.js', 'utf8').split('\r\n').join('\n');
const src = roh.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let ok = 0, fehler = 0;
const ist = (b, n) => { if (b) { ok++; console.log('  ok   ' + n); } else { fehler++; console.log('  FEHL ' + n); } };

const block = (start, laenge = 1500) => { const i = src.indexOf(start); return i === -1 ? '' : src.slice(i, i + laenge); };

const connect = block("peer.on('connect'", 2500);
ist(connect.length > 0, 'Gegenprobe: connect-Handler gefunden');
ist(connect.includes("p2pAutoSync')?.checked && !p2pAngenommen()"), 'Auto-Sync nur auf dem einladenden Geraet (nicht nach Link UND nicht nach Einfuegen)');
// Zweitpruefung 18.11.: der Einfuege-Weg (viaLink=false, Rolle client) war ungeschuetzt
ist(src.includes("function p2pAngenommen() { return p2pSync.viaLink || p2pSync.role === 'client'; }"), 'angenommen = per Link ODER Empfaenger-Rolle (eingefuegter Code)');

const link = block('async function p2pHandleDeepLink', 4000);
const iSet = link.indexOf('p2pSync.viaLink = true'), iStart = link.indexOf('p2pStartClient()');
ist(iSet !== -1 && iStart !== -1 && iSet < iStart, 'Deep-Link setzt viaLink vor dem Start der Empfaenger-Rolle');

const reset = block('function p2pWizardReset', 1500);
ist(reset.includes('p2pSync.viaLink = false'), 'Neustart des Assistenten setzt viaLink zurueck (sonst bleibt es fuer die naechste, eigene Kopplung stehen)');

// Audit 18.11.2026: viaLink sperrte nur das SENDEN. Ein fremder Absender schob dem
// Opfer ohne Klick Eintraege in den Speicher — mit type "<img onerror>" gespeichertes
// XSS (trash.js setzt entry.type ungemaskt ein).
const complete = block("case 'sync-complete'", 1500);
const iGate = complete.indexOf('p2pAngenommen() && !p2pSync.empfangFrei'), iMerge = complete.indexOf('p2pSmartMerge(');
ist(iGate !== -1 && iMerge !== -1 && iGate < iMerge, 'Per Link: Empfangenes wird vor dem Merge angehalten');
ist(/p2pSync\.empfangFrei = true[\s\S]{0,200}p2pSmartMerge\(p2pSync\.wartend\)/.test(block('function p2pManualSync', 1200)), 'erst der Klick auf Übertragen gibt frei und übernimmt das Wartende');
ist(reset.includes('p2pSync.empfangFrei = false') && reset.includes('p2pSync.wartend = null'), 'Neustart setzt Freigabe und Wartendes zurueck');
ist(block('function p2pSmartMerge', 800).includes('p2pEintragSauber(remoteEntry)'), 'Merge prueft jeden fremden Eintrag');

// Formpruefung am echten Code (Ausschnitt aus der Quelle, nicht nachgebaut)
const a = roh.indexOf('const P2P_FREI_TAG'), b = roh.indexOf('// === SMART MERGE ENGINE ===');
ist(a !== -1 && b > a, 'Gegenprobe: Pruef-Funktionen gefunden');
const sauber = new Function(roh.slice(a, b) + '\nreturn p2pEintragSauber;')();
const gut = { id: 1731900000000, date: '2026-11-18', type: 'work', worked: 7.5, expected: '8.75', diff: -1.25, info: 'Server 3 < 4 umgezogen | Projekt', start: '07:00', end: '15:30', jobId: 'primary', breakLog: [{ von: '12:00', bis: '12:45' }], customFieldValues: { kunde: 'Zahn' }, timestamp: 1731900000000, mood: '' };
ist(sauber(gut), 'normaler Eintrag (auch mit „3 < 4“ im Text) kommt durch');
ist(sauber({ ...gut, id: 'e_17319-a' }), 'Text-Id kommt durch');
const alsText = { ...gut, worked: '7.5', diff: '-1.25' };
ist(sauber(alsText) && alsText.worked === 7.5 && alsText.diff === -1.25, 'Zahl als Text wird zur Zahl (Anzeige ruft .toFixed auf)');
const boese = {
  'type mit HTML': { ...gut, type: '<img src=x onerror=alert(1)>' },
  'date mit HTML': { ...gut, date: '<svg onload=alert(1)>' },
  'Uhrzeit mit HTML': { ...gut, start: '<b>7</b>' },
  'worked als Text': { ...gut, worked: '"><img src=x>' },
  'Tag in info': { ...gut, info: 'hallo <script>alert(1)</script>' },
  'Tag tief im Objekt': { ...gut, customFieldValues: { a: { b: '<iframe src=//x>' } } },
  'Tag im Schluessel': { ...gut, customFieldValues: { '<img src=x>': 1 } },
  // Als berechneter Schluessel — ein woertliches '__proto__': im Objekt-Literal setzt den
  // Prototyp des Testobjekts, und der Fall fiele still aus der Liste.
  ['__proto__ (eigener Schluessel aus JSON)']: JSON.parse('{"id":1,"date":"2026-11-18","__proto__":{"x":1}}'),
  'ohne Id': { ...gut, id: undefined },
  'Id mit HTML': { ...gut, id: '<a>' },
  'Array statt Objekt': [gut],
  'riesiger Text': { ...gut, info: 'x'.repeat(5001) },
};
for (const [n, e] of Object.entries(boese)) ist(!sauber(e), 'abgelehnt: ' + n);

console.log(`\n${ok} ok, ${fehler} fehlgeschlagen`);
process.exit(fehler ? 1 : 0);
