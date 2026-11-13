#!/usr/bin/env node
// ═══ RECHTE-SEITEN: je Fall des Rechte-Checkers eine eigene Seite ═══
//
//   node tools/rechte-seiten.mjs           → schreibt alles (idempotent)
//   node tools/rechte-seiten.mjs --check   → exit 1, wenn DE-Seiten, Sitemap oder
//                                            Kennzahlen nicht zu den Daten passen
//
// Quelle: Assets/js/rechte-checker/faelle.js (DE) + faelle.en.js (EN).
// Ziel:   pages/rechte-checker/<id>/index.html     — eingecheckt
//         pages/en/rechte-checker/<id>/index.html  — Artefakt (pages/en ist gitignored)
//         sitemap.xml zwischen <!-- rechte-faelle:start/end -->
//         Fallzahl/Kategorienzahl auf pages/rechte-checker/index.html
//
// Warum eigene Seiten: Bis v8.6.3 war der Checker EINE Seite, deren Faelle erst
// per JS entstanden. Google sah 51 Fragen hinter einer Adresse und fand ueber
// 90 Tage null Einstiege von aussen. Jede Frage ("darf mein Chef mich putzen
// lassen") ist eine eigene Suche und braucht deshalb eine eigene Adresse.
//
// Die EN-Seiten laufen bewusst NICHT durch tools/i18n: die Uebersetzung steht
// fertig in faelle.en.js, ein Woerterbuch je Fallseite waeren 112 Dateien ohne
// Mehrwert. Deshalb steht dieser Lauf in der Build-Kette NACH i18n:build.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://myworklog.de';
const CHECK = process.argv.includes('--check');

function lade() {
  const c = { window: {} };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'Assets/js/rechte-checker/faelle.js'), 'utf8'), c);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'Assets/js/rechte-checker/faelle.en.js'), 'utf8'), c);
  return { faelle: c.window.RC_FAELLE, en: c.window.RC_EN.scenarios, stand: c.window.RC_STAND, seo: { de: c.window.RC_SEO || {}, en: c.window.RC_EN.seo || {} }, seoText: { de: c.window.RC_SEO_TEXT || {}, en: c.window.RC_EN.seoText || {} } };
}
const { faelle, en: EN, stand: STAND, seo: SEO, seoText: SEO_TEXT } = lade();
if (!faelle || faelle.length < 50) { console.error('[rechte-seiten] Daten nicht geladen'); process.exit(1); }
if (!/^\d{4}-\d{2}-\d{2}$/.test(STAND || '')) { console.error('[rechte-seiten] RC_STAND fehlt in faelle.js'); process.exit(1); }
const seoKaputt = [...Object.keys(SEO.de), ...Object.keys(SEO.en)].filter((id) => !faelle.some((s) => s.id === id) || !SEO.de[id] || !SEO.en[id]);
if (seoKaputt.length) { console.error('[rechte-seiten] RC_SEO ohne Fall oder ohne DE/EN: ' + [...new Set(seoKaputt)].join(', ')); process.exit(1); }
const textKaputt = [...Object.keys(SEO_TEXT.de), ...Object.keys(SEO_TEXT.en)].filter((id) => !faelle.some((s) => s.id === id) || !SEO_TEXT.de[id] || !SEO_TEXT.en[id] || SEO_TEXT.de[id].length > 160 || SEO_TEXT.en[id].length > 160);
if (textKaputt.length) { console.error('[rechte-seiten] RC_SEO_TEXT ohne Fall, ohne DE/EN oder ueber 160 Zeichen: ' + [...new Set(textKaputt)].join(', ')); process.exit(1); }
const fehltEn = faelle.filter((s) => !EN[s.id]).map((s) => s.id);
if (fehltEn.length) { console.error('[rechte-seiten] ohne Englisch: ' + fehltEn.join(', ')); process.exit(1); }

const KAT = {
  de: { arbeitszeit: 'Arbeitszeit', taetigkeit: 'Tätigkeiten', urlaub: 'Urlaub', schule: 'Berufsschule', pruefung: 'Prüfung', geld: 'Vergütung', gesundheit: 'Krankheit', kuendigung: 'Kündigung', mobbing: 'Mobbing', sicherheit: 'Sicherheit', ausbildung: 'Ausbildung', mitbestimmung: 'Mitbestimmung', privat: 'Privates' },
  en: { arbeitszeit: 'Working hours', taetigkeit: 'Duties', urlaub: 'Vacation', schule: 'Vocational school', pruefung: 'Exams', geld: 'Pay', gesundheit: 'Sickness', kuendigung: 'Termination', mobbing: 'Bullying', sicherheit: 'Safety', ausbildung: 'Training', mitbestimmung: 'Co-determination', privat: 'Private life' },
};
// Welcher Weg in die App zu welchem Thema passt. Gemessen 28.10.2026: Fallseiten
// bekommen Google-Einstiege, aber Einstiege ≈ Ausstiege — der alte Kasten war auf
// allen Seiten gleich und nannte das Schatten-Berichtsheft nie, obwohl genau die
// Kündigungs-/Mobbing-Leser es brauchen. Klicks messen: rechte_checker/weiter_klick.
const WEITER = {
  kuendigung: 'schatten', mobbing: 'schatten', sicherheit: 'schatten', mitbestimmung: 'schatten', privat: 'schatten', taetigkeit: 'schatten',
  arbeitszeit: 'zeit', urlaub: 'zeit', geld: 'zeit', gesundheit: 'zeit',
  schule: 'heft', pruefung: 'heft', ausbildung: 'heft',
};
const WEITER_ZIEL = { schatten: '/schatten-berichtsheft/', zeit: '/', heft: '/berichtsheft/' };
// Zweiter Link: der naheliegende Nachbar, damit niemand in eine Sackgasse läuft.
const WEITER_NEBEN = { schatten: 'zeit', zeit: 'schatten', heft: 'zeit' };
const ohneWeg = Object.keys(KAT.de).filter((k) => !WEITER[k]);
if (ohneWeg.length) { console.error('[rechte-seiten] Kategorie ohne Weg in die App: ' + ohneWeg.join(', ')); process.exit(1); }
const unbekannt = faelle.filter((s) => !KAT.de[s.cat]).map((s) => s.id + ':' + s.cat);
if (unbekannt.length) { console.error('[rechte-seiten] unbekannte Kategorie: ' + unbekannt.join(', ')); process.exit(1); }

const T = {
  de: {
    urteil: { nein: 'Das darf der Chef NICHT', jein: 'Kommt drauf an …', ja: 'Das ist erlaubt' },
    checker: 'Rechte-Checker', alle: 'Alle Fälle', gesetz: 'Was im Gesetz steht', tipps: 'Was du tun kannst',
    chefSagt: 'Dein Chef sagt', fundstellen: (n) => n === 1 ? '1 Fundstelle' : n + ' Fundstellen',
    teilenFrage: 'Kennt das jemand aus deiner Klasse?', teilen: 'Link teilen', geteilt: 'Link kopiert',
    urteilKurz: { nein: 'Darf er nicht', jein: 'Kommt drauf an', ja: 'Darf er' },
    // Bezieht sich auf das Chef-Zitat daneben, NICHT auf die Suchfrage im H1: die ist mal
    // „Muss ich …?“, mal „Darf der Betrieb …?“ — ein „Nein.“ wäre bei der Hälfte falsch herum.
    urteilWort: { nein: 'Darf er nicht.', jein: 'Kommt drauf an.', ja: 'Darf er.' },
    ganzeAntwort: 'Die ganze Antwort', naechster: 'Tipp', kurzGesagt: 'Kurz gesagt',
    mail: 'E-Mail-Vorlage an deinen Ausbilder', betreff: 'Betreff', kopieren: 'Kopieren', kopiert: 'Kopiert',
    mehr: (k) => 'Weitere Fälle: ' + k, frage: (t) => t + ' – ist das erlaubt?',
    titel: (t) => t + ' – Azubi-Rechte | MyWorkLog',
    stand: (d) => 'Rechtsstand: ' + d,
    hinweis: 'Diese Informationen dienen zur allgemeinen Orientierung und ersetzen keine Rechtsberatung. Bei konkreten Problemen hilft die Ausbildungsberatung deiner IHK/HWK, deine Gewerkschaft oder ein Fachanwalt für Arbeitsrecht.',
    weiter: {
      schatten: { titel: 'Schreib mit, was passiert', text: 'Am Ende zählt, was du belegen kannst: Datum, Uhrzeit, wer was gesagt oder verlangt hat. Das Schatten-Berichtsheft ist dein privates Protokoll dafür – verschlüsselt, nur auf deinem Gerät, kostenlos.', knopf: 'Schatten-Berichtsheft öffnen' },
      zeit: { titel: 'Deine Stunden als Beleg', text: 'Überstunden, Pausen, Urlaubs- und Krankheitstage kannst du später nur nachweisen, wenn du sie festgehalten hast. MyWorkLog erfasst deine Arbeitszeit kostenlos und rechnet Saldo und Urlaubsrest mit.', knopf: 'Arbeitszeit erfassen' },
      heft: { titel: 'Berichtsheft ohne Zettelwirtschaft', text: 'Ohne vollständiges Berichtsheft keine Zulassung zur Abschlussprüfung. Mit MyWorkLog schreibst du es Woche für Woche, auf Wunsch mit KI-Hilfe, und dein Ausbilder kann es digital abzeichnen.', knopf: 'Berichtsheft schreiben' },
    },
  },
  en: {
    urteil: { nein: 'The boss may NOT do that', jein: 'It depends …', ja: 'This is allowed' },
    checker: 'Rights Checker', alle: 'All cases', gesetz: 'What the law says', tipps: 'What you can do',
    chefSagt: 'Your boss says', fundstellen: (n) => n === 1 ? '1 legal source' : n + ' legal sources',
    teilenFrage: 'Does someone in your class know this one?', teilen: 'Share link', geteilt: 'Link copied',
    urteilKurz: { nein: 'Not allowed', jein: 'It depends', ja: 'Allowed' },
    urteilWort: { nein: 'Not allowed.', jein: 'It depends.', ja: 'Allowed.' },
    ganzeAntwort: 'The full answer', naechster: 'Tip', kurzGesagt: 'In short',
    mail: 'Email template for your trainer', betreff: 'Subject', kopieren: 'Copy', kopiert: 'Copied',
    mehr: (k) => 'More cases: ' + k, frage: (t) => t + ' – is that allowed?',
    titel: (t) => t + ' – Trainee rights | MyWorkLog',
    stand: (d) => 'Legal status: ' + d,
    hinweis: 'This information is for general guidance only and is not legal advice. For specific problems, contact the training advisers at your IHK/HWK, your union or a lawyer specialising in employment law.',
    weiter: {
      schatten: { titel: 'Write down what happens', text: 'In the end, what counts is what you can prove: date, time, who said or demanded what. The shadow training log is your private record for exactly that – encrypted, only on your device, free.', knopf: 'Open the shadow training log' },
      zeit: { titel: 'Your hours as evidence', text: 'Overtime, breaks, vacation and sick days can only be proven later if you recorded them. MyWorkLog tracks your working time for free and keeps your balance and remaining vacation up to date.', knopf: 'Track working time' },
      heft: { titel: 'A training log without the paperwork', text: 'Without a complete training log there is no admission to the final exam. With MyWorkLog you write it week by week, with AI help if you like, and your trainer can sign it off digitally.', knopf: 'Write your training log' },
    },
  },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fett = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const ohneFett = (s) => String(s).replace(/\*\*(.+?)\*\*/g, '$1');
// '"Du machst heute Überstunden!"' → 'Du machst heute Überstunden!'
const ohneAnf = (t) => String(t).replace(/"/g, '').replace(/\s+/g, ' ').trim();
function kurz(text, max) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const schnitt = t.slice(0, max - 1);
  return schnitt.slice(0, schnitt.lastIndexOf(' ')).replace(/[,;:–-]$/, '') + '…';
}
// Bis 11/2026 endeten alle 112 Beschreibungen mitten im Satz auf "…". Ganze Saetze, solange sie
// reichen; Abkuerzungen wie "z." oder "Abs." sind keine Satzenden. Zu kurz bleibt der Wortschnitt.
function bisSatzende(text, max) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const saetze = t.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ„"])/);
  let aus = '';
  for (const s of saetze) {
    const neu = aus ? aus + ' ' + s : s;
    if (neu.length > max) break;
    aus = neu;
  }
  const abkuerzung = /(?:\b[A-Za-zÄÖÜäöü]|Abs|Nr|bzw|ca|ggf|vgl|Art|etc|no)\.$/;
  while (abkuerzung.test(aus)) aus = aus.slice(0, aus.lastIndexOf(' ') > 0 ? aus.lastIndexOf(' ') : 0).trim();
  return aus.length >= 80 && /[.!?]$/.test(aus) ? aus : kurz(t, max);
}
const datumDe = (iso) => { const [y, m, d] = iso.split('-').map(Number); return d + '. ' + ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][m - 1] + ' ' + y; };
const datumEn = (iso) => { const [y, m, d] = iso.split('-').map(Number); return d + ' ' + ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1] + ' ' + y; };

const CAT_ICON = {
  arbeitszeit: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  taetigkeit: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  urlaub: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  schule: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  pruefung: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  geld: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01"/><path d="M18 12h.01"/>',
  gesundheit: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
  kuendigung: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  mobbing: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  sicherheit: '<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/>',
  ausbildung: '<path d="M21.42 10.92a1 1 0 0 0-.02-1.84L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  mitbestimmung: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  privat: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
};
const svg = (d, kl) => '<svg' + (kl ? ' class="' + kl + '"' : '') + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
const BUCH = '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>';
const PFEIL_L = '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>';

// Woerterbuch der /en/-Adressen wie in tools/i18n/i18n-build.js (buildLinkMap):
// i18n-runtime.js schreibt damit die Links im gemeinsamen Fussbereich um.
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

// JSON in <script>: "</" darf nicht roh stehen, sonst endet das Skript-Element.
const ldJson = (o) => JSON.stringify(o, null, 2).replace(/<\//g, '<\\/');

function seite(s, lang) {
  const t = T[lang];
  const d = lang === 'de' ? s : { ...s, ...EN[s.id] };
  const pre = lang === 'en' ? '/en' : '';
  const url = SITE + pre + '/rechte-checker/' + s.id + '/';
  const urlDe = SITE + '/rechte-checker/' + s.id + '/';
  const urlEn = SITE + '/en/rechte-checker/' + s.id + '/';
  const titel = ohneAnf(d.title);
  const seo = SEO[lang][s.id];
  // Google kuerzt ab ~60 Zeichen; dann lieber ohne Markenzusatz als mit abgeschnittener Frage.
  const kopfTitel = seo ? (seo.length <= 52 ? seo + ' | MyWorkLog' : seo) : t.titel(titel);
  const beschreibung = SEO_TEXT[lang][s.id] || bisSatzende(d.verdictShort + ' ' + ohneFett(d.verdictDetail), 158);
  const kat = KAT[lang][s.cat];
  const standText = lang === 'de' ? datumDe(STAND) : datumEn(STAND);
  const weg = WEITER[s.cat], neben = WEITER_NEBEN[weg];
  const nachbarn = faelle.filter((x) => x.cat === s.cat && x.id !== s.id);
  const antwort = ohneFett(d.verdictShort + ' ' + d.verdictDetail);

  const faq = {
    '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: lang,
    mainEntity: [{ '@type': 'Question', name: seo || t.frage(titel), acceptedAnswer: { '@type': 'Answer', text: antwort } }],
  };
  const crumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'MyWorkLog', item: SITE + pre + '/' },
      { '@type': 'ListItem', position: 2, name: t.checker, item: SITE + pre + '/rechte-checker/' },
      { '@type': 'ListItem', position: 3, name: titel, item: url },
    ],
  };

  // H1 = die Suchfrage (RC_SEO), nicht mehr das Chef-Zitat: bis 11/2026 stand im H1 nur
  // '"Weihnachtsgeld bekommen nur die Festangestellten."' — kein Wort der Suche
  // („bekommen azubis weihnachtsgeld“), 5.771 Einblendungen in 28 Tagen bei 0,4 % Klickrate.
  // Das Zitat bleibt als Sprechblase direkt darunter. Hinter dem ersten „?“ steht im
  // SEO-Titel nur noch der Zusatz fürs Suchergebnis („Anspruch und Höhe“).
  const frage = seo ? (seo.includes('?') ? seo.slice(0, seo.indexOf('?') + 1) : seo) : t.frage(titel);
  const paragraphen = String(s.law || '').split(/\s*\/\s*/).filter(Boolean);
  const gesetze = (d.laws || []).map((l) => `
                    <li><p class="rf-g-titel">${esc(l.title)}</p><p>${esc(l.text)}</p></li>`).join('');
  const tipps = (d.tips || []).map((x) => `
                    <li>${esc(x)}</li>`).join('');
  const mail = d.email ? `
            <details class="fall-mail">
                <summary>${esc(t.mail)}</summary>
                <div class="email-output active">
                    <div class="email-output-header">
                        <div class="email-output-title">${esc(t.betreff)}: ${esc(d.email.subject)}</div>
                        <button type="button" class="email-copy-btn" data-kopiert="${esc(t.kopiert)}" onclick="rcKopieren(this)">${esc(t.kopieren)}</button>
                    </div>
                    <div class="email-text">${esc(d.email.body)}</div>
                </div>
            </details>` : '';
  const mehr = nachbarn.map((x) => {
    const xd = lang === 'de' ? x : { ...x, ...EN[x.id] };
    return `
                    <li><a href="${pre}/rechte-checker/${x.id}/" data-urteil="${x.verdict}"><span class="rf-mehr-urteil">${esc(t.urteilKurz[x.verdict])}</span><span class="rf-mehr-zitat">${esc(ohneAnf(xd.title))}</span></a></li>`;
  }).join('');
  // Drei Wege statt zwei: das Berichtsheft fehlte auf allen Arbeitszeit-, Krankheits- und
  // Kündigungsseiten, obwohl dort der meiste Google-Verkehr landet (28 Tage bis 13.11.2026).
  const wege = [...new Set([weg, neben, 'heft'])];
  const artikel = {
    '@context': 'https://schema.org', '@type': 'Article', inLanguage: lang,
    headline: frage, description: beschreibung, dateModified: STAND,
    mainEntityOfPage: url, image: SITE + '/Grafiken/icon-512.png',
    author: { '@type': 'Organization', name: 'MyWorkLog', url: SITE + '/' },
    publisher: { '@type': 'Organization', name: 'MyWorkLog', logo: { '@type': 'ImageObject', url: SITE + '/Grafiken/icon-512.png' } },
  };

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="apple-touch-icon" href="/Grafiken/apple-touch-icon.png">
<script>
(function(){if(/^\\/maintenance/.test(location.pathname))return;document.documentElement.style.visibility='hidden';var r=false;function re(){if(!r){r=true;document.documentElement.style.visibility='';}}fetch('/config/maintenance.json?t='+Date.now(),{cache:'no-store'}).then(function(x){return x.ok?x.json():null;}).then(function(c){if(c && c.active===true){location.replace('/maintenance/');}else{re();}}).catch(re);setTimeout(re,1200);})();
</script>
    <title>${esc(kopfTitel)}</title>
    <meta name="description" content="${esc(beschreibung)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${url}">
    <link rel="alternate" hreflang="de" href="${urlDe}">
    <link rel="alternate" hreflang="en" href="${urlEn}">
    <link rel="alternate" hreflang="x-default" href="${urlDe}">
    <meta property="og:type" content="article">
    <meta property="og:locale" content="${lang === 'de' ? 'de_DE' : 'en_GB'}">
    <meta property="og:site_name" content="MyWorkLog">
    <meta property="og:title" content="${esc(seo || titel)}">
    <meta property="og:description" content="${esc(beschreibung)}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${SITE}/Grafiken/icon-512.png">
    <meta name="twitter:card" content="summary">
    <meta name="theme-color" content="#050507">
    <link rel="manifest" href="/manifest.json">
    <script type="application/ld+json" data-ld-id="faq">
${ldJson(faq)}
    </script>
    <script type="application/ld+json" data-ld-id="breadcrumb">
${ldJson(crumbs)}
    </script>
    <script type="application/ld+json" data-ld-id="artikel">
${ldJson(artikel)}
    </script>
    <link rel="stylesheet" href="/Assets/fonts/bricolage-grotesque-geist-bfd216ed.css">
    <link rel="stylesheet" href="/Assets/css/rechte-checker.css">
    <link rel="stylesheet" href="/Assets/css/rechte-fall.css">
    <script defer src="/Assets/js/ph-init.js"></script>
${lang === 'en' ? '    <script type="application/json" id="i18nLinkMap">' + LINKMAP + '</script>\n' : ''}</head>
<body class="fall-seite" data-fall="${s.id}">
    <div class="ambient"></div>
    <div class="shell fall-shell rf-shell">
        <div class="rc-kopfzeile">
        <a href="${pre}/rechte-checker/" class="back-btn">${svg(PFEIL_L)}${esc(t.alle)}</a>
        <nav aria-label="Breadcrumb" class="fall-pfad">
            <ol>
                <li><a href="${pre}/">MyWorkLog</a></li>
                <li aria-hidden="true">›</li>
                <li><a href="${pre}/rechte-checker/">${esc(t.checker)}</a></li>
                <li aria-hidden="true">›</li>
                <li aria-current="page">${esc(kat)}</li>
            </ol>
        </nav>
        </div>

        <main class="rf" data-urteil="${s.verdict}">
            <section class="rf-held">
                <div class="rf-held-text">
                    <p class="rf-kat">${svg(CAT_ICON[s.cat])}${esc(kat)}</p>
                    <h1 class="rf-frage">${esc(frage)}</h1>
                    <figure class="rf-spruch">
                        <figcaption>${esc(t.chefSagt)}</figcaption>
                        <blockquote><p>${esc(titel)}</p></blockquote>
                    </figure>
                    <p class="rf-lage">${esc(d.desc)}</p>
                </div>
                <aside class="rf-urteil" aria-labelledby="rf-urteil-wort">
                  <div class="rf-urteil-kern">
                    <p class="rf-urteil-marke">${esc(t.kurzGesagt)}</p>
                    <p class="rf-urteil-wort" id="rf-urteil-wort">${esc(t.urteilWort[s.verdict])}</p>
                    <p class="rf-kurz">${esc(d.verdictShort)}</p>
${(d.tips || []).length ? `                    <div class="rf-erster">
                        <p class="rf-erster-t">${svg('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>')}${esc(t.naechster)}</p>
                        <p>${esc(d.tips[0])}</p>
                    </div>
` : ''}                    <ul class="rf-paragraphen" aria-label="${esc(t.gesetz)}">${paragraphen.map((x) => '<li>' + esc(x) + '</li>').join('')}</ul>
                  </div>
                </aside>
            </section>

            <div class="rf-raster">
                <article class="rf-inhalt">
                    <section class="rf-block" aria-labelledby="h-antwort">
                        <h2 class="rf-h2" id="h-antwort">${esc(t.ganzeAntwort)}</h2>
                        <div class="rf-detail">${fett(d.verdictDetail)}</div>
                        <p class="rf-stand"><time datetime="${STAND}">${esc(t.stand(standText))}</time> · ${esc(t.fundstellen((d.laws || []).length))}</p>
                    </section>

                    <section class="rf-block" aria-labelledby="h-gesetz">
                        <h2 class="rf-h2" id="h-gesetz">${esc(t.gesetz)}</h2>
                        <ul class="rf-gesetze">${gesetze}
                        </ul>
                    </section>

                    <section class="rf-block" aria-labelledby="h-tipps">
                        <h2 class="rf-h2" id="h-tipps">${esc(t.tipps)}</h2>
                        <ol class="rf-schritte">${tipps}
                        </ol>
                    </section>
${mail}
                </article>

                <div class="rf-seite">
                    <aside class="fall-werbung rf-weiter" data-weg="${weg}">
                      <div class="rf-weiter-kern">
                        <p class="rf-weiter-titel">${esc(t.weiter[weg].titel)}</p>
                        <p class="rf-weiter-text">${esc(t.weiter[weg].text)}</p>
                        <p class="rf-weiter-links">${wege.map((w, i) => '<a class="' + (i === 0 ? 'rf-knopf' : 'rf-link') + '" href="' + pre + WEITER_ZIEL[w] + '" data-ziel="' + w + '">' + (i === 0 ? '<span>' + esc(t.weiter[w].knopf) + '</span><span class="rf-knopf-pfeil">' + svg('<path d="M7 17 17 7"/><path d="M8 7h9v9"/>') + '</span>' : esc(t.weiter[w].knopf)) + '</a>').join('')}</p>
                      </div>
                    </aside>
                    <div class="rf-teilen">
                        <p>${esc(t.teilenFrage)}</p>
                        <button type="button" class="rf-link-knopf" data-geteilt="${esc(t.geteilt)}" onclick="rcTeilen(this)">${svg('<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/>')}<span>${esc(t.teilen)}</span></button>
                    </div>
                </div>
            </div>
${nachbarn.length ? `
            <section class="rf-mehr" aria-labelledby="h-mehr">
                <h2 class="rf-h2" id="h-mehr">${esc(t.mehr(kat))}</h2>
                <ul>${mehr}
                </ul>
            </section>
` : ''}        </main>

        <footer class="disclaimer">
            <p>${esc(t.hinweis)}</p>
        </footer>
    </div>

    <div id="page-footer"></div>

    <script>
    function rcKopieren(btn) {
        var text = btn.closest('.email-output').querySelector('.email-text').textContent;
        var fertig = function () { var alt = btn.textContent; btn.textContent = btn.getAttribute('data-kopiert'); setTimeout(function () { btn.textContent = alt; }, 1800); };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(fertig, function () {});
        if (typeof mwlEvent === 'function') mwlEvent('rechte_checker', { aktion: 'mustermail_kopiert', fall: document.body.getAttribute('data-fall'), ort: 'fallseite' });
    }
    // Teilen: am Handy das System-Menü (WhatsApp & Co.), sonst den Link kopieren.
    function rcTeilen(btn) {
        var fall = document.body.getAttribute('data-fall');
        var daten = { title: document.querySelector('.rf-frage').textContent, url: location.href.split('#')[0] };
        var gemeldet = function (weg) { if (typeof mwlEvent === 'function') mwlEvent('rechte_checker', { aktion: 'geteilt', weg: weg, fall: fall }); };
        if (navigator.share) { navigator.share(daten).then(function () { gemeldet('menue'); }).catch(function () { /* abgebrochen */ }); return; }
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(daten.url).then(function () {
            var sp = btn.querySelector('span'), alt = sp.textContent;
            sp.textContent = btn.getAttribute('data-geteilt');
            setTimeout(function () { sp.textContent = alt; }, 1800);
            gemeldet('kopiert');
        }, function () { });
    }
    document.querySelectorAll('.fall-werbung a[data-ziel]').forEach(function (a) {
        a.addEventListener('click', function () {
            if (typeof mwlEvent === 'function') mwlEvent('rechte_checker', { aktion: 'weiter_klick', ziel: a.getAttribute('data-ziel'), fall: document.body.getAttribute('data-fall') }, { transport: 'sendBeacon' });
        });
    });
    </script>

    <!-- Theme-Sync: Akzent aus den App-Einstellungen (Pflicht fuer Standalone-Seiten) -->
    <script>
    (function () {
        try {
            var data = JSON.parse(localStorage.getItem('tg_pro_data') || 'null');
            var hex = data && data.settings && data.settings.theme;
            if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return;
            var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
            document.documentElement.style.setProperty('--primary', hex);
            document.documentElement.style.setProperty('--primary-rgb', r + ',' + g + ',' + b);
        } catch (e) { /* ohne Einstellung bleibt der Startwert */ }
    })();
    </script>
    <script>
    fetch('/pages/footer/footer.html')
        .then(function (r) { return r.text(); })
        .then(function (html) {
            var ph = document.getElementById('page-footer');
            if (!ph) return;
            var tmpl = document.createElement('template');
            tmpl.innerHTML = html;
            ph.replaceWith(tmpl.content);
            if (typeof loadAppVersion === 'function') loadAppVersion();
        });
    </script>
<script>(function(){var h=location.hostname;if(h==='localhost'||h==='127.0.0.1'||h==='::1'||h===''||location.protocol==='file:')return;window.addEventListener('load',function(){setTimeout(function(){var s=document.createElement('script');s.defer=true;s.src='https://static.cloudflareinsights.com/beacon.min.js';s.setAttribute('data-cf-beacon','{"token": "3aa3f484545341a0a8a390cd4dc9983a"}');document.body.appendChild(s);},2000);});})();</script>
${lang === 'en' ? '<script src="/Assets/js/i18n-runtime.js" defer></script>\n' : ''}</body>
</html>
`;
}

// ── Schreiben / Pruefen ─────────────────────────────────────────────────────
const abweichungen = [];
function setze(rel, inhalt) {
  const datei = path.join(ROOT, rel);
  const alt = fs.existsSync(datei) ? fs.readFileSync(datei, 'utf8').split('\r\n').join('\n') : null;
  if (alt === inhalt) return;
  if (CHECK) { abweichungen.push(rel); return; }
  fs.mkdirSync(path.dirname(datei), { recursive: true });
  fs.writeFileSync(datei, inhalt);
}

// stamp-assets setzt ?v= an die Asset-Adressen; der Vergleich ignoriert sie,
// sonst waere --check nach jedem Stempeln rot.
const ohneStempel = (s) => s.replace(/\?v=[0-9a-f]{6,}/g, '');
function setzeSeite(rel, inhalt) {
  const datei = path.join(ROOT, rel);
  if (fs.existsSync(datei)) {
    const alt = fs.readFileSync(datei, 'utf8').split('\r\n').join('\n');
    if (ohneStempel(alt) === inhalt) return;
  }
  setze(rel, inhalt);
}

const ids = new Set(faelle.map((s) => s.id));
for (const s of faelle) {
  setzeSeite(`pages/rechte-checker/${s.id}/index.html`, seite(s, 'de'));
  if (!CHECK) setzeSeite(`pages/en/rechte-checker/${s.id}/index.html`, seite(s, 'en'));
}

// Verwaiste Fallseiten (id umbenannt oder Fall entfernt) melden bzw. entfernen
for (const basis of ['pages/rechte-checker', 'pages/en/rechte-checker']) {
  const dir = path.join(ROOT, basis);
  if (!fs.existsSync(dir)) continue;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || ids.has(e.name)) continue;
    if (!fs.existsSync(path.join(dir, e.name, 'index.html'))) continue;
    if (CHECK) { if (basis === 'pages/rechte-checker') abweichungen.push(basis + '/' + e.name + ' (verwaist)'); }
    else fs.rmSync(path.join(dir, e.name), { recursive: true, force: true });
  }
}

// ── Sitemap ─────────────────────────────────────────────────────────────────
const smDatei = path.join(ROOT, 'sitemap.xml');
const smRoh = fs.readFileSync(smDatei, 'utf8');
const crlf = smRoh.includes('\r\n');
let sm = smRoh.split('\r\n').join('\n');
const START = '  <!-- rechte-faelle:start (tools/rechte-seiten.mjs) -->', ENDE = '  <!-- rechte-faelle:end -->';
const block = [START, ...faelle.flatMap((s) => ['de', 'en'].map((lang) => {
  const loc = SITE + (lang === 'en' ? '/en' : '') + '/rechte-checker/' + s.id + '/';
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${STAND}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.6</priority>
    <xhtml:link rel="alternate" hreflang="de" href="${SITE}/rechte-checker/${s.id}/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}/en/rechte-checker/${s.id}/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/rechte-checker/${s.id}/"/>
  </url>`;
})), ENDE].join('\n');
if (sm.includes(START)) sm = sm.slice(0, sm.indexOf(START)) + block + sm.slice(sm.indexOf(ENDE) + ENDE.length);
else sm = sm.replace('</urlset>', block + '\n\n</urlset>');
// Bildunterschriften des Checkers tragen die Fallzahl
sm = sm.replace(/\d+ Szenarien zu Überstunden/g, faelle.length + ' Szenarien zu Überstunden')
       .replace(/\d+ scenarios on overtime/g, faelle.length + ' scenarios on overtime');
const smNeu = crlf ? sm.split('\n').join('\r\n') : sm;
if (smNeu !== smRoh) { if (CHECK) abweichungen.push('sitemap.xml'); else fs.writeFileSync(smDatei, smNeu); }

// ── Kennzahlen auf der Hauptseite (stehen damit auch ohne JS richtig im Markup) ──
const hpDatei = path.join(ROOT, 'pages/rechte-checker/index.html');
const hpRoh = fs.readFileSync(hpDatei, 'utf8');
const kats = new Set(faelle.map((s) => s.cat)).size;
const hpNeu = hpRoh
  .replace(/(id="statTotal">)\d+(<)/, '$1' + faelle.length + '$2')
  .replace(/(id="statKat">)\d+(<)/, '$1' + kats + '$2')
  .replace(/(id="rcStand" datetime=")[\d-]+(">)[^<]*(<)/, '$1' + STAND + '$2' + datumDe(STAND) + '$3');
if (hpNeu !== hpRoh) { if (CHECK) abweichungen.push('pages/rechte-checker/index.html (Kennzahlen)'); else fs.writeFileSync(hpDatei, hpNeu); }

if (CHECK) {
  if (abweichungen.length) {
    console.error('[rechte-seiten] nicht aktuell — node tools/rechte-seiten.mjs ausfuehren:\n  ' + abweichungen.slice(0, 20).join('\n  ') + (abweichungen.length > 20 ? '\n  … und ' + (abweichungen.length - 20) + ' weitere' : ''));
    process.exit(1);
  }
  console.log('[rechte-seiten] ✓ ' + faelle.length + ' Fallseiten, Sitemap und Kennzahlen aktuell.');
} else {
  console.log('[rechte-seiten] ✓ ' + faelle.length + ' Fälle → DE + EN, Sitemap ' + (smNeu !== smRoh ? 'aktualisiert' : 'unverändert') + '.');
}
