#!/usr/bin/env node
/**
 * Wartungsschalter: config/maintenance.json schreiben und den Live-Stand lesen.
 *
 *   node tools/wartung.mjs                         Status lokal + live
 *   node tools/wartung.mjs an "Titel" [Optionen]   Wartung an (schreibt die Datei)
 *   node tools/wartung.mjs aus                     Wartung aus
 *
 * Optionen fuer `an`:
 *   --text "…"          Beschreibung (Vorgabe: neutraler Satz mit Daten-Hinweis)
 *   --eta 90m | 21:30   Rueckkehr: Dauer ab jetzt oder Uhrzeit heute (Vorgabe 60m)
 *   --schritte "A;B;C"  Ablaufliste; der erste Schritt steht auf "active"
 *   --mail adresse      supportEmail (Vorgabe: bisheriger Wert)
 *
 * Das Skript committet NICHT und pusht NICHT — es schreibt nur die Datei.
 * Live wird der Schalter erst nach Push + Pages-Deploy; `_headers` haelt
 * /config/* auf max-age=0 und der Torwaechter in index.template.html holt die
 * Datei mit cache:'no-store', also greift er dann sofort, ohne Purge.
 *
 * Die Felder sind genau die, die pages/maintenance/index.html liest:
 * active, title, description, incidentId, started, eta, steps[{label,status,time}],
 * supportEmail. Schritt-Status kennt die Seite nur als done|active|pending.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// WARTUNG_DATEI nur fuer den Test (tools/wartung.test.mjs) — der darf die
// echte Datei nie anfassen, ein vergessener Testlauf ginge sonst live.
const DATEI = process.env.WARTUNG_DATEI || path.join(ROOT, 'config', 'maintenance.json');
const LIVE = 'https://myworklog.de/config/maintenance.json';

function lesen() {
  return JSON.parse(readFileSync(DATEI, 'utf8'));
}

function schreiben(cfg) {
  writeFileSync(DATEI, JSON.stringify(cfg, null, 2) + '\n');
  JSON.parse(readFileSync(DATEI, 'utf8'));   // Gegenprobe: muss wieder lesbar sein
}

// ISO mit LOKALEM Offset ("2026-09-15T22:30:00+02:00"), nicht toISOString():
// das rechnet nach UTC, und die Seite zeigt die Zeit dem Nutzer als Uhrzeit an.
function isoLokal(d) {
  const p = n => String(n).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const vz = off >= 0 ? '+' : '-';
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` +
         `${vz}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`;
}

function uhrzeit(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// "90m" | "2h" | "21:30" | ISO -> Date
function etaParsen(s, jetzt) {
  if (!s) return new Date(jetzt.getTime() + 60 * 60000);
  let m;
  if ((m = /^(\d+)\s*(m|min)$/i.exec(s))) return new Date(jetzt.getTime() + +m[1] * 60000);
  if ((m = /^(\d+(?:[.,]\d+)?)\s*h$/i.exec(s))) return new Date(jetzt.getTime() + parseFloat(m[1].replace(',', '.')) * 3600000);
  if ((m = /^(\d{1,2}):(\d{2})$/.exec(s))) {
    const d = new Date(jetzt); d.setHours(+m[1], +m[2], 0, 0);
    if (d <= jetzt) d.setDate(d.getDate() + 1);   // "01:00" abends heisst morgen frueh
    return d;
  }
  const d = new Date(s);
  if (!isNaN(d)) return d;
  throw new Error(`--eta unlesbar: "${s}" (erlaubt: 90m, 2h, 21:30, ISO)`);
}

function slug(titel) {
  return titel.normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/ß/g, 'ss').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 14) || 'WARTUNG';
}

function optionen(argv) {
  const o = { rest: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { o[a.slice(2)] = argv[++i]; }
    else o.rest.push(a);
  }
  return o;
}

async function live() {
  try {
    const r = await fetch(`${LIVE}?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!r.ok) return { fehler: `HTTP ${r.status}` };
    return await r.json();
  } catch (e) {
    return { fehler: e.message };
  }
}

function zeile(name, cfg) {
  if (cfg.fehler) return `${name.padEnd(6)} nicht lesbar (${cfg.fehler})`;
  if (!cfg.active) return `${name.padEnd(6)} AUS`;
  const eta = cfg.eta ? ` · zurueck ${uhrzeit(new Date(cfg.eta))}` : '';
  return `${name.padEnd(6)} AN  „${cfg.title}"  (${cfg.incidentId || 'ohne Id'}${eta})`;
}

const [befehl, ...rest] = process.argv.slice(2);

if (!befehl || befehl === 'status') {
  const lokal = lesen();
  const l = await live();
  console.log(zeile('lokal', lokal));
  console.log(zeile('live', l));
  if (!l.fehler && !!lokal.active !== !!l.active) {
    console.log('→ lokal und live weichen ab: noch nicht gepusht/deployt.');
  }
  // kein process.exit hier: nach einem fetch() reisst das unter Windows den
  // noch schliessenden undici-Handle mit (Assertion in async.c) — Prozess
  // einfach auslaufen lassen.
} else if (befehl === 'an') {
  const o = optionen(rest);
  const titel = o.rest.join(' ').trim();
  if (!titel) { console.error('FEHLER: Titel fehlt.  node tools/wartung.mjs an "Titel" [--eta 90m]'); process.exit(2); }
  const alt = lesen();
  const jetzt = new Date();
  const eta = etaParsen(o.eta, jetzt);
  const minuten = Math.round((eta - jetzt) / 60000);
  const schritte = (o.schritte ? o.schritte.split(';') : ['Update wird eingespielt', 'Prüfung & Freigabe'])
    .map(s => s.trim()).filter(Boolean)
    .map((label, i) => ({ label, status: i === 0 ? 'active' : 'pending', time: i === 0 ? 'läuft' : '-' }));
  const cfg = {
    active: true,
    title: titel,
    description: o.text || `Wir spielen gerade ein Update ein. Deine lokal gespeicherten Daten bleiben vollständig erhalten. Wir sind in etwa ${minuten} Minuten zurück.`,
    incidentId: `INC-${jetzt.getFullYear()}.${String(jetzt.getMonth() + 1).padStart(2, '0')}.${String(jetzt.getDate()).padStart(2, '0')}-${slug(titel)}`,
    started: isoLokal(jetzt),
    eta: isoLokal(eta),
    steps: schritte,
    supportEmail: o.mail || alt.supportEmail || 'support@myworklog.de',
  };
  schreiben(cfg);
  console.log(`geschrieben: ${path.relative(ROOT, DATEI)}`);
  console.log(zeile('lokal', cfg));
  console.log(`ETA ${uhrzeit(eta)} (${minuten} min) · ${schritte.length} Schritte`);
  console.log('Live erst nach Commit + Push + Deploy.');
} else if (befehl === 'aus') {
  const cfg = lesen();
  if (!cfg.active) { console.log('lokal war schon AUS.'); }
  cfg.active = false;
  const t = uhrzeit(new Date());
  cfg.steps = (cfg.steps || []).map(s => ({ ...s, status: 'done', time: s.status === 'done' ? s.time : t }));
  schreiben(cfg);
  console.log(`geschrieben: ${path.relative(ROOT, DATEI)}`);
  console.log(zeile('lokal', cfg));
  console.log('Live erst nach Commit + Push + Deploy.');
} else {
  console.error(`Unbekannter Befehl: ${befehl}  (status | an "Titel" | aus)`);
  process.exit(2);
}
