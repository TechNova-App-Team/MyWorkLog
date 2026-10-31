// Ausbildungsrahmenpläne aller dualen Ausbildungsberufe → Assets/data/rahmenplaene/
//
//   node tools/rahmenplaene/bauen.mjs            # nutzt den Zwischenspeicher, holt nur Fehlendes
//   node tools/rahmenplaene/bauen.mjs --neu      # alles frisch von gesetze-im-internet.de
//
// Quelle: die XML-Fassungen der Ausbildungsverordnungen (amtliche Werke, § 5 UrhG — gemeinfrei).
// Der Zwischenspeicher (≈ 25 MB) liegt in tools/rahmenplaene/.quelle/ und ist gitignored.
// Jährlich im Oktober mit --neu laufen lassen (neue/geänderte Verordnungen), zusammen mit der
// Rechte-Checker-Prüfung. Test: node tools/rahmenplaene.test.mjs
//
// Gemessen 31.10.2026: 305 Verordnungen mit "Berufsausbildung" im Titel, davon ~30 keine
// Rahmenpläne (Eignung der Ausbildungsstätte, Mindestvergütung, Erprobung). 273 liefern Daten,
// 316 Berufe. Ohne Daten bleiben Bäderbetriebe, Fahrradmonteur, Holzbildhauer (Rahmenplan nicht
// als Tabelle im XML) — die Ansicht sagt das dem Nutzer, statt etwas zu raten.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { holen } from './holen.mjs';
import { verarbeite } from './extrakt.mjs';
import { baue } from './baue.mjs';

const hier = path.dirname(fileURLToPath(import.meta.url));
const quelle = path.join(hier, '.quelle');
const ziel = path.join(hier, '..', '..', 'Assets', 'data', 'rahmenplaene');

const h = await holen(quelle, { neu: process.argv.includes('--neu') });
console.log(`Verordnungen im Verzeichnis: ${h.kandidaten}, neu geholt: ${h.geholt}, Fehler: ${h.fehl}`);

const xmlDir = path.join(quelle, 'xml');
const roh = [];
for (const kurz of fs.readdirSync(xmlDir).sort()) {
  const xml = fs.readdirSync(path.join(xmlDir, kurz)).find(f => f.endsWith('.xml'));
  if (!xml) continue;
  roh.push(verarbeite(path.join(xmlDir, kurz, xml), kurz));
}
const s = baue({ xmlDir, roh, zielDir: ziel });
console.log(`Rahmenpläne: ${s.verordnungen} Verordnungen, ${s.berufe} Berufe, ${s.varianten} mit Fachrichtung/Schwerpunkt`);
if (s.probleme.length) console.log('Ohne Berufsnamen:\n  ' + s.probleme.join('\n  '));
// Gegenprobe: ein leerer Lauf darf nie als Erfolg durchgehen
if (s.berufe < 250) { console.error('Zu wenige Berufe — Quelle oder Parser kaputt?'); process.exit(1); }
