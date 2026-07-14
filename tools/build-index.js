#!/usr/bin/env node
/**
 * build-index.js — baut index.html aus index.template.html + components/<x>/<x>.html.
 *
 * WARUM: index.html hatte 7431 Zeilen, weil das gesamte SPA-HTML inline drin lag.
 * Die Dateien in components/ waren nur tote Kopien — nichts hat sie je geladen.
 * Jetzt sind SIE die Quelle, index.html ist das generierte Artefakt.
 *
 * KEIN Runtime-Loader, KEIN fetch: Das ausgelieferte index.html bleibt eine
 * vollstaendige Datei. Damit bleiben i18n (/en/ wird per jsdom aus index.html
 * gebacken), SEO, Service-Worker und Ladezeit exakt wie vorher.
 *
 * Marker im Template:  <!-- @include components/support/support.html -->
 *
 *   node tools/build-index.js          → schreibt index.html
 *   node tools/build-index.js --check  → exit 1, wenn index.html vom Soll abweicht
 *
 * Laeuft im Pre-Commit-Hook VOR dem i18n-Build.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'index.template.html');
const OUT = path.join(ROOT, 'index.html');

const INCLUDE_RE = /<!-- @include ([^\s]+) -->/g;

function build() {
  const template = fs.readFileSync(TEMPLATE, 'utf8');
  const used = [];

  const html = template.replace(INCLUDE_RE, (_m, rel) => {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) {
      console.error('[build-index] ✗ Fragment fehlt: ' + rel);
      process.exit(1);
    }
    used.push(rel);
    return fs.readFileSync(file, 'utf8');
  });

  if (!used.length) {
    console.error('[build-index] ✗ Keine @include-Marker im Template — das kann nicht stimmen.');
    process.exit(1);
  }
  return { html, used };
}

const { html, used } = build();
const check = process.argv.includes('--check');
const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;

if (check) {
  if (current === html) {
    console.log('[build-index] ✓ index.html ist aktuell (' + used.length + ' Fragmente).');
    process.exit(0);
  }
  console.error('[build-index] ✗ index.html weicht von Template + Fragmenten ab.');
  console.error('              index.html ist GENERIERT — direkte Edits gehen verloren.');
  console.error('              Bearbeite index.template.html oder components/<x>/<x>.html,');
  console.error('              dann: npm run build:index');
  process.exit(1);
}

if (current === html) {
  console.log('[build-index] ✓ unveraendert (' + used.length + ' Fragmente).');
} else {
  fs.writeFileSync(OUT, html, 'utf8');
  console.log('[build-index] ✓ index.html gebaut — ' + used.length + ' Fragmente, ' +
    html.split('\n').length + ' Zeilen.');
}
