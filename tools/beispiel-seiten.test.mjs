#!/usr/bin/env node
// Berichtsheft-Beispiele (tools/beispiel-seiten.mjs): Daten gueltig, Seiten aktuell,
// und jede Berufsseite traegt, was Google und Leser brauchen.
//   node tools/beispiel-seiten.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

let ok = 0, fehl = 0;
const t = (bed, name, detail) => {
  if (bed) { ok++; console.log('  ok    ' + name); }
  else { fehl++; console.log('  FEHL  ' + name + (detail ? '\n        ' + detail : '')); }
};
const lies = (p) => fs.readFileSync(p, 'utf8').split('\r\n').join('\n');

const DATEN = 'tools/beispiele';
const dateien = fs.readdirSync(DATEN).filter((f) => f.endsWith('.json'));
t(dateien.length > 0, 'Gegenprobe: es gibt Berufsdaten');

let pruef = '';
try { pruef = execFileSync('node', ['tools/beispiel-seiten.mjs', '--check'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
catch (e) { pruef = String(e.stdout || '') + String(e.stderr || ''); }
t(pruef.includes('aktuell'), 'Daten gueltig, DE-Seiten und Sitemap aktuell', pruef.trim().split('\n').slice(0, 6).join(' | '));

const sitemap = lies('sitemap.xml');
const probleme = [];
for (const f of dateien) {
  const b = JSON.parse(fs.readFileSync(path.join(DATEN, f), 'utf8'));
  const p = `pages/berichtsheft-beispiele/${b.id}/index.html`;
  if (!fs.existsSync(p)) { probleme.push(b.id + ': Seite fehlt'); continue; }
  const h = lies(p);
  const blaetter = (h.match(/class="fm-page"/g) || []).length;
  if (blaetter !== b.de.wochen.length) probleme.push(b.id + ': ' + blaetter + ' Blaetter statt ' + b.de.wochen.length);
  if (!h.includes(b.de.wochen[0].betrieb[0].text.replace(/&/g, '&amp;').replace(/"/g, '&quot;'))) probleme.push(b.id + ': Wochentext steht nicht im HTML');
  if (!h.includes(`hreflang="en" href="https://myworklog.de/en/berichtsheft-beispiele/${b.id}/"`)) probleme.push(b.id + ': hreflang en fehlt');
  if ((h.match(/rel="canonical"/g) || []).length !== 1) probleme.push(b.id + ': nicht genau ein canonical');
  if (/undefined|NaN|\[object Object\]/.test(h)) probleme.push(b.id + ': undefined/NaN im HTML');
  if (!h.includes('href="/berichtsheft/"') || !h.includes('href="/berichtsheft-vorlage/"')) probleme.push(b.id + ': Weg in die App fehlt');
  if (!sitemap.includes(`<loc>https://myworklog.de/berichtsheft-beispiele/${b.id}/</loc>`)) probleme.push(b.id + ': nicht in der Sitemap');
  const titel = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  if (!titel || titel.length > 70) probleme.push(b.id + ': Titel fehlt oder > 70 Zeichen (' + titel.length + ')');
}
t(probleme.length === 0, 'jede Berufsseite: Blaetter, Text im HTML, hreflang, canonical, Wege, Sitemap, Titel', probleme.join('\n        '));

const hub = lies('pages/berichtsheft-beispiele/index.html');
const karten = (hub.match(/class="bb-karte"/g) || []).length;
t(karten === dateien.length, 'Uebersicht verlinkt jeden Beruf', karten + ' Karten, ' + dateien.length + ' Berufe');

// Laufzeit-Link-Regel fuer generierte Seitenfamilien ohne pages.config-Eintrag
const rt = lies('Assets/js/i18n-runtime.js');
t(rt.includes("pathOnly.indexOf('/berichtsheft-beispiele/') === 0"), 'i18n-runtime biegt Beispiel-Links auf /en/ um');
t(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(lies('tools/beispiel-seiten.mjs') + rt), 'keine Steuerzeichen in Generator und Laufzeit (Heredoc-Falle)');

console.log(`\nBerichtsheft-Beispiele: ${ok} ok, ${fehl} fehlgeschlagen`);
process.exit(fehl ? 1 : 0);
