// ═══ AUSBILDER-SEITE: was eine Suchmaschine dort zu sehen bekommt ═══
//
// ANLASS (2026-09-10). Googles KI-Uebersicht beschrieb /ausbilder/ als reine
// Link-Ansicht: „ohne Anmeldung und ohne eigenes Konto", „Die Daten der
// jeweiligen Woche sind direkt im Link codiert". Das war keine Halluzination,
// sondern eine korrekte Zusammenfassung des einzigen crawlbaren Textes auf der
// Seite. Das Ausbilder-Cockpit — Sammeluebersicht, §14-Frist, Pruefverlauf,
// Vertretungen — wird per JS in `#abKonto` gerendert, einer LEEREN Sektion mit
// `display:none`, und nur bei angemeldetem Ausbilder. Ein Crawler sieht davon
// nichts.
//
// Diese Datei haelt fest, was im MARKUP stehen muss, damit die oeffentliche
// Beschreibung der Seite stimmt. Sie prueft absichtlich Text und nicht Optik:
// ein Screenshot zeigt genau diesen Fehler NICHT — die Seite sah immer richtig
// aus, sie beschrieb sich nur falsch.
//
// Aufruf:  node tools/ausbilder-seo.test.mjs

import { readFileSync, existsSync } from 'node:fs';

const DE = 'pages/ausbilder/index.html';
const EN = 'pages/en/ausbilder/index.html';
const OVR = 'tools/i18n/dict/ausbilder.en-overrides.json';

const lies = (p) => readFileSync(p, 'utf8').split('\r\n').join('\n');

let geprueft = 0, fehler = 0;
const ok = (name, b, detail = '') => {
    geprueft++;
    if (!b) fehler++;
    console.log(`  ${b ? 'ok  ' : 'FAIL'}  ${name}${detail ? '   → ' + detail : ''}`);
};

const src = lies(DE);

// 🔴 Vor JEDER Negativ-Behauptung die Kommentare strippen. Der Kommentar ueber
// #abIntro zitiert den alten Satz („Sie brauchen dafuer kein Konto"), weil er
// erklaert, warum der Block so aussieht wie er aussieht — ein Grep auf die rohe
// Datei wuerde also die eigene Begruendung als Verstoss melden. Beide Sorten:
// <!-- --> im Markup und /* */ im <style>/<script>.
const ohneKomm = src
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map((z) => z.replace(/^\s*\/\/.*$/, '')).join('\n');

// Der Bereich, den ein Crawler ohne JS und ohne Sitzung sieht.
const introVon = ohneKomm.indexOf('<section id="abIntro">');
const introBis = ohneKomm.indexOf('\n        </section>\n', introVon);
const INTRO = introVon >= 0 && introBis > introVon ? ohneKomm.slice(introVon, introBis) : '';
const introText = INTRO.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

console.log('\n1. Der crawlbare Text beschreibt beide Wege');
{
    ok('Intro-Block gefunden', INTRO.length > 500, INTRO.length + ' Zeichen Markup');
    ok('Gegenprobe: es gibt ueberhaupt Text zu pruefen', introText.length > 800,
       introText.length + ' Zeichen Text');

    // Der Kontoweg — das, was die KI-Uebersicht komplett fehlte.
    const kontoBelege = [
        ['Einladungscode', /Einladungscode/],
        ['Sammeluebersicht', /alle Azubis|jede fertige Woche/],
        ['Monatsfrist §14 BBiG', /§14 BBiG/],
        ['Pruefverlauf', /Prüfverlauf/],
        ['Signatur', /signiert/],
        ['Vertretung', /Urlaubsvertretung|Vertretung/],
        ['Nachtraegliche Aenderung', /nach der Freigabe/],
        ['Anmelde-Einstieg', /Anmelden und Übersicht öffnen/],
    ];
    for (const [name, rx] of kontoBelege) ok('Kontoweg: ' + name, rx.test(introText));

    // Der Link-Weg bleibt beschrieben — er ist nicht weg, nur nicht mehr allein.
    ok('Link-Weg: QR/Link', /QR-Code/.test(introText));
    ok('Link-Weg: Rautezeichen-Erklaerung', /Rautezeichen/.test(introText));
}

console.log('\n2. Keine Aussage mehr, die nur den Link-Weg kennt');
{
    ok('kein „Sie brauchen dafür kein Konto" mehr',
       !/Sie brauchen dafür kein Konto/.test(ohneKomm));
    ok('kein „Ohne einen solchen Link hat diese Seite keinen Inhalt" mehr',
       !/keinen Inhalt anzuzeigen/.test(ohneKomm));
    // Gegenprobe zur Kommentar-Falle: im ROHEN Text steht der Satz sehr wohl
    // (im erklaerenden Kommentar). Ohne das Strippen waere die Zeile darueber
    // rot, obwohl das Markup sauber ist.
    ok('Gegenprobe: das Strippen war noetig (der Kommentar zitiert den alten Satz)',
       /Sie brauchen dafuer kein Konto/.test(src)
       && !/Sie brauchen dafuer kein Konto/.test(ohneKomm));

    const kopf = ohneKomm.slice(0, ohneKomm.indexOf('</head>'));
    ok('meta description nennt beide Wege',
       /Konto/.test(kopf) && /ohne Konto per Link/.test(kopf));
    ok('title nennt die Zielgruppe', /<title>[^<]*Ausbilder/.test(kopf));
    ok('og:description ohne „ohne Konto, ohne Anmeldung"',
       !/ohne Konto, ohne Anmeldung/.test(kopf));
}

console.log('\n3. Strukturierte Daten');
{
    const bloecke = [...src.matchAll(
        /<script type="application\/ld\+json" data-ld-id="([a-z]+)">([\s\S]*?)<\/script>/g)];
    ok('Gegenprobe: es gibt JSON-LD-Bloecke', bloecke.length >= 3, bloecke.length + ' Bloecke');

    const ids = [];
    for (const b of bloecke) {
        let daten = null;
        try { daten = JSON.parse(b[2]); } catch (e) { /* faellt unten auf */ }
        ok('JSON gueltig: ' + b[1], daten !== null);
        ids.push(b[1]);
    }
    ok('FAQPage dabei', ids.includes('faq'));

    const faq = bloecke.find((b) => b[1] === 'faq');
    const fragen = faq ? JSON.parse(faq[2]).mainEntity : [];
    ok('FAQ hat genug Fragen', fragen.length >= 6, fragen.length + ' Fragen');
    ok('FAQ beantwortet die Konto-Frage',
       fragen.some((f) => /Konto/.test(f.name)));
    ok('FAQ trennt Server-Speicherung nach Weg',
       fragen.some((f) => /hochgeladen/.test(f.name)
                          && /Zugriffsregeln/.test(f.acceptedAnswer.text)));

    // 🔴 Genau diese Pruefung fehlt auf /wechseln/: dort steht JSON-LD OHNE
    // data-ld-id, und die englische Seite serviert deshalb deutsche
    // strukturierte Daten. Ein Block ohne Gegenstueck in den Overrides ist
    // derselbe Fehler in Vorbereitung.
    const ovr = JSON.parse(readFileSync(OVR, 'utf8'));
    const ld = ovr.__jsonLd || {};
    for (const id of ids) ok('englische Fassung vorhanden: ' + id, !!ld[id]);
    ok('Gegenprobe: __jsonLd ist nicht leer', Object.keys(ld).length >= 3);
}

console.log('\n4. Der Anmelde-Rueckweg');
{
    ok('CTA zeigt auf den Anmelde-Umweg mit Rueckkehr-Slug',
       /href="\/\?cloud=login&amp;back=ausbilder"/.test(src));

    const api = lies('components/core/api-cloud-sync.js')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n').map((z) => z.replace(/^\s*\/\/.*$/, '')).join('\n');
    ok('die App wertet back= aus', /back=\(\[a-z\]/.test(api));
    ok('nur ein Slug, kein Pfad (kein offener Redirect)',
       !/back=\(\[^&\]/.test(api) && /a-z0-9-/.test(api));
    ok('Rueckweg verfaellt', /600000/.test(api));
    ok('Rueckweg nur bei frischer Anmeldung',
       /_warAnmeldeRueckkehr \|\| _loginDialogOffen/.test(api));
}

console.log('\n5. Englische Fassung');
if (!existsSync(EN)) {
    console.log('  ÜBERSPRUNGEN — pages/en/ ist ein generiertes Artefakt und liegt gerade');
    console.log('                 nicht vor. Mit `npm run i18n:build` erzeugen, dann zaehlt');
    console.log('                 dieser Abschnitt mit. NICHT als bestanden werten.');
} else {
    const en = lies(EN);
    const enIntroVon = en.indexOf('<section id="abIntro">');
    const enIntro = en.slice(enIntroVon, en.indexOf('\n        </section>\n', enIntroVon))
        .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    ok('EN: Intro gefunden', enIntro.length > 800, enIntro.length + ' Zeichen');
    ok('EN: kein deutscher Satz mehr uebrig',
       !/Ihrer Azubis|Einladungscode|Betriebsarten/.test(enIntro));
    ok('EN: beschreibt den Kontoweg', /invite code/i.test(enIntro));
    ok('EN: title uebersetzt', /<title>[^<]*Trainers/.test(en));

    const enLd = [...en.matchAll(
        /<script type="application\/ld\+json" data-ld-id="([a-z]+)">([\s\S]*?)<\/script>/g)];
    ok('EN: Gegenprobe, JSON-LD ist da', enLd.length >= 3, enLd.length + ' Bloecke');
    const enFaq = enLd.find((b) => b[1] === 'faq');
    const enFrage = enFaq ? JSON.parse(enFaq[2]).mainEntity[0].name : '';
    ok('EN: FAQ ist englisch, nicht die deutsche Fassung',
       /account/i.test(enFrage) && !/Konto/.test(enFrage), enFrage.slice(0, 56));
}

console.log(`\n${geprueft - fehler}/${geprueft} bestanden`);
if (geprueft < 25) {
    console.log('ZU WENIG PRUEFUNGEN — der Lauf hat nichts getan');
    process.exit(1);
}
process.exit(fehler ? 1 : 0);
