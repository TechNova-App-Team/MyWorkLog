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
const versionJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/version.json'), 'utf8'));
const version = versionJson.version;
// Juengstes Datum aus changelogDates = Tag des letzten Release. Beim Bump traegt
// der Eintrag der neuen Version genau dieses Datum, also stimmt es auch dann.
const releaseDate = Object.values(versionJson.changelogDates || {}).sort().at(-1) || '';

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
  // JSON-LD der App (index.template.html, EN-Fassung aus index.en-overrides.json).
  // Stand bis v7.2.5 ein halbes Jahr lang auf 3.5.3 — Google las eine Version,
  // die es laengst nicht mehr gab.
  /("softwareVersion":\s*")\d+\.\d+\.\d+(")/g,
];

// dateModified im JSON-LD gibt es nur in den App-Dateien; ein Standalone-
// Seiten-Block wuerde damit ein Datum bekommen, an dem sich die SEITE nicht
// geaendert hat. Deshalb nicht in VERSION_RES, sondern nur fuer diese Liste.
//
// 🔴 Das EN-Woerterbuch gehoert dazu, weil die englische index.html ihren
// JSON-LD-Block aus dem Override bezieht — und zwar mit dem Literal, das dort
// steht. In CI (tests.yml) laeuft KEIN stamp-assets, nur build-index und
// i18n:build; die EN-Seite trug auf dem Runner deshalb noch 7.2.5, waehrend
// version.json 7.3.0 sagte, und jsonld.test.mjs war vier Pushes lang rot,
// lokal aber gruen (der Hook stempelt pages/en/ nach dem Bau). Die Quelle
// muss stimmen, nicht nur das Artefakt.
const DATE_RE = /("dateModified":\s*")\d{4}-\d{2}-\d{2}(")/g;
const EN_DICT = path.join(ROOT, 'tools', 'i18n', 'dict', 'index.en-overrides.json');
const APP_FILES = new Set([
  path.join(ROOT, 'index.html'),
  path.join(ROOT, 'index.template.html'),
  path.join(ROOT, 'pages', 'en', 'index.html'),
  EN_DICT,
]);

// Gibt null zurueck, wenn die Datei unveraendert bleibt, sonst die Zahl der
// ?v=-Referenzen (beim Woerterbuch 0 — dort wird nur die Version gestempelt).
function stampFile(file) {
  // index.html existiert im frischen Checkout (Cloudflare) noch nicht — sie wird
  // erst von build-index.js erzeugt. Fehlende Dateien sind kein Fehler.
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8');
  let out = raw.replace(RE, (_m, pre, url, post) => pre + url + '?v=' + version + post);
  for (const re of VERSION_RES) out = out.replace(re, (_m, pre, post) => pre + version + post);
  if (releaseDate && APP_FILES.has(file)) out = out.replace(DATE_RE, (_m, pre, post) => pre + releaseDate + post);
  if (out === raw) return null;
  // 🔴 Atomar schreiben, nicht direkt. Dieses Werkzeug schreibt beim Bump 22
  // Quelldateien neu; ein `writeFileSync` darauf ist erst leer, dann halb, dann
  // ganz. Wer dieselbe Datei in dem Moment liest — ein Test, ein Editor, ein
  // parallel laufender Build — bekommt einen Torso und meldet einen Fehler, den
  // es im Code nicht gibt. Genau so sind am 2026-09-07 zweimal Tests
  // durchgefallen, die einzeln und danach wieder sauber liefen.
  // rename() im selben Verzeichnis ist auf allen hier benutzten Systemen
  // atomar: der Leser sieht entweder die alte oder die neue Datei, nie eine
  // halbe. Das Temporaerfile liegt bewusst DANEBEN, nicht in %TEMP% —
  // ueber Laufwerksgrenzen hinweg ist rename() kein Rename mehr.
  // Endung bewusst `.stamp.tmp`: `.gitignore` sperrt `*.tmp` (Z. 82). Mit
  // `-tmp` griffe die Regel NICHT, und ein nach einem Abbruch liegen
  // gebliebener Torso landete beim naechsten `git add -A` des Hooks im Commit.
  const tmp = file + '.stamp.tmp';
  fs.writeFileSync(tmp, out);
  fs.renameSync(tmp, file);
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

// ═══ README.md ═══
// Die README ist die Visitenkarte auf GitHub und trug bis v7.3.0 noch 6.9.16 —
// neun Releases hinter der App, weil niemand beim Bump daran dachte. Jetzt zieht
// der Build sie mit: das Versions-Badge per Muster, und zwischen den Markern
// <!-- changelog:start --> / <!-- changelog:end --> die juengsten Eintraege als
// Tabelle. Alles ausserhalb der Marker bleibt Handarbeit.
const README_ANFANG = '<!-- changelog:start -->';
const README_ENDE = '<!-- changelog:end -->';
const README_ANZAHL = 5;

// Titel je Eintrag genau wie die Release-Ansicht der Support-Seite (clSplit in
// components/support/support.html): erste Zeile, wenn sie <= 90 Zeichen hat und
// eine Leerzeile folgt; sonst der erste Satz; zuletzt der erste Absatz. Weicht
// das hier ab, stehen auf GitHub andere Ueberschriften als in der App.
function changelogTitel(text) {
  const t = String(text == null ? '' : text).replace(/\r\n/g, '\n').trim();
  if (!t) return '';
  const paras = t.split(/\n\s*\n/).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const first = paras[0] || '';
  const head = t.split('\n')[0].trim();
  if (paras.length > 1 && head === first && head.length <= 90) return head;
  const m = first.match(/^(.{10,}?[.!?])\s+/);
  return m ? m[1] : first;
}

function versionAbsteigend(a, b) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return (pb[i] || 0) - (pa[i] || 0);
  return 0;
}

// Reine Textfunktion (Test: tools/readme-stamp.test.mjs). CRLF bleibt CRLF —
// der Arbeitsbaum liegt wegen autocrlf so da, und ein LF-Rueckschreiben meldete
// die ganze Datei als geaendert.
function readmeStempeln(text, vj) {
  const crlf = text.includes('\r\n');
  let s = crlf ? text.split('\r\n').join('\n') : text;
  const v = vj.version;
  // Das Datum DER aktuellen Version, nicht das juengste im Verzeichnis — die
  // zwei fallen auseinander, sobald ein aelterer Eintrag nachdatiert wurde.
  const datum = (vj.changelogDates || {})[v] || vj.releaseDate || '';

  s = s.replace(/(img\.shields\.io\/badge\/version-)\d+\.\d+\.\d+(-)/g, (_m, pre, post) => pre + v + post);

  const a = s.indexOf(README_ANFANG), e = s.indexOf(README_ENDE);
  if (a !== -1 && e > a) {
    const versionen = Object.keys(vj.changelog || {}).sort(versionAbsteigend).slice(0, README_ANZAHL);
    const zeilen = versionen.map((k) => {
      const d = (vj.changelogDates || {})[k] || '—';
      const titel = changelogTitel(vj.changelog[k]).replace(/\|/g, '\\|');
      return '| ' + (k === v ? '**' + k + '**' : k) + ' | ' + d + ' | ' + titel + ' |';
    });
    // Leerzeilen um die Marker: ein HTML-Kommentar ist fuer Markdown ein
    // HTML-Block, und ohne Leerzeile klebt die Tabelle daran und rendert nicht.
    const block = [
      README_ANFANG,
      '',
      'Aktuelle Version: **v' + v + '**' + (datum ? ' · ' + datum : ''),
      '',
      '| Version | Datum | Was ist anders |',
      '|---|---|---|',
      ...zeilen,
      '',
      README_ENDE,
    ].join('\n');
    s = s.slice(0, a) + block + s.slice(e + README_ENDE.length);
  }
  return crlf ? s.split('\n').join('\r\n') : s;
}

function main() {
  // index.html ist GENERIERT (tools/build-index.js). Die Quelle — index.template.html —
  // muss mitgestempelt werden, sonst kippen die ?v=-Stempel beim naechsten Rebuild auf
  // den alten Stand zurueck und die 24h-Cache-Falle ist wieder da. components/ laeuft
  // vorsorglich mit, falls dort mal eine Asset-Referenz landet.
  const files = [
    path.join(ROOT, 'index.html'),
    path.join(ROOT, 'index.template.html'),
    ...walk(path.join(ROOT, 'components'), []),
    ...walk(path.join(ROOT, 'pages'), []),
    EN_DICT,
  ];

  let touched = 0, refs = 0;
  for (const f of files) {
    const n = stampFile(f);
    if (n !== null) { touched++; refs += n; }
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

  const readmePath = path.join(ROOT, 'README.md');
  if (fs.existsSync(readmePath)) {
    const raw = fs.readFileSync(readmePath, 'utf8');
    const out = readmeStempeln(raw, versionJson);
    if (out !== raw) {
      const tmp = readmePath + '.stamp.tmp';   // atomar, siehe stampFile()
      fs.writeFileSync(tmp, out);
      fs.renameSync(tmp, readmePath);
      console.log('stamp-assets: README.md → v' + version);
    }
  }

  console.log('stamp-assets: v' + version + ' → ' + refs + ' Referenzen in ' + touched + ' Datei(en)');
}

if (require.main === module) main();

module.exports = { readmeStempeln, changelogTitel, README_ANFANG, README_ENDE, README_ANZAHL };
