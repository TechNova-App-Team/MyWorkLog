#!/usr/bin/env node
// ═══ BEISPIEL-SEITEN: Berichtsheft-Beispiele je Ausbildungsberuf ═══
//
//   node tools/beispiel-seiten.mjs           → schreibt alles (idempotent)
//   node tools/beispiel-seiten.mjs --check   → exit 1, wenn Daten ungueltig oder
//                                              DE-Seiten/Sitemap nicht passen
//   node tools/beispiel-seiten.mjs --nur-pruefen → nur die Daten validieren, nichts schreiben
//
// Quelle: tools/beispiele/<id>.json (DE + EN in einer Datei, Format = die Datei
//         fachinformatiker-anwendungsentwicklung.json; validiere() unten ist die Spezifikation).
// Ziel:   pages/berichtsheft-beispiele/<id>/index.html + Uebersicht  — eingecheckt
//         pages/en/berichtsheft-beispiele/…                          — Artefakt (gitignored)
//         sitemap.xml zwischen <!-- beispiele:start/end -->
//
// Warum (Search Console 28.10.2026): /berichtsheft/ rankt fuer "Berichtsheft KI",
// aber Suchen nach Beispielen je Beruf ("berichtsheft beispiele fachinformatiker")
// erreichten keine Seite. Jede Berufsfrage braucht eine eigene Adresse — dasselbe
// Muster wie tools/rechte-seiten.mjs.
// Die Wochenblaetter zeichnet ihkFormToHtml() aus Assets/js/berichtsheft/ihk-formulare.js
// schon beim Bauen: der Text steht damit crawlbar im HTML, und Vordruck-Aenderungen
// kommen hier automatisch mit an. Der Vordruck bleibt auch auf /en/ deutsch
// (Behoerdenformular, Regel aus .claude/notes/berichtsheft.md), nur der Inhalt ist englisch.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://myworklog.de';
const CHECK = process.argv.includes('--check');
const DATEN = path.join(ROOT, 'tools/beispiele');

// ── Vordruck-Code laden (Browser-IIFE, braucht nur window/document.lang) ────
function vordruck(lang) {
  const c = { window: {}, document: { documentElement: { lang } } };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'Assets/js/berichtsheft/ihk-formulare.js'), 'utf8'), c);
  return c.window;
}
const VD = vordruck('de');

// ── Daten laden + pruefen ───────────────────────────────────────────────────
const fehler = [];
const KAMMERN = ['IHK', 'HWK', 'Ärztekammer', 'Zahnärztekammer', 'Steuerberaterkammer', 'Landwirtschaftskammer'];
const STEUER = /[\x00-\x08\x0b\x0c\x0e-\x1f]/;
function txt(wo, s, max) {
  if (typeof s !== 'string' || !s.trim()) { fehler.push(wo + ': leer'); return; }
  if (s.length > max) fehler.push(wo + ': ' + s.length + ' > ' + max + ' Zeichen');
  if (STEUER.test(s)) fehler.push(wo + ': Steuerzeichen');
  if (/\*\*|<|>/.test(s)) fehler.push(wo + ': Markup (** oder <>) im Text');
}
function liste(wo, a, min, max, len) {
  if (!Array.isArray(a) || a.length < min || a.length > max) { fehler.push(wo + ': ' + min + '–' + max + ' Eintraege erwartet'); return; }
  a.forEach((s, i) => txt(wo + '[' + i + ']', s, len));
}
function validiere(b, datei) {
  const id = path.basename(datei, '.json');
  if (b.id !== id) fehler.push(datei + ': id ≠ Dateiname');
  if (!/^[a-z0-9-]+$/.test(b.id || '')) fehler.push(datei + ': id nur a-z0-9-');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.stand || '')) fehler.push(datei + ': stand fehlt');
  const de = b.de || {}, en = b.en || {};
  for (const [l, o] of [['de', de], ['en', en]]) {
    txt(id + '.' + l + '.beruf', o.beruf, 110);
    txt(id + '.' + l + '.kurz', o.kurz, 48);
    txt(id + '.' + l + '.dauer', o.dauer, 20);
    txt(id + '.' + l + '.verordnung', o.verordnung, 200);
    txt(id + '.' + l + '.intro', o.intro, 700);
    liste(id + '.' + l + '.tipps', o.tipps, 3, 6, 260);
    liste(id + '.' + l + '.fehler', o.fehler, 2, 5, 220);
    if (o.lernfelder && o.lernfelder.length) {
      txt(id + '.' + l + '.lernfelderQuelle', o.lernfelderQuelle, 160);
      o.lernfelder.forEach((f, i) => { txt(id + '.' + l + '.lernfelder[' + i + '].titel', f.titel, 140); if (!/^\d{1,2}[a-d]?$/.test(f.nr || '')) fehler.push(id + '.' + l + '.lernfelder[' + i + '].nr'); });
    }
  }
  if (!KAMMERN.includes(de.kammer)) fehler.push(id + ': kammer muss eine von ' + KAMMERN.join('/') + ' sein');
  if (en.kammer !== de.kammer) fehler.push(id + ': en.kammer ≠ de.kammer');
  if ((de.lernfelder || []).length !== (en.lernfelder || []).length) fehler.push(id + ': Lernfelder DE/EN ungleich lang');
  (de.lernfelder || []).forEach((f, i) => { if (en.lernfelder && en.lernfelder[i] && en.lernfelder[i].nr !== f.nr) fehler.push(id + ': Lernfeld ' + i + ' nr DE/EN ungleich'); });
  const jahre = parseInt(de.dauer, 10);
  if (!(jahre >= 2 && jahre <= 4)) fehler.push(id + ': dauer muss mit 2, 3 oder 4 beginnen ("3 Jahre", "3,5 Jahre")');
  const w = de.wochen || [], we = en.wochen || [];
  if (w.length < 3 || w.length > 6) fehler.push(id + ': 3–6 Wochen erwartet');
  if (we.length !== w.length) fehler.push(id + ': en.wochen ≠ de.wochen');
  const maxJahr = Math.ceil(parseFloat(String(de.dauer).replace(',', '.')));
  for (let j = 1; j <= maxJahr; j++) if (!w.some((x) => x.jahr === j)) fehler.push(id + ': keine Woche fuer Ausbildungsjahr ' + j);
  w.forEach((x, i) => {
    const wo = id + '.de.wochen[' + i + ']', e = we[i] || {};
    if (!(x.jahr >= 1 && x.jahr <= maxJahr)) fehler.push(wo + '.jahr');
    txt(wo + '.titel', x.titel, 70); txt(wo + '.bereich', x.bereich, 50);
    txt(wo + '.en.titel', e.titel, 70); txt(wo + '.en.bereich', e.bereich, 50);
    if (!Array.isArray(x.betrieb) || x.betrieb.length < 2 || x.betrieb.length > 6) fehler.push(wo + '.betrieb: 2–6 Zeilen');
    let summe = 0;
    (x.betrieb || []).forEach((z, k) => { txt(wo + '.betrieb[' + k + ']', z.text, 140); if (!(z.std > 0 && z.std <= 40)) fehler.push(wo + '.betrieb[' + k + '].std'); summe += z.std || 0; });
    if (summe < 8 || summe > 40) fehler.push(wo + ': Betriebsstunden ' + summe + ' (8–40)');
    liste(wo + '.unterweisung', x.unterweisung, 0, 4, 140);
    liste(wo + '.schule', x.schule, 0, 5, 140);
    if (!(x.schule || []).length && !(x.unterweisung || []).length) fehler.push(wo + ': weder Schule noch Unterweisung');
    for (const k of ['unterweisung', 'schule']) if ((e[k] || []).length !== (x[k] || []).length) fehler.push(wo + '.en.' + k + ' ungleich lang');
    if ((e.betrieb || []).length !== (x.betrieb || []).length) fehler.push(wo + '.en.betrieb ungleich lang');
    (e.betrieb || []).forEach((s, k) => txt(wo + '.en.betrieb[' + k + ']', s, 160));
    ['unterweisung', 'schule'].forEach((k) => (e[k] || []).forEach((s, n) => txt(wo + '.en.' + k + '[' + n + ']', s, 160)));
  });
}

const berufe = fs.readdirSync(DATEN).filter((f) => f.endsWith('.json')).sort().map((f) => {
  let b;
  try { b = JSON.parse(fs.readFileSync(path.join(DATEN, f), 'utf8')); } catch (e) { fehler.push(f + ': kein gueltiges JSON (' + e.message + ')'); return null; }
  validiere(b, f);
  return b;
}).filter(Boolean);
if (fehler.length) { console.error('[beispiel-seiten] ✗ Daten ungueltig:\n  ' + fehler.join('\n  ')); process.exit(1); }
if (!berufe.length) { console.error('[beispiel-seiten] keine Daten in tools/beispiele/'); process.exit(1); }
berufe.sort((a, b) => a.de.kurz.localeCompare(b.de.kurz, 'de'));
// Nur Daten pruefen, nichts schreiben — fuer parallele Autoren (mehrere Agents gleichzeitig).
if (process.argv.includes('--nur-pruefen')) { console.log('[beispiel-seiten] ✓ ' + berufe.length + ' Berufe, Daten gueltig.'); process.exit(0); }

// ── Texte ───────────────────────────────────────────────────────────────────
const T = {
  de: {
    alle: 'Alle Berufe', hub: 'Berichtsheft-Beispiele', vorlage: 'Leere Vorlage', app: 'Berichtsheft mit KI',
    jahr: (j) => j + '. Ausbildungsjahr', kammer: 'Kammer', dauer: 'Dauer', grundlage: 'Grundlage',
    wochenT: 'Beispielwochen', wochenU: 'So kann je eine Woche im Berichtsheft aussehen. Schreib deine eigenen Einträge immer nach dem, was du wirklich gemacht hast.',
    lernT: 'Lernfelder der Berufsschule', lernU: (q) => 'Quelle: ' + q + '. Die Themen der Berufsschule trägst du im Block „Themen des Berufsschulunterrichts“ ein.',
    tippT: 'Tipps für dieses Berichtsheft', fehlerT: 'Typische Fehler',
    weiterT: 'Deine Woche, ohne abzutippen', weiterP: 'Im Berichtsheft von MyWorkLog erzählst du in ein paar Stichpunkten, was los war. Der Assistent kennt deinen Beruf und schreibt daraus den Eintrag, als PDF auf dem IHK-Vordruck.',
    weiterK: 'Berichtsheft mit KI schreiben', vorlageK: 'Leere Vorlage als PDF',
    andereT: 'Beispiele für andere Berufe',
    hinweis: 'Die Beispiele sind ausgedacht und zeigen Form und Umfang, keine Abschrift echter Berichtshefte. Was in deinem Heft steht, muss zu deiner Ausbildung passen.',
    stand: (d) => 'Stand: ' + d,
    titel: (k) => 'Berichtsheft ' + k + ': Beispiele',
    beschreibung: (b, n, j) => 'Berichtsheft-Beispiele für ' + b + ': ' + n + ' Musterwochen vom 1. bis ' + j + '. Ausbildungsjahr, mit Lernfeldern, Tipps und kostenloser Vorlage.',
    hubTitel: 'Berichtsheft-Beispiele für jeden Beruf | MyWorkLog',
    hubH1: 'Berichtsheft-Beispiele nach Beruf',
    hubLede: 'Musterwochen für jedes Ausbildungsjahr: was in die betrieblichen Tätigkeiten gehört, was in die Unterweisungen und was aus der Berufsschule. Such deinen Beruf.',
    hubBeschreibung: (n) => 'Berichtsheft-Beispiele für ' + n + ' Ausbildungsberufe: Musterwochen für jedes Ausbildungsjahr, Lernfelder, Tipps und eine kostenlose Vorlage als PDF.',
    wochenZahl: (n) => n + ' Beispielwochen',
  },
  en: {
    alle: 'All occupations', hub: 'Training log examples', vorlage: 'Blank template', app: 'Training log with AI',
    jahr: (j) => 'Year ' + j, kammer: 'Chamber', dauer: 'Duration', grundlage: 'Regulation',
    wochenT: 'Example weeks', wochenU: 'This is what one week in the training log can look like. Always write your own entries about what you actually did. The form itself stays German, as it is submitted in German.',
    lernT: 'Vocational school learning fields', lernU: (q) => 'Source: ' + q + '. School topics go into the block “Themen des Berufsschulunterrichts”.',
    tippT: 'Tips for this training log', fehlerT: 'Common mistakes',
    weiterT: 'Your week, without typing it all', weiterP: 'In the MyWorkLog training log you describe what happened in a few keywords. The assistant knows your occupation and writes the entry, as a PDF on the IHK form.',
    weiterK: 'Write your training log with AI', vorlageK: 'Blank template as a PDF',
    andereT: 'Examples for other occupations',
    hinweis: 'The examples are made up and show form and scope, not copies of real training logs. What goes into your log has to match your own training.',
    stand: (d) => 'Last updated: ' + d,
    titel: (k) => 'Training log examples: ' + k,
    beschreibung: (b, n, j) => 'German training log (Berichtsheft) examples for ' + b + ': ' + n + ' sample weeks from year 1 to ' + j + ', with learning fields, tips and a free template.',
    hubTitel: 'German training log examples by occupation | MyWorkLog',
    hubH1: 'Training log examples by occupation',
    hubLede: 'Sample weeks for every year of training: what goes into work tasks, what into instruction and what comes from vocational school. Find your occupation.',
    hubBeschreibung: (n) => 'German training log (Berichtsheft) examples for ' + n + ' occupations: sample weeks for every year, learning fields, tips and a free PDF template.',
    wochenZahl: (n) => n + ' example weeks',
  },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ldJson = (o) => JSON.stringify(o, null, 2).replace(/<\//g, '<\\/');
const datum = (iso, lang) => { const [y, m, d] = iso.split('-').map(Number); return lang === 'de'
  ? d + '. ' + ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][m - 1] + ' ' + y
  : d + ' ' + ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1] + ' ' + y; };
const mitMarke = (t) => (t.length <= 50 ? t + ' | MyWorkLog' : t);

function linkMap() {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/i18n/pages.config.json'), 'utf8'));
  const map = {};
  for (const p of cfg.pages) {
    if (!p.canonicalDe || !p.canonicalEn) continue;
    const de = new URL(p.canonicalDe).pathname, en = new URL(p.canonicalEn).pathname;
    if (de === en) continue;
    map[de] = en;
    const bare = de.replace(/\/+$/, '');
    if (bare) map[bare] = en;
  }
  return map;
}
const LINKMAP = JSON.stringify(linkMap());

// ── Bausteine ───────────────────────────────────────────────────────────────
function kopf({ lang, titel, beschreibung, url, urlDe, urlEn, ld }) {
  return `<!DOCTYPE html>
<html lang="${lang}" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="apple-touch-icon" href="/Grafiken/apple-touch-icon.png">
<script>
(function(){if(/^\\/maintenance/.test(location.pathname))return;document.documentElement.style.visibility='hidden';var r=false;function re(){if(!r){r=true;document.documentElement.style.visibility='';}}fetch('/config/maintenance.json?t='+Date.now(),{cache:'no-store'}).then(function(x){return x.ok?x.json():null;}).then(function(c){if(c && c.active===true){location.replace('/maintenance/');}else{re();}}).catch(re);setTimeout(re,1200);})();
</script>
    <title>${esc(titel)}</title>
    <meta name="description" content="${esc(beschreibung)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${url}">
    <link rel="alternate" hreflang="de" href="${urlDe}">
    <link rel="alternate" hreflang="en" href="${urlEn}">
    <link rel="alternate" hreflang="x-default" href="${urlDe}">
    <meta property="og:type" content="article">
    <meta property="og:locale" content="${lang === 'de' ? 'de_DE' : 'en_GB'}">
    <meta property="og:site_name" content="MyWorkLog">
    <meta property="og:title" content="${esc(titel.replace(/ \| MyWorkLog$/, ''))}">
    <meta property="og:description" content="${esc(beschreibung)}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${SITE}/Grafiken/og-image.png">
    <meta name="theme-color" content="#131428">
    <link rel="manifest" href="/manifest.json">
${ld.map((o) => `    <script type="application/ld+json">\n${ldJson(o)}\n    </script>`).join('\n')}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Caveat:wght@500;600&display=swap">
    <link rel="stylesheet" href="/Assets/css/berichtsheft/pdf-studio.css">
    <link rel="stylesheet" href="/Assets/css/berichtsheft-vorlage.css">
    <link rel="stylesheet" href="/Assets/css/berichtsheft-beispiele.css">
    <script defer src="/Assets/js/ph-init.js"></script>
${lang === 'en' ? '    <script type="application/json" id="i18nLinkMap">' + LINKMAP + '</script>\n' : ''}</head>`;
}

function fuss(lang, ort) {
  return `
<div id="page-footer"></div>

<script>
(function () {
    try {
        var d = JSON.parse(localStorage.getItem('tg_pro_data') || 'null');
        var hex = d && d.settings && d.settings.theme;
        if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return;
        var s = document.documentElement.style;
        s.setProperty('--primary', hex);
        s.setProperty('--primary-rgb', parseInt(hex.slice(1, 3), 16) + ',' + parseInt(hex.slice(3, 5), 16) + ',' + parseInt(hex.slice(5, 7), 16));
    } catch (e) { /* ohne Einstellung bleibt der Startwert */ }
})();
fetch('/pages/footer/footer.html')
    .then(function (r) { return r.text(); })
    .then(function (html) {
        var ph = document.getElementById('page-footer');
        if (!ph) return;
        var t = document.createElement('template');
        t.innerHTML = html;
        ph.replaceWith(t.content);
        if (typeof loadAppVersion === 'function') loadAppVersion();
    })
    .catch(function () {});
document.querySelectorAll('a[data-weiter]').forEach(function (a) {
    a.addEventListener('click', function () {
        if (typeof mwlEvent === 'function') mwlEvent('berichtsheft_beispiel', { aktion: 'weiter_klick', ziel: a.getAttribute('data-weiter'), ort: '${ort}' }, { transport: 'sendBeacon' });
    });
});
</script>
<script>(function(){var h=location.hostname;if(h==='localhost'||h==='127.0.0.1'||h==='::1'||h===''||location.protocol==='file:')return;window.addEventListener('load',function(){setTimeout(function(){var s=document.createElement('script');s.defer=true;s.src='https://static.cloudflareinsights.com/beacon.min.js';s.setAttribute('data-cf-beacon','{"token": "3aa3f484545341a0a8a390cd4dc9983a"}');document.body.appendChild(s);},2000);});})();</script>
${lang === 'en' ? '<script src="/Assets/js/i18n-runtime.js" defer></script>\n' : ''}</body>
</html>
`;
}

const MARKE = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;

function blatt(w, we, lang) {
  const q = lang === 'de' ? w : { ...w, ...we, betrieb: w.betrieb.map((z, i) => ({ text: we.betrieb[i], std: z.std })) };
  const summe = w.betrieb.reduce((a, z) => a + z.std, 0);
  const model = VD.buildIhkFormModel('dihk-w', {
    jahr: String(w.jahr), bereich: q.bereich,
    activities: q.betrieb.map((z) => z.text).join('\n'),
    instruction: (q.unterweisung || []).join('\n'),
    school: (q.schule || []).join('\n'),
    betriebStunden: String(summe),
  });
  return VD.ihkFormToHtml(model);
}

function seite(b, lang) {
  const t = T[lang], d = b[lang], de = b.de;
  const pre = lang === 'en' ? '/en' : '';
  const pfad = '/berichtsheft-beispiele/' + b.id + '/';
  const url = SITE + pre + pfad, urlDe = SITE + pfad, urlEn = SITE + '/en' + pfad;
  const maxJahr = Math.max(...de.wochen.map((w) => w.jahr));
  const titel = mitMarke(t.titel(d.kurz));
  const beschreibung = t.beschreibung(d.beruf.replace(/ \(.*\)$/, ''), de.wochen.length, maxJahr);
  const crumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'MyWorkLog', item: SITE + pre + '/' },
      { '@type': 'ListItem', position: 2, name: t.hub, item: SITE + pre + '/berichtsheft-beispiele/' },
      { '@type': 'ListItem', position: 3, name: d.kurz, item: url },
    ],
  };
  const wochen = de.wochen.map((w, i) => `
            <section class="bb-woche" aria-labelledby="bbW${i}">
                <h3 class="bb-woche-t" id="bbW${i}"><span class="bb-jahr">${esc(t.jahr(w.jahr))}</span> ${esc(lang === 'de' ? w.titel : d.wochen[i].titel)}</h3>
                <div class="pdf-doc style-form bb-blatt">${blatt(w, d.wochen[i], lang)}</div>
            </section>`).join('');
  const lern = (d.lernfelder || []).length ? `
        <section class="bb-abschnitt" aria-labelledby="bbLernT">
            <h2 id="bbLernT">${esc(t.lernT)}</h2>
            <ol class="bb-lernfelder">${d.lernfelder.map((f) => `
                <li><span class="bb-lf-nr">LF ${esc(f.nr)}</span><span>${esc(f.titel)}</span></li>`).join('')}
            </ol>
            <p class="bb-quelle">${esc(t.lernU(d.lernfelderQuelle))}</p>
        </section>` : '';
  const andere = berufe.filter((x) => x.id !== b.id).map((x) => `
                <li><a href="${pre}/berichtsheft-beispiele/${x.id}/">${esc(x[lang].kurz)}</a></li>`).join('');

  return kopf({ lang, titel, beschreibung, url, urlDe, urlEn, ld: [crumbs] }) + `
<body class="bv bb" data-beruf="${b.id}">

<header class="bv-top">
    <a class="bv-marke" href="${pre}/" translate="no">${MARKE}<span>MyWorkLog</span></a>
    <a class="bv-top-link" href="${pre}/berichtsheft-beispiele/">${esc(t.alle)}</a>
</header>

<main class="bv-main">
    <nav aria-label="Breadcrumb" class="bb-pfad">
        <ol>
            <li><a href="${pre}/">MyWorkLog</a></li>
            <li aria-hidden="true">›</li>
            <li><a href="${pre}/berichtsheft-beispiele/">${esc(t.hub)}</a></li>
            <li aria-hidden="true">›</li>
            <li aria-current="page">${esc(d.kurz)}</li>
        </ol>
    </nav>

    <header class="bb-kopf">
        <h1 class="bv-titel bb-titel">${esc(lang === 'de' ? 'Berichtsheft-Beispiele: ' + d.beruf : 'Training log examples: ' + d.beruf)}</h1>
        <p class="bv-lede">${esc(d.intro)}</p>
        <dl class="bb-fakten">
            <div><dt>${esc(t.kammer)}</dt><dd>${esc(d.kammer)}</dd></div>
            <div><dt>${esc(t.dauer)}</dt><dd>${esc(d.dauer)}</dd></div>
            <div><dt>${esc(t.grundlage)}</dt><dd>${esc(d.verordnung)}</dd></div>
        </dl>
    </header>

    <section class="bb-abschnitt" aria-labelledby="bbWochenT">
        <h2 id="bbWochenT">${esc(t.wochenT)}</h2>
        <p class="bb-unter">${esc(t.wochenU)}</p>
        <div class="bb-wochen">${wochen}
        </div>
    </section>

    <aside class="bv-weiter">
        <div>
            <h2 class="bv-weiter-t">${esc(t.weiterT)}</h2>
            <p>${esc(t.weiterP)}</p>
        </div>
        <div class="bb-weiter-knoepfe">
            <a class="bv-knopf is-haupt" href="${pre}/berichtsheft/" data-weiter="berichtsheft">${esc(t.weiterK)}</a>
            <a class="bv-knopf" href="${pre}/berichtsheft-vorlage/" data-weiter="vorlage">${esc(t.vorlageK)}</a>
        </div>
    </aside>

    <div class="bb-spalten">${lern}
        <section class="bb-abschnitt" aria-labelledby="bbTippT">
            <h2 id="bbTippT">${esc(t.tippT)}</h2>
            <ul class="bv-liste">${d.tipps.map((x) => `
                <li>${esc(x)}</li>`).join('')}
            </ul>
            <h2 id="bbFehlerT" class="bb-h2-zwei">${esc(t.fehlerT)}</h2>
            <ul class="bv-liste">${d.fehler.map((x) => `
                <li>${esc(x)}</li>`).join('')}
            </ul>
        </section>
    </div>

    <section class="bb-abschnitt" aria-labelledby="bbAndereT">
        <h2 id="bbAndereT">${esc(t.andereT)}</h2>
        <ul class="bb-andere">${andere}
        </ul>
    </section>

    <footer class="bb-hinweis">
        <p>${esc(t.hinweis)}</p>
        <p>${esc(t.stand(datum(b.stand, lang)))}</p>
    </footer>
</main>
` + fuss(lang, 'beruf');
}

function uebersicht(lang) {
  const t = T[lang], pre = lang === 'en' ? '/en' : '';
  const pfad = '/berichtsheft-beispiele/';
  const url = SITE + pre + pfad;
  const liste = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    itemListElement: berufe.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b[lang].kurz, url: SITE + pre + pfad + b.id + '/' })),
  };
  return kopf({ lang, titel: t.hubTitel, beschreibung: t.hubBeschreibung(berufe.length), url, urlDe: SITE + pfad, urlEn: SITE + '/en' + pfad, ld: [liste] }) + `
<body class="bv bb">

<header class="bv-top">
    <a class="bv-marke" href="${pre}/" translate="no">${MARKE}<span>MyWorkLog</span></a>
    <a class="bv-top-link" href="${pre}/berichtsheft/">${esc(t.app)}</a>
</header>

<main class="bv-main">
    <header class="bb-kopf">
        <h1 class="bv-titel bb-titel">${esc(t.hubH1)}</h1>
        <p class="bv-lede">${esc(t.hubLede)}</p>
    </header>
    <ul class="bb-karten">${berufe.map((b) => `
        <li><a class="bb-karte" href="${pre}${pfad}${b.id}/">
            <span class="bb-karte-t">${esc(b[lang].kurz)}</span>
            <span class="bb-karte-m">${esc(b[lang].kammer)} · ${esc(b[lang].dauer)} · ${esc(t.wochenZahl(b.de.wochen.length))}</span>
        </a></li>`).join('')}
    </ul>

    <aside class="bv-weiter">
        <div>
            <h2 class="bv-weiter-t">${esc(t.weiterT)}</h2>
            <p>${esc(t.weiterP)}</p>
        </div>
        <div class="bb-weiter-knoepfe">
            <a class="bv-knopf is-haupt" href="${pre}/berichtsheft/" data-weiter="berichtsheft">${esc(t.weiterK)}</a>
            <a class="bv-knopf" href="${pre}/berichtsheft-vorlage/" data-weiter="vorlage">${esc(t.vorlageK)}</a>
        </div>
    </aside>
</main>
` + fuss(lang, 'uebersicht');
}

// ── Schreiben / Pruefen (wie rechte-seiten.mjs) ─────────────────────────────
const abweichungen = [];
const ohneStempel = (s) => s.replace(/\?v=[0-9a-f]{6,}/g, '');
function setzeSeite(rel, inhalt) {
  const datei = path.join(ROOT, rel);
  if (fs.existsSync(datei) && ohneStempel(fs.readFileSync(datei, 'utf8').split('\r\n').join('\n')) === inhalt) return;
  if (CHECK) { abweichungen.push(rel); return; }
  fs.mkdirSync(path.dirname(datei), { recursive: true });
  fs.writeFileSync(datei, inhalt);
}

setzeSeite('pages/berichtsheft-beispiele/index.html', uebersicht('de'));
if (!CHECK) setzeSeite('pages/en/berichtsheft-beispiele/index.html', uebersicht('en'));
const ids = new Set(berufe.map((b) => b.id));
for (const b of berufe) {
  setzeSeite(`pages/berichtsheft-beispiele/${b.id}/index.html`, seite(b, 'de'));
  if (!CHECK) setzeSeite(`pages/en/berichtsheft-beispiele/${b.id}/index.html`, seite(b, 'en'));
}
for (const basis of ['pages/berichtsheft-beispiele', 'pages/en/berichtsheft-beispiele']) {
  const dir = path.join(ROOT, basis);
  if (!fs.existsSync(dir)) continue;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || ids.has(e.name)) continue;
    if (CHECK) { if (basis === 'pages/berichtsheft-beispiele') abweichungen.push(basis + '/' + e.name + ' (verwaist)'); }
    else fs.rmSync(path.join(dir, e.name), { recursive: true, force: true });
  }
}

// ── Sitemap ─────────────────────────────────────────────────────────────────
const smDatei = path.join(ROOT, 'sitemap.xml');
const smRoh = fs.readFileSync(smDatei, 'utf8');
const crlf = smRoh.includes('\r\n');
let sm = smRoh.split('\r\n').join('\n');
const START = '  <!-- beispiele:start (tools/beispiel-seiten.mjs) -->', ENDE = '  <!-- beispiele:end -->';
const eintrag = (p, lastmod, prio) => ['de', 'en'].map((lang) => `  <url>
    <loc>${SITE}${lang === 'en' ? '/en' : ''}${p}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${lang === 'de' ? prio : '0.5'}</priority>
    <xhtml:link rel="alternate" hreflang="de" href="${SITE}${p}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}/en${p}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${p}"/>
  </url>`);
const neuester = berufe.map((b) => b.stand).sort().pop();
const block = [START, ...eintrag('/berichtsheft-beispiele/', neuester, '0.8'),
  ...berufe.flatMap((b) => eintrag('/berichtsheft-beispiele/' + b.id + '/', b.stand, '0.7')), ENDE].join('\n');
if (sm.includes(START)) sm = sm.slice(0, sm.indexOf(START)) + block + sm.slice(sm.indexOf(ENDE) + ENDE.length);
else sm = sm.replace('</urlset>', block + '\n\n</urlset>');
const smNeu = crlf ? sm.split('\n').join('\r\n') : sm;
if (smNeu !== smRoh) { if (CHECK) abweichungen.push('sitemap.xml'); else fs.writeFileSync(smDatei, smNeu); }

if (CHECK) {
  if (abweichungen.length) { console.error('[beispiel-seiten] ✗ nicht aktuell — node tools/beispiel-seiten.mjs:\n  ' + abweichungen.join('\n  ')); process.exit(1); }
  console.log('[beispiel-seiten] ✓ ' + berufe.length + ' Berufe, Seiten und Sitemap aktuell.');
} else {
  console.log('[beispiel-seiten] ✓ ' + berufe.length + ' Berufe → DE + EN.');
}
