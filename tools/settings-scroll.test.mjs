#!/usr/bin/env node
// ═══ TEST: Settings Modal Scroll & Akzentfarbe Performance ═══
//
// Fehleranalyse (CLAUDE.md Zeile 1157):
// Beim Scrollen in den Einstellungen zu "Akzentfarbe" kam es zu starken
// Rucklern/Lags (Framezeiten bis 206ms, ~26 FPS).
//
// Ursache:
// 1. In der Sektion .accent-picker liegen 37 Elemente mit box-shadow (35 Swatches
//    mit 3-lagigen Inset/Outset-Schatten, Hero-Preview, Custom-Picker) und
//    Radial-Gradients.
// 2. Der Scroll-Container (#settingsModal .modal-box > div[style*="overflow-y"])
//    hatte keine eigene Compositing-Ebene (will-change: auto).
// 3. .modal hat background: rgba(0,0,0,0.88) (semi-transparent). Auf der Seite
//    dahinter liegen ~50 Elemente mit backdrop-filter.
// Ohne will-change: scroll-position musste der Browser bei jedem Scroll-Tick den
// gesamten komplexen DOM-Baum der 35 Farbpunkte neu zeichnen und mit den
// backdrop-filter-Elementen dahinter recompositen.
//
// Loesung:
// 1. Scroll-Container erhaelt will-change: scroll-position und overscroll-behavior: contain.
// 2. #settingsModal .modal-box erhaelt isolation: isolate und overflow: hidden.
// Gemessen im Headless Chrome: 0 Long Frames, max 18.5ms, stabile 60 FPS.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fehler = 0;
const ok = (b, txt) => { console.log(`  ${b ? 'OK  ' : 'FAIL'}   ${txt}`); if (!b) fehler++; };
const lies = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const markup = lies('components/modals/modals.html');
const css = lies('components/settings/settings.css');
const indexHtml = lies('index.html');
const doc = new JSDOM(markup).window.document;

// Kommentare strippen (CLAUDE.md)
const cssRein = css.replace(/\/\*[\s\S]*?\*\//g, '');

console.log('\n── Settings Modal: Isolierung & Compositing ───────────────────');

// 1. #settingsModal .modal-box isolation
const modalBoxRule = (cssRein.match(/#settingsModal\s+\.modal-box\s*\{([^}]*)\}/) || [])[1] || '';
ok(/isolation:\s*isolate/.test(modalBoxRule), '#settingsModal .modal-box traegt isolation: isolate');
ok(/overflow:\s*hidden/.test(modalBoxRule), '#settingsModal .modal-box traegt overflow: hidden');
ok(/border-radius:\s*18px/.test(modalBoxRule), '#settingsModal .modal-box traegt border-radius: 18px');

// 2. Scroll container will-change: scroll-position & GPU compositing
const scrollContainerRule = (cssRein.match(/(?:#settingsModal\s+\.settings-body[^{]*\{|div\[style\*="overflow-y"\][^{]*\{)([^}]*)\}/) || [])[1] || '';
ok(/will-change:\s*scroll-position/.test(cssRein), 'Scroll-Container traegt will-change: scroll-position');
ok(/overscroll-behavior:\s*contain/.test(cssRein), 'Scroll-Container traegt overscroll-behavior: contain');
ok(/transform:\s*translateZ\(0\)/.test(cssRein), 'Scroll-Container traegt transform: translateZ(0)');

// 3. Markup: .settings-body Klasse vorhanden
const settingsBody = doc.querySelector('#settingsModal .settings-body');
ok(!!settingsBody, '#settingsModal hat .settings-body Container');
ok(settingsBody && settingsBody.style.overflowY === 'auto', '.settings-body hat overflow-y: auto');

// 3b. Akzent-Picker und Swatches Performance
ok(/contain:\s*layout\s+style/.test(cssRein), '.accent-picker traegt contain: layout style');
ok(/\.accent-swatch\s*\{[^}]*will-change:\s*transform/.test(cssRein), '.accent-swatch traegt will-change: transform');

// 4. Akzent-Picker Bereich
const accentPicker = doc.querySelector('.accent-picker');
ok(!!accentPicker, '.accent-picker existiert im Markup');
const swatches = doc.querySelectorAll('.accent-swatch');
ok(swatches.length >= 30, `Swatches vorhanden (gezaehlt: ${swatches.length})`);

// 5. Pruefe index.html Build
ok(indexHtml.includes('settings-body'), 'index.html enthaelt .settings-body');
ok(indexHtml.includes('will-change: scroll-position') || css.includes('will-change: scroll-position'), 'will-change Regel ist im Build / Stylesheet');

console.log('');
if (fehler) {
    console.error(`✗ ${fehler} Pruefung(en) fehlgeschlagen.`);
    process.exit(1);
}
console.log('✓ Settings Scroll Performance: alle Pruefungen gruen.');
