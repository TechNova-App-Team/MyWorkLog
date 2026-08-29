/* ═══ /skill-tree/ — Overrides aus dem Wortlaut erzeugen ═══════════════
 *
 *   node tools/i18n/dict/skill-tree.en-gen.mjs
 *   (danach wie immer: npm run i18n:build)
 *
 * WARUM diese eine Seite einen Generator hat und die anderen nicht:
 * die Overrides sind nach i18n-SCHLUESSEL benannt, und der Schluessel
 * entsteht aus dem Text. Wiederholte Texte bekommen _2, _3 … in
 * Reihenfolge des Auftretens. Diese Seite hat 265 Schluessel, davon
 * allein 30 mal "Level 1" und 30 mal "0 XP" — eine neue Karte weiter
 * oben verschiebt die Nummerierung aller folgenden und haengt die
 * vorhandene Uebersetzung an die falsche Stelle. Der Build meldet das
 * NICHT: "0 fehlend" stimmt weiterhin, weil merge-dict die Luecke mit
 * Deutsch fuellt.
 *
 * Deshalb ist hier der deutsche WORTLAUT der Schluessel
 * (skill-tree.en-map.json), und die Schluessel-Datei wird daraus
 * erzeugt. Nach jeder Aenderung an der deutschen Seite: extract, dann
 * dieses Skript. Fehlt eine Uebersetzung, sagt es das beim Namen —
 * statt sie still auf Deutsch stehen zu lassen.
 *
 * Die 150 Fragen laufen NICHT hierueber. Sie stehen zweisprachig in
 * Assets/js/skill-tree-data.js, weil <script> von der Pipeline gar
 * nicht angefasst wird.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('../../../', import.meta.url);
const p = rel => new URL(rel, ROOT);

// 1. Schluessel-Registry frisch aus der deutschen Seite ziehen
execFileSync(process.execPath, [
  'tools/i18n/i18n-build.js', 'extract',
  'pages/skill-tree/index.html', 'tools/i18n/dict/skill-tree.de.json'
], { cwd: ROOT.pathname.replace(/^\/([A-Za-z]:)/, '$1'), stdio: 'inherit' });

const de  = JSON.parse(readFileSync(p('tools/i18n/dict/skill-tree.de.json'), 'utf8'));
const map = JSON.parse(readFileSync(p('tools/i18n/dict/skill-tree.en-map.json'), 'utf8'));

// 2. Flach machen: "app.skillbaum" → deutscher Text
const flat = {};
(function walk(o, prefix) {
  for (const k of Object.keys(o)) {
    const key = prefix ? prefix + '.' + k : k;
    if (typeof o[k] === 'string') flat[key] = o[k];
    else walk(o[k], key);
  }
})(de, '');

// 3. Jeden Schluessel ueber seinen deutschen Wortlaut uebersetzen
const out = {};
const missing = [];
for (const [key, text] of Object.entries(flat)) {
  if (Object.prototype.hasOwnProperty.call(map, text)) out[key] = map[text];
  else missing.push(text);
}

// 4. Kopfdaten (Titel, Beschreibung, Open Graph) durchreichen
for (const k of ['__title', '__metaDescription', '__ogTitle', '__ogDescription',
                 '__twitterDescription', '__ogImageAlt', '__keywords']) {
  if (map[k]) out[k] = map[k];
}

// 5. JSON-LD mituebersetzen. Es steht in <script> und wird vom Walk
// uebersprungen; ohne diesen Schritt behauptet die Auszeichnung auf /en/
// deutschen Inhalt, waehrend die Seite englisch ist. Google verlangt, dass
// beides dasselbe sagt — den Widerspruch meldet niemand, er kostet nur
// die Auszeichnung.
const ldMap = Object.assign({}, map, map.__ld || {});
const HTML = readFileSync(p('pages/skill-tree/index.html'), 'utf8');
const NEUTRAL = new Set(['@context', '@type', 'eduQuestionType', 'learningResourceType',
  'courseMode', 'courseWorkload', 'priceCurrency', 'price', 'category', 'position']);
const ldMissing = [];
function localize(node, key) {
  if (Array.isArray(node)) return node.map(v => localize(v, key));
  if (node && typeof node === 'object') {
    const o = {};
    for (const k of Object.keys(node)) o[k] = localize(node[k], k);
    return o;
  }
  if (typeof node !== 'string') return node;
  if (key === 'inLanguage') return 'en';
  if (NEUTRAL.has(key)) return node;
  if (/^https?:\/\//.test(node)) {
    // Adressen zeigen auf die englische Fassung
    return node.replace(/^https:\/\/myworklog\.de\/(?!en\/)(.*)$/, (m, rest) => 'https://myworklog.de/en/' + rest);
  }
  if (Object.prototype.hasOwnProperty.call(ldMap, node)) return ldMap[node];
  ldMissing.push(node);
  return node;
}
const jsonLd = {};
for (const m of HTML.matchAll(/<script type="application\/ld\+json" data-ld-id="([a-z]+)">([\s\S]*?)<\/script>/g)) {
  jsonLd[m[1]] = localize(JSON.parse(m[2]), null);
}
out.__jsonLd = jsonLd;

// Was im Wortlaut steht, aber auf der Seite nicht mehr vorkommt — sonst
// waechst die Karteileiche mit jedem Umbau weiter.
const used = new Set(Object.values(flat));
const stale = Object.keys(map).filter(k => !k.startsWith('__') && !used.has(k));

writeFileSync(p('tools/i18n/dict/skill-tree.en-overrides.json'),
  JSON.stringify(out, null, 2) + '\n', 'utf8');

console.log(`\n✓ ${Object.keys(out).length} Overrides geschrieben (aus ${Object.keys(flat).length} Schluesseln).`);
const allMissing = [...new Set([...missing, ...ldMissing])];
if (allMissing.length) {
  console.error(`\n✗ ${allMissing.length} Texte ohne Uebersetzung — in skill-tree.en-map.json nachtragen.`);
  console.error('  Was nur in der Auszeichnung steht, gehoert unter "__ld":');
  allMissing.forEach(t => console.error('   ' + JSON.stringify(t)));
  process.exit(1);
}
if (stale.length) {
  console.warn(`\n⚠ ${stale.length} Eintraege im Wortlaut, die auf der Seite nicht mehr vorkommen:`);
  stale.forEach(t => console.warn('   ' + JSON.stringify(t.slice(0, 70))));
}
