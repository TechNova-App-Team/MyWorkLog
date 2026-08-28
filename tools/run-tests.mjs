#!/usr/bin/env node
/**
 * Faehrt alle tools/*.test.mjs und meldet am Ende, was durchfiel.
 *
 * WARUM NICHT `for t in tools/*.test.mjs; do node "$t"; done`: das bricht beim
 * ersten Fehlschlag ab (oder verschluckt ihn ganz), und unter PowerShell laeuft
 * es gar nicht. Hier sieht man in EINEM Durchgang alle kaputten Tests.
 *
 * `npm run test:all` — dieselbe Liste wie in der GitHub Action.
 */

import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const tests = readdirSync(TOOLS).filter(f => f.endsWith('.test.mjs')).sort();

// Exit 2 heisst "uebersprungen, mit Begruendung" — aktuell nur
// umfrage-worker.test.mjs, dessen Quelle (workers/) gitignored ist und auf einem
// Runner gar nicht existiert. Ein uebersprungener Test darf NICHT als gruen
// durchgehen: sonst meldet die Zeile am Ende eine Deckung, die es nicht gibt.
const durchgefallen = [];
const uebersprungen = [];
for (const t of tests) {
  process.stdout.write(`──────── ${t}\n`);
  const r = spawnSync(process.execPath, [path.join(TOOLS, t)], { stdio: 'inherit' });
  if (r.status === 2) uebersprungen.push(t);
  else if (r.status !== 0) durchgefallen.push(t);
}

const gelaufen = tests.length - uebersprungen.length;
console.log('');
if (durchgefallen.length === 0) {
  console.log(`✓ ${gelaufen}/${gelaufen} gelaufene Tests gruen.`);
  if (uebersprungen.length) {
    console.log(`  ${uebersprungen.length} uebersprungen: ${uebersprungen.join(', ')}`);
  }
  process.exit(0);
}
console.error(`✗ ${durchgefallen.length} von ${gelaufen} gelaufenen Tests durchgefallen:`);
durchgefallen.forEach(t => console.error('    ' + t));
if (uebersprungen.length) console.error(`  (${uebersprungen.length} uebersprungen: ${uebersprungen.join(', ')})`);
process.exit(1);
