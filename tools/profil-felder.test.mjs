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
// Seit dem Neubau der Einstellungen (25.10.2026) heissen die Klassen
// .st-row / .st-row--select / .st-select-overlay / .st-select-value statt
// .pfield*; die Pruefungen sind dieselben geblieben.
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
const zeilen = [...doc.querySelectorAll('.profile-card .st-row')];
// Fuenfte Zeile "Dein Beruf" (#confJobCustomRow) ist nur bei "Eigenen Beruf eintragen" sichtbar.
ok(zeilen.length === 5, `fuenf Zeilen, gezaehlt: ${zeilen.length}`);

// CLAUDE.md: Kinderzahl gegen Spurenzahl. Die Klickschicht ist absolut
// positioniert und faellt aus dem Raster.
const auswahl = zeilen.filter((z) => z.classList.contains('st-row--select'));
ok(auswahl.length === 2, `zwei Auswahlzeilen, gezaehlt: ${auswahl.length}`);
for (const z of auswahl) {
    const raster = [...z.children].filter((c) => !c.classList.contains('st-select-overlay'));
    const label = z.querySelector('.st-row-label').textContent.trim();
    ok(raster.length === 3, `"${label}": drei Rasterkinder, gezaehlt: ${raster.length}`);
}
const spuren = (cssRein.match(/\.st-row--select\s*\{[^}]*grid-template-columns:\s*([^;]+);/) || [])[1] || '';
ok(spuren.trim().split(/\s+(?![^(]*\))/).length === 3, `drei Rasterspuren, gelesen: "${spuren.trim()}"`);
for (const z of zeilen.filter((z) => z.classList.contains('st-row--field'))) {
    const label = z.querySelector('.st-row-label').textContent.trim();
    ok(z.children.length === 2, `"${label}": Text und Eingabe, gezaehlt: ${z.children.length}`);
}

// ─────────────────────────────────────────────────────────────────────────
console.log('\n── Die ganze Zeile traegt den Klick ───────────────────────────');
for (const id of ['confJob', 'confBundesland']) {
    const sel = doc.getElementById(id);
    ok(!!sel && sel.classList.contains('st-select-overlay'),
        `#${id} ist die Klickschicht der Zeile`);
    ok(!!sel && sel.closest('.st-row--select') !== null, `#${id} liegt in einer Auswahlzeile`);
    ok(!!doc.querySelector(`[data-pvalue-for="${id}"]`), `#${id} hat ein sichtbares Wertfeld`);
}
const ctrl = (cssRein.match(/\.st-select-overlay\s*\{([^}]*)\}/) || [])[1] || '';
ok(/position:\s*absolute/.test(ctrl), '.st-select-overlay liegt absolut ueber der Zeile');
ok(/inset:\s*0/.test(ctrl), '.st-select-overlay deckt die ganze Zeile ab (inset: 0)');
// opacity:0 statt display/visibility — sonst waere sie nicht mehr bedienbar.
ok(/opacity:\s*0\b/.test(ctrl), '.st-select-overlay ist unsichtbar, aber bedienbar (opacity: 0)');
ok(!/display:\s*none|visibility:\s*hidden/.test(ctrl),
    '.st-select-overlay ist NICHT per display/visibility versteckt (das nimmt ihr den Klick)');
// Alles unter 16px laesst iOS beim Fokus in die Seite zoomen.
ok(/font-size:\s*16px/.test(ctrl), '.st-select-overlay hat 16px (sonst zoomt iOS beim Fokus)');
ok(/\.st-row\s*\{[^}]*position:\s*relative/.test(cssRein), 'die Zeile ist der Bezugsrahmen der Schicht');

// ─────────────────────────────────────────────────────────────────────────
console.log('\n── Der Zeiger sagt die Wahrheit ───────────────────────────────');
ok(/\.st-row--select\s*\{[^}]*cursor:\s*pointer/.test(cssRein), 'die Auswahlzeilen zeigen einen Zeigefinger');
ok(/\.st-row--field\s*\{[^}]*cursor:\s*text/.test(cssRein),
    'die Namenszeile zeigt einen Textcursor, keinen Zeigefinger');

// ─────────────────────────────────────────────────────────────────────────
console.log('\n── Was die Umbauten beseitigt haben ───────────────────────────');
ok(!/profile-field|pfield/.test(cssRein), 'die alten .profile-field- und .pfield-Regeln sind weg');
ok(!/profile-field|class="pfield/.test(markupRein), 'das alte Markup ist weg');
// Ein leerer Zustand ist kein Inhalt und darf nicht aussehen wie einer.
ok(!/— Bitte wählen —/.test(markupRein), '"— Bitte wählen —" ist weg');
ok((markupRein.match(/>Nicht gewählt</g) || []).length >= 2, 'der leere Zustand heisst "Nicht gewählt"');
ok(/\.st-select-value\.is-empty/.test(cssRein), 'und ist als leer gekennzeichnet, nicht wie ein Wert gesetzt');
// Fuellung im Akzentton, nie Weiss — Weiss auf Dunkel entsaettigt (CLAUDE.md).
ok(!/\.st-row[^{]*\{[^}]*background:\s*rgba\(255,\s*255,\s*255/.test(cssRein),
    'keine weisse Hover-Fuellung');
ok(!/\.st-row[^{]*\{[^}]*background:\s*rgba\(0,\s*0,\s*0/.test(cssRein),
    'keine feste schwarze Fuellung (die stand im Light-Theme als dunkler Kasten da)');
ok(/--st-hover:\s*var\(--hover-fill\)/.test(cssRein), 'Hover nutzt das Akzent-Token');
ok(/\.st-row--select:hover\s*\{[^}]*var\(--st-hover\)/.test(cssRein), 'die Auswahlzeile nutzt es beim Hover');
ok(/\.st-row--select:active\s*\{/.test(cssRein), 'es gibt eine Rueckmeldung beim Druecken');
// Nichts bewegt sich beim Hover (CLAUDE.md).
const hoverRegel = (cssRein.match(/\.st-row--select:hover\s*\{([^}]*)\}/) || [])[1] || '';
ok(hoverRegel.length > 0, 'Gegenprobe: Hover-Regel gefunden');
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
    const liste = d.querySelector('.profile-card .st-list');
    ok(!!liste, '/en/ hat die Profilliste');
    const txt = liste ? liste.textContent : '';
    const deutsch = ['Kürzel', 'Ausbildungsberuf', 'Bundesland', 'Nicht gewählt', 'Für die Feiertage', 'Zwei Buchstaben']
        .filter((w) => txt.includes(w));
    ok(deutsch.length === 0, `/en/ traegt keinen deutschen Feldtext${deutsch.length ? ': ' + deutsch.join(', ') : ''}`);
    ok(d.getElementById('confName').placeholder === 'Not set',
        `/en/ Platzhalter uebersetzt, gelesen: "${d.getElementById('confName').placeholder}"`);
    ok(d.getElementById('confAvatarInitials').placeholder === 'Auto',
        `/en/ Avatar-Platzhalter uebersetzt, gelesen: "${d.getElementById('confAvatarInitials').placeholder}"`);
} else {
    console.log('  ..     pages/en/index.html nicht gebaut — uebersprungen');
}

console.log('');
if (fehler) { console.error(`✗ ${fehler} Pruefung(en) durchgefallen.`); process.exit(1); }
console.log('✓ Profil-Felder: alle Pruefungen gruen.');
