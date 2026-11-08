// ═══ STAMP-ASSETS — nurStempelDiff ═══
//
// Der Pre-Commit-Hook staged nur Dateien, deren offener Unterschied allein aus
// ?v=-Stempeln besteht. Bis 08.11.2026 zaehlte ein NEU hinzugekommener Stempel
// (Link vorher ganz ohne ?v=, so schreibt ihn tools/beispiel-seiten.mjs) als
// fremde Aenderung — die gestempelten Berufsseiten blieben liegen und gingen
// ungestempelt in den Commit.
//
// Der Test veraendert eine eingecheckte Seite kurz im Arbeitsbaum und stellt sie
// im finally wieder her. Lauf: node tools/stamp-diff.test.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { nurStempelDiff } = require('./stamp-assets.js');

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FEHLT ' + n)); };

const REL = 'pages/berichtsheft-beispiele/koch/index.html';
const original = readFileSync(REL);
// Ausgangspunkt ist der Index, nicht die Platte: nach einem Generator-Lauf
// koennte der Arbeitsbaum schon ungestempelt sein.
const text = execFileSync('git', ['show', ':' + REL], { encoding: 'utf8' });
const stempel = (text.match(/\?v=[0-9a-f]{6,}/g) || []).length;

try {
  ok(`Probeseite traegt Stempel (${stempel})`, stempel > 0);            // Gegenprobe: sonst testet nichts
  writeFileSync(REL, text);
  ok('Index-Stand gegen sich selbst → STEMPEL', nurStempelDiff(REL) === true);

  writeFileSync(REL, text.replace(/\?v=[0-9a-f]{6,}/g, ''));
  ok('nur Stempel weg/dazu → STEMPEL', nurStempelDiff(REL) === true);

  writeFileSync(REL, text.replace(/\?v=[0-9a-f]{6,}/g, '').replace('Beispielwochen', 'Musterwochen'));
  ok('Stempel + echte Textaenderung → GEMISCHT', nurStempelDiff(REL) === false);
} finally {
  writeFileSync(REL, original);
}

console.log(`\nstamp-diff: ${pass} ok, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
