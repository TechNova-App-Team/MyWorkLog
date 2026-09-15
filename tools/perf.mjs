#!/usr/bin/env node
/**
 * Ladezeit messen und den Verlauf festhalten.
 *
 *   node tools/perf.mjs [url] [--runs 3] [--throttle none|4g|3g] [--trace] [--kein-log]
 *
 * Faehrt tools/lcp-measure.mjs (eigener headless Chrome per CDP — NICHT der
 * Automations-Tab, der ist hidden und malt nicht), zieht je Lauf TTFB, FCP,
 * LCP samt Element und das Ende der Skriptkette heraus und haengt EINE Zeile an
 * .claude/notes/perf-verlauf.md. Ohne diese Datei vergleicht jede Messung
 * gegen eine Erinnerung — mit ihr gegen die letzte Zahl derselben URL.
 *
 * Vorgabe-URL ist der lokale Server; laeuft der nicht, sagt das Skript, wie man
 * ihn startet, statt eine Messung gegen "connection refused" zu protokollieren.
 * Lokale Zahlen sind KEIN Live-Wert (Cloudflare inlinet Fonts, brotli, Edge) —
 * deshalb steht die URL in jeder Verlaufszeile.
 *
 * --trace haengt tools/lcp-trace.mjs an (Hauptthread bis LCP, erzwungene
 * Layouts mit Aufrufer); dessen Ausgabe wird unveraendert durchgereicht.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TOOLS, '..');
const VERLAUF = path.join(ROOT, '.claude', 'notes', 'perf-verlauf.md');

const argv = process.argv.slice(2);
const opt = { url: 'http://localhost:5001/', runs: 3, throttle: 'none', trace: false, log: true };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--runs') opt.runs = parseInt(argv[++i], 10) || 3;
  else if (a === '--throttle') opt.throttle = argv[++i] || 'none';
  else if (a === '--trace') opt.trace = true;
  else if (a === '--kein-log') opt.log = false;
  else if (a.startsWith('--')) { console.error(`Unbekannte Option: ${a}`); process.exit(2); }
  else opt.url = a;
}
if (!/^https?:\/\//.test(opt.url)) opt.url = 'https://' + opt.url.replace(/^\/+/, '');
if (!opt.url.endsWith('/') && !/\.[a-z]+$/i.test(opt.url) && !opt.url.includes('?')) opt.url += '/';

// Erreichbarkeit vor dem Chrome-Start — sonst misst man einen Fehler.
try {
  const r = await fetch(opt.url, { method: 'HEAD', signal: AbortSignal.timeout(8000), redirect: 'follow' });
  if (!r.ok) { console.error(`FEHLER: ${opt.url} antwortet mit HTTP ${r.status}.`); process.exit(1); }
} catch (e) {
  const lokal = /localhost|127\.0\.0\.1/.test(opt.url);
  console.error(`FEHLER: ${opt.url} nicht erreichbar (${e.cause?.code || e.message}).`);
  if (lokal) console.error('        Server starten:  bash ~/.claude/scripts/portman.sh start');
  process.exit(1);
}

// Version: lokal aus der Datei, live vom Server — die Zeile im Verlauf muss
// sagen, WELCHER Stand gemessen wurde.
async function version() {
  try {
    const u = new URL('/config/version.json', opt.url).toString() + '?t=' + Date.now();
    const r = await fetch(u, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (r.ok) return (await r.json()).version || '?';
  } catch { /* faellt auf lokal zurueck */ }
  try { return JSON.parse(readFileSync(path.join(ROOT, 'config', 'version.json'), 'utf8')).version; } catch { return '?'; }
}
const ver = await version();

console.log(`Messe ${opt.url}  (Version ${ver}, ${opt.runs} Laeufe, throttle=${opt.throttle}) …`);
const m = spawnSync(process.execPath, [path.join(TOOLS, 'lcp-measure.mjs'), opt.url, String(opt.runs), opt.throttle],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
if (m.status !== 0) {
  console.error(m.stderr || m.stdout);
  console.error(`FEHLER: lcp-measure.mjs endete mit Status ${m.status}.`);
  process.exit(1);
}

// Zeilen je Lauf einsammeln. lcp-measure schreibt pro Lauf einen Block
// "=== Lauf N (…) ===" mit Zeilen "nav {…}", "paint {…} …", "LCP [ … ]".
const laeufe = [];
let cur = null;
for (const zeile of m.stdout.split(/\r?\n/)) {
  let mm;
  if ((mm = /^=== Lauf (\d+) \(([^;)]+)/.exec(zeile))) { cur = { nr: +mm[1], art: mm[2].trim() }; laeufe.push(cur); continue; }
  if (!cur) continue;
  if ((mm = /^nav\s+(\{.*\})\s*$/.exec(zeile))) { try { cur.nav = JSON.parse(mm[1]); } catch {} }
  else if ((mm = /^paint\s+(\{.*?\})\s+blockingCssEnd\s+(\S+)\s+scriptsEnd\s+(\S+)\s+\((\d+) Skripte, (\d+) KB\)/.exec(zeile))) {
    try { cur.paint = JSON.parse(mm[1]); } catch {}
    cur.cssEnd = +mm[2]; cur.scriptsEnd = +mm[3]; cur.scripts = +mm[4]; cur.kb = +mm[5];
  }
  else if ((mm = /^LCP\s+(\[.*\])\s*$/.exec(zeile))) { try { cur.lcp = JSON.parse(mm[1]); } catch {} }
  else if ((mm = /^longtasks\s+(\[.*\])\s*$/.exec(zeile))) { try { cur.lt = JSON.parse(mm[1]); } catch {} }
  else if ((mm = /^SW-ctrl\s+(\S+)\s+fromSW\s+(\d+)\s*\/\s*(\d+)/.exec(zeile))) { cur.sw = mm[1] === 'true'; cur.fromSW = +mm[2]; cur.res = +mm[3]; }
}
if (!laeufe.length || !laeufe.some(l => l.lcp)) {
  console.error(m.stdout.slice(-2000));
  console.error('FEHLER: keine LCP-Zeile in der Ausgabe gefunden — Format von lcp-measure.mjs geaendert?');
  process.exit(1);
}

const ms = v => (v == null || Number.isNaN(v)) ? '   —' : String(Math.round(v)).padStart(4);
const el = l => { const k = l.lcp && l.lcp[l.lcp.length - 1]; if (!k) return '—'; return (k.el || '?').replace(/#\.$/, '').replace(/\.$/, '').replace(/#\./, '.'); };
const lcpMs = l => { const k = l.lcp && l.lcp[l.lcp.length - 1]; return k ? k.t : null; };
const fcp = l => l.paint && l.paint['first-contentful-paint'];
const ltSum = l => (l.lt || []).reduce((s, t) => s + t.d, 0);

console.log('');
console.log('Lauf  Art             TTFB  FCP   LCP   Skripte-Ende  Longtasks   LCP-Element');
for (const l of laeufe) {
  console.log(`${String(l.nr).padStart(3)}   ${l.art.padEnd(15)} ${ms(l.nav?.ttfb)}  ${ms(fcp(l))}  ${ms(lcpMs(l))}  ${ms(l.scriptsEnd)} (${l.scripts || '?'})  ${String((l.lt || []).length).padStart(2)}/${ms(ltSum(l))} ms   ${el(l)}`);
}

// Kandidatenliste des letzten (warmen) Laufs — die Reihenfolge zeigt, WAS
// wann Kandidat wurde; ein spaeter Kandidat mit grosser Flaeche ist der Hebel.
const warm = laeufe[laeufe.length - 1];
if (warm.lcp && warm.lcp.length > 1) {
  console.log('');
  console.log(`LCP-Kandidaten (Lauf ${warm.nr}): ` + warm.lcp.map(k => `${k.t} ms ${(k.el || '?').replace(/#\./, '.').replace(/\.$/, '')} (${k.size} px²)`).join(' → '));
}

// Verlauf: eine Zeile je Messung. Kalt = Lauf 1, warm = letzter Lauf.
const kalt = laeufe[0];
const datum = new Date();
const p = n => String(n).padStart(2, '0');
const stempel = `${datum.getFullYear()}-${p(datum.getMonth() + 1)}-${p(datum.getDate())} ${p(datum.getHours())}:${p(datum.getMinutes())}`;
const zeile = `| ${stempel} | ${ver} | ${opt.url} | ${opt.throttle} | ${ms(fcp(kalt)).trim()} / ${ms(lcpMs(kalt)).trim()} | ${ms(fcp(warm)).trim()} / ${ms(lcpMs(warm)).trim()} | ${el(warm)} | ${ms(warm.scriptsEnd).trim()} |`;

if (opt.log) {
  mkdirSync(path.dirname(VERLAUF), { recursive: true });
  if (!existsSync(VERLAUF)) {
    writeFileSync(VERLAUF,
      '# Perf-Verlauf\n\nEine Zeile je `node tools/perf.mjs`. Kalt = erster Lauf ohne SW, warm = letzter Lauf mit SW. ' +
      'Millisekunden. Lokale Zahlen sind kein Live-Wert (Fonts, brotli, Edge) — URL beachten.\n\n' +
      '| Datum | Version | URL | Throttle | kalt FCP / LCP | warm FCP / LCP | LCP-Element (warm) | Skripte-Ende (warm) |\n' +
      '|---|---|---|---|---|---|---|---|\n');
  }
  // Vorherige Zeile derselben URL fuer den Vergleich, BEVOR die neue dazukommt.
  const alt = readFileSync(VERLAUF, 'utf8').split(/\r?\n/).filter(z => z.startsWith('| 2'))
    .map(z => z.split('|').map(s => s.trim()))
    .filter(f => f[3] === opt.url && f[4] === opt.throttle);
  const vorher = alt[alt.length - 1];
  appendFileSync(VERLAUF, zeile + '\n');
  console.log('');
  if (vorher) {
    const warmVorher = parseInt((vorher[6] || '').split('/')[1], 10);
    const warmJetzt = lcpMs(warm);
    if (!Number.isNaN(warmVorher) && warmJetzt != null) {
      const d = Math.round(warmJetzt - warmVorher);
      console.log(`Warm-LCP gegen letzte Messung (${vorher[1]}, Version ${vorher[2]}): ${warmVorher} → ${Math.round(warmJetzt)} ms (${d >= 0 ? '+' : ''}${d} ms)`);
    }
  } else {
    console.log('Erste Messung dieser URL — ab jetzt gibt es einen Vergleich.');
  }
  console.log(`Verlauf: ${path.relative(ROOT, VERLAUF)} (${alt.length + 1} Zeilen zu dieser URL)`);
} else {
  console.log('\n(nicht protokolliert: --kein-log)');
}

if (opt.trace) {
  console.log('\n──── lcp-trace ────');
  const t = spawnSync(process.execPath, [path.join(TOOLS, 'lcp-trace.mjs'), opt.url, opt.throttle], { stdio: 'inherit' });
  if (t.status !== 0) console.error(`lcp-trace.mjs endete mit Status ${t.status}.`);
}
