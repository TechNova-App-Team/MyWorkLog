#!/usr/bin/env node
/**
 * Live-Smoketest gegen die ausgelieferte Site.
 *
 * WARUM ES DAS GIBT: Das Routing dieser Site steht NICHT vollstaendig im Repo.
 * Eine Rewrite-Regel im Cloudflare-Dashboard laeuft am Edge vor `_redirects`
 * und kann jede Zeile darin ueberstimmen. Aendert jemand diese Regel, faellt
 * lokal nichts auf — `_redirects` liest sich weiter richtig. Genau so lag die
 * ArchFlow-Karte unbemerkt auf 404 (v6.4.1). Nur ein Abruf gegen Live sieht das.
 *
 * Abnahme: jede <loc> aus sitemap.xml muss DIREKT 200 liefern — ein 301/308
 * zaehlt dort als Fehler, weil der Canonical sonst nicht stimmt. Dateien duerfen
 * unterwegs weitergeleitet werden (Cloudflare Pages strippt `.html` per 308),
 * muessen aber am Ende 200 liefern.
 *
 * Usage: node tools/live-check.mjs [basis-url]
 *        node tools/live-check.mjs http://localhost:5001   (Portman)
 */

import fs from 'node:fs';

const BASE = (process.argv[2] || process.env.LIVE_BASE || 'https://myworklog.de').replace(/\/$/, '');
const PARALLEL = 6;
const RETRIES = 2;          // gegen Netz-Zufall, nicht gegen echte Fehler
const TIMEOUT_MS = 20000;

// Dateien ohne <loc>, die trotzdem oeffentlich erreichbar sein MUESSEN.
// Jede hier ist schon einmal still ausgefallen oder wuerde eine Seite leer lassen.
const ASSETS = [
  ['/Assets/js/archflow-data.js', 'ArchFlow-Karte (lag bis v6.4.1 auf 404)'],
  ['/pages/footer/footer.html',   'Shared Footer, von jeder Standalone-Seite gefetcht'],
  ['/config/version.json',        'Version + Changelog, steuert SW-Update'],
  ['/service-worker.js',          'Offline-Faehigkeit'],
  ['/manifest.json',              'PWA-Installation'],
  ['/sitemap.xml',                'Grundlage dieses Tests'],
  ['/robots.txt',                 'Indexierung'],
];

// Weiterleitungen, die gelten MUESSEN. Sie haengen an fremden Systemen — bricht
// eine, merkt es sonst niemand, weil kein Link im Repo dorthin zeigt.
const REDIRECTS = [
  ['/Googl-Chrome-Extension-DSGVO/', '/legal/farbe/', 'URL im Chrome-Web-Store-Eintrag'],
];

// BEKANNT KAPUTT — nur Hinweis, kein Fehler. Diese Formen stehen als 301 in
// `_redirects`, aber die Dashboard-Regel am Edge frisst sie vorher (gemessen
// 2026-08-28). Reparieren laesst sich das nur im Cloudflare-Dashboard oder mit
// einem echten Verzeichnis unter pages/. Ein roter Dauerzustand waere Rauschen,
// deshalb hier: faellt einer davon irgendwann auf 200/301, sagt der Test Bescheid
// und die Zeile gehoert nach oben in REDIRECTS.
const BEKANNT_KAPUTT = [
  ['/archflow',    'schraeglose Form; landet auf /pages/archflow/ statt /archflow/'],
  ['/impressum',   'kleingeschrieben; wird oft abgetippt'],
  ['/dsgvo',       'kleingeschrieben; wird oft abgetippt'],
  ['/Weihnachten', 'Altlast, sollte auf / gehen'],
];

function sitemapUrls() {
  const xml = fs.readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(m => m[1].trim().replace(/^https?:\/\/[^/]+/, ''));
}

async function probe(path, folgen = false) {
  for (let versuch = 0; versuch <= RETRIES; versuch++) {
    const abbruch = AbortSignal.timeout(TIMEOUT_MS);
    try {
      // GET statt HEAD: manche Edge-Regeln verhalten sich bei HEAD anders.
      const r = await fetch(BASE + path, { redirect: folgen ? 'follow' : 'manual', signal: abbruch });
      return { status: r.status, location: r.headers.get('location') || '' };
    } catch (e) {
      if (versuch === RETRIES) return { status: 0, location: '', fehler: String(e.message || e) };
      await new Promise(r => setTimeout(r, 800 * (versuch + 1)));
    }
  }
}

async function inChargen(aufgaben) {
  const ergebnisse = [];
  for (let i = 0; i < aufgaben.length; i += PARALLEL) {
    ergebnisse.push(...await Promise.all(aufgaben.slice(i, i + PARALLEL).map(f => f())));
  }
  return ergebnisse;
}

const fehler = [];

console.log(`Live-Check gegen ${BASE}\n`);

// ─── 1. Sitemap: alles direkt 200 ────────────────────────────────────────────
const seiten = sitemapUrls();
const seitenErg = await inChargen(seiten.map(p => async () => ({ p, ...await probe(p) })));
for (const { p, status, location, fehler: netz } of seitenErg) {
  const ok = status === 200;
  if (!ok) fehler.push(`sitemap  ${p}  →  ${netz ? 'NETZ: ' + netz : status + (location ? ' → ' + location : '')}`);
  console.log(`  ${ok ? '✓' : '✗'} ${status || '--'}  ${p}${location ? '  → ' + location : ''}`);
}

// ─── 2. Dateien, die kein <loc> haben ────────────────────────────────────────
console.log('');
// Weiterleitung erlaubt (CF strippt `.html`), das Ergebnis muss aber da sein.
const assetErg = await inChargen(ASSETS.map(([p, warum]) => async () => ({ p, warum, ...await probe(p, true) })));
for (const { p, warum, status } of assetErg) {
  const ok = status === 200;
  if (!ok) fehler.push(`datei    ${p}  →  ${status}   (${warum})`);
  console.log(`  ${ok ? '✓' : '✗'} ${status || '--'}  ${p}   ${warum}`);
}

// ─── 3. Weiterleitungen, die halten muessen ──────────────────────────────────
console.log('');
const redirErg = await inChargen(REDIRECTS.map(([p, ziel, warum]) => async () => ({ p, ziel, warum, ...await probe(p) })));
for (const { p, ziel, warum, status, location } of redirErg) {
  const ok = (status === 301 || status === 302 || status === 308) && location.replace(/^https?:\/\/[^/]+/, '') === ziel;
  if (!ok) fehler.push(`redirect ${p}  →  ${status} ${location || '(kein Location)'}   erwartet ${ziel}   (${warum})`);
  console.log(`  ${ok ? '✓' : '✗'} ${status || '--'}  ${p} → ${location || '—'}   ${warum}`);
}

// ─── 4. Fehlerseite: muss STATUS 404 liefern, nicht bloss so aussehen ────────
// Ein Soft-404 (Status 200 auf einer Nicht-Seite) laesst Google die Seite
// indexieren; deshalb zaehlt hier der Status, nicht der Text.
console.log('');
{
  const p = '/diese-seite-gibt-es-nicht-' + Date.now();
  const r = await probe(p, true);
  const ok = r.status === 404;
  if (!ok) fehler.push(`404-seite ${p}  →  ${r.status}   (erwartet 404, sonst Soft-404)`);
  console.log(`  ${ok ? '✓' : '✗'} ${r.status || '--'}  ${p}   Fehlerseite liefert echten 404-Status`);
}

// ─── 5. Bekannt kaputt: nur melden, wenn sich etwas GEBESSERT hat ────────────
console.log('');
const kaputtErg = await inChargen(BEKANNT_KAPUTT.map(([p, warum]) => async () => ({ p, warum, ...await probe(p) })));
const gebessert = [];
for (const { p, warum, status, location } of kaputtErg) {
  const jetztOk = status !== 404 && !/\/pages\//.test(location);
  if (jetztOk) gebessert.push(`${p} liefert jetzt ${status}${location ? ' → ' + location : ''}`);
  console.log(`  ${jetztOk ? '!' : '·'} ${status || '--'}  ${p}${location ? ' → ' + location : ''}   ${warum}`);
}

// ─── Ergebnis ────────────────────────────────────────────────────────────────
const gesamt = seiten.length + ASSETS.length + REDIRECTS.length + 1;
console.log('');
if (gebessert.length) {
  console.log('Hinweis — bekannt kaputte Adressen funktionieren wieder:');
  gebessert.forEach(z => console.log('  ' + z));
  console.log('Wurde die Dashboard-Regel geaendert? Dann Zeile aus BEKANNT_KAPUTT');
  console.log('nach REDIRECTS verschieben, damit sie ab jetzt bewacht wird.');
  console.log('');
}
if (fehler.length === 0) {
  console.log(`✓ ${gesamt} Adressen geprueft, alle in Ordnung.`);
  console.log(`  (${BEKANNT_KAPUTT.length} bekannt kaputte nicht mitgezaehlt.)`);
  process.exit(0);
}
console.error(`✗ ${fehler.length} von ${gesamt} Adressen kaputt:\n`);
fehler.forEach(z => console.error('  ' + z));
console.error('\nRouting steht nicht vollstaendig im Repo: pruefe die Rewrite-Regel im');
console.error('Cloudflare-Dashboard, bevor du _redirects aenderst.');
process.exit(1);
