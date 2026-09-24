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
ist(/p2pAutoSync'\)\?\.checked && !p2pSync\.viaLink/.test(connect), 'Auto-Sync nur, wenn die Verbindung NICHT per Link kam');

const link = block('async function p2pHandleDeepLink', 4000);
const iSet = link.indexOf('p2pSync.viaLink = true'), iStart = link.indexOf('p2pStartClient()');
ist(iSet !== -1 && iStart !== -1 && iSet < iStart, 'Deep-Link setzt viaLink vor dem Start der Empfaenger-Rolle');

const reset = block('function p2pWizardReset', 1500);
ist(reset.includes('p2pSync.viaLink = false'), 'Neustart des Assistenten setzt viaLink zurueck (sonst bleibt es fuer die naechste, eigene Kopplung stehen)');

console.log(`\n${ok} ok, ${fehler} fehlgeschlagen`);
process.exit(fehler ? 1 : 0);
