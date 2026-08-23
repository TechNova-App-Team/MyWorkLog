#!/usr/bin/env node
/**
 * stamp-assets.js — haengt ?v=<version> an lokale JS/CSS-Referenzen in HTML-Seiten.
 *
 * Warum: Cloudflare liefert /Assets/* mit `Cache-Control: max-age=86400` aus (kommt
 * NICHT aus _headers — dort steht max-age=0 — sondern aus einer Dashboard-Regel).
 * Browser halten JS/CSS damit 24h fest, ohne je nachzufragen. Das HTML selbst ist
 * `max-age=0`, also immer frisch. Eine Versions-Query im HTML erzeugt nach jedem
 * Bump eine neue URL → garantierter Cache-Miss, egal was der Header sagt.
 *
 * Laeuft im Pre-Commit-Hook nach dem i18n-Build.
 * Aufruf: node tools/stamp-assets.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/version.json'), 'utf8')).version;

// Nur eigene Assets. CDN-URLs und alles mit eigener Query bleiben unangetastet.
//
// /Grafiken/*.mp4 muss mit, obwohl dort sonst nur Icons liegen: _headers gibt dem
// ganzen Ordner `max-age=31536000, immutable`. Fuer Icons stimmt das (die aendern
// sich nie unter gleichem Namen), fuer intro.mp4 nicht — die Datei wird ersetzt,
// der Name bleibt. `immutable` heisst, der Browser fragt NIE nach: auch nicht beim
// Neuladen und auch nicht nach einem Cloudflare-Purge, denn der raeumt die Kante,
// nicht den Geraete-Cache. Ergebnis war ein Handy, das nach dem Deploy weiter den
// alten Clip zeigte. Mit ?v=<version> aendert sich der Cache-Key bei jedem Bump.
const RE = /(\s(?:src|href)=")((?:\/(?:Assets|components)\/[^"?]+\.(?:js|css)|\/Grafiken\/[^"?]+\.(?:mp4|webm)))(?:\?v=[^"]*)?(")/g;

// Versionsnummern, die im HTML stehen MUESSEN und daher unweigerlich veralten:
//  - <meta name="generator">: Crawler lesen statisches HTML, JS kommt zu spaet.
//  - Fallback-Text in [data-app-version]/[data-version]: was vor dem version.json-
//    Fetch kurz sichtbar ist (Sidebar-Footer, Intro-Badge). version-loader.js
//    ueberschreibt es zur Laufzeit — falsch ist es trotzdem, wenn es einfriert.
// Bis v4.1.19 stand hier ueberall noch 3.11.0. Statt jedes Vorkommen von Hand zu
// pflegen, zieht der Build sie an config/version.json an — wie schon package.json.
const VERSION_RES = [
  /(<meta\s+name="generator"\s+content="MyWorkLog v)\d+\.\d+\.\d+(")/g,
  // [^>]* deckt weitere Attribute hinter dem Marker ab (z.B. translate="no").
  /(\sdata-app-version(?:="[^"]*")?[^>]*>\s*v)\d+\.\d+\.\d+(\s*<)/g,
  /(\sdata-version(?:="[^"]*")?[^>]*>\s*)\d+\.\d+\.\d+(\s*<)/g,
];

function stampFile(file) {
  // index.html existiert im frischen Checkout (Cloudflare) noch nicht — sie wird
  // erst von build-index.js erzeugt. Fehlende Dateien sind kein Fehler.
  if (!fs.existsSync(file)) return 0;
  const raw = fs.readFileSync(file, 'utf8');
  let out = raw.replace(RE, (_m, pre, url, post) => pre + url + '?v=' + version + post);
  for (const re of VERSION_RES) out = out.replace(re, (_m, pre, post) => pre + version + post);
  if (out === raw) return 0;
  fs.writeFileSync(file, out);
  return (out.match(new RegExp('\\?v=' + version.replace(/\./g, '\\.'), 'g')) || []).length;
}

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

// index.html ist GENERIERT (tools/build-index.js). Die Quelle — index.template.html —
// muss mitgestempelt werden, sonst kippen die ?v=-Stempel beim naechsten Rebuild auf
// den alten Stand zurueck und die 24h-Cache-Falle ist wieder da. components/ laeuft
// vorsorglich mit, falls dort mal eine Asset-Referenz landet.
const files = [
  path.join(ROOT, 'index.html'),
  path.join(ROOT, 'index.template.html'),
  ...walk(path.join(ROOT, 'components'), []),
  ...walk(path.join(ROOT, 'pages'), []),
];

let touched = 0, refs = 0;
for (const f of files) {
  const n = stampFile(f);
  if (n) { touched++; refs += n; }
}

// package.json-Version an config/version.json angleichen. Sie war bis v3.19.7 auf
// 3.13.1 eingefroren — sichtbar im Cloudflare-Build-Log ("MyWorkLog@3.13.1"), was
// beim Debuggen in die Irre fuehrt. config/version.json bleibt die einzige Quelle.
const pkgPath = path.join(ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
if (pkg.version !== version) {
  const old = pkg.version;
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('stamp-assets: package.json ' + old + ' → ' + version);
}

console.log('stamp-assets: v' + version + ' → ' + refs + ' Referenzen in ' + touched + ' Datei(en)');
