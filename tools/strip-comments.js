#!/usr/bin/env node
/**
 * strip-comments.js — entfernt Kommentare aus dem Deploy-Output (JS, CSS, HTML).
 *
 * WARUM: Die Quellen bleiben im Repo mit allen Kommentaren — die sind das
 * "Warum" fuer den naechsten Durchgang (CLAUDE.md). Auf myworklog.de sollen sie
 * nicht stehen; nicht aus Geheimhaltung (das Repo ist public), sondern weil
 * view-source auf einer Live-Seite keine 300 Zeilen Werkstattnotizen zeigen
 * soll. Bewusst KEIN zweiter Branch und kein Worktree (zwei Kopien der Wahrheit,
 * die bei jedem Commit nachgezogen werden muessten): ein Schritt am Ende von
 * `npm run build`, den nur Cloudflare ausfuehrt.
 *
 * WIE: JS ueber den echten Parser (acorn, onComment) — nie per Regex. `//` in
 * "https://", `/*` in einem Regex-Literal und Template-Literale mit Leerzeilen
 * sind genau die Faelle, an denen ein Muster scheitert. CSS ueber einen kleinen
 * Tokenizer (Strings und ungequotetes url() werden uebersprungen). HTML nur
 * ausserhalb von script/style/pre/code/textarea; Inline-<script>/<style> laufen
 * durch die JS-/CSS-Strecke. Es wird NUR geloescht — kein Umbenennen, kein
 * Umbrechen, kein Minify: die App haengt an onclick="fn()"-Globals, ein
 * umbenanntes fn waere stumm tot. Beweis in tools/strip-comments.test.mjs: der
 * acorn-Syntaxbaum vor und nach dem Strippen ist identisch.
 *
 * BLEIBT DRIN: Bloecke, die mit `!` beginnen, @license/@preserve,
 * //# sourceMappingURL, bedingte HTML-Kommentare (<!--[if …]) und alles in
 * Assets/js/vendor/ (fremder, fertig minifizierter Code mit Lizenzkopf).
 * HTML-Kommentare INNERHALB von JS-Strings (weather.js baut so eine SVG-Szene)
 * bleiben ebenfalls — sie sind Teil eines String-Werts, und der AST-Beweis
 * verlangt, dass String-Werte unangetastet bleiben.
 *
 * SICHERHEIT: In-place NUR auf Cloudflare (CF_PAGES=1). Lokal gibt es bewusst
 * kein --force: es gibt keinen Grund, die eigenen Quellen zu entkommentieren,
 * und prune-deploy.js hat gezeigt, was ein --force kostet. Zum Anschauen:
 *   node tools/strip-comments.js --out <ordner>   Kopien dorthin, Quellen bleiben
 *   node tools/strip-comments.js --dry-run        nur zaehlen
 *
 * REIHENFOLGE im Build: NACH repo-report (dessen Zeilenzahlen meinen die
 * Quelle) und VOR prune-deploy (das loescht tools/, also auch dieses Skript).
 */
'use strict';

const fs = require('fs');
const path = require('path');

let acorn;
try {
  acorn = require('acorn');
} catch (e) {
  console.error('[strip] ABBRUCH — acorn fehlt. Steht in package.json unter dependencies; `npm install` nachholen.');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');

// Was im Deploy liegt und Kommentare tragen kann. components/**/*.html und
// index.template.html fehlen bewusst: die loescht prune-deploy ohnehin.
const DEPLOY_DIRS = ['Assets', 'components', 'pages', 'config'];
const DEPLOY_FILES = ['index.html', '404.html', 'service-worker.js'];
const SKIP = [
  /^Assets\/js\/vendor\//,
  /^components\/.*\.html$/,
];
const EXT = new Set(['.js', '.css', '.html']);

// ───────────────────────── gemeinsame Zeilenlogik ─────────────────────────

function isBlank(s) {
  return /^[ \t\r]*$/.test(s);
}
function lineStartAt(src, i) {
  return src.lastIndexOf('\n', i - 1) + 1;
}
// Index NACH dem Zeilenumbruch der Zeile, in der i liegt (oder Dateiende).
function lineEndAt(src, i) {
  const k = src.indexOf('\n', i);
  return k < 0 ? src.length : k + 1;
}
function stripEol(s) {
  return s.replace(/\r?\n$/, '');
}

/**
 * Entfernt die Bereiche [start, end) aus src, von hinten nach vorn, und
 * raeumt dabei die Zeile auf:
 *  - steht der Kommentar allein auf seiner Zeile: Zeile weg; war er von zwei
 *    Leerzeilen umrahmt, geht eine davon mit (sonst haeufen sich Leerzeilen)
 *  - steht er am Zeilenende: Kommentar samt Leerraum davor weg
 *  - steht er am Zeilenanfang vor Code: Kommentar samt Leerraum danach weg
 *  - steht er mitten in der Zeile: weg, und nur wenn auf keiner Seite schon
 *    Leerraum steht, ein Leerzeichen — sonst kleben Tokens zusammen
 *    (`.e/**\/.f` → `.e .f`, aber `red; /* x *\/ margin` → `red; margin`).
 *    Enthielt der Kommentar selbst einen Zeilenumbruch, wird er zum
 *    Zeilenumbruch: in JS zaehlt der fuer die automatische Semikolon-Setzung,
 *    `a /*\n*\/ b` sind zwei Anweisungen, `a b` ist ein Syntaxfehler.
 */
function removeRanges(src, ranges) {
  const EOL = src.includes('\r\n') ? '\r\n' : '\n';
  let out = src;
  for (let k = ranges.length - 1; k >= 0; k--) {
    const { start, end } = ranges[k];
    const ls = lineStartAt(out, start);
    const le = lineEndAt(out, end);
    const before = out.slice(ls, start);
    const after = stripEol(out.slice(end, le));
    if (isBlank(before) && isBlank(after)) {
      let cutEnd = le;
      const prevBlank = ls > 0 && isBlank(stripEol(out.slice(lineStartAt(out, ls - 1), ls)));
      const nextLe = lineEndAt(out, le);
      const nextBlank = le < out.length && isBlank(stripEol(out.slice(le, nextLe)));
      if (prevBlank && nextBlank) cutEnd = nextLe;
      out = out.slice(0, ls) + out.slice(cutEnd);
    } else if (isBlank(after)) {
      const kept = before.replace(/[ \t]+$/, '');
      out = out.slice(0, ls + kept.length) + out.slice(end);
    } else if (isBlank(before)) {
      const rest = out.slice(end).replace(/^[ \t]+/, '');
      out = out.slice(0, start) + rest;
    } else {
      let left = out.slice(0, start);
      let right = out.slice(end);
      const wsL = /[ \t]$/.test(left);
      const wsR = /^[ \t]/.test(right);
      let sep = ' ';
      if (out.slice(start, end).includes('\n')) {
        sep = EOL;
        left = left.replace(/[ \t]+$/, '');
        right = right.replace(/^[ \t]+/, '');
      } else if (wsL || wsR) {
        sep = '';
        if (wsL && wsR) right = right.replace(/^[ \t]+/, '');
      }
      out = left + sep + right;
    }
  }
  return out;
}

// ───────────────────────────────── JS ─────────────────────────────────────

function keepJsComment(c) {
  if (c.type === 'Block') return c.value[0] === '!' || /@(license|preserve)\b/.test(c.value);
  return /^[#@]\s*source(Mapping)?URL=/.test(c.value);
}

function parseJs(src) {
  const comments = [];
  const opts = { ecmaVersion: 'latest', allowHashBang: true, onComment: comments };
  try {
    acorn.parse(src, { ...opts, sourceType: 'script' });
  } catch (e) {
    comments.length = 0;
    acorn.parse(src, { ...opts, sourceType: 'module' }); // wirft weiter, wenn beides scheitert
  }
  return comments;
}

function stripJs(src) {
  const ranges = parseJs(src)
    .filter((c) => !keepJsComment(c))
    .map((c) => ({ start: c.start, end: c.end }));
  return { text: removeRanges(src, ranges), removed: ranges.length };
}

// ───────────────────────────────── CSS ────────────────────────────────────

function cssCommentRanges(src) {
  const ranges = [];
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== '\n') {
        if (src[j] === '\\') j++;
        j++;
      }
      i = j + 1;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2);
      if (e < 0) break; // unterminiert: der Rest bleibt, wie im Browser
      if (src[i + 2] !== '!') ranges.push({ start: i, end: e + 2 });
      i = e + 2;
      continue;
    }
    if ((c === 'u' || c === 'U') && /^url\(/i.test(src.slice(i, i + 4))
        && (i === 0 || !/[\w-]/.test(src[i - 1]))) {
      let j = i + 4;
      while (j < n && /\s/.test(src[j])) j++;
      if (src[j] !== '"' && src[j] !== "'") {
        const e = src.indexOf(')', j);
        i = e < 0 ? n : e + 1;
        continue;
      }
      i = j; // gequotet: die String-Regel oben uebernimmt
      continue;
    }
    i++;
  }
  return ranges;
}

function stripCss(src) {
  const ranges = cssCommentRanges(src);
  return { text: removeRanges(src, ranges), removed: ranges.length };
}

// ───────────────────────────────── HTML ───────────────────────────────────

const RAW_OPEN = /<(script|style|pre|code|textarea|xmp)\b([^>]*)>/giy;
const JS_TYPES = new Set(['', 'text/javascript', 'application/javascript', 'module',
  'text/ecmascript', 'application/ecmascript']);

function scriptIsJs(attrs) {
  if (/\ssrc\s*=/i.test(attrs)) return false;
  const m = /\stype\s*=\s*["']?([^"'\s>]*)/i.exec(attrs);
  return JS_TYPES.has((m ? m[1] : '').toLowerCase());
}

function stripHtml(src) {
  const edits = [];
  const warnings = [];
  let removed = 0;
  const n = src.length;
  let i = 0;
  while (i < n) {
    if (src.startsWith('<!--', i)) {
      const e = src.indexOf('-->', i + 4);
      if (e < 0) break;
      const body = src.slice(i + 4, e).trim();
      if (!/^\[if\b|^<!\[endif\]/.test(body)) edits.push({ start: i, end: e + 3 });
      i = e + 3;
      continue;
    }
    if (src[i] === '<') {
      RAW_OPEN.lastIndex = i;
      const m = RAW_OPEN.exec(src);
      if (m) {
        const tag = m[1].toLowerCase();
        const contentStart = i + m[0].length;
        const closeRe = new RegExp('</' + tag + '\\s*>', 'ig');
        closeRe.lastIndex = contentStart;
        const cm = closeRe.exec(src);
        const contentEnd = cm ? cm.index : n;
        const inner = src.slice(contentStart, contentEnd);
        if (tag === 'script' && scriptIsJs(m[2])) {
          try {
            const r = stripJs(inner);
            if (r.removed) edits.push({ start: contentStart, end: contentEnd, text: r.text });
            removed += r.removed;
          } catch (err) {
            warnings.push('inline <script> nicht parsebar (bleibt): ' + err.message);
          }
        } else if (tag === 'style') {
          const r = stripCss(inner);
          if (r.removed) edits.push({ start: contentStart, end: contentEnd, text: r.text });
          removed += r.removed;
        }
        i = cm ? cm.index + cm[0].length : n;
        continue;
      }
    }
    i++;
  }
  let out = src;
  for (let k = edits.length - 1; k >= 0; k--) {
    const ed = edits[k];
    if (ed.text !== undefined) {
      out = out.slice(0, ed.start) + ed.text + out.slice(ed.end);
    } else {
      out = removeRanges(out, [ed]);
      removed++;
    }
  }
  return { text: out, removed, warnings };
}

// ─────────────────────────────── Dateien ──────────────────────────────────

function stripFile(rel, src) {
  const bom = src.charCodeAt(0) === 0xFEFF;
  if (bom) src = src.slice(1);
  const ext = path.extname(rel).toLowerCase();
  let r;
  if (ext === '.js') r = stripJs(src);
  else if (ext === '.css') r = stripCss(src);
  else if (ext === '.html') r = stripHtml(src);
  else return null;
  if (bom) r.text = String.fromCharCode(0xFEFF) + r.text;
  return r;
}

function listDeployFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (EXT.has(path.extname(e.name).toLowerCase())) out.push(p);
    }
  };
  for (const d of DEPLOY_DIRS) {
    const p = path.join(ROOT, d);
    if (fs.existsSync(p)) walk(p);
  }
  for (const f of DEPLOY_FILES) {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) out.push(p);
  }
  return out
    .map((p) => path.relative(ROOT, p).replace(/\\/g, '/'))
    .filter((rel) => !SKIP.some((re) => re.test(rel)))
    .sort();
}

function main() {
  const args = process.argv.slice(2);
  const KNOWN = ['--dry-run', '--out'];
  let dryRun = false;
  let outDir = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') dryRun = true;
    else if (args[i] === '--out') {
      outDir = args[++i];
      if (!outDir) { console.error('[strip] ABBRUCH — --out braucht einen Ordner.'); process.exit(1); }
      outDir = path.resolve(outDir);
    } else {
      console.error('[strip] ABBRUCH — unbekanntes Flag: ' + args[i] + '\n[strip] Erlaubt: ' + KNOWN.join(' | '));
      process.exit(1);
    }
  }
  const onCF = process.env.CF_PAGES === '1' || process.env.CF_PAGES === 'true';
  const inPlace = onCF && !dryRun && !outDir;
  if (!onCF && !dryRun && !outDir) {
    console.log('[strip] übersprungen (nicht auf Cloudflare — lokale Quellen bleiben unangetastet).');
    return;
  }
  if (outDir && path.relative(outDir, ROOT) === '') {
    console.error('[strip] ABBRUCH — --out zeigt auf das Projekt selbst.');
    process.exit(1);
  }
  if (dryRun) console.log('[strip] DRY-RUN — es wird NICHTS geschrieben, nur gezaehlt.');

  const tally = { '.js': [0, 0, 0], '.css': [0, 0, 0], '.html': [0, 0, 0] }; // [Dateien, Kommentare, Bytes]
  const skipped = [];
  for (const rel of listDeployFiles()) {
    const abs = path.join(ROOT, rel);
    const src = fs.readFileSync(abs, 'utf8');
    let r;
    try {
      r = stripFile(rel, src);
    } catch (err) {
      skipped.push(rel + ' — ' + err.message);
      continue;
    }
    if (!r) continue;
    for (const w of r.warnings || []) console.warn('[strip] ' + rel + ': ' + w);
    const t = tally[path.extname(rel).toLowerCase()];
    t[0]++;
    t[1] += r.removed;
    t[2] += Buffer.byteLength(src) - Buffer.byteLength(r.text);
    if (r.removed === 0) continue;
    if (inPlace) {
      fs.writeFileSync(abs, r.text);
    } else if (outDir) {
      const dest = path.join(outDir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, r.text);
    }
  }
  const sum = Object.values(tally).reduce((a, t) => [a[0] + t[0], a[1] + t[1], a[2] + t[2]], [0, 0, 0]);
  const fmt = (t) => `${t[0]} Dateien · ${t[1]} Kommentare · ${(t[2] / 1024).toFixed(1)} KB`;
  console.log(`[strip] JS   ${fmt(tally['.js'])}`);
  console.log(`[strip] CSS  ${fmt(tally['.css'])}`);
  console.log(`[strip] HTML ${fmt(tally['.html'])}`);
  for (const s of skipped) console.warn('[strip] ⚠ nicht parsebar, bleibt unveraendert: ' + s);
  const verb = inPlace ? 'entkommentiert' : outDir ? 'nach ' + outDir + ' geschrieben' : 'gezaehlt';
  console.log(`[strip] ✓ ${fmt(sum)} ${verb}.`);
}

module.exports = { stripJs, stripCss, stripHtml, stripFile, removeRanges, listDeployFiles, keepJsComment };

if (require.main === module) main();
