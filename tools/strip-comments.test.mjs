#!/usr/bin/env node
/**
 * Prueft tools/strip-comments.js — den Build-Schritt, der auf Cloudflare die
 * Kommentare aus JS/CSS/HTML entfernt.
 *
 * Der Beweis, der zaehlt, steht in Abschnitt 4: fuer JEDE JS-Datei im Deploy
 * (und jedes Inline-<script>) ist der acorn-Syntaxbaum vor und nach dem
 * Strippen identisch, Positionen abgestreift. Das faengt, was ein Zeilendiff
 * nicht faengt — ein `//` in "https://", ein `/*` im Regex-Literal, eine
 * Leerzeile in einem Template-Literal. Fuer HTML vergleicht Abschnitt 5 den
 * DOM (jsdom, Kommentarknoten entfernt, Leerraum normalisiert).
 *
 * Jede Negativ-Behauptung hat ihre Gegenprobe: „keine Kommentare mehr" ist nur
 * dann ein Befund, wenn vorher welche da waren.
 */

import { mkdtempSync, readFileSync, rmSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import { JSDOM } from 'jsdom';
import strip from './strip-comments.js';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TOOLS, '..');
const { stripJs, stripCss, stripHtml, stripFile, listDeployFiles } = strip;

let fehler = 0, n = 0;
function ok(bedingung, text) {
  n++;
  if (bedingung) console.log(`  ✓ ${text}`);
  else { fehler++; console.log(`  ✗ ${text}`); }
}

function ast(src) {
  let tree;
  const opts = { ecmaVersion: 'latest', allowHashBang: true };
  try { tree = acorn.parse(src, { ...opts, sourceType: 'script' }); }
  catch { tree = acorn.parse(src, { ...opts, sourceType: 'module' }); }
  return JSON.stringify(tree, (k, v) => (k === 'start' || k === 'end' ? undefined : v));
}

// ───────────────────────── 1. JS-Grenzfaelle ─────────────────────────

console.log('── 1. JS: was ein Regex falsch machen wuerde');
{
  const src = [
    '// Kopf',
    'const url = "https://example.org/a"; // Adresse',
    "const re = /\\/\\*nicht\\*\\//g; /* echt */",
    'const t = `zeile1',
    '',
    '// kein Kommentar, steht im Template',
    'zeile3`;',
    'const q = a / b / c;',
    'function f(/* x */ a, /* y */ b) { return a + b; }',
    '',
    '/* mehr',
    '   zeilig */',
    '',
    'let z = 1 /* eins',
    '*/ let w = 2',
    '/*! lizenz */',
    '/* @license MIT */',
    '//# sourceMappingURL=x.map',
    'const ende = 1; // letzte Zeile ohne Umbruch',
  ].join('\n');
  const r = stripJs(src);
  ok(ast(r.text) === ast(src), 'AST identisch');
  ok(r.text.includes('"https://example.org/a"'), '// in einem String bleibt');
  ok(r.text.includes("/\\/\\*nicht\\*\\//g"), '/* im Regex-Literal bleibt');
  ok(r.text.includes('zeile1\n\n// kein Kommentar, steht im Template\nzeile3'), 'Template-Literal byteweise unveraendert (inkl. Leerzeile und //)');
  ok(!r.text.includes('Kopf') && !r.text.includes('Adresse') && !r.text.includes('echt') && !r.text.includes('mehr'), 'echte Kommentare sind weg');
  ok(r.text.includes('function f( a,  b)') || r.text.includes('function f(a, b)') || /function f\(\s*a,\s*b\)/.test(r.text), 'Inline-Kommentar in der Parameterliste klebt keine Tokens zusammen');
  ok(/let z = 1\nlet w = 2/.test(r.text), 'mehrzeiliger Blockkommentar mitten in der Zeile wird zum Zeilenumbruch (ASI)');
  ok(r.text.includes('/*! lizenz */') && r.text.includes('@license MIT') && r.text.includes('//# sourceMappingURL=x.map'), 'Lizenz, @license und sourceMappingURL bleiben');
  ok(r.text.endsWith('const ende = 1;'), 'Kommentar am Dateiende ohne Umbruch: Code bleibt, Kommentar und Leerraum weg');
  ok(r.removed === 8, `8 Kommentare gezaehlt (${r.removed})`);
  ok(stripJs(r.text).text === r.text && stripJs(r.text).removed === 0, 'idempotent: zweiter Lauf aendert nichts');

  const crlf = 'a();\r\n// weg\r\n\r\n// auch weg\r\nb(); // ende\r\n';
  const rc = stripJs(crlf);
  ok(rc.text === 'a();\r\n\r\nb();\r\n', `CRLF bleibt CRLF, Leerzeilen haeufen sich nicht (${JSON.stringify(rc.text)})`);

  const blank = 'a();\n\n// weg\n\nb();\n';
  ok(stripJs(blank).text === 'a();\n\nb();\n', 'Kommentar zwischen zwei Leerzeilen: eine Leerzeile bleibt');

  let threw = false;
  try { stripJs('function ( {'); } catch { threw = true; }
  ok(threw, 'nicht parsebares JS wirft (Datei bleibt dann unveraendert, siehe CLI)');
}

// ───────────────────────── 2. CSS-Grenzfaelle ─────────────────────────

console.log('── 2. CSS: Strings, url(), Lizenz, unterminiert');
{
  const src = [
    '/* Kopf */',
    '.a::before { content: "/* kein kommentar */"; } /* echt */',
    ".b { background: url(data:image/svg+xml;utf8,<svg>/*x*/</svg>) no-repeat; }",
    ".c { background: url('/*auch string*/'); }",
    '/*! lizenz */',
    '.d { color: red; /* mitte */ margin: 0 }',
    '.e/**/.f { }',
  ].join('\n');
  const r = stripCss(src);
  ok(r.text.includes('content: "/* kein kommentar */"'), '/* in einem String bleibt');
  ok(r.text.includes('<svg>/*x*/</svg>'), '/* in ungequotetem url() bleibt');
  ok(r.text.includes("url('/*auch string*/')"), '/* in gequotetem url() bleibt');
  ok(r.text.includes('/*! lizenz */'), '/*! bleibt');
  ok(!r.text.includes('Kopf') && !r.text.includes('echt') && !r.text.includes('mitte'), 'echte Kommentare weg');
  ok(r.text.includes('.d { color: red; margin: 0 }'), 'Kommentar mitten in der Zeile: ein Leerzeichen');
  ok(r.text.includes('.e .f { }'), 'leerer Kommentar zwischen Selektoren klebt sie nicht zusammen');
  ok(r.removed === 4, `4 Kommentare gezaehlt (${r.removed})`);
  const unt = '.a { } /* nie zu';
  ok(stripCss(unt).text === unt, 'unterminierter Kommentar: Datei bleibt, wie sie ist');
}

// ───────────────────────── 3. HTML-Grenzfaelle ─────────────────────────

console.log('── 3. HTML: raw-Bereiche, Inline-Skripte, bedingte Kommentare');
{
  const src = [
    '<!doctype html>',
    '<!-- Kopf -->',
    '<html><head>',
    '<!--[if IE]><p>alt</p><![endif]-->',
    '<style>/* css weg */ .a { color: red }</style>',
    '<script>// js weg\nconst s = "<!-- bleibt, ist ein String -->";</script>',
    '<script src="/x.js"><!-- bleibt: hat src --></script>',
    '<script type="application/ld+json">{"a":"<!-- bleibt -->"}</script>',
    '</head><body>',
    '<pre><!-- bleibt: pre --></pre>',
    '<p>Text <code><!-- bleibt: code --></code> <!-- weg --> Ende</p>',
    '<textarea><!-- bleibt: textarea --></textarea>',
    '<svg><!-- weg: svg --><path d="M0 0"/></svg>',
    '</body></html>',
  ].join('\n');
  const r = stripHtml(src);
  ok(!r.text.includes('Kopf') && !r.text.includes('<!-- weg -->') && !r.text.includes('weg: svg'), 'HTML-Kommentare weg, auch im Inline-SVG');
  ok(r.text.includes('<!--[if IE]>'), 'bedingter Kommentar bleibt');
  ok(r.text.includes('<style> .a { color: red }</style>') || r.text.includes('<style>.a { color: red }</style>'), 'Inline-<style> laeuft durch die CSS-Strecke');
  ok(!r.text.includes('js weg') && r.text.includes('"<!-- bleibt, ist ein String -->"'), 'Inline-<script>: JS-Kommentar weg, HTML-Kommentar im String bleibt');
  ok(r.text.includes('<!-- bleibt: hat src -->') && r.text.includes('<!-- bleibt -->'), 'script[src] und ld+json unangetastet');
  ok(r.text.includes('<!-- bleibt: pre -->') && r.text.includes('<!-- bleibt: code -->') && r.text.includes('<!-- bleibt: textarea -->'), 'pre/code/textarea unangetastet');
  ok(r.text.includes('<p>Text <code><!-- bleibt: code --></code> Ende</p>'), 'Kommentar zwischen Text: ein Leerzeichen');
  ok(r.removed === 5, `5 Kommentare gezaehlt (${r.removed})`);
  ok(r.warnings.length === 0, 'keine Warnung');
  const kaputt = '<script>function ( {</script><!-- x -->';
  const rk = stripHtml(kaputt);
  ok(rk.warnings.length === 1 && rk.text.includes('function ( {'), 'nicht parsebares Inline-Skript: Warnung, Skript bleibt, Rest wird trotzdem gestrippt');
}

// ───────────────────── 4. echte JS-Dateien: AST-Beweis ─────────────────────

console.log('── 4. Deploy-JS: acorn-AST vor/nach identisch');
{
  const files = listDeployFiles();
  const js = files.filter((f) => f.endsWith('.js'));
  let gleich = 0, entfernt = 0, dateienMit = 0;
  const abweichend = [];
  for (const rel of js) {
    const src = readFileSync(path.join(ROOT, rel), 'utf8');
    const r = stripJs(src);
    entfernt += r.removed;
    if (r.removed) dateienMit++;
    if (ast(r.text) === ast(src)) gleich++; else abweichend.push(rel);
  }
  ok(js.length > 100, `es gibt ueberhaupt JS im Deploy (${js.length} Dateien)`);
  ok(abweichend.length === 0, `AST identisch in allen ${gleich} Dateien` + (abweichend.length ? ' — ABWEICHEND: ' + abweichend.join(', ') : ''));
  ok(entfernt > 5000, `Gegenprobe: es wurde ueberhaupt etwas entfernt (${entfernt} Kommentare in ${dateienMit} Dateien)`);
  ok(!js.some((f) => f.includes('/vendor/')), 'Assets/js/vendor/ ist nicht in der Liste');
  ok(!files.some((f) => /^components\/.*\.html$/.test(f)) && !files.includes('index.template.html'), 'Komponenten-Fragmente und Template nicht in der Liste (prune loescht sie)');
  ok(files.includes('service-worker.js') && files.includes('config/supabase-config.js'), 'Service Worker und supabase-config.js sind drin (werden live geladen)');
}

// ───────────────────── 5. echte HTML/CSS-Dateien ─────────────────────

function domShape(html) {
  const doc = new JSDOM(html).window.document;
  const scripts = [], styles = [];
  const walk = (node) => {
    for (const ch of [...node.childNodes]) {
      if (ch.nodeType === 8) { ch.remove(); continue; }
      if (ch.nodeType !== 1) continue;
      const t = ch.tagName.toLowerCase();
      if (t === 'script') {
        if (!ch.hasAttribute('src') && ['', 'text/javascript', 'module'].includes((ch.getAttribute('type') || '').toLowerCase())) {
          scripts.push(ch.textContent); ch.textContent = '';
        }
        continue;
      }
      if (t === 'style') { styles.push(ch.textContent); ch.textContent = ''; continue; }
      if (t === 'pre' || t === 'textarea' || t === 'code') continue;
      walk(ch);
    }
  };
  walk(doc.documentElement);
  doc.normalize();
  const text = (node) => {
    for (const ch of [...node.childNodes]) {
      if (ch.nodeType === 3) {
        const v = ch.data.replace(/\s+/g, ' ').trim();
        if (v) ch.data = v; else ch.remove();
      } else if (ch.nodeType === 1 && !['pre', 'textarea', 'code', 'script', 'style'].includes(ch.tagName.toLowerCase())) {
        text(ch);
      }
    }
  };
  text(doc.documentElement);
  return { html: doc.documentElement.outerHTML, scripts, styles };
}

console.log('── 5. Deploy-HTML: DOM ohne Kommentarknoten identisch, Inline-Skripte AST-gleich');
{
  const html = listDeployFiles().filter((f) => f.endsWith('.html'));
  let entfernt = 0, warn = 0;
  const domAb = [], jsAb = [], cssRest = [];
  for (const rel of html) {
    const src = readFileSync(path.join(ROOT, rel), 'utf8');
    const r = stripHtml(src);
    entfernt += r.removed;
    warn += r.warnings.length;
    const a = domShape(src), b = domShape(r.text);
    if (a.html !== b.html) domAb.push(rel);
    if (a.scripts.length !== b.scripts.length || a.scripts.some((s, i) => ast(s) !== ast(b.scripts[i]))) jsAb.push(rel);
    if (b.styles.some((s) => stripCss(s).removed > 0)) cssRest.push(rel);
  }
  ok(html.length > 30, `es gibt ueberhaupt HTML im Deploy (${html.length} Dateien)`);
  ok(domAb.length === 0, 'DOM identisch' + (domAb.length ? ' — ABWEICHEND: ' + domAb.join(', ') : ''));
  ok(jsAb.length === 0, 'Inline-Skripte AST-identisch' + (jsAb.length ? ' — ABWEICHEND: ' + jsAb.join(', ') : ''));
  ok(cssRest.length === 0, 'Inline-Styles ohne Kommentarrest' + (cssRest.length ? ' — REST: ' + cssRest.join(', ') : ''));
  ok(warn === 0, `kein Inline-Skript unparsebar (${warn} Warnungen)`);
  ok(entfernt > 1000, `Gegenprobe: es wurde ueberhaupt etwas entfernt (${entfernt})`);
}

console.log('── 5b. Deploy-CSS: idempotent, kein Rest, Lizenzen bleiben');
{
  const css = listDeployFiles().filter((f) => f.endsWith('.css'));
  let entfernt = 0;
  const rest = [], nichtIdem = [];
  for (const rel of css) {
    const src = readFileSync(path.join(ROOT, rel), 'utf8');
    const r = stripCss(src);
    entfernt += r.removed;
    const r2 = stripCss(r.text);
    if (r2.removed > 0) rest.push(rel);
    if (r2.text !== r.text) nichtIdem.push(rel);
    const bang = (src.match(/\/\*!/g) || []).length;
    if (bang !== (r.text.match(/\/\*!/g) || []).length) rest.push(rel + ' (Lizenz verloren)');
  }
  ok(css.length > 30, `es gibt ueberhaupt CSS im Deploy (${css.length} Dateien)`);
  ok(rest.length === 0 && nichtIdem.length === 0, 'zweiter Lauf findet nichts mehr' + (rest.concat(nichtIdem).length ? ' — ' + rest.concat(nichtIdem).join(', ') : ''));
  ok(entfernt > 500, `Gegenprobe: es wurde ueberhaupt etwas entfernt (${entfernt})`);
}

// ───────────────────────────── 6. CLI ─────────────────────────────

console.log('── 6. CLI: lokal nichts, --out kopiert, --dry-run zaehlt, Unbekanntes bricht ab');
{
  const probe = 'components/core/state-config.js';
  const vorher = readFileSync(path.join(ROOT, probe), 'utf8');
  const run = (args, env = {}) => spawnSync(process.execPath, [path.join(TOOLS, 'strip-comments.js'), ...args],
    { encoding: 'utf8', env: { ...process.env, CF_PAGES: '', ...env } });

  const r0 = run([]);
  ok(r0.status === 0 && /übersprungen/.test(r0.stdout), 'ohne CF_PAGES: uebersprungen, Exit 0');
  ok(readFileSync(path.join(ROOT, probe), 'utf8') === vorher, 'Quelle byteweise unveraendert');

  const r1 = run(['--dry-run']);
  ok(r1.status === 0 && /DRY-RUN/.test(r1.stdout) && /JS\s+\d+ Dateien · \d+ Kommentare/.test(r1.stdout), 'dry-run zaehlt je Typ');
  ok(!/⚠/.test(r1.stdout + r1.stderr), 'dry-run meldet keine unparsebare Datei');
  ok(readFileSync(path.join(ROOT, probe), 'utf8') === vorher, 'dry-run schreibt nichts');

  const TMP = mkdtempSync(path.join(tmpdir(), 'mwl-strip-'));
  const r2 = run(['--out', TMP]);
  const kopie = path.join(TMP, probe);
  ok(r2.status === 0 && existsSync(kopie), '--out legt die Kopie unter demselben Pfad ab');
  ok(existsSync(kopie) && readFileSync(kopie, 'utf8') === stripJs(vorher).text, 'Kopie entspricht stripJs(Quelle)');
  ok(readFileSync(path.join(ROOT, probe), 'utf8') === vorher, '--out laesst die Quelle in Ruhe');
  ok(!existsSync(path.join(TMP, 'Assets/js/vendor')), 'vendor/ wird nicht kopiert');
  rmSync(TMP, { recursive: true, force: true });

  const r3 = run(['--force']);
  ok(r3.status === 1 && /unbekanntes Flag/.test(r3.stderr), '--force gibt es nicht: Abbruch mit Exit 1');
  const r4 = run(['--out', ROOT]);
  ok(r4.status === 1 && /Projekt selbst/.test(r4.stderr), '--out auf das Projekt: Abbruch');

  // In-place-Pfad wie auf Cloudflare — in einem Wegwerf-Klon der Deploy-Struktur
  const CF = mkdtempSync(path.join(tmpdir(), 'mwl-cf-'));
  mkdirSync(path.join(CF, 'tools'), { recursive: true });
  mkdirSync(path.join(CF, 'components', 'x'), { recursive: true });
  writeFileSync(path.join(CF, 'tools', 'strip-comments.js'), readFileSync(path.join(TOOLS, 'strip-comments.js')));
  writeFileSync(path.join(CF, 'components', 'x', 'x.js'), '// weg\nconst a = 1; // auch\n');
  writeFileSync(path.join(CF, 'components', 'x', 'x.css'), '/* weg */ .a { }\n');
  writeFileSync(path.join(CF, 'index.html'), '<!-- weg --><p>hi</p>\n');
  const rcf = spawnSync(process.execPath, [path.join(CF, 'tools', 'strip-comments.js')],
    { encoding: 'utf8', env: { ...process.env, CF_PAGES: '1', NODE_PATH: path.join(ROOT, 'node_modules') } });
  ok(rcf.status === 0 && /entkommentiert/.test(rcf.stdout), `mit CF_PAGES=1: schreibt in-place (${(rcf.stdout + rcf.stderr).trim().split('\n').pop()})`);
  ok(readFileSync(path.join(CF, 'components', 'x', 'x.js'), 'utf8') === 'const a = 1;\n', 'JS in-place gestrippt');
  ok(readFileSync(path.join(CF, 'components', 'x', 'x.css'), 'utf8') === '.a { }\n', 'CSS in-place gestrippt');
  ok(readFileSync(path.join(CF, 'index.html'), 'utf8') === '<p>hi</p>\n', 'HTML in-place gestrippt');
  rmSync(CF, { recursive: true, force: true });
}

// ───────────────────────── 7. Build-Verdrahtung ─────────────────────────

console.log('── 7. package.json: Schritt steht nach repo-report und vor prune-deploy');
{
  const build = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts.build;
  const teile = build.split('&&').map((s) => s.trim());
  const iStrip = teile.findIndex((s) => s.includes('strip-comments'));
  const iPrune = teile.findIndex((s) => s.includes('prune-deploy'));
  const iReport = teile.findIndex((s) => s.includes('repo-report'));
  ok(iStrip > -1, 'strip-comments ist im Build');
  ok(iStrip < iPrune, 'vor prune-deploy (das loescht tools/)');
  ok(iStrip > iReport, 'nach repo-report (Zeilenzahlen meinen die Quelle)');
  const deps = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')).dependencies || {};
  ok('acorn' in deps, 'acorn steht unter dependencies (Cloudflare installiert keine devDependencies zuverlaessig)');
}

ok(n > 60, `es wurde ueberhaupt etwas geprueft (${n} Pruefungen)`);
console.log(fehler ? `\n✗ ${fehler} von ${n} Pruefungen durchgefallen` : `\n✓ ${n}/${n} gruen`);
process.exit(fehler ? 1 : 0);
