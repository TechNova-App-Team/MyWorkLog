#!/usr/bin/env node
// ═══ TEST: Profil-Felder in den Einstellungen ═══
//
// Der Fehler, den dieser Test festhaelt (v6.4.11):
//
// Die drei Profilzeilen (Name, Ausbildungsberuf, Bundesland) trugen
// `cursor: pointer` ueber die ganze Karte — gemessen 766 x 86 px. Das
// <select> darin belegte davon 620 x 23 px, also 21 %. Am optischen
// Mittelpunkt der Zeile lag der Hinweistext.
//
// 🔴 Und selbst diese 21 % waren nicht die ganze Wahrheit: ein Klick auf ein
// <label> gibt einem <select> zwar den FOKUS, oeffnet aber NICHT dessen
// Liste. Das ist Browser-Standard, kein Fehler — es heisst nur, dass ein
// <select> in einer grossen Klickflaeche eine Luege ist, solange es nicht
// selbst darunterliegt. Symptom beim Nutzer: "klickt man drauf, passiert
// einfach nix". Kein Fehler in der Konsole, nichts im Screenshot; die Zeile
// leuchtet sogar auf, weil :focus-within greift.
//
// Behoben, indem das <select> als unsichtbare Schicht (opacity:0, inset:0)
// ueber der ganzen Zeile liegt. Der offene Zustand bleibt nativ (Systemrad
// auf dem Handy, Tastatur und Screenreader gratis), der geschlossene wird
// gespiegelt gerendert — anders liesse er sich gar nicht gestalten, ein
// <select> ist unter Windows nicht stylbar.
//
// Aufruf: node tools/profil-felder.test.mjs

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
const doc = new JSDOM(markup).window.document;

// Negativ-Behauptungen laufen gegen den kommentarfreien Text — sonst prueft
// der Test die Erklaerungen, die genau diese Woerter enthalten.
const cssRein = css.replace(/\/\*[\s\S]*?\*\//g, '');
const markupRein = markup.replace(/<!--[\s\S]*?-->/g, '');

// ─────────────────────────────────────────────────────────────────────────
console.log('\n── Aufbau der Zeilen ──────────────────────────────────────────');
const zeilen = [...doc.querySelectorAll('.pfield')];
ok(zeilen.length === 3, `drei Zeilen, gezaehlt: ${zeilen.length}`);

// CLAUDE.md: Kinderzahl gegen Spurenzahl. Die Klickschicht ist absolut
// positioniert und faellt aus dem Raster — es bleiben genau vier Rasterkinder.
for (const z of zeilen) {
    const raster = [...z.children].filter((c) => !c.classList.contains('pfield-control'));
    const label = z.querySelector('.pfield-label').textContent.trim();
    ok(raster.length === 4, `"${label}": vier Rasterkinder, gezaehlt: ${raster.length}`);
}
const spuren = (cssRein.match(/\.pfield\s*\{[^}]*grid-template-columns:\s*([^;]+);/) || [])[1] || '';
ok(spuren.trim().split(/\s+(?![^(]*\))/).length === 4, `vier Rasterspuren, gelesen: "${spuren.trim()}"`);

// ─────────────────────────────────────────────────────────────────────────
console.log('\n── Die ganze Zeile traegt den Klick ───────────────────────────');
for (const id of ['confJob', 'confBundesland']) {
    const sel = doc.getElementById(id);
    ok(!!sel && sel.classList.contains('pfield-control'),
        `#${id} ist die Klickschicht der Zeile`);
    ok(!!sel && sel.closest('.pfield') !== null, `#${id} liegt in einer .pfield-Zeile`);
    ok(!!doc.querySelector(`[data-pvalue-for="${id}"]`), `#${id} hat ein sichtbares Wertfeld`);
}
const ctrl = (cssRein.match(/\.pfield-control\s*\{([^}]*)\}/) || [])[1] || '';
ok(/position:\s*absolute/.test(ctrl), '.pfield-control liegt absolut ueber der Zeile');
ok(/inset:\s*0/.test(ctrl), '.pfield-control deckt die ganze Zeile ab (inset: 0)');
// opacity:0 statt display/visibility — sonst waere sie nicht mehr bedienbar.
ok(/opacity:\s*0\b/.test(ctrl), '.pfield-control ist unsichtbar, aber bedienbar (opacity: 0)');
ok(!/display:\s*none|visibility:\s*hidden/.test(ctrl),
    '.pfield-control ist NICHT per display/visibility versteckt (das nimmt ihr den Klick)');
// Alles unter 16px laesst iOS beim Fokus in die Seite zoomen.
ok(/font-size:\s*16px/.test(ctrl), '.pfield-control hat 16px (sonst zoomt iOS beim Fokus)');

// ─────────────────────────────────────────────────────────────────────────
console.log('\n── Der Zeiger sagt die Wahrheit ───────────────────────────────');
ok(/\.pfield\s*\{[^}]*cursor:\s*pointer/.test(cssRein), 'die Auswahlzeilen zeigen einen Zeigefinger');
ok(/\.pfield:has\(\.pfield-input\)\s*\{[^}]*cursor:\s*text/.test(cssRein),
    'die Namenszeile zeigt einen Textcursor, keinen Zeigefinger');

// ─────────────────────────────────────────────────────────────────────────
console.log('\n── Was der Umbau beseitigt hat ────────────────────────────────');
ok(!/profile-field/.test(cssRein), 'die alten .profile-field-Regeln sind weg');
ok(!/profile-field/.test(markupRein), 'das alte Markup ist weg');
// Ein leerer Zustand ist kein Inhalt und darf nicht aussehen wie einer.
ok(!/— Bitte wählen —/.test(markupRein), '"— Bitte wählen —" ist weg');
ok((markupRein.match(/>Nicht gewählt</g) || []).length >= 2, 'der leere Zustand heisst "Nicht gewählt"');
ok(/\.pfield-value\.is-empty/.test(cssRein), 'und ist als leer gekennzeichnet, nicht wie ein Wert gesetzt');
// Fuellung im Akzentton, nie Weiss — Weiss auf Dunkel entsaettigt (CLAUDE.md).
ok(!/\.pfield[^{]*\{[^}]*background:\s*rgba\(255,\s*255,\s*255/.test(cssRein),
    'keine weisse Hover-Fuellung');
ok(!/\.pfield[^{]*\{[^}]*background:\s*rgba\(0,\s*0,\s*0/.test(cssRein),
    'keine feste schwarze Fuellung (die stand im Light-Theme als dunkler Kasten da)');
ok(/\.pfield:hover\s*\{[^}]*var\(--hover-fill\)/.test(cssRein), 'Hover nutzt das Akzent-Token');
ok(/\.pfield:active\s*\{/.test(cssRein), 'es gibt eine Rueckmeldung beim Druecken');
// Nichts bewegt sich beim Hover (CLAUDE.md).
const hoverRegel = (cssRein.match(/\.pfield:hover\s*\{([^}]*)\}/) || [])[1] || '';
ok(!/transform|translate|scale|padding/.test(hoverRegel), 'beim Hover bewegt sich nichts');

// ─────────────────────────────────────────────────────────────────────────
console.log('\n── Sprache: kein deutscher Text aus dem Skript ────────────────');
// Der gespiegelte Wert kommt aus der <option>, nie aus einer Zeichenkette im
// Skript — die leere Option heisst auf /en/ "Not selected".
const skript = (markup.match(/function spiegle\(sel\)\{[\s\S]*?\n\s*\}/) || [''])[0];
ok(skript.length > 0, 'die Spiegelung existiert');
ok(!/'Nicht gewählt'|"Nicht gewählt"/.test(skript),
    'sie schreibt keinen deutschen Rueckfalltext, sondern nimmt den Optionstext');
// Dasselbe fuer die Leertexte des Profil-Kopfs.
for (const t of ['Noch kein Name', 'Beruf nicht ausgewählt', 'Region offen']) {
    const alsString = new RegExp(`textContent\\s*=\\s*['"]${t}`);
    ok(!alsString.test(markup), `"${t}" wird nicht aus dem Skript gesetzt, sondern aus dem Markup gelesen`);
}

const en = path.join(ROOT, 'pages/en/index.html');
if (fs.existsSync(en)) {
    const d = new JSDOM(fs.readFileSync(en, 'utf8')).window.document;
    const liste = d.querySelector('.pfield-list');
    ok(!!liste, '/en/ hat die Profilliste');
    const txt = liste ? liste.textContent : '';
    const deutsch = ['Dein Name', 'Ausbildungsberuf', 'Bundesland', 'Nicht gewählt', 'Für lokale Feiertage']
        .filter((w) => txt.includes(w));
    ok(deutsch.length === 0, `/en/ traegt keinen deutschen Feldtext${deutsch.length ? ': ' + deutsch.join(', ') : ''}`);
    ok(d.getElementById('confName').placeholder === 'Not set',
        `/en/ Platzhalter uebersetzt, gelesen: "${d.getElementById('confName').placeholder}"`);
} else {
    console.log('  ..     pages/en/index.html nicht gebaut — uebersprungen');
}

console.log('');
if (fehler) { console.error(`✗ ${fehler} Pruefung(en) durchgefallen.`); process.exit(1); }
console.log('✓ Profil-Felder: alle Pruefungen gruen.');
