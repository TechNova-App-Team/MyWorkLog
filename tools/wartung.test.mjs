#!/usr/bin/env node
/**
 * Prueft tools/wartung.mjs gegen eine Kopie von config/maintenance.json
 * (WARTUNG_DATEI) — die echte Datei bleibt unangetastet, sonst ginge ein
 * Testlauf mit dem naechsten Commit live.
 *
 * Was hier steht, ist genau das, was pages/maintenance/index.html liest:
 * active, title, description, incidentId, started, eta, steps[{label,status,time}],
 * supportEmail. Aendert sich dort ein Feldname, faellt es hier auf.
 */

import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TOOLS, '..');
const ECHT = path.join(ROOT, 'config', 'maintenance.json');
const TMP = mkdtempSync(path.join(tmpdir(), 'mwl-wartung-'));
const KOPIE = path.join(TMP, 'maintenance.json');
copyFileSync(ECHT, KOPIE);
const echtVorher = readFileSync(ECHT, 'utf8');

let fehler = 0, n = 0;
function ok(bedingung, text) {
  n++;
  if (bedingung) console.log(`  ✓ ${text}`);
  else { fehler++; console.log(`  ✗ ${text}`); }
}

function lauf(...args) {
  const r = spawnSync(process.execPath, [path.join(TOOLS, 'wartung.mjs'), ...args],
    { encoding: 'utf8', env: { ...process.env, WARTUNG_DATEI: KOPIE } });
  return { status: r.status, out: (r.stdout || '') + (r.stderr || ''), cfg: JSON.parse(readFileSync(KOPIE, 'utf8')) };
}

console.log('── an: Felder, Ableitungen, Schritte');
{
  const r = lauf('an', 'Größeres Update: Übersicht', '--eta', '90m', '--schritte', 'Daten sichern;Update einspielen;Prüfen');
  ok(r.status === 0, 'Exit 0');
  ok(r.cfg.active === true, 'active = true');
  ok(r.cfg.title === 'Größeres Update: Übersicht', 'Titel mit echten Umlauten unveraendert');
  ok(/^INC-\d{4}\.\d{2}\.\d{2}-[A-Z0-9-]{1,14}$/.test(r.cfg.incidentId), `incidentId in Form INC-JJJJ.MM.TT-SLUG (${r.cfg.incidentId})`);
  ok(/GROSSERES-UPDA/.test(r.cfg.incidentId), 'Slug: ö→O, ß→SS, ASCII, gekuerzt');
  ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(r.cfg.started), 'started ist ISO mit lokalem Offset, kein Z');
  const dauer = (new Date(r.cfg.eta) - new Date(r.cfg.started)) / 60000;
  ok(Math.abs(dauer - 90) < 1, `eta = started + 90 min (gemessen ${dauer.toFixed(1)})`);
  ok(r.cfg.steps.length === 3, 'drei Schritte');
  ok(r.cfg.steps[0].status === 'active' && r.cfg.steps[0].time === 'läuft', 'erster Schritt active/„läuft"');
  ok(r.cfg.steps.slice(1).every(s => s.status === 'pending' && s.time === '-'), 'uebrige Schritte pending');
  ok(r.cfg.steps.every(s => ['done', 'active', 'pending'].includes(s.status)), 'nur Status, die die Seite kennt');
  ok(r.cfg.supportEmail === JSON.parse(echtVorher).supportEmail, 'supportEmail aus der Vorlage uebernommen');
  ok(/Deine lokal gespeicherten Daten bleiben/.test(r.cfg.description), 'Vorgabetext traegt den Datenhinweis');
  ok(/90 Minuten/.test(r.cfg.description), 'Vorgabetext nennt die Minuten aus --eta');
  ok(/Live erst nach Commit/.test(r.out), 'Ausgabe erinnert an Commit + Push');
}

console.log('── an: Uhrzeit-ETA und eigener Text');
{
  const r = lauf('an', 'Test', '--eta', '23:59', '--text', 'Eigener Satz.');
  ok(r.status === 0, 'Exit 0');
  ok(r.cfg.description === 'Eigener Satz.', '--text ersetzt die Vorgabe');
  ok(new Date(r.cfg.eta) > new Date(r.cfg.started), 'Uhrzeit-ETA liegt nach started');
  ok(r.cfg.eta.includes('T23:59:00'), 'Uhrzeit-ETA traegt 23:59');
  ok(r.cfg.steps.length === 2, 'ohne --schritte zwei Vorgabeschritte');
}

console.log('── an: Fehlerpfade');
{
  const r = lauf('an');
  ok(r.status === 2, 'ohne Titel Exit 2');
  ok(r.cfg.active === true, 'Datei blieb unveraendert (vorheriger Stand)');
  const r2 = lauf('an', 'X', '--eta', 'quatsch');
  ok(r2.status !== 0, 'unlesbare --eta bricht ab');
  ok(/unlesbar/.test(r2.out), 'und sagt es');
}

console.log('── aus');
{
  const r = lauf('aus');
  ok(r.status === 0, 'Exit 0');
  ok(r.cfg.active === false, 'active = false');
  ok(r.cfg.steps.every(s => s.status === 'done'), 'alle Schritte done');
  ok(r.cfg.steps.every(s => /^\d{2}:\d{2}$/.test(s.time)), 'jeder Schritt hat eine Uhrzeit');
  ok(r.cfg.title === 'X' || r.cfg.title === 'Test', 'Titel bleibt als Historie stehen');
  const r2 = lauf('aus');
  ok(/schon AUS/.test(r2.out), 'zweites aus meldet es, kein Fehler');
}

console.log('── unbekannter Befehl');
{
  const r = lauf('foo');
  ok(r.status === 2, 'Exit 2');
}

console.log('── Gegenprobe');
ok(readFileSync(ECHT, 'utf8') === echtVorher, 'die echte config/maintenance.json ist byteweise unveraendert');
ok(n > 25, `es wurde ueberhaupt etwas geprueft (${n} Pruefungen)`);

rmSync(TMP, { recursive: true, force: true });
console.log(fehler ? `\n✗ ${fehler} von ${n} Pruefungen fehlgeschlagen` : `\n✓ ${n}/${n}`);
process.exit(fehler ? 1 : 0);
