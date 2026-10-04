#!/usr/bin/env node
/**
 * stamp-assets.js — haengt ?v=<inhalts-hash> an lokale Asset-Referenzen.
 *
 * Warum: Cloudflare liefert /Assets/* mit `Cache-Control: max-age=86400` aus (kommt
 * NICHT aus _headers — dort steht max-age=0 — sondern aus einer Dashboard-Regel).
 * Browser halten JS/CSS damit 24h fest, ohne je nachzufragen. Das HTML selbst ist
 * `max-age=0`, also immer frisch. Eine Query im HTML, die sich mit dem Inhalt
 * aendert, ist deshalb ein garantierter Cache-Miss genau dann, wenn es noetig ist.
 *
 * 🔴 Seit v8.1.11 der HASH der Datei, nicht mehr die App-Version. Mit der Version
 * bekamen bei JEDEM Bump alle 87 App-Dateien eine neue Adresse (650 KB gzip je
 * Nutzer und Release), obwohl sich je Release gemessen 1, 2 oder 15 davon
 * geaendert hatten. Nebenwirkung, die man nicht verlieren darf: der Stempel
 * stimmt jetzt auch OHNE Bump — Cloudflare stempelt im Build (`npm run build`)
 * selbst, ein vergessener Bump liefert keine veraltete Datei mehr aus.
 *
 * Gehasht wird mit CRLF→LF: lokal liegt der Baum wegen core.autocrlf mit CRLF,
 * der Cloudflare-Klon mit LF. Ohne Normalisierung waeren alle Stempel im
 * committeten HTML auf Live falsch (harmlos, Cloudflare stempelt neu — aber
 * jeder Vergleich lokal/live liefe ins Leere).
 *
 * Laeuft im Pre-Commit-Hook beim Bump und in `npm run build`.
 * Aufruf: node tools/stamp-assets.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
// sich nie unter gleichem Namen), fuer Videos nicht — die Datei wird ersetzt,
// der Name bleibt. `immutable` heisst, der Browser fragt NIE nach: auch nicht beim
// Neuladen und auch nicht nach einem Cloudflare-Purge, denn der raeumt die Kante,
// nicht den Geraete-Cache. Ergebnis war ein Handy, das nach dem Deploy weiter den
// alten Clip zeigte (intro.mp4, seit v7.5.0 entfernt). Mit ?v=<hash> aendert
// sich der Cache-Key, sobald sich die Datei aendert.
// Icons (favicon, apple-touch-icon, icon-NNN) bewusst NICHT: die laufen ohne
// Query mit `immutable`, Cache-Rate geht vor. Aendert sich das Symbol, einmal
// Cloudflare-Custom-Purge auf die Adressen (so am 04.10.2026 nach v8.1.7).
// Seit v7.4.5 auch /Grafiken/**/*.webp: die App-Screenshots auf /about/ werden bei
// jeder Aenderung der Oberflaeche unter gleichem Namen neu aufgenommen. data-src
// gehoert dazu, fuer Bilder, die ein Skript erst beim Oeffnen einsetzt.
const RE = /(\s(?:data-src|src|href)=")((?:\/(?:Assets|components)\/[^"?]+\.(?:js|css)|\/Grafiken\/[^"?]+\.(?:mp4|webm|webp)))(?:\?v=[^"]*)?(")/g;

// Zeichenketten in JS, die ein Skript zur Laufzeit nachlaedt (VIEW_SCRIPTS in
// tab-navigation.js, qrcode.min.js). NUR Literale, die schon `?v=` tragen —
// das ist das Opt-in: kein anderer Pfad in einer JS-Datei wird je angefasst.
// Bis v8.1.10 schauten diese Lader den ?v= eines fremden <script> ab; mit
// Inhalts-Hashes ergaebe das den Hash der FALSCHEN Datei, also eine Adresse,
// die sich nicht aendert, wenn sich das Nachgeladene aendert.
const JS_RE = /(['"`])(\/(?:Assets|components)\/[^'"`?\s]+\.(?:js|css))\?v=[^'"`]*\1/g;

const TEXT_EXT = new Set(['.js', '.css', '.html', '.json', '.svg']);

// sha256 ueber den Inhalt, Textdateien mit LF (siehe Kopf), 10 Hex-Zeichen.
function hashInhalt(buf, ext) {
  const daten = TEXT_EXT.has(ext) ? Buffer.from(buf.toString('utf8').split('\r\n').join('\n'), 'utf8') : buf;
  return crypto.createHash('sha256').update(daten).digest('hex').slice(0, 10);
}

// Schreibt die JS-Literale einer Datei und gibt danach ihren Hash. Eine Datei,
// die eine andere nachlaedt, wird ZUERST gestempelt: ihr Hash muss den Hash des
// Nachgeladenen enthalten, sonst bliebe tab-navigation.js gleich, waehrend sich
// history.js aendert — und die alte tab-navigation.js zeigte aus dem Cache
// weiter auf die alte history.js.
const _hashCache = new Map();
function hashVon(url, kette = []) {
  if (_hashCache.has(url)) return _hashCache.get(url);
  const datei = path.join(ROOT, url);
  if (!fs.existsSync(datei)) { _hashCache.set(url, null); return null; }
  if (kette.includes(url)) throw new Error('stamp-assets: Lade-Zyklus ' + [...kette, url].join(' → '));
  const ext = path.extname(datei).toLowerCase();
  if (ext === '.js') stampJsDatei(datei, url, kette);
  const h = hashInhalt(fs.readFileSync(datei), ext);
  _hashCache.set(url, h);
  return h;
}

function stampJsText(text, hashFn) {
  return text.replace(JS_RE, (m, q, url) => {
    const h = hashFn(url);
    return h ? q + url + '?v=' + h + q : m;
  });
}

function stampJsDatei(datei, url, kette) {
  const raw = fs.readFileSync(datei, 'utf8');
  if (!JS_RE.test(raw)) return;
  JS_RE.lastIndex = 0;
  const out = stampJsText(raw, (u) => hashVon(u, [...kette, url]));
  if (out !== raw) atomarSchreiben(datei, out);
}

// Jede geschriebene Datei, fuer --geaendert (der Hook staged genau diese).
const GEAENDERT = new Set();
function atomarSchreiben(file, out) {
  GEAENDERT.add(file);
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
}

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
  let n = 0;
  // Fehlt die Datei (Tippfehler im Pfad, 404 auf Live), bleibt die Referenz
  // unangetastet — ein erfundener Stempel wuerde den Fehler nur verdecken.
  let out = raw.replace(RE, (m, pre, url, post) => {
    const h = hashVon(url);
    if (!h) return m;
    n++;
    return pre + url + '?v=' + h + post;
  });
  for (const re of VERSION_RES) out = out.replace(re, (_m, pre, post) => pre + version + post);
  if (releaseDate && APP_FILES.has(file)) out = out.replace(DATE_RE, (_m, pre, post) => pre + releaseDate + post);
  if (out === raw) return null;
  atomarSchreiben(file, out);
  return n;
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
// Assets/js/support.js): erste Zeile, wenn sie <= 90 Zeichen hat und
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
    GEAENDERT.add(pkgPath);
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
      GEAENDERT.add(readmePath);
      console.log('stamp-assets: README.md → v' + version);
    }
  }

  console.log('stamp-assets: v' + version + ', ' + refs + ' Hash-Referenzen in ' + touched + ' geaenderten Datei(en)');
  // Fuer den Pre-Commit-Hook: eine Datei je Zeile auf stdout, relativ zum Repo,
  // OHNE die generierten Artefakte (index.html, pages/en/ sind gitignored).
  // 🔴 Gemeldet wird nur, was der Hook gefahrlos stagen darf: eine Datei, deren
  // NICHT gestagter Unterschied ausschliesslich aus ?v=-Stempeln besteht. Liegt
  // daneben fremde Arbeit (Codex parallel, CLAUDE.md „Fremde Änderungen"), wuerde
  // ein `git add` sie in den Commit ziehen — die Datei kommt dann als GEMISCHT
  // und bleibt liegen.
  if (process.argv.includes('--geaendert')) {
    const liste = [...GEAENDERT].map(f => path.relative(ROOT, f).split(path.sep).join('/'))
      .filter(f => f !== 'index.html' && !f.startsWith('pages/en/'));
    const zeilen = liste.map(f => (nurStempelDiff(f) ? 'STEMPEL ' : 'GEMISCHT ') + f);
    process.stdout.write(zeilen.join('\n') + (zeilen.length ? '\n' : ''));
  }
}

// Vergleicht den Unterschied Arbeitsbaum ↔ Index, mit herausgenommenen Stempeln.
function nurStempelDiff(rel) {
  let diff;
  try {
    diff = require('child_process').execFileSync('git', ['diff', '--no-color', '-U0', '--', rel], { cwd: ROOT, encoding: 'utf8' });
  } catch (e) { return false; }
  // Versionsnummern und Daten zaehlen mit: die setzt dieses Skript beim Bump
  // selbst (VERSION_RES, DATE_RE).
  const ohne = (z) => z.slice(1).replace(/\r$/, '').replace(/\?v=[^"'`\s]*/g, '?v=')
    .replace(/\d+\.\d+\.\d+/g, 'X.Y.Z').replace(/\d{4}-\d{2}-\d{2}/g, 'JJJJ-MM-TT');
  const weg = [], dazu = [];
  for (const z of diff.split('\n')) {
    if (z.startsWith('---') || z.startsWith('+++')) continue;
    if (z.startsWith('-')) weg.push(ohne(z));
    else if (z.startsWith('+')) dazu.push(ohne(z));
  }
  return weg.sort().join('\n') === dazu.sort().join('\n');
}

if (require.main === module) main();

module.exports = { hashInhalt, stampJsText, nurStempelDiff, JS_RE, RE, readmeStempeln, changelogTitel, README_ANFANG, README_ENDE, README_ANZAHL };
