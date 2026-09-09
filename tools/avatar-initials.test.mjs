#!/usr/bin/env node
// ═══ TEST: Avatar-Kürzel (automatisch & custom) ═══
//
// Prueft:
// 1. Automatische Kuerzel-Berechnung aus dem Namen:
//    - Mehrwort-Namen: Erster Buchstabe des ersten + letzten Wortes ("Max Mustermann" → "MM")
//    - Einzelwort-Namen: Erste zwei Buchstaben ("Max" → "MA")
//    - Leer: Rueckfall auf "U"
// 2. Custom Avatar-Kuerzel (data.settings.avatarInitials):
//    - Wenn gesetzt, ueberschreibt es das automatische Kuerzel ("HK")
//    - Trimmung & Uppercase (" hk " → "HK")
//    - Maximal 2 Zeichen ("ABC" → "AB")
//    - Wenn geleert/entfernt, greift wieder das automatische Kuerzel
// 3. Beide Avatar-Elemente (#sidebarAvatar & #popoverAvatar) werden synchronisiert.
// 4. Input-Feld #confAvatarInitials in components/modals/modals.html existiert mit maxlength="2".
//
// Aufruf: node tools/avatar-initials.test.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fehler = 0;
const ok = (b, txt) => { console.log(`  ${b ? 'OK  ' : 'FAIL'}   ${txt}`); if (!b) fehler++; };
const lies = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

console.log('\n── Markup & UI-Elemente ───────────────────────────────────────');
const modalsHtml = lies('components/modals/modals.html');
const sidebarHtml = lies('components/sidebar/sidebar.html');
const modalDoc = new JSDOM(modalsHtml).window.document;
const sidebarDoc = new JSDOM(sidebarHtml).window.document;

const input = modalDoc.getElementById('confAvatarInitials');
ok(!!input, '#confAvatarInitials im Modals-Markup vorhanden');
ok(input && input.getAttribute('maxlength') === '2', '#confAvatarInitials hat maxlength="2"');
ok(input && input.classList.contains('pfield-input'), '#confAvatarInitials nutzt .pfield-input');
ok(input && input.classList.contains('pfield-value'), '#confAvatarInitials nutzt .pfield-value');

const sidebarAvatar = sidebarDoc.getElementById('sidebarAvatar');
ok(!!sidebarAvatar, '#sidebarAvatar in sidebar.html vorhanden');
const popoverAvatar = sidebarDoc.getElementById('popoverAvatar');
ok(!!popoverAvatar, '#popoverAvatar in sidebar.html vorhanden');

console.log('\n── JS-Logik & Verhalten ───────────────────────────────────────');
// Erstelle ein Test-DOM mit beiden Avataren und dem Settings-Feld
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
  <body>
    <div id="sidebarAvatar">SK</div>
    <div id="popoverAvatar">SK</div>
    <input type="text" id="confName" value="">
    <input type="text" id="confAvatarInitials" value="" maxlength="2">
  </body>
  </html>
`);
const win = dom.window;
global.document = win.document;
global.window = win;

// Lade navbar-sidebar.js und sidebar.js Code-Schnipsel
const navbarSidebarJs = lies('components/core/navbar-sidebar.js');
const settingsJs = lies('components/settings/settings.js');

// Simuliere data Global
global.data = {
  settings: {
    name: 'Max Mustermann',
    avatarInitials: ''
  }
};

// Eval updateSidebarAvatar
const updateSidebarAvatarFn = new Function('data', 'document', `
  ${navbarSidebarJs}
  return updateSidebarAvatar;
`)(global.data, win.document);

// Test 1: Name mit 2 Wörtern, kein Custom Initials
global.data.settings.name = 'Max Mustermann';
global.data.settings.avatarInitials = '';
updateSidebarAvatarFn();
ok(win.document.getElementById('sidebarAvatar').textContent === 'MM', 'Automatisches Kuerzel (2 Woerter): "Max Mustermann" → "MM" in #sidebarAvatar');
ok(win.document.getElementById('popoverAvatar').textContent === 'MM', 'Automatisches Kuerzel (2 Woerter): "Max Mustermann" → "MM" in #popoverAvatar');

// Test 2: Name mit 1 Wort
global.data.settings.name = 'Sven';
global.data.settings.avatarInitials = '';
updateSidebarAvatarFn();
ok(win.document.getElementById('sidebarAvatar').textContent === 'SV', 'Automatisches Kuerzel (1 Wort): "Sven" → "SV"');

// Test 3: Name mit 3 Wörtern (erstes und letztes Wort)
global.data.settings.name = 'Hans Peter Mueller';
global.data.settings.avatarInitials = '';
updateSidebarAvatarFn();
ok(win.document.getElementById('sidebarAvatar').textContent === 'HM', 'Automatisches Kuerzel (3 Woerter): "Hans Peter Mueller" → "HM"');

// Test 4: Custom Initials gesetzt
global.data.settings.name = 'Max Mustermann';
global.data.settings.avatarInitials = 'HK';
updateSidebarAvatarFn();
ok(win.document.getElementById('sidebarAvatar').textContent === 'HK', 'Custom Kuerzel "HK" ueberschreibt automatische Kuerzel in #sidebarAvatar');
ok(win.document.getElementById('popoverAvatar').textContent === 'HK', 'Custom Kuerzel "HK" ueberschreibt automatische Kuerzel in #popoverAvatar');

// Test 5: Custom Initials mit Kleinbuchstaben und Leerzeichen
global.data.settings.avatarInitials = '  xy  ';
updateSidebarAvatarFn();
ok(win.document.getElementById('sidebarAvatar').textContent === 'XY', 'Custom Kuerzel "  xy  " getrimmt und gross: "XY"');

// Test 6: Custom Initials mit 3 Zeichen wird auf 2 gekuerzt
global.data.settings.avatarInitials = 'DEV';
updateSidebarAvatarFn();
ok(win.document.getElementById('sidebarAvatar').textContent === 'DE', 'Custom Kuerzel "DEV" gekuerzt auf 2 Zeichen: "DE"');

// Test 7: Custom Initials zurueckgesetzt (leer) -> Fallback wieder aktiv
global.data.settings.avatarInitials = '';
global.data.settings.name = 'Hans Klaus';
updateSidebarAvatarFn();
ok(win.document.getElementById('sidebarAvatar').textContent === 'HK', 'Nach Leeren von custom initials: Fallback auf "Hans Klaus" → "HK"');

// Test 8: Weder Name noch Custom Initials
global.data.settings.name = '';
global.data.settings.avatarInitials = '';
updateSidebarAvatarFn();
ok(win.document.getElementById('sidebarAvatar').textContent === 'U', 'Ohne Name und ohne Custom: Fallback auf "U"');

console.log('');
if (fehler) { console.error(`✗ ${fehler} Pruefung(en) durchgefallen.`); process.exit(1); }
console.log('✓ Avatar-Kuerzel: alle Pruefungen gruen.');
