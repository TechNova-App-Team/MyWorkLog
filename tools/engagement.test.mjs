#!/usr/bin/env node
// ═══ TEST: Engagement-Kennzahl auf /about/ und /analytics/ ═══
//
// Drei Fehler werden hier festgehalten, alle drei aus v6.4.10:
//
// 1. /about/ trug die Zahlen als Konstanten im Skript — 200 Nutzer,
//    8900 Stunden, 86 % "Zufriedenheit". Unter der Ueberschrift "Vertrauen in
//    Zahlen" stand damit keine einzige gemessene Zahl. Dieselbe Klasse wie das
//    fest eingebaute "OK" in den Audit-Karten (CLAUDE.md): im Screenshot nicht
//    von einem echten Wert zu unterscheiden.
//
// 2. Die Engagement-Formel gab es nur in insights.js. Als /about/ dieselbe
//    Zahl zeigen sollte, war die naheliegende Loesung ein zweiter Rechner —
//    und zwei Rechner auf eine fachliche Groesse driften garantiert. Sie steht
//    deshalb in Assets/js/insights/engagement.js und NUR dort.
//
// 3. `clip-path: inset(0 0 -25% 0)` stand im eingeblendeten Zustand JEDES
//    Reveal-Elements. Von der 339 px hohen Sprechblase des "i"-Knopfes blieben
//    61 px sichtbar. Gehoert hat der clip-path zum Wisch-Effekt, den kein
//    einziges Element traegt.
//
// 🔴 Die Negativ-Behauptungen hier strippen vorher BEIDE Kommentarsorten aus
// der HTML-Datei (`<!-- -->` und `/* */` im <style>) — sonst prueft der Test
// seine eigenen Erklaertexte, und genau die reden ueber clip-path.
//
// Aufruf: node tools/engagement.test.mjs

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fehler = 0;
const ok = (b, txt) => { console.log(`  ${b ? 'OK  ' : 'FAIL'}   ${txt}`); if (!b) fehler++; };
const lies = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Kommentare raus, beide Sorten — sonst prueft eine Negativ-Behauptung den Text,
// der sie erklaert.
const ohneKommentare = (html) => html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

// ─────────────────────────────────────────────────────────────────────────
console.log('\n── Die Formel selbst ──────────────────────────────────────────');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(lies('Assets/js/insights/engagement.js'), ctx);
const E = ctx.window.mwlEngagement;
ok(!!E, 'engagement.js definiert window.mwlEngagement');

// Echte Messung vom 2026-08-29, 90 Tage. Die Analytics-Seite zeigte dafuer 51 %.
const ECHT = { visitors: 329, pageviews: 1228, sessions: 515, bounceRate: 0.4640776699029126, avgSessionDuration: 444.567 };
const p = E.parts(ECHT);
ok(p.score === 51, `Score = 51 (wie /analytics/ am 2026-08-29), gemessen: ${p.score}`);
ok(p.bounceScore === 54, `Absprung-Haelfte = 54, gemessen: ${p.bounceScore}`);
ok(p.pagesScore === 48, `Seitentiefe-Haelfte = 48, gemessen: ${p.pagesScore}`);
ok(Math.abs(p.pagesPerSession - 2.3844) < 0.001, `2,38 Seiten je Sitzung, gemessen: ${p.pagesPerSession.toFixed(4)}`);

// Ohne Sitzungen ist die Seitentiefe 0/0. Ungeschuetzt kaeme NaN heraus und
// daraus stillschweigend eine 0 — eine Note, die niemand gerechnet hat.
const leer = E.parts({ visitors: 0, pageviews: 0, sessions: 0, bounceRate: 0 });
ok(!Number.isNaN(leer.score), 'kein NaN bei null Sitzungen');
ok(leer.hasData === false, 'hasData meldet "keine Daten", statt 50 % zu behaupten');

ok(E.duration(444.567) === '7m 25s', `444s → "7m 25s", gemessen: "${E.duration(444.567)}"`);
ok(E.duration(48) === '48s', `48s → "48s", gemessen: "${E.duration(48)}"`);
ok(E.duration(0) === '0s', 'null Sekunden werfen nicht');
ok(E.duration(7200) === '2h 0m', `7200s → "2h 0m", gemessen: "${E.duration(7200)}"`);

// ─────────────────────────────────────────────────────────────────────────
console.log('\n── Nur EINE Fassung der Formel ────────────────────────────────');
const insights = lies('Assets/js/insights/insights.js');
const aboutRoh = lies('pages/about/index.html');
// Die charakteristische Zeile: (1 - bounce) * 0.5 + min(pps / 5, 1) * 0.5
const FORMEL = /\(\s*1\s*-\s*\w+\s*\)\s*\*\s*0?\.5\s*\+\s*Math\.min\(/;
ok(!FORMEL.test(insights), 'insights.js rechnet nicht mehr selbst');
ok(!FORMEL.test(aboutRoh), '/about/ rechnet nicht selbst');
ok(/mwlEngagement/.test(insights), 'insights.js ruft mwlEngagement');
ok(/mwlEngagement/.test(aboutRoh), '/about/ ruft mwlEngagement');

for (const seite of ['pages/analytics/index.html', 'pages/about/index.html']) {
    ok(/insights\/engagement\.js/.test(lies(seite)), `${seite} laedt engagement.js`);
}
// Reihenfolge zaehlt: das Inline-Skript von /about/ laeuft vor jedem defer.
const tag = aboutRoh.match(/<script([^>]*)src="\/Assets\/js\/insights\/engagement\.js[^"]*"/);
ok(tag && !/\bdefer\b|\basync\b/.test(tag[1]),
    'engagement.js wird auf /about/ OHNE defer/async geladen (das Inline-Skript vor </body> laeuft sonst frueher)');

// ─────────────────────────────────────────────────────────────────────────
console.log('\n── Keine handgeschriebenen Kennzahlen mehr ────────────────────');
const about = ohneKommentare(aboutRoh);
ok(!/FALLBACK_VISITORS|FALLBACK_HOURS|FALLBACK_SAT/.test(about), 'die FALLBACK_-Konstanten sind weg');
ok(!/×\s*45\s*\+\s*800|\*\s*45\s*\+\s*800/.test(about), 'die erfundene Stundenformel (Nutzer x 45 + 800) ist weg');
ok(!/stat-hours|stat-satisfaction/.test(about), 'die alten Ids sind weg');
ok(/analytics-proxy\.myworklog\.workers\.dev/.test(about), '/about/ holt die Zahlen vom Analytics-Proxy');
ok(/range=/.test(about) && /AN_RANGE\s*=\s*90/.test(about), 'Zeitraum sind 90 Tage');

// Der Snapshot ist erlaubt — aber nur MIT Datum daneben, sonst ist er wieder
// eine Behauptung von heute.
ok(/measuredAt:\s*'\d{4}-\d{2}-\d{2}'/.test(about), 'der Ruecfall-Stand traegt ein Messdatum');
ok(/stat-users-sub/.test(about), 'die Besucherzahl nennt ihren Zeitraum');

// Die Kachel darf nicht "Zufriedenheit" heissen: gemessen wird Verhalten,
// befragt wurde niemand.
ok(!/>\s*Zufriedenheit\s*</.test(about), 'keine Kachel behauptet "Zufriedenheit"');
ok(/>\s*Engagement\s*</.test(about), 'die Kachel heisst "Engagement"');

// ─────────────────────────────────────────────────────────────────────────
console.log('\n── Die Sprechblasen werden nicht mehr beschnitten ─────────────');
const isIn = about.match(/\[data-reveal\]\.is-in\s*\{[^}]*\}/);
ok(!!isIn, 'die .is-in-Regel existiert');
ok(isIn && !/clip-path/.test(isIn[0]), 'sie setzt KEINEN clip-path mehr (er kappte jede Sprechblase)');
ok(!/data-reveal="wipe"/.test(about), 'die tote Wisch-Variante ist weg');

// z-index am Tooltip wirkt nur innerhalb von #stats — der Abschnitt selbst
// muss ueber seine Nachbarn, sonst liegt der Lauftext darueber.
ok(/#stats\s*\{[^}]*z-index:\s*[2-9]/.test(about), '#stats liegt ueber den Nachbar-Abschnitten');

// Beide Sprechblasen klappen nach oben: nach unten lief die des Engagement-
// Kastens aus dem Bild.
const tips = [...about.matchAll(/class="stat-tip (up|down)"/g)].map((m) => m[1]);
ok(tips.length === 2 && tips.every((d) => d === 'up'), `beide Sprechblasen klappen nach oben, gemessen: ${tips.join(', ')}`);

// startStats() haengt sonst am IntersectionObserver als EINZIGEM Ausloeser.
ok(/setTimeout\(startStats/.test(about), 'startStats hat einen Zeit-Fallback (nicht nur den Observer)');

// ─────────────────────────────────────────────────────────────────────────
console.log('\n── i18n: kein Textknoten neben einem Kind-Element ─────────────');
// Der Walk ueberspringt solche Stellen still, und der Build meldet trotzdem
// "0 fehlend" — die Saetze staenden auf /en/ deutsch da.
const { JSDOM } = await import('jsdom');
const doc = new JSDOM(aboutRoh).window.document;
const treffer = [];
doc.getElementById('stats').querySelectorAll('*').forEach((el) => {
    if (el.closest('script,style,svg,code,template,noscript')) return;
    const k = [...el.childNodes];
    if (k.some((x) => x.nodeType === 1) && k.some((x) => x.nodeType === 3 && x.textContent.trim().length > 1))
        treffer.push(el.tagName + '.' + el.className);
});
ok(treffer.length === 0, `Kennzahlen-Block ist vollstaendig extrahierbar${treffer.length ? ': ' + treffer.join(', ') : ''}`);

const enSeite = path.join(ROOT, 'pages/en/about/index.html');
if (fs.existsSync(enSeite)) {
    // 🔴 Nur den SICHTBAREN Text pruefen. Skript- und Stilbloecke wandern
    // unuebersetzt mit auf die EN-Seite — und der Kommentar im Skript erklaert
    // ausgerechnet, was frueher "Zufriedenheit" hiess. Ohne das Strippen prueft
    // diese Zeile ihre eigene Begruendung und schlaegt fehl, obwohl die Seite
    // sauber ist. Dieselbe Falle wie bei den Negativ-Behauptungen oben.
    const en = fs.readFileSync(enSeite, 'utf8')
        .replace(/<script[\s\S]*?<\/script>/g, '')
        .replace(/<style[\s\S]*?<\/style>/g, '')
        .replace(/<!--[\s\S]*?-->/g, '');
    const deutsch = ['Zufriedenheit', 'Verweildauer', 'Sitzungen mit mehr', 'Seiten je Sitzung',
        'Woher kommt die Zahl', 'Wie wird das berechnet', 'Aktive Nutzer', 'letzte 90 Tage']
        .filter((w) => en.includes(w));
    ok(deutsch.length === 0, `/en/about/ traegt keinen deutschen Kennzahlen-Text${deutsch.length ? ': ' + deutsch.join(', ') : ''}`);
} else {
    console.log('  ..     /en/about/ nicht gebaut — uebersprungen (npm run i18n:build)');
}

console.log('');
if (fehler) { console.error(`✗ ${fehler} Pruefung(en) durchgefallen.`); process.exit(1); }
console.log('✓ Engagement-Kennzahl: alle Pruefungen gruen.');
