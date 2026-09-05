// ═══ E-MAIL-VORLAGEN TEST ═══
//
// Prueft tools/email-templates/*.html gegen die Eigenheiten von HTML-Mail.
//
// Warum ueberhaupt: eine Mail laesst sich nach dem Versand nicht korrigieren,
// und sie wird in Clients gerendert, die kein CSS-Layout, kein SVG und keine
// externen Schriften koennen. Ein Fehler faellt hier nicht im Browser auf,
// sondern beim Empfaenger — einmalig und endgueltig.
//
// 🔴 Alle Negativ-Behauptungen laufen gegen die KOMMENTARFREIE Fassung. Die
// Datei erklaert im Kopf ausfuehrlich, was bewusst NICHT drinsteht ("kein
// inline-SVG", "keine STEP-Nummerierung") — ein Grep auf die rohe Datei
// pruefte also die eigenen Kommentare und schlaege fehl, obwohl das Markup
// sauber ist. Genau diese Falle steht in CLAUDE.md.
//
// Aufruf:  node tools/email-template.test.mjs

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const DATEI = 'tools/email-templates/magic-link.html';

const roh = fs.readFileSync(path.join(ROOT, DATEI), 'utf8').split('\r\n').join('\n');
const h = roh.replace(/<!--[\s\S]*?-->/g, '');   // ohne Kommentare

let fehler = 0, geprueft = 0;
const ok = (name, b, detail = '') => {
    geprueft++;
    if (!b) fehler++;
    console.log(`  ${b ? 'ok  ' : 'FAIL'}  ${name}${detail ? '   → ' + detail : ''}`);
};

console.log('\n1. Supabase-Vertrag');
{
    const treffer = (h.match(/\{\{\s*\.ConfirmationURL\s*\}\}/g) || []).length;
    ok('ConfirmationURL steht drin', treffer === 2, treffer + '× (Knopf + Fallback)');
    ok('keine erfundenen Variablen',
       (h.match(/\{\{\s*\.\w+/g) || []).every(v => /ConfirmationURL/.test(v)),
       [...new Set(h.match(/\{\{\s*\.\w+/g) || [])].join(', '));
    ok('der Knopf zeigt auf die Variable, nicht auf eine feste Adresse',
       /href="\{\{\s*\.ConfirmationURL\s*\}\}"/.test(h));
}

console.log('\n2. Was Mail-Clients nicht koennen');
{
    ok('kein <svg> (Gmail entfernt es ersatzlos)', !/<svg/i.test(h));
    ok('kein display:flex / grid', !/display:\s*(flex|grid)/i.test(h));
    ok('keine externe Schrift', !/fonts\.googleapis|@import/i.test(h));
    ok('kein <script>', !/<script/i.test(h));
    ok('keine Hintergrundbilder', !/background-image/i.test(h));
    ok('Layout ueber Tabellen', (h.match(/role="presentation"/g) || []).length >= 6,
       (h.match(/role="presentation"/g) || []).length + ' Tabellen');
    // Gegenprobe: es gibt ueberhaupt Markup zu pruefen.
    ok('Gegenprobe — Datei ist nicht leer', h.length > 2000, h.length + ' Zeichen ohne Kommentare');
    ok('Gegenprobe — die Kommentare wurden wirklich gestrippt', roh.length - h.length > 1000,
       (roh.length - h.length) + ' Zeichen entfernt');
}

console.log('\n3. Projekt- und Inhaltsregeln');
{
    ok('keine Emojis', !/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(h));
    ok('keine feste Jahreszahl im Fuss', !/©\s*\d{4}|\(c\)\s*\d{4}/i.test(h));
    ok('keine STEP-Nummerierung', !/STEP\s*0\d/i.test(h));
    ok('keine Drohsprache', !/monitored|unauthorized access|provisioned/i.test(h));
    ok('keine unbelegte Dauer-Zusage', !/\d+\s*(Stunden|hours|Tage|days)/i.test(h),
       'die alte Fassung behauptete 24 h, Supabase-Vorgabe ist 1 h');
    ok('deutsch als Hauptsprache', /<html lang="de">/.test(h) && h.includes('Jetzt anmelden'));
    ok('englischer Block vorhanden', /English:/.test(h));
}

console.log('\n4. Robustheit');
{
    ok('Vorschauzeile (Preheader) vorhanden', /max-height:0/.test(h) && /Anmelde-Link/.test(h));

    // Das Logo darf Beiwerk sein, nie Traeger: Outlook laedt Bilder nie
    // automatisch. Faellt es aus, muss die Absenderkennung trotzdem dastehen.
    const bilder = [...h.matchAll(/<img[^>]*>/g)].map(m => m[0]);
    ok('hoechstens ein Bild', bilder.length <= 1, bilder.length + ' Bild(er)');
    if (bilder.length) {
        ok('Bild absolut verlinkt', /src="https:\/\//.test(bilder[0]));
        ok('Bild hat width UND height als Attribut (Outlook ignoriert CSS)',
           /width="\d+"/.test(bilder[0]) && /height="\d+"/.test(bilder[0]));
        ok('Bild ist dekorativ (leeres alt), die Wortmarke steht als Text daneben',
           /alt=""/.test(bilder[0]) && />MyWorkLog</.test(h));
    }
    ok('Wortmarke existiert als Text, nicht nur im Bild',
       (h.match(/>MyWorkLog</g) || []).length >= 1);
    ok('lange Token-URL bricht um', /word-break:\s*break-all/.test(h));
    ok('Dunkelmodus behandelt', /prefers-color-scheme:\s*dark/.test(h));
    ok('color-scheme angemeldet', /name="color-scheme"/.test(h));
    ok('Breite gedeckelt', /max-width:600px/.test(h));
    ok('mobile Anpassung', /@media \(max-width:620px\)/.test(h));

    // Der Knopf muss lesbar sein — in einer Mail ist nichts nachzubessern.
    const bg = (h.match(/bgcolor="(#[0-9a-f]{6})"/i) || [])[1];
    ok('Knopf hat bgcolor als Attribut (Outlook ignoriert CSS-Hintergrund)', !!bg, bg);
    const lum = c => { const s = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
    const hex = x => [1, 3, 5].map(i => parseInt(x.substr(i, 2), 16));
    if (bg) {
        const k = (1.05) / (lum(hex(bg)) + 0.05);
        ok('Weiss auf dem Knopf erreicht 4.5:1', k >= 4.5, k.toFixed(2) + ':1');
    }

    // Jeder Link muss absolut sein: in einer Mail gibt es keine Basis-URL.
    const hrefs = [...h.matchAll(/href="([^"]+)"/g)].map(m => m[1])
                    .filter(u => !u.includes('ConfirmationURL'));
    ok('alle Links absolut', hrefs.every(u => /^https:\/\//.test(u)), hrefs.join(' '));
    ok('Gegenprobe — es gibt ueberhaupt Links', hrefs.length >= 3, hrefs.length + ' Links');
}

console.log(`\n${geprueft - fehler}/${geprueft} bestanden`);
if (geprueft < 25) { console.log('ZU WENIG PRUEFUNGEN — der Lauf hat nichts getan'); process.exit(1); }
process.exit(fehler ? 1 : 0);
