// Prueft den Rechte-Checker: Daten, Fallseiten, Sitemap, Kategorien.
//
//   node tools/rechte-checker.test.mjs
//
// Festgehalten wird, was bis v8.6.3 falsch war oder beim Ausbau schiefgehen kann:
//  - Zwei verschiedene Mindestverguetungen auf einer Seite ("ca. 695 €" und
//    "ca. 700 €+"), richtig waren 724 € (Beginn 2026). Ein Rechtswert, der jaehrlich
//    wechselt, steht deshalb hier fest — der Test wird rot, wenn ihn jemand
//    zurueckdreht, und erinnert mit RC_STAND daran, jaehrlich nachzusehen.
//  - Ueberstunden standen unter "§ 17 Abs. 3 BBiG" (seit 2020 Abs. 7).
//  - "Berufskrankheit BK Nr. 2113" fuer Burnout (2113 ist eine Nervenschaedigung
//    an der Hand) und ein nicht belegbares BAG-Aktenzeichen.
//  - **fett** stand als Sternchen im Detailfenster.
//  - Jeder Fall braucht Englisch, sonst steht auf /en/ ein deutscher Fall.
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';

let ok = 0, fehl = 0;
const t = (bed, name, detail) => {
  if (bed) { ok++; console.log('  ok    ' + name); }
  else { fehl++; console.log('  FEHL  ' + name + (detail ? '\n        ' + detail : '')); }
};
const gruppe = (g) => console.log('\n▶ ' + g);

const c = { window: {} };
vm.createContext(c);
vm.runInContext(fs.readFileSync('Assets/js/rechte-checker/faelle.js', 'utf8'), c);
vm.runInContext(fs.readFileSync('Assets/js/rechte-checker/faelle.en.js', 'utf8'), c);
const F = c.window.RC_FAELLE, EN = c.window.RC_EN.scenarios, KW = c.window.RC_STICHWORTE, KWEN = c.window.RC_EN.keywords;
const ids = new Set(F.map((s) => s.id));
const KATS = ['arbeitszeit', 'taetigkeit', 'urlaub', 'schule', 'pruefung', 'geld', 'gesundheit', 'kuendigung', 'mobbing', 'sicherheit', 'ausbildung', 'mitbestimmung', 'privat'];

// ── 1. Daten ────────────────────────────────────────────────────────────────
gruppe('Daten');
t(F.length >= 100, 'mindestens 100 Fälle (Gegenprobe: Daten geladen)', F.length);
t(ids.size === F.length, 'jede id einmal');
t(F.every((s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id)), 'ids taugen als URL-Segment');
t(F.every((s) => KATS.includes(s.cat)), 'jede Kategorie bekannt', F.filter((s) => !KATS.includes(s.cat)).map((s) => s.id).join(','));
t(KATS.every((k) => F.some((s) => s.cat === k)), 'jede Kategorie hat Fälle');
t(F.every((s) => ['ja', 'nein', 'jein'].includes(s.verdict) && [1, 2, 3].includes(s.severity)), 'Urteil und Schwere gültig');
const pflicht = ['title', 'desc', 'law', 'verdictShort', 'verdictDetail'];
t(F.every((s) => pflicht.every((k) => typeof s[k] === 'string' && s[k].trim())), 'Pflichtfelder DE gefüllt');
t(F.every((s) => s.laws?.length && s.tips?.length), 'jeder Fall hat Paragraphen und Tipps');
const ohneEn = F.filter((s) => !EN[s.id]).map((s) => s.id);
t(ohneEn.length === 0, 'jeder Fall hat Englisch', ohneEn.join(','));
const enLuecke = F.filter((s) => EN[s.id] && (['title', 'desc', 'verdictShort', 'verdictDetail'].some((k) => !EN[s.id][k]) ||
  (EN[s.id].laws || []).length !== s.laws.length || (EN[s.id].tips || []).length !== s.tips.length || !!EN[s.id].email !== !!s.email));
t(enLuecke.length === 0, 'Englisch vollständig (gleich viele Paragraphen, Tipps, E-Mail)', enLuecke.map((s) => s.id).join(','));
t(Object.keys(EN).every((id) => ids.has(id)), 'kein englischer Fall ohne deutschen');
const fettKaputt = F.filter((s) => (s.verdictDetail.match(/\*\*/g) || []).length % 2 || ((EN[s.id]?.verdictDetail || '').match(/\*\*/g) || []).length % 2);
t(fettKaputt.length === 0, '**fett** immer paarig', fettKaputt.map((s) => s.id).join(','));
const totDe = Object.entries(KW).flatMap(([w, l]) => l.filter((i) => !ids.has(i)).map((i) => w + '→' + i));
const totEn = Object.entries(KWEN).flatMap(([w, l]) => l.filter((i) => !ids.has(i)).map((i) => w + '→' + i));
t(totDe.length + totEn.length === 0, 'Stichworte zeigen nur auf vorhandene Fälle', [...totDe, ...totEn].slice(0, 5).join(', '));
t(Object.keys(KW).length > 300 && Object.keys(KWEN).length > 300, 'Gegenprobe: es gibt überhaupt Stichworte');
const ohneStich = F.filter((s) => !Object.values(KW).some((l) => l.includes(s.id))).map((s) => s.id);
t(ohneStich.length === 0, 'jeder Fall ist über ein Stichwort auffindbar', ohneStich.join(','));
t(/^\d{4}-\d{2}-\d{2}$/.test(c.window.RC_STAND || ''), 'Rechtsstand gesetzt');

// ── 2. Rechtswerte (zurückgedrehte Fehler) ───────────────────────────────────
gruppe('Rechtswerte');
const alles = JSON.stringify(F) + JSON.stringify(EN);
const fall = (id) => F.find((s) => s.id === id);
t(fall('mindestausbildungsverguetung').verdictDetail.includes('724') && fall('verguetung-niedrig').verdictDetail.includes('724'),
  'Mindestvergütung Beginn 2026: 724 € in beiden Fällen');
t(fall('mindestausbildungsverguetung').verdictDetail.includes('764'), 'Beginn 2027 (764 €) genannt');
t(!/695 €|ca\. 700/.test(alles), 'keine alten Schätzwerte (695 € / ca. 700 €)');
t(!/BK Nr\. 2113|9 AZR 76\/18|15\.000 €|€15,000/.test(alles), 'keine falschen Fundstellen oder Bußgeldbeträge');
const abs3 = F.filter((s) => JSON.stringify(s).includes('17 Abs. 3 BBiG') && /berstunde|Mehrarbeit|hinausgehende/.test(JSON.stringify(s.laws.filter((l) => l.title.includes('17 Abs. 3')))));
t(abs3.length === 0, 'Mehrarbeit steht unter § 17 Abs. 7, nicht Abs. 3', abs3.map((s) => s.id).join(','));
t(fall('nach-schule-betrieb').verdict === 'nein' && /alle/.test(fall('nach-schule-betrieb').verdictDetail), 'langer Schultag gilt seit 2020 für alle Azubis');
t(fall('fahrtkosten-arbeit').verdictDetail.includes('38 Cent'), 'Entfernungspauschale 38 ct (seit 2026)');

// ── 3. Fallseiten + Sitemap ─────────────────────────────────────────────────
gruppe('Fallseiten');
let check = '';
try { check = execFileSync(process.execPath, ['tools/rechte-seiten.mjs', '--check'], { encoding: 'utf8' }); }
catch (e) { check = 'FEHLER ' + (e.stderr || e.stdout); }
t(check.includes('✓'), 'tools/rechte-seiten.mjs --check: Seiten, Sitemap, Kennzahlen aktuell', check.trim().slice(0, 300));
const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
const fehltSm = F.filter((s) => !sitemap.includes(`<loc>https://myworklog.de/rechte-checker/${s.id}/</loc>`) || !sitemap.includes(`<loc>https://myworklog.de/en/rechte-checker/${s.id}/</loc>`));
t(fehltSm.length === 0, 'jede Fallseite DE + EN in der Sitemap', fehltSm.map((s) => s.id).join(','));
t(!sitemap.includes('/vertrags-manager/'), 'Vertrags-Manager nicht mehr in der Sitemap');
let geprueft = 0; const seitenFehler = [];
for (const s of F) {
  const html = fs.readFileSync(`pages/rechte-checker/${s.id}/index.html`, 'utf8');
  const doc = new JSDOM(html).window.document;
  const f = (m) => seitenFehler.push(s.id + ': ' + m);
  if (doc.querySelectorAll('h1').length !== 1) f('h1');
  if (doc.querySelector('link[rel=canonical]')?.href !== `https://myworklog.de/rechte-checker/${s.id}/`) f('canonical');
  if (doc.querySelectorAll('link[rel=alternate][hreflang]').length !== 3) f('hreflang');
  for (const ld of doc.querySelectorAll('script[type="application/ld+json"]')) {
    if (!ld.getAttribute('data-ld-id')) f('ld ohne data-ld-id');
    try { JSON.parse(ld.textContent); } catch (e) { f('JSON-LD kaputt'); }
  }
  if (html.includes('**')) f('Sternchen im Text');
  if (!doc.getElementById('page-footer')) f('kein Footer');
  if (!/tg_pro_data/.test(html)) f('kein Theme-Sync');
  const desc = doc.querySelector('meta[name=description]')?.content || '';
  if (desc.length < 80 || desc.length > 160) f('description ' + desc.length);
  geprueft++;
}
t(geprueft === F.length && seitenFehler.length === 0, `${geprueft} Fallseiten: h1, canonical, hreflang, JSON-LD, Footer, Theme-Sync, Beschreibung`, seitenFehler.slice(0, 6).join(' | '));

// ── 4. Hauptseite: Kategorien in Markup, Beschriftung und Symbolen ───────────
gruppe('Hauptseite');
const haupt = fs.readFileSync('pages/rechte-checker/index.html', 'utf8');
const pills = [...haupt.matchAll(/data-cat="([a-z]+)"/g)].map((m) => m[1]).filter((k) => k !== 'all');
t(pills.length > 0, 'Gegenprobe: Filterknöpfe gefunden');
t(KATS.every((k) => pills.includes(k)) && pills.every((k) => KATS.includes(k)), 'jede Kategorie hat genau einen Filterknopf', pills.join(','));
const labelDe = haupt.match(/const map = \{([^}]+)\}/)?.[1] || '', labelEn = haupt.match(/const en = \{([^}]+)\}/)?.[1] || '';
t(KATS.every((k) => labelDe.includes(k + ':') && labelEn.includes(k + ':')), 'jede Kategorie hat DE- und EN-Beschriftung');
const icons = haupt.match(/const CAT_ICONS = \{([\s\S]*?)\};/)?.[1] || '';
t(KATS.every((k) => new RegExp('\\b' + k + ':').test(icons)), 'jede Kategorie hat ein Symbol');
t(haupt.includes(`id="statTotal">${F.length}<`), 'Fallzahl steht im Markup (ohne JS lesbar)');
t(haupt.includes('function fett(') && haupt.includes('fett(s.verdictDetail)'), 'Detailfenster rendert **fett** als <strong>');
t(haupt.includes('fallUrl(s.id)'), 'Karten verlinken auf die Fallseite');

console.log(`\nRechte-Checker: ${ok} ok, ${fehl} fehlgeschlagen`);
process.exit(fehl ? 1 : 0);
