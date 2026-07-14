#!/usr/bin/env node
/**
 * prune-deploy.js — entfernt Quell- und Tooling-Dateien aus dem Deploy.
 *
 * WARUM: Cloudflare Pages laedt das gesamte Build-Output-Verzeichnis ("/") hoch.
 * Damit landete alles im Netz, was im Repo liegt — auch reine Quellen. Konkret war
 * abrufbar (geprueft am 2026-07-15):
 *   /index.template  → eine halb-gerenderte Kopie der Startseite (mit @include-Markern!)
 *   /components/support/support.html → das rohe Fragment
 *   /tools/build-index.js → Build-Tooling
 * Die "SECURITY BLOCKS" in _redirects greifen dagegen NICHT: sie nutzen Status 404,
 * und Cloudflare Pages unterstuetzt in _redirects nur 200/301/302/303/307/308 — die
 * Regeln werden still ignoriert.
 *
 * LOESUNG: Die Dateien werden nach dem Build aus dem Output geloescht, also gar nicht
 * erst hochgeladen. Kein Redirect-Geschummel.
 *
 * SICHERHEIT: Laeuft AUSSCHLIESSLICH auf Cloudflare (CF_PAGES=1). Lokal passiert
 * nichts — sonst wuerde ein `npm run build` die eigenen Quellen loeschen.
 * Erzwingen (z.B. zum Testen) mit --force.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const onCF = process.env.CF_PAGES === '1' || process.env.CF_PAGES === 'true';
const forced = process.argv.includes('--force');

if (!onCF && !forced) {
  console.log('[prune] übersprungen (nicht auf Cloudflare — lokale Quellen bleiben unangetastet).');
  process.exit(0);
}

// Einzelne Dateien / ganze Verzeichnisse, die NICHT ins Deploy gehoeren.
// NICHT hier rein: config/ (version.json + maintenance.json werden zur Laufzeit
// gefetcht), Assets/, Grafiken/, pages/ (inkl. pages/footer/footer.html!),
// components/**/*.{css,js} — die sind alle live verlinkt.
const REMOVE = [
  'index.template.html',   // Quelle der generierten index.html
  'tools',                 // Build-Tooling
  'CLAUDE.md',
  '.eslintrc.json',
  'jest.config.js',
  'babel.config.js',
  '__tests__',
  '__mocks__',
];

let removed = 0;

function rm(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return;
  fs.rmSync(p, { recursive: true, force: true });
  console.log('[prune] entfernt: ' + rel);
  removed++;
}

// Component-FRAGMENTE raus — aber css/js bleiben (die sind live verlinkt!)
function pruneFragments(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) pruneFragments(p);
    else if (e.name.endsWith('.html')) {
      fs.rmSync(p, { force: true });
      console.log('[prune] entfernt: ' + path.relative(ROOT, p).replace(/\\/g, '/'));
      removed++;
    }
  }
}

for (const rel of REMOVE) rm(rel);

const componentsDir = path.join(ROOT, 'components');
if (fs.existsSync(componentsDir)) pruneFragments(componentsDir);

console.log('[prune] ✓ ' + removed + ' Quell-/Tooling-Pfade aus dem Deploy entfernt.');
