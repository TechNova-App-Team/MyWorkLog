// ═══ JSON-LD DER APP: was Google ueber MyWorkLog gesagt bekommt ═══
//
// ANLASS (2026-09-18). Der @graph in index.template.html trug ein halbes Jahr
// lang "softwareVersion": "3.5.3" (App war bei 7.2.5), ein dateModified vom
// Maerz, ein aggregateRating 4.8/50 OHNE Bewertungsquelle und eine SearchAction
// auf ?q=, das die App nie ausgewertet hat. Nichts davon faellt im Browser auf —
// ein <script type="application/ld+json"> rendert nicht. Erfundene Ratings sind
// bei Google ein Grund, der Domain ALLE Rich Results zu nehmen.
//
// Seitdem stempelt tools/stamp-assets.js Version und Datum; diese Datei haelt
// fest, dass der gerenderte Block (DE und EN) parsebar ist, zur version.json
// passt und die zwei erfundenen Felder nicht zurueckkommen.
//
// Aufruf:  node tools/jsonld.test.mjs   (nach der Build-Kette — liest index.html)

import { readFileSync, existsSync, readdirSync } from 'node:fs';

const lies = (p) => readFileSync(p, 'utf8').split('\r\n').join('\n');

let geprueft = 0, fehler = 0;
const ok = (name, b, detail = '') => {
    geprueft++;
    if (!b) fehler++;
    console.log(`  ${b ? 'ok  ' : 'FAIL'}  ${name}${detail ? '   → ' + detail : ''}`);
};

const versionJson = JSON.parse(lies('config/version.json'));
const version = versionJson.version;
const releaseDate = Object.values(versionJson.changelogDates || {}).sort().at(-1);
ok('version.json hat ein Release-Datum', /^\d{4}-\d{2}-\d{2}$/.test(releaseDate || ''), String(releaseDate));

// Alle Bloecke einer Datei parsen. Ein Block, der nicht parst, ist fuer Google
// nicht vorhanden — genau so unsichtbar wie ein fehlender.
function bloecke(datei) {
    const html = lies(datei);
    const re = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
    const out = [];
    let m;
    while ((m = re.exec(html))) out.push(JSON.parse(m[1]));
    return out;
}

// Alle Knoten eines @graph flach — die Pruefungen fragen nach Typen, nicht Positionen.
const knoten = (b) => b.flatMap((x) => (Array.isArray(x['@graph']) ? x['@graph'] : [x]));
const vomTyp = (k, t) => k.filter((x) => x['@type'] === t);

for (const [name, datei, lang] of [['DE', 'index.html', 'de'], ['EN', 'pages/en/index.html', 'en']]) {
    console.log(`\n${name}: ${datei}`);
    if (!existsSync(datei)) { ok(`${datei} existiert (Build-Kette gelaufen?)`, false); continue; }

    let b;
    try { b = bloecke(datei); } catch (e) { ok('JSON-LD parst', false, e.message); continue; }
    ok('JSON-LD parst', true);
    ok('mindestens ein Block', b.length > 0, String(b.length));

    const k = knoten(b);
    const app = vomTyp(k, 'WebApplication');
    ok('genau eine WebApplication', app.length === 1, String(app.length));
    if (app.length !== 1) continue;
    const a = app[0];

    ok('softwareVersion = version.json', a.softwareVersion === version, `${a.softwareVersion} vs ${version}`);
    ok('dateModified = juengstes changelogDates', a.dateModified === releaseDate, `${a.dateModified} vs ${releaseDate}`);
    ok('inLanguage passt zur Fassung', a.inLanguage === lang, a.inLanguage);
    ok('kostenlos: offers.price = 0', a.offers && a.offers.price === '0');
    ok('featureList ist nicht leer', Array.isArray(a.featureList) && a.featureList.length > 5);

    // Die zwei erfundenen Felder — Negativ-Behauptung mit Gegenprobe darueber
    // (die WebApplication existiert und hat Felder, also gaebe es sie zu finden).
    const json = JSON.stringify(b);
    ok('kein aggregateRating (keine Bewertungsquelle)', !json.includes('aggregateRating'));
    ok('keine SearchAction (App kennt kein ?q=)', !json.includes('SearchAction') && !json.includes('search_term_string'));

    const seiten = vomTyp(k, 'WebPage');
    ok('WebPage vorhanden', seiten.length === 1, String(seiten.length));
    if (seiten.length === 1) ok('WebPage.dateModified = Release-Datum', seiten[0].dateModified === releaseDate, String(seiten[0].dateModified));

    // @id-Verweise muessen auf einen Knoten im selben Graph zeigen, sonst haengt
    // z.B. der Publisher der App im Leeren.
    const ids = new Set(k.map((x) => x['@id']).filter(Boolean));
    const verweise = [...json.matchAll(/"@id":"(https:[^"]+)"/g)].map((m) => m[1]);
    const tot = [...new Set(verweise)].filter((v) => !ids.has(v));
    ok('jeder @id-Verweis hat einen Knoten', tot.length === 0, tot.join(', '));
    ok('es gibt ueberhaupt Verweise', verweise.length > 0, String(verweise.length));
}

// Alle Standalone-Seiten, DE und EN: jeder Block muss parsen. Anlass (2026-09-20):
// /vergleich/ trug drei Tage lang eine FAQPage mit „nicht genannt" — das
// Anfuehrungszeichen war ein rohes ", also war der JSON-String dort zu Ende
// und der Block fuer Google nicht vorhanden. Im Browser sieht man davon
// nichts, und die EN-Fassung war sogar in Ordnung, weil das Override den Block
// ersetzt. Deutsche Anfuehrungszeichen in JSON-LD heissen „…“ (U+201E/U+201C).
console.log('\nStandalone-Seiten: jeder JSON-LD-Block parst');
const seitenDateien = [];
for (const wurzel of ['pages', 'pages/en']) {
    for (const d of readdirSync(wurzel, { withFileTypes: true })) {
        if (!d.isDirectory() || d.name === 'en') continue;
        const f = `${wurzel}/${d.name}/index.html`;
        if (existsSync(f)) seitenDateien.push(f);
    }
}
let seitenMitLd = 0, kaputt = [];
for (const f of seitenDateien) {
    const html = lies(f);
    const re = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
    let m, hat = false;
    while ((m = re.exec(html))) {
        hat = true;
        try { JSON.parse(m[1]); } catch (e) { kaputt.push(`${f}: ${e.message.slice(0, 60)}`); }
    }
    if (hat) seitenMitLd++;
}
ok('kein Block mit Syntaxfehler', kaputt.length === 0, kaputt.join(' | '));
ok('es gibt ueberhaupt Seiten mit JSON-LD', seitenMitLd >= 6, String(seitenMitLd));   // sonst prueft die Zeile darueber nichts

// Quelle: die Stempel-Muster muessen die Felder ueberhaupt treffen — sonst laeuft
// stamp-assets gruen und aendert nichts.
const tpl = lies('index.template.html');
ok('Template: softwareVersion in der von stamp-assets erwarteten Form', /"softwareVersion":\s*"\d+\.\d+\.\d+"/.test(tpl));
ok('Template: dateModified in der von stamp-assets erwarteten Form', /"dateModified":\s*"\d{4}-\d{2}-\d{2}"/.test(tpl));
const ovr = lies('tools/i18n/dict/index.en-overrides.json');
ok('EN-Override: softwareVersion in Stempel-Form', /"softwareVersion":\s*"\d+\.\d+\.\d+"/.test(ovr));
ok('EN-Override: kein aggregateRating', !ovr.includes('aggregateRating'));
ok('EN-Override: keine SearchAction', !ovr.includes('SearchAction'));

console.log(`\n${geprueft} geprueft, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
