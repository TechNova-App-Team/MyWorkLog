#!/usr/bin/env node
/**
 * Prueft, dass jedes <script src> / <link href> in pages/** eine Datei trifft.
 *
 * WARUM: Ein <link> oder <script> auf eine fehlende Datei ist im Browser STUMM.
 * Kein Fehler im Bild, nur eine Netzwerk-Zeile, die niemand liest — die Seite
 * baut sich auf, eben ohne das, was die Datei mitgebracht haette. pages/Weihnachten/
 * forderte drei Dateien an, von denen zwei woanders lagen und eine gar nicht
 * existierte; es hat deshalb jahrelang nicht geschneit, und niemand sah es.
 *
 * Zweite Regel derselben Klasse: Pfade muessen ABSOLUT ab Root sein. Relative
 * (`../`) brechen bei den Cloudflare-Rewrites, weil die Seite unter einer anderen
 * Tiefe ausgeliefert wird, als sie im Repo liegt.
 *
 * Usage: node tools/asset-pfade.test.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

// pages/en/** ist generiert und erbt seine Pfade aus der deutschen Quelle —
// ein Fund dort waere immer ein Doppel des DE-Funds.
const IGNORE = [/^pages[\/]en[\/]/];

function htmlDateien(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) htmlDateien(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const dateien = htmlDateien(path.join(ROOT, 'pages'))
  .map(p => path.relative(ROOT, p))
  .filter(p => !IGNORE.some(re => re.test(p)));

const fehlt = [];
const relativ = [];

for (const rel of dateien) {
  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  // Nur echte Ressourcen-Attribute, keine Anker und keine Zeichenketten aus JS.
  const treffer = [...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="([^"]+)"/gi)].map(m => m[1]);

  for (const roh of treffer) {
    const url = roh.split('?')[0].split('#')[0].trim();
    if (!url || /^(https?:|data:|mailto:|#|\/\/)/i.test(url)) continue;   // extern / inline
    if (!/\.(js|mjs|css)$/i.test(url)) continue;                          // nur Code-Assets

    if (!url.startsWith('/')) { relativ.push(`${rel}  →  ${roh}`); continue; }
    if (!fs.existsSync(path.join(ROOT, url.slice(1)))) fehlt.push(`${rel}  →  ${url}`);
  }
}

let fehler = 0;

if (fehlt.length) {
  fehler += fehlt.length;
  console.error(`✗ ${fehlt.length} Verweis(e) auf eine Datei, die es nicht gibt:`);
  fehlt.forEach(z => console.error('    ' + z));
  console.error('  Im Browser passiert dabei NICHTS Sichtbares — die Seite laedt einfach ohne.');
}

if (relativ.length) {
  fehler += relativ.length;
  console.error(`✗ ${relativ.length} relative(r) Pfad(e) — Projektregel verlangt absolut ab Root:`);
  relativ.forEach(z => console.error('    ' + z));
  console.error('  Relative Pfade brechen bei den Cloudflare-Rewrites.');
}

if (fehler) process.exit(1);
console.log(`✓ ${dateien.length} Seiten geprueft, alle JS/CSS-Verweise treffen eine Datei und sind absolut.`);
