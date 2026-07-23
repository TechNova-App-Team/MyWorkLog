#!/usr/bin/env node
/**
 * count-stats.js — zaehlt die Zahlen, die im Intro (index.template.html, S2/S3)
 * stehen: Zeilen Code und Commits.
 *
 * Warum ein Script statt Build-Injektion: Die Commit-Zahl braucht die volle
 * git-History. Cloudflare checkt flach aus (depth 1) — eine Injektion im Build
 * wuerde dort "1 Commit" ins Live-HTML schreiben. Also bleiben die Zahlen im
 * Template hartcodiert; dieses Script macht das Nachziehen zum Einzeiler.
 *
 * Aufruf: npm run stats   → Zahlen ausgeben und in index.template.html eintragen:
 *   - S2 "lines:"   (deutsch formatiert, z.B. 108.461)
 *   - S3 data-target der Karten "Zeilen Code" und "Commits"
 *
 * Gezaehlt werden getrackte .js/.css/.html-Quellen. Draussen bleiben:
 * generierte Artefakte (index.html ist ohnehin gitignored, pages/en/,
 * Assets/i18n/), Uebersetzungs-Dicts und Minified-Libs (fremder Code).
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });

const EXCLUDE = /^(pages\/en\/|Assets\/i18n\/|tools\/i18n\/dict\/)|\.min\.(js|css)$/;

const files = git(['ls-files', '--', '*.js', '*.css', '*.html'])
  .split('\n')
  .map((f) => f.trim())
  .filter((f) => f && !EXCLUDE.test(f));

let lines = 0;
const byExt = {};
for (const f of files) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) continue; // geloescht, aber noch im Index
  // Wie `wc -l`: die leere Zeile hinter dem abschliessenden \n zaehlt nicht mit.
  const parts = fs.readFileSync(abs, 'utf8').split('\n');
  if (parts[parts.length - 1] === '') parts.pop();
  const n = parts.length;
  lines += n;
  const ext = path.extname(f).slice(1);
  byExt[ext] = (byExt[ext] || 0) + n;
}

const commits = parseInt(git(['rev-list', '--count', 'HEAD']).trim(), 10);

console.log('Dateien : ' + files.length);
for (const ext of Object.keys(byExt).sort((a, b) => byExt[b] - byExt[a])) {
  console.log('  .' + ext.padEnd(5) + byExt[ext].toLocaleString('de-DE'));
}
console.log('');
console.log('lines   : ' + lines.toLocaleString('de-DE') + '   (data-target="' + lines + '")');
console.log('commits : ' + commits.toLocaleString('de-DE') + '   (data-target="' + commits + '")');
