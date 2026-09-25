#!/usr/bin/env node
/**
 * Prueft den README-Stempel aus tools/stamp-assets.js (readmeStempeln):
 * Versions-Badge, Changelog-Tabelle zwischen den Markern, Titel-Ableitung wie
 * in der Support-Ansicht, CRLF-Erhalt, Idempotenz — an einer Attrappe.
 *
 * Und am Ende gegen die ECHTE README.md und config/version.json: die Datei muss
 * dem Stand entsprechen, den der Stempel erzeugen wuerde. Faellt das rot, hat
 * jemand gebumpt, ohne dass der Hook lief (`--no-verify`) — dann steht auf
 * GitHub eine alte Version. Gegenprobe drin: die echte README traegt Badge und
 * Marker ueberhaupt, sonst prueft der Vergleich nichts.
 */

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TOOLS, '..');
const { readmeStempeln, changelogTitel, README_ANFANG, README_ENDE, README_ANZAHL } = require('./stamp-assets.js');

let fehler = 0, n = 0;
function ok(bedingung, text) {
  n++;
  if (bedingung) console.log(`  ✓ ${text}`);
  else { fehler++; console.log(`  ✗ ${text}`); }
}

const vj = {
  version: '7.3.0',
  releaseDate: '2026-09-18',
  changelog: {
    '7.2.4': 'Alter Stil ohne Titelzeile. Hier folgt der zweite Satz mit Details.',
    '7.3.0': 'Neue Seite: Vergleich mit Zubido | Azubiheft\n\nUnter /vergleich/ stehen vier Hefte nebeneinander.',
    '7.2.5': 'Enter speichert den Eintrag\n\nWer Start und Ende eingetragen hat, drueckt Enter.',
    '7.2.3': 'Nur ein Absatz ohne Satzende',
    '7.2.10': 'Zehnter Patch\n\nZahlenvergleich, kein Zeichenkettenvergleich.',
    '7.2.2': 'Faellt aus der Tabelle\n\nSechster Eintrag, die Tabelle zeigt fuenf.',
  },
  changelogDates: { '7.3.0': '2026-09-18', '7.2.5': '2026-09-17', '7.2.4': '2026-09-16', '7.2.10': '2026-09-20' },
};

const attrappe = [
  '# Kopf',
  '[![Version](https://img.shields.io/badge/version-6.9.16-7c3aed?style=for-the-badge)](x)',
  '',
  '## Versionierung',
  '',
  README_ANFANG,
  'ALTER INHALT',
  README_ENDE,
  '',
  'Fuss mit version-1.2.3 im Text, das kein Badge ist.',
  '',
].join('\r\n');

console.log('── Titel-Ableitung (wie clSplit in Assets/js/support.js)');
{
  ok(changelogTitel('Titelzeile\n\nAbsatz.') === 'Titelzeile', 'erste Zeile + Leerzeile → Titel');
  ok(changelogTitel('Erster Satz hier. Zweiter Satz.') === 'Erster Satz hier.', 'ohne Titelzeile → erster Satz');
  ok(changelogTitel('Nur ein Absatz ohne Satzende') === 'Nur ein Absatz ohne Satzende', 'ein Absatz → ganzer Absatz');
  const lang = 'A'.repeat(85) + ' Satz eins. Satz zwei.';
  ok(changelogTitel(lang + '\n\nAbsatz.') === 'A'.repeat(85) + ' Satz eins.', 'Titelzeile ueber 90 Zeichen zaehlt nicht als Titel → erster Satz');
  ok(changelogTitel('') === '' && changelogTitel(null) === '', 'leer/null → leer');
}

console.log('── Stempel an der Attrappe');
const out = readmeStempeln(attrappe, vj);
{
  ok(out.includes('badge/version-7.3.0-7c3aed'), 'Badge traegt die neue Version');
  ok(out.includes('version-1.2.3 im Text'), 'Versionsnummer ausserhalb des Badge-Musters bleibt stehen');
  ok(!out.includes('ALTER INHALT'), 'alter Blockinhalt ist ersetzt');
  ok(out.includes(README_ANFANG) && out.includes(README_ENDE), 'beide Marker stehen noch (naechster Bump findet sie)');
  ok(out.includes('Aktuelle Version: **v7.3.0** · 2026-09-18'), 'Versionszeile traegt das Datum DER Version (7.2.10 ist nachdatiert und juenger)');

  const tabelle = out.split('\r\n').filter((z) => /^\| /.test(z) && !/^\| Version /.test(z));
  ok(tabelle.length === README_ANZAHL, `Tabelle hat ${README_ANZAHL} Zeilen (hat ${tabelle.length})`);
  ok(tabelle[0].startsWith('| **7.3.0** | 2026-09-18 |'), 'neueste Version zuerst und fett');
  ok(tabelle[1].startsWith('| 7.2.10 |'), '7.2.10 steht vor 7.2.5 (numerisch, nicht alphabetisch)');
  ok(!out.includes('7.2.2'), 'sechster Eintrag faellt aus der Tabelle');
  ok(tabelle.some((z) => z.includes('| 7.2.3 | — |')), 'fehlendes Datum → Gedankenstrich');
  ok(tabelle.some((z) => z.includes('Zubido \\| Azubiheft')), 'senkrechter Strich im Titel ist escaped');
  ok(tabelle.some((z) => z.includes('| Alter Stil ohne Titelzeile. |')), 'alter Stil → erster Satz als Titel');

  ok(out.includes('\r\n') && !/(^|[^\r])\n/.test(out), 'CRLF bleibt CRLF (kein nacktes LF)');
  ok(out.startsWith('# Kopf\r\n'), 'Text vor dem Badge unveraendert');
  ok(readmeStempeln(out, vj) === out, 'zweiter Lauf aendert nichts (idempotent)');
  ok(readmeStempeln(attrappe.replace(/\r\n/g, '\n'), vj).includes('\n') && !readmeStempeln(attrappe.replace(/\r\n/g, '\n'), vj).includes('\r'), 'LF-Datei bleibt LF');

  const ohneMarker = readmeStempeln('[![Version](https://img.shields.io/badge/version-1.0.0-x)](y)\nkein Block', vj);
  ok(ohneMarker.includes('version-7.3.0-x') && ohneMarker.endsWith('kein Block'), 'ohne Marker: nur das Badge, kein Block eingefuegt');
}

console.log('── echte README.md gegen config/version.json');
{
  const readme = readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const echt = JSON.parse(readFileSync(path.join(ROOT, 'config', 'version.json'), 'utf8'));
  ok(/img\.shields\.io\/badge\/version-\d+\.\d+\.\d+-/.test(readme), 'README traegt ein Versions-Badge (Gegenprobe)');
  ok(readme.includes(README_ANFANG) && readme.includes(README_ENDE), 'README traegt beide Marker (Gegenprobe)');
  ok(readme.includes('version-' + echt.version + '-'), `Badge zeigt v${echt.version}`);
  ok(readmeStempeln(readme, echt) === readme, 'README entspricht dem Stand aus version.json (sonst: node tools/stamp-assets.js)');
}

console.log('');
if (fehler) { console.error(`✗ ${fehler} von ${n} Pruefungen durchgefallen`); process.exit(1); }
console.log(`✓ ${n}/${n} Pruefungen gruen`);
