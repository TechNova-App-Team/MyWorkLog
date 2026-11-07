// ═══ WEIHNACHTEN TEST ═══
//
// Adventskalender und gemalte Winternacht (components/weihnachten/). Das Malen selbst braucht eine echte
// Leinwand und wird per Bild geprueft; hier steht eine Attrappe. Geprueft wird:
//   1. Torwaechter: Fenster 01.12. 0 Uhr bis 27.12. 7 Uhr, Test-Schalter, 'weg' und Deko aus
//   2. Kalender: 24 Tueren, kuenftige bleiben zu und werden nicht gespeichert, geoeffnete bleiben
//   3. Schalter: Deko aus + Ausblenden wirken wirklich und ueberleben den naechsten Start
//   4. Jede Tuer zeigt auf einen echten Rechte-Fall und hat Englisch
//   5. Nie im Druck, kein Hover ohne Medienabfrage, reduzierte Bewegung
//
// Lauf: node tools/weihnachten.test.mjs
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FEHLT ' + n)); };
const lf = (s) => s.split('\r\n').join('\n');

const TEMPLATE = lf(readFileSync('index.template.html', 'utf8'));
const DASH = lf(readFileSync('components/dashboard/dashboard.html', 'utf8'));
const JS = lf(readFileSync('components/weihnachten/weihnachten.js', 'utf8'));
const SZENE = lf(readFileSync('components/weihnachten/weihnachten-szene.js', 'utf8'));
const CSS = lf(readFileSync('components/weihnachten/weihnachten.css', 'utf8'));
const FAELLE = lf(readFileSync('Assets/js/rechte-checker/faelle.js', 'utf8'));
const FAELLE_EN = lf(readFileSync('Assets/js/rechte-checker/faelle.en.js', 'utf8'));

function fixedDateClass(iso) {
    const FIXED = new Date(iso).getTime();
    return class extends Date {
        constructor(...a) { if (a.length === 0) super(FIXED); else super(...a); }
        static now() { return FIXED; }
    };
}

console.log('\n1. Torwaechter im <head>');
const gStart = TEMPLATE.indexOf('<script>(function(){\n  // 1. Sidebar collapse pre-apply');
const gEnd = TEMPLATE.indexOf('})();</script>', gStart);
ok('Pre-Apply-Skript gefunden', gStart > 0 && gEnd > gStart);
const GATE = TEMPLATE.slice(gStart + '<script>'.length, gEnd + '})();'.length);
ok('Schritt 8 steht im Pre-Apply', GATE.includes('mwl-weihnachten-karte'));

function gate({ now, ls = {} }) {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/', runScripts: 'outside-only' });
    const w = dom.window;
    for (const k of Object.keys(ls)) w.localStorage.setItem(k, ls[k]);
    w.Date = fixedDateClass(now);
    w.eval(GATE);
    return w.document.documentElement.className.split(/\s+/).filter(Boolean);
}
const alles = (c) => ['mwl-weihnachten', 'mwl-weihnachten-karte', 'mwl-weihnachten-deko'].every((k) => c.includes(k));
ok('01.12. 0:00: an', alles(gate({ now: '2026-12-01T00:00:00' })));
ok('24.12. 20:00: an', alles(gate({ now: '2026-12-24T20:00:00' })));
ok('27.12. 6:59: noch an', alles(gate({ now: '2026-12-27T06:59:00' })));
ok('27.12. 7:00: aus', !gate({ now: '2026-12-27T07:00:00' }).includes('mwl-weihnachten'));
ok('30.11. 23:59: noch nichts', !gate({ now: '2026-11-30T23:59:00' }).includes('mwl-weihnachten'));
ok('31.12.: nichts', !gate({ now: '2026-12-31T12:00:00' }).includes('mwl-weihnachten'));
ok('Test-Schalter', alles(gate({ now: '2026-03-01T09:30:00', ls: { mwl_weihnachten_test: '1' } })));
{
    const weg = gate({ now: '2026-12-10T12:00:00', ls: { mwl_weihnachten_2026: 'weg' } });
    ok("'weg': weder Karte noch Deko", weg.includes('mwl-weihnachten') && !weg.includes('mwl-weihnachten-karte') && !weg.includes('mwl-weihnachten-deko'));
    const ruhe = gate({ now: '2026-12-10T12:00:00', ls: { mwl_weihnachten_ruhe_2026: '1' } });
    ok('Deko aus: Karte bleibt, keine Deko', ruhe.includes('mwl-weihnachten-karte') && !ruhe.includes('mwl-weihnachten-deko'));
    ok("'weg' vom Vorjahr zaehlt nicht", alles(gate({ now: '2026-12-10T12:00:00', ls: { mwl_weihnachten_2025: 'weg' } })));
}

console.log('\n2. Kalender');
ok('Karte im Dashboard', DASH.includes('<section id="wnCard" class="wn-card"></section>'));
function aufbauen(now, ls = {}, lang = 'de') {
    const dom = new JSDOM(`<!doctype html><html lang="${lang}" class="mwl-weihnachten mwl-weihnachten-karte mwl-weihnachten-deko"><head></head><body><section id="wnCard"></section></body></html>`,
        { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window;
    for (const k of Object.keys(ls)) w.localStorage.setItem(k, ls[k]);
    w.Date = fixedDateClass(now);
    const ev = [];
    w.mwlEvent = (n, p) => ev.push(n + ':' + p.aktion);
    const szene = { an: false, zahl: -1 };
    w.WeihnachtsSzene = { start: (n) => { szene.an = true; szene.zahl = n; }, stop: () => { szene.an = false; }, lichter: (n) => { szene.zahl = n; } };
    w.eval(JS);
    return { w, d: w.document, ev, szene };
}
const warte = () => new Promise((r) => setTimeout(r, 30));
{
    const { w, d, ev, szene } = aufbauen('2026-12-10T12:00:00');
    await warte();
    const tueren = () => [...d.querySelectorAll('.wn-tuer')];
    ok('24 Tueren', tueren().length === 24);
    ok('Heute ist Tuer 10', tueren()[9].classList.contains('is-heute') && d.querySelectorAll('.is-heute').length === 1);
    ok('11 bis 24 sind zu', tueren().filter((t) => t.classList.contains('is-zu')).length === 14);
    tueren()[14].click();
    ok('Kuenftige Tuer sagt, wann sie aufgeht', d.getElementById('wnLead').textContent.includes('15. Dezember'));
    ok('Kuenftige Tuer wird nicht gespeichert', w.localStorage.getItem('mwl_weihnachten_tueren_2026') === null);
    ok('Kuenftige Tuer bleibt zu', !tueren()[14].classList.contains('is-auf'));
    const knopf = d.querySelector('.wn-btn--primary');
    ok('Knopf nennt das heutige Tuerchen', knopf.textContent === 'Türchen 10 öffnen');
    knopf.click();
    ok('Oeffnen zeigt den Satz', d.getElementById('wnLead').textContent.length > 40);
    ok('Oeffnen setzt den Link', d.querySelector('.wn-link').getAttribute('href').startsWith('/rechte-checker/') && !d.querySelector('.wn-link').hidden);
    ok('Oeffnen wird gespeichert', JSON.parse(w.localStorage.getItem('mwl_weihnachten_tueren_2026')).includes(10));
    ok('Knopf verschwindet danach', knopf.hidden);
    tueren()[2].click();
    ok('Fruehere Tuer laesst sich nachholen', tueren()[2].classList.contains('is-auf'));

    console.log('\n3. Schalter');
    const deko = d.querySelector('.wn-btn--leise');
    ok('Szene laeuft mit Deko', szene.an);
    ok('Knopf heisst „Deko aus“', deko.textContent === 'Deko aus');
    deko.click();
    ok('Deko aus haelt die Szene an', !szene.an);
    ok('Deko aus: Klasse und Speicher', !d.documentElement.classList.contains('mwl-weihnachten-deko') && w.localStorage.getItem('mwl_weihnachten_ruhe_2026') === '1');
    ok('Deko aus: Knopf sagt „Deko an“', deko.textContent === 'Deko an' && deko.getAttribute('aria-pressed') === 'false');
    deko.click();
    ok('Deko wieder an', d.documentElement.classList.contains('mwl-weihnachten-deko') && !w.localStorage.getItem('mwl_weihnachten_ruhe_2026'));
    d.querySelector('.wn-close').click();
    ok('Ausblenden haelt die Szene an', !szene.an);
    ok('Ausblenden nimmt Karte und Deko', !d.documentElement.classList.contains('mwl-weihnachten-karte') && !d.documentElement.classList.contains('mwl-weihnachten-deko'));
    ok("Ausblenden speichert 'weg'", w.localStorage.getItem('mwl_weihnachten_2026') === 'weg');
    ok('Ereignisse ueber mwlEvent', ['tuer', 'deko_aus', 'deko_an', 'weg'].every((a) => ev.includes('weihnachten:' + a)));
}
{
    const { d } = aufbauen('2026-12-11T12:00:00', { mwl_weihnachten_tueren_2026: '[1,2,10]' });
    await warte();
    ok('Geoeffnete Tueren bleiben nach dem Neuladen auf', d.querySelectorAll('.wn-tuer.is-auf').length === 3);
}
{
    const { d } = aufbauen('2026-12-26T12:00:00');
    await warte();
    ok('Nach dem 24.: Tuer 24 ist die heutige, keine ist zu', d.querySelectorAll('.is-zu').length === 0 && d.querySelector('.wn-btn--primary').textContent === 'Türchen 24 öffnen');
}
{
    const { d } = aufbauen('2026-12-10T12:00:00', {}, 'en');
    await warte();
    d.querySelector('.wn-btn--primary').click();
    ok('EN: Knopf- und Fall-Link auf /en/', d.querySelector('.wn-link').getAttribute('href').startsWith('/en/rechte-checker/'));
    ok('EN: Satz ist nicht der deutsche', !/[äöüß]/i.test(d.getElementById('wnLead').textContent));
}

{
    const ls = { mwl_weihnachten_tueren_2026: '[9,10]' };
    ok('Heutige Tuer offen: Karte startet klein', gate({ now: '2026-12-10T12:00:00', ls }).includes('mwl-weihnachten-klein'));
    ok('Naechster Tag: wieder gross', !gate({ now: '2026-12-11T12:00:00', ls }).includes('mwl-weihnachten-klein'));
    ok('Kaputter Speicher wirft den Torwaechter nicht um', alles(gate({ now: '2026-12-10T12:00:00', ls: { mwl_weihnachten_tueren_2026: 'kaputt' } })));
    const { d, ev } = aufbauen('2026-12-10T12:00:00', ls);
    d.documentElement.classList.add('mwl-weihnachten-klein');
    await warte();
    ok('Klein: kein Oeffnen-Knopf', d.querySelector('.wn-btn--primary').hidden);
    d.querySelector('.wn-btn--alle').click();
    ok('„Alle Tuerchen“ macht die Karte gross', !d.documentElement.classList.contains('mwl-weihnachten-klein') && ev.includes('weihnachten:alle'));
    ok('Klein ist im CSS', CSS.includes('html.mwl-weihnachten-klein .wn-raster'));
}

console.log('\n3b. Lichter und Begruessung');
{
    const { w, d, szene } = aufbauen('2026-12-10T12:00:00', { mwl_weihnachten_tueren_2026: '[1,2]' });
    await warte();
    ok('Szene startet mit den offenen Tueren', szene.an && szene.zahl === 2);
    d.querySelector('.wn-btn--primary').click();
    ok('Oeffnen zuendet ein Licht an', szene.zahl === 3);
    ok('Zaehler stimmt', d.querySelector('.wn-zaehler').textContent === '3 von 24 Lichtern brennen am Baum');
    d.querySelector('.wn-tuer').click();
    ok('Bereits offene Tuer zaehlt nicht doppelt', szene.zahl === 3 && JSON.parse(w.localStorage.getItem('mwl_weihnachten_tueren_2026')).length === 3);
}
{
    const { szene } = aufbauen('2026-12-10T12:00:00', { mwl_weihnachten_ruhe_2026: '1' });
    await warte();
    ok('Klasse fehlt nicht im Test: Deko-Klasse setzt der Torwaechter', szene.an === true);
}
{
    const dom = new JSDOM('<!doctype html><html lang="de" class="mwl-weihnachten mwl-weihnachten-karte mwl-weihnachten-deko"><head></head><body><section id="wnCard"></section><p id="dnGreet">Guten Abend,</p><p id="dnName">Anna</p><p id="dnQuote">x</p></body></html>',
        { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window, d = w.document;
    w.Date = fixedDateClass('2026-12-10T20:00:00');
    w.mwlAnzeigeName = () => 'Anna';
    w.eval('function dnRenderHero(){ document.getElementById("dnGreet").textContent = "Guten Abend,"; document.getElementById("dnQuote").textContent = "normal"; }');
    w.eval(JS);
    await warte();
    ok('Begruessung ist weihnachtlich', d.getElementById('dnGreet').textContent === 'Gemütlichen Abend,');
    w.dnRenderHero();
    ok('Neu zeichnen behaelt den Gruss', d.getElementById('dnGreet').textContent === 'Gemütlichen Abend,' && d.getElementById('dnQuote').textContent.startsWith('\u201E'));
    d.querySelector('.wn-btn--leise').click();
    ok('Deko aus bringt die normale Begruessung zurueck', d.getElementById('dnGreet').textContent === 'Guten Abend,' && d.getElementById('dnQuote').textContent === 'normal');
}

console.log('\n3c. Eigenstaendige Seiten');
{
    const SEITE = lf(readFileSync('components/weihnachten/weihnachten-seite.js', 'utf8'));
    const SEITE_CSS = lf(readFileSync('components/weihnachten/weihnachten-seite.css', 'utf8'));
    const hat = (n) => readFileSync('pages/' + n + '/index.html', 'utf8').includes('/components/weihnachten/weihnachten-seite.js');
    for (const n of ['berichtsheft', 'aufgaben', 'rechte-checker', 'preise', 'support', 'about', 'it-landing', 'vertrags-manager', 'ki-dashboard', 'ki-verbinden', 'vergleich', 'wechseln', 'ihk-berichtsheft', 'berichtsheft-vorlage'])
        ok('mit Deko: ' + n, hat(n));
    for (const n of ['Impressum', 'DSGVO', 'agb', 'widerrufen', 'kaufen', 'schatten-berichtsheft', 'ausbilder', 'klasse', 'lernen', 'traum', 'maintenance', 'offline'])
        ok('ohne Deko: ' + n, !hat(n));
    const seite = (now, ls = {}) => {
        const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/', runScripts: 'outside-only' });
        const w = dom.window;
        for (const k of Object.keys(ls)) w.localStorage.setItem(k, ls[k]);
        w.Date = fixedDateClass(now);
        w.eval(SEITE);
        return w.document;
    };
    const an = (d) => d.documentElement.classList.contains('mwl-weihnachten-seite');
    ok('Seite im Fenster: an', an(seite('2026-12-10T12:00:00')));
    ok('Seite 27.12. 7 Uhr: aus', !an(seite('2026-12-27T07:00:00')));
    ok('Seite im Juni: laedt nichts', !an(seite('2026-06-10T12:00:00')) && !seite('2026-06-10T12:00:00').querySelector('link'));
    ok('Seite: Deko aus gilt', !an(seite('2026-12-10T12:00:00', { mwl_weihnachten_ruhe_2026: '1' })));
    ok('Seite: Ausblenden gilt', !an(seite('2026-12-10T12:00:00', { mwl_weihnachten_2026: 'weg' })));
    ok('Seite: Stil laedt nach', !!seite('2026-12-10T12:00:00').querySelector('link[href*="weihnachten-seite.css"]'));
    const druck = SEITE_CSS.indexOf('@media print'), body = SEITE_CSS.indexOf('body { background: transparent');
    ok('Seite: Stil gilt nur am Bildschirm', SEITE_CSS.startsWith('/*') && SEITE_CSS.indexOf('@media screen') > 0 && SEITE_CSS.indexOf('@media screen') < body && body < druck);
    ok('Seite: Szene nie im Druck', /@media print[^}]*\.wn-welt/.test(SEITE_CSS));
}

console.log('\n4. Faelle');
const ids = [...JS.matchAll(/\{ id: '([\w-]+)', de: /g)].map((m) => m[1]);
ok('24 Faelle im Kalender (Gegenprobe)', ids.length === 24);
ok('Kein Fall doppelt', new Set(ids).size === 24);
for (const id of ids) {
    ok('Fall existiert: ' + id, FAELLE.includes(`id: '${id}',`));
    ok('Fall hat EN: ' + id, FAELLE_EN.includes(`'${id}': {`));
}
ok('Jede Tuer hat DE und EN', (JS.match(/, de: "/g) || []).length === 24 && (JS.match(/, en: "/g) || []).length === 24);

console.log('\n5. CSS');
for (const k of ['is-auf', 'is-zu', 'is-heute', 'is-neu', 'is-da', 'wn-raster', 'wn-tuer', 'wn-text', 'wn-title', 'wn-lead', 'wn-actions', 'wn-link', 'wn-close', 'wn-welt', 'wn-zaehler'])
    ok('.' + k + ' im CSS', CSS.includes('.' + k));
ok('Nie im Druck', /@media print[^}]*\.wn-welt, \.wn-card/.test(CSS));
ok('Szene liegt hinter dem Inhalt und faengt keine Klicks', /\.wn-welt \{[^}]*z-index: -1[^}]*pointer-events: none/.test(CSS));
ok('Szene: Deko-Schleife faengt Fehler', SZENE.includes("catch (e) { console.warn('[WeihnachtsSzene]', e)"));
ok('Szene: steht in verdeckten Tabs', SZENE.includes('document.hidden') && SZENE.includes('visibilitychange'));
ok('Szene: Bewegung aus bei reduzierter Bewegung', SZENE.includes('prefers-reduced-motion') && SZENE.includes('RUHIG'));
ok('Szene: malt erst im Leerlauf', SZENE.includes('requestIdleCallback'));
const hoverBloecke = CSS.split('@media (hover: hover)');
ok('Hover nur hinter Medienabfrage', hoverBloecke.length === 2 && !hoverBloecke[0].includes(':hover'));
ok('--primary mit !important (schlaegt applyTheme inline), nur unter der Deko', /html\.mwl-weihnachten-deko \{[^}]*--primary:\s*#[0-9a-f]{6} !important/.test(CSS));
ok('Deko hat eine helle Fassung', /html\.mwl-weihnachten-deko\[data-theme="light"\] \{[^}]*--primary:/.test(CSS));
ok('CSS + beide JS im Template, Szene zuerst', TEMPLATE.includes('/components/weihnachten/weihnachten.css') && TEMPLATE.indexOf('/components/weihnachten/weihnachten-szene.js') > 0 && TEMPLATE.indexOf('/components/weihnachten/weihnachten-szene.js') < TEMPLATE.indexOf('/components/weihnachten/weihnachten.js'));

console.log('\n' + pass + ' ok, ' + fail + ' fehlgeschlagen');
process.exit(fail ? 1 : 0);
