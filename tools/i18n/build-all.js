#!/usr/bin/env node
/**
 * build-all.js — generiert alle englischen /en/-Seiten aus pages.config.json.
 * Für jede Seite: overrides → en.json (merge), dann render (mit phrases).
 * Aufruf: node tools/i18n/build-all.js   (bzw. `npm run i18n:build`)
 */
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'pages.config.json'), 'utf8'));
const node = process.execPath;
const build = path.join(__dirname, 'i18n-build.js');
const merge = path.join(__dirname, 'merge-dict.js');

function run(args) {
  execFileSync(node, args, { cwd: ROOT, stdio: 'inherit', env: process.env });
}

let ok = 0;
for (const p of cfg.pages) {
  console.log(`\n▶ ${p.id}  (${p.src} → ${p.out})`);
  if (p.overrides && fs.existsSync(path.join(ROOT, p.overrides))) {
    run([merge, p.dict, p.overrides, p.enJson]);
  }
  run([build, 'render', p.src, p.enJson, p.out, p.canonicalEn, p.canonicalDe, p.phrases || '']);
  ok++;
}
console.log(`\n✓ ${ok} Seite(n) generiert.`);
