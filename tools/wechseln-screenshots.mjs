#!/usr/bin/env node
// ═══ DIE AUFNAHMEN AUF /wechseln/ NEU MACHEN ═══
//
// Fuenf Bilder unter /Grafiken/wechseln/: der Weg in den Import (Seitenleiste,
// Menue „Daten uebernehmen") und der Import-Assistent in
// seinen drei Schritten (Zeilen einfuegen, Spalten zuordnen, Vorschau mit
// Saldo). Seed wie /about/ (tools/about-screenshots.mjs), 1440 x 900, 2x,
// WebP. Braucht den lokalen Server (Portman, 5001).
//
//   node tools/wechseln-screenshots.mjs   → Grafiken/wechseln/*.webp, danach bumpen (?v=)
//
// Die eingefuegte „Excel-Tabelle" ist erfunden: sechs Wochen vor dem ersten
// Seed-Eintrag, dazu die zwei ersten Seed-Tage, damit in der Vorschau
// „Tag existiert schon" steht. Tabulator-getrennt, wie Excel beim Kopieren
// liefert — also genau der Weg, den die Seite als den schnellsten empfiehlt.
// Der Assistent wird ueber seine eigenen Funktionen bedient (openImportWizard,
// mwlImportPaste, mwlImportBuildPreview), nicht per Klick-Attrappe.

import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const URL_APP = 'http://localhost:5001/';
const OUT = join(ROOT, 'Grafiken', 'wechseln');
const SEED = join(HERE, 'about-screenshots.seed.json');

const seedLauf = spawnSync(process.execPath, [join(HERE, 'about-screenshots.mjs'), '--nur-seed'], { cwd: ROOT, encoding: 'utf8' });
process.stdout.write(seedLauf.stdout); process.stderr.write(seedLauf.stderr);
if (seedLauf.status !== 0 || !existsSync(SEED)) { console.error('Seed fehlt'); process.exit(1); }

// ── Die erfundene Tabelle ──────────────────────────────────────────────
const seed = JSON.parse(readFileSync(SEED, 'utf8'));
const tage = seed.tg_pro_data.entries.map((e) => e.date).sort();
const erster = new Date(tage[0] + 'T00:00:00');
const de = (d) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
const rnd = (() => { let s = 7; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; })();
const notizen = ['Wareneingang geprüft', 'Inventur Lager 2', 'Kundenanrufe, Tickets', 'Server-Update begleitet', 'Schulung Warenwirtschaft', 'Angebote vorbereitet', ''];
const zeilen = [['Datum', 'Beginn', 'Ende', 'Pause', 'Typ', 'Notiz'].join('\t')];
const start = new Date(erster); start.setDate(start.getDate() - 7 * 6);
for (let d = new Date(start); d < erster; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    if (dow === 2) { zeilen.push([de(d), '', '', '', 'Berufsschule', 'Berufsschule'].join('\t')); continue; }
    const b = 7 * 60 + 15 + Math.floor(rnd() * 45);
    const dauer = (dow === 5 ? 4.5 : 8.75) * 60 + Math.round((rnd() - 0.4) * 50);
    const e = b + dauer + 30;
    const hm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    zeilen.push([de(d), hm(b), hm(e), '30', 'Arbeit', notizen[Math.floor(rnd() * notizen.length)]].join('\t'));
}
for (const t of tage.slice(0, 2)) zeilen.push([de(new Date(t + 'T00:00:00')), '07:30', '16:45', '30', 'Arbeit', 'Kundenanrufe, Tickets'].join('\t'));
const TABELLE = zeilen.join('\n');

const CLEAN = "var b=document.getElementById('localhostWarningBanner');if(b)b.remove();document.querySelectorAll('.toast,.smart-notification').forEach(function(e){e.remove();});";
const warte = (body) => `(function(){return new Promise(function(done){setTimeout(function(){${CLEAN}${body}},900);})})()`;
const EINFUEGEN = `openImportWizard();document.getElementById('impPasteArea').value=${JSON.stringify(TABELLE)};`;

// Jede Aufnahme meldet den Kasten, auf den die Kamera auf /wechseln/ zeigt,
// in Prozent des Bildes (Mitte x/y, Breite, Hoehe). Diese Zahlen gehoeren in
// die Brennpunkt-Regeln der Seite (.flow[data-step] … transform-origin, Ring) —
// nach jeder Neuaufnahme vergleichen.
const MISS = "function miss(el){var r=el.getBoundingClientRect(),W=innerWidth,H=innerHeight;return 'Mitte '+((r.left+r.width/2)/W*100).toFixed(1)+'% / '+((r.top+r.height/2)/H*100).toFixed(1)+'%, Groesse '+(r.width/W*100).toFixed(1)+'% x '+(r.height/H*100).toFixed(1)+'%';}";
const IMPORT_EINTRAG = "document.querySelector('.nav-item[onclick=\"showBackupMenu()\"]')";

const shots = [
    ['seitenleiste.webp', warte(`${MISS}var n=${IMPORT_EINTRAG};n.scrollIntoView({block:'center'});setTimeout(function(){done('Import-Eintrag: '+miss(n));},500);`)],
    ['menue.webp', warte(`${MISS}showBackupMenu();setTimeout(function(){var b=document.querySelector('button[onclick*="openImportWizard"]');done('Excel-Knopf: '+miss(b));},600);`)],
    ['einfuegen.webp', warte(`${MISS}${EINFUEGEN}var t=document.getElementById('impPasteArea');t.scrollTop=0;setTimeout(function(){done('Einfuegefeld: '+miss(t));},500);`)],
    ['spalten.webp', warte(`${MISS}${EINFUEGEN}mwlImportPaste();setTimeout(function(){done('Zuordnung: '+miss(document.getElementById('impMapRows'))+' · '+_mwlImport.body.length+' Zeilen');},500);`)],
    ['vorschau.webp', warte(`${MISS}${EINFUEGEN}mwlImportPaste();mwlImportBuildPreview();setTimeout(function(){done('Saldo-Zeile: '+miss(document.getElementById('impSummary'))+' · '+document.querySelectorAll('.imp-badge.warn').length+' vorhanden');},500);`)],
];

mkdirSync(OUT, { recursive: true });
let fehler = 0;
for (const [datei, js] of shots) {
    const r = spawnSync(process.execPath, [join(HERE, 'screenshot.mjs'), URL_APP, join(OUT, datei), '--w', '1440', '--h', '900', '--dpr', '2', '--quality', '88', '--seed', SEED, '--wait', '3500', '--js', js], { cwd: ROOT, encoding: 'utf8' });
    process.stdout.write(r.stdout); process.stderr.write(r.stderr);
    if (r.status !== 0) fehler++;
}
console.log(fehler ? `${fehler} Aufnahme(n) fehlgeschlagen` : 'Fuenf Aufnahmen unter Grafiken/wechseln/ — danach bumpen, damit die ?v= wechseln.');
process.exit(fehler ? 1 : 0);
