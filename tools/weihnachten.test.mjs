// ═══ WEIHNACHTEN TEST ═══
//
// Winterliche App (components/weihnachten/). Das Malen selbst braucht eine echte Leinwand und wird per
// Bild geprueft; hier steht eine Attrappe. Geprueft wird:
//   1. Torwaechter: Fenster 01.12. 0 Uhr bis 27.12. 7 Uhr, Test-Schalter, 'weg' und Deko aus
//   2. Grusszeile: Countdown bis Heiligabend, DE/EN, kein Kalender mehr
//   3. Schalter: Deko aus + Ausblenden wirken wirklich und ueberleben den naechsten Start
//   4. Nie im Druck, kein Hover ohne Medienabfrage, reduzierte Bewegung, kein eigener Akzent
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

console.log('\n2. Grusszeile');
ok('Zeile im Dashboard', DASH.includes('<section id="wnCard" class="wn-card"></section>'));
function aufbauen(now, ls = {}, lang = 'de') {
    const dom = new JSDOM(`<!doctype html><html lang="${lang}" class="mwl-weihnachten mwl-weihnachten-karte mwl-weihnachten-deko"><head></head><body><section id="wnCard"></section></body></html>`,
        { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window;
    for (const k of Object.keys(ls)) w.localStorage.setItem(k, ls[k]);
    w.Date = fixedDateClass(now);
    const ev = [];
    w.mwlEvent = (n, p) => ev.push(n + ':' + p.aktion);
    const szene = { an: false };
    w.WeihnachtsSzene = { start: () => { szene.an = true; }, stop: () => { szene.an = false; } };
    w.eval(JS);
    return { w, d: w.document, ev, szene };
}
const warte = () => new Promise((r) => setTimeout(r, 30));
const titel = async (now, lang) => { const { d } = aufbauen(now, {}, lang); await warte(); return d.getElementById('wnTitle').textContent; };
ok('10.12.: noch 14 Tage', (await titel('2026-12-10T12:00:00')) === 'Noch 14 Tage bis Heiligabend');
ok('23.12.: morgen', (await titel('2026-12-23T12:00:00')) === 'Morgen ist Heiligabend');
ok('24.12.: heute', (await titel('2026-12-24T12:00:00')) === 'Heute ist Heiligabend');
ok('26.12.: Frohe Weihnachten', (await titel('2026-12-26T12:00:00')) === 'Frohe Weihnachten');
ok('Test im Maerz rechnet mit dem 7.', (await titel('2026-03-01T12:00:00')) === 'Noch 17 Tage bis Heiligabend');
ok('EN', (await titel('2026-12-10T12:00:00', 'en')) === '14 days until Christmas Eve');
{
    const { d } = aufbauen('2026-12-10T12:00:00');
    await warte();
    ok('Zeile sagt, wann der Winter geht', d.querySelector('.wn-lead').textContent.includes('27. Dezember'));
    // Der Dateikopf erklaert, warum der Kalender weg ist — darum nur den Code ohne Kommentare pruefen
    const code = JS.replace(/\/\/.*$/gm, '');
    ok('Kein Kalender mehr', !d.querySelector('.wn-tuer') && !code.includes('TUEREN') && !code.includes('Türchen') && !CSS.includes('.wn-tuer'));
    ok('Gegenprobe: der Code ist nach dem Kuerzen noch da', code.includes('function zeile'));
}

console.log('\n3. Schalter');
{
    const { w, d, ev, szene } = aufbauen('2026-12-10T12:00:00');
    await warte();
    const deko = d.querySelector('.wn-btn');
    ok('Szene laeuft mit Deko', szene.an);
    ok('Knopf heisst „Deko aus“', deko.textContent === 'Deko aus');
    deko.click();
    ok('Deko aus haelt die Szene an', !szene.an);
    ok('Deko aus: Klasse und Speicher', !d.documentElement.classList.contains('mwl-weihnachten-deko') && w.localStorage.getItem('mwl_weihnachten_ruhe_2026') === '1');
    ok('Deko aus: Knopf sagt „Deko an“', deko.textContent === 'Deko an' && deko.getAttribute('aria-pressed') === 'false');
    deko.click();
    ok('Deko wieder an', d.documentElement.classList.contains('mwl-weihnachten-deko') && !w.localStorage.getItem('mwl_weihnachten_ruhe_2026') && szene.an);
    d.querySelector('.wn-close').click();
    ok('Ausblenden haelt die Szene an', !szene.an);
    ok('Ausblenden nimmt Zeile und Deko', !d.documentElement.classList.contains('mwl-weihnachten-karte') && !d.documentElement.classList.contains('mwl-weihnachten-deko'));
    ok("Ausblenden speichert 'weg'", w.localStorage.getItem('mwl_weihnachten_2026') === 'weg');
    ok('Ereignisse ueber mwlEvent', ['deko_aus', 'deko_an', 'weg'].every((a) => ev.includes('weihnachten:' + a)));
}
ok('Torwaechter kennt keine Tueren mehr', !GATE.includes('tueren') && !GATE.includes('mwl-weihnachten-klein'));

console.log('\n3b. Begruessung');
{
    const dom = new JSDOM('<!doctype html><html lang="de" class="mwl-weihnachten mwl-weihnachten-karte mwl-weihnachten-deko"><head></head><body><section id="wnCard"></section><p id="dnGreet">Guten Abend,</p><p id="dnName">Anna</p><p id="dnQuote">normal</p></body></html>',
        { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window, d = w.document;
    w.Date = fixedDateClass('2026-12-10T20:00:00');
    w.mwlAnzeigeName = () => 'Anna';
    w.eval('function dnRenderHero(){ document.getElementById("dnGreet").textContent = "Guten Abend,"; document.getElementById("dnQuote").textContent = "normal"; }');
    w.eval(JS);
    await warte();
    ok('Begruessung ist weihnachtlich', d.getElementById('dnGreet').textContent === 'Gemütlichen Abend,');
    w.dnRenderHero();
    ok('Neu zeichnen behaelt den Gruss', d.getElementById('dnGreet').textContent === 'Gemütlichen Abend,' && d.getElementById('dnQuote').textContent.startsWith('„'));
    d.querySelector('.wn-btn').click();
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

console.log('\n4. CSS');
for (const k of ['is-da', 'wn-card', 'wn-marke', 'wn-text', 'wn-title', 'wn-lead', 'wn-btn', 'wn-close', 'wn-welt'])
    ok('.' + k + ' im CSS', CSS.includes('.' + k));
ok('Nie im Druck', /@media print[^}]*\.wn-welt, \.wn-card/.test(CSS));
ok('Szene liegt hinter dem Inhalt und faengt keine Klicks', /\.wn-welt \{[^}]*z-index: -1[^}]*pointer-events: none/.test(CSS));
ok('Szene: Deko-Schleife faengt Fehler', SZENE.includes("catch (e) { console.warn('[WeihnachtsSzene]', e)"));
ok('Szene: steht in verdeckten Tabs', SZENE.includes('document.hidden') && SZENE.includes('visibilitychange'));
ok('Szene: Bewegung aus bei reduzierter Bewegung', SZENE.includes('prefers-reduced-motion') && SZENE.includes('RUHIG'));
ok('Szene: malt erst im Leerlauf', SZENE.includes('requestIdleCallback'));
ok('Schneekante haengt am Handy in der Navigation', SZENE.includes("getElementById('mobNavInner')") && /\.wn-kante\.is-nav \{[^}]*bottom: 100%/.test(CSS));
ok('Schneekante nie im Druck, faengt keine Klicks', /@media print[^}]*\.wn-kante/.test(CSS) && /\.wn-kante \{[^}]*pointer-events: none/.test(CSS));
ok('Keine Eisblumen mehr (verworfen 22.11.2026)', !SZENE.includes('maleFrost'));
ok('Gegenprobe: die Szene malt ueberhaupt eine Kante', SZENE.includes('function maleKante'));
const hoverBloecke = CSS.split('@media (hover: hover)');
ok('Hover nur hinter Medienabfrage', hoverBloecke.length === 2 && !hoverBloecke[0].includes(':hover'));
// Entscheidung 22.11.2026: Winter kommt aus Flaechen und Szene, die Akzentfarbe des Nutzers bleibt
const ohneKommentare = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
ok('Kein eigener Akzent (--primary wird nicht ueberschrieben)', !/--primary(-rgb|-dim)?\s*:/.test(ohneKommentare));
ok('Gegenprobe: Deko setzt ueberhaupt Tokens', /html\.mwl-weihnachten-deko \{[^}]*--bg-surface:/.test(ohneKommentare));
ok('Deko hat eine helle Fassung', /html\.mwl-weihnachten-deko\[data-theme="light"\] \{[^}]*--bg-deep:/.test(ohneKommentare));
ok('CSS + beide JS im Template, Szene zuerst', TEMPLATE.includes('/components/weihnachten/weihnachten.css') && TEMPLATE.indexOf('/components/weihnachten/weihnachten-szene.js') > 0 && TEMPLATE.indexOf('/components/weihnachten/weihnachten-szene.js') < TEMPLATE.indexOf('/components/weihnachten/weihnachten.js'));

console.log('\n' + pass + ' ok, ' + fail + ' fehlgeschlagen');
process.exit(fail ? 1 : 0);
