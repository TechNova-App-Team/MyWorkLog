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
 *
 * ⚠️ --force LOESCHT SOFORT UND ECHT. Wer nur sehen will, WAS entfernt wuerde,
 * nimmt --dry-run (loescht nichts). Am 2026-07-22 hat ein `--force --dry-run`
 * echte Dateien vernichtet, weil es --dry-run damals nicht gab und unbekannte
 * Flags still ignoriert wurden — CLAUDE.md und README´s/ stehen in .gitignore
 * und waren damit unwiederbringlich weg. Deshalb: unbekannte Flags brechen jetzt
 * ab, und --dry-run gewinnt immer gegen --force.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const onCF = process.env.CF_PAGES === '1' || process.env.CF_PAGES === 'true';

// Unbekannte Flags sind ein Abbruchgrund: ein stillschweigend ignoriertes
// --dry-run hat hier schon einmal Dateien gekostet.
const KNOWN_FLAGS = ['--force', '--dry-run'];
const unknown = process.argv.slice(2).filter((a) => !KNOWN_FLAGS.includes(a));
if (unknown.length) {
  console.error('[prune] ABBRUCH — unbekanntes Flag: ' + unknown.join(' '));
  console.error('[prune] Erlaubt: ' + KNOWN_FLAGS.join(' | '));
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');
// --dry-run gewinnt immer: "zeig mir was passieren wuerde" darf nie loeschen.
const forced = process.argv.includes('--force') && !dryRun;

if (dryRun) {
  console.log('[prune] DRY-RUN — es wird NICHTS geloescht, nur aufgelistet.\n');
}

if (!onCF && !forced && !dryRun) {
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
  '.github',               // Workflows — gehoeren ins Repo, nicht auf die Domain
];

let removed = 0;

function rm(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return;
  if (!dryRun) fs.rmSync(p, { recursive: true, force: true });
  console.log('[prune] ' + (dryRun ? 'wuerde entfernen' : 'entfernt') + ': ' + rel);
  removed++;
}

// Component-FRAGMENTE raus — aber css/js bleiben (die sind live verlinkt!)
function pruneFragments(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) pruneFragments(p);
    else if (e.name.endsWith('.html')) {
      if (!dryRun) fs.rmSync(p, { force: true });
      console.log('[prune] ' + (dryRun ? 'wuerde entfernen' : 'entfernt') + ': '
        + path.relative(ROOT, p).replace(/\\/g, '/'));
      removed++;
    }
  }
}

for (const rel of REMOVE) rm(rel);

const componentsDir = path.join(ROOT, 'components');
if (fs.existsSync(componentsDir)) pruneFragments(componentsDir);

console.log('[prune] ✓ ' + removed + ' Quell-/Tooling-Pfade aus dem Deploy entfernt.');
