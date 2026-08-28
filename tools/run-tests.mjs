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

const durchgefallen = [];
for (const t of tests) {
  process.stdout.write(`──────── ${t}\n`);
  const r = spawnSync(process.execPath, [path.join(TOOLS, t)], { stdio: 'inherit' });
  if (r.status !== 0) durchgefallen.push(t);
}

console.log('');
if (durchgefallen.length === 0) {
  console.log(`✓ ${tests.length}/${tests.length} Tests gruen.`);
  process.exit(0);
}
console.error(`✗ ${durchgefallen.length} von ${tests.length} Tests durchgefallen:`);
durchgefallen.forEach(t => console.error('    ' + t));
process.exit(1);
