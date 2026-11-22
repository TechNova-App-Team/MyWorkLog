// ═══ SILVESTER TEST ═══
//
// Feuerwerk + Countdown + Jahresrueckblick (components/silvester/). Das Feuerwerk selbst braucht eine echte
// Leinwand und wird per Bild geprueft; hier steht eine Attrappe. Geprueft wird:
//   1. Torwaechter: 30.12. 0 Uhr bis 02.01. 7 Uhr, Schluessel mit dem NEUEN Jahr, Test-Schalter
//   2. Countdown-Texte zu festen Uhrzeiten, DE/EN
//   3. Rueckblick: nur echte Zahlen, Kalenderjahr statt Ausbildungsjahr, Nullen fallen weg
//   4. Schalter: Feuerwerk aus + Ausblenden wirken und ueberleben den naechsten Start
//   5. Dichte steigt bis Mitternacht und klingt danach ab
//   6. Eigenstaendige Seiten, CSS-Regeln, Szene-Pflichten
//
// Lauf: node tools/silvester.test.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FEHLT ' + n)); };
const lf = (s) => s.split('\r\n').join('\n');

const TEMPLATE = lf(readFileSync('index.template.html', 'utf8'));
const DASH = lf(readFileSync('components/dashboard/dashboard.html', 'utf8'));
const JS = lf(readFileSync('components/silvester/silvester.js', 'utf8'));
const SZENE = lf(readFileSync('components/silvester/silvester-szene.js', 'utf8'));
const CSS = lf(readFileSync('components/silvester/silvester.css', 'utf8'));
const SEITE = lf(readFileSync('components/silvester/silvester-seite.js', 'utf8'));
const SEITE_CSS = lf(readFileSync('components/silvester/silvester-seite.css', 'utf8'));

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
ok('Schritt 9 steht im Pre-Apply', GATE.includes('mwl-silvester-karte'));
function gate(now, ls = {}) {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/', runScripts: 'outside-only' });
    const w = dom.window;
    for (const k of Object.keys(ls)) w.localStorage.setItem(k, ls[k]);
    w.Date = fixedDateClass(now);
    w.eval(GATE);
    return w.document.documentElement.className.split(/\s+/).filter(Boolean);
}
const alles = (c) => ['mwl-silvester', 'mwl-silvester-karte', 'mwl-silvester-deko'].every((k) => c.includes(k));
ok('29.12. 23:59: nichts', !gate('2026-12-29T23:59:00').includes('mwl-silvester'));
ok('30.12. 0:00: an', alles(gate('2026-12-30T00:00:00')));
ok('31.12. 23:59: an', alles(gate('2026-12-31T23:59:00')));
ok('01.01. 0:30: an', alles(gate('2027-01-01T00:30:00')));
ok('02.01. 6:59: noch an', alles(gate('2027-01-02T06:59:00')));
ok('02.01. 7:00: aus', !gate('2027-01-02T07:00:00').includes('mwl-silvester'));
ok('Weihnachten und Silvester nie gleichzeitig (28.12.)', !gate('2026-12-28T12:00:00').includes('mwl-silvester') && !gate('2026-12-28T12:00:00').includes('mwl-weihnachten'));
ok('Test-Schalter', alles(gate('2026-06-01T10:00:00', { mwl_silvester_test: '1' })) && alles(gate('2026-06-01T10:00:00', { mwl_silvester_test: 'finale' })));
{
    const weg = { mwl_silvester_2027: 'weg' };
    ok("'weg' am 31.12. gilt (Schluessel = neues Jahr)", !gate('2026-12-31T20:00:00', weg).includes('mwl-silvester-karte'));
    ok("'weg' am 31.12. gilt auch am 1.1. noch", !gate('2027-01-01T10:00:00', weg).includes('mwl-silvester-karte'));
    ok("'weg' vom letzten Silvester zaehlt nicht", alles(gate('2026-12-31T20:00:00', { mwl_silvester_2026: 'weg' })));
    const ruhe = gate('2026-12-31T20:00:00', { mwl_silvester_ruhe_2027: '1' });
    ok('Feuerwerk aus: Karte bleibt, keine Deko', ruhe.includes('mwl-silvester-karte') && !ruhe.includes('mwl-silvester-deko'));
}

console.log('\n2. Countdown');
ok('Karte im Dashboard', DASH.includes('<section id="svCard" class="sv-card"></section>'));
function aufbauen(now, ls = {}, lang = 'de', daten) {
    const dom = new JSDOM(`<!doctype html><html lang="${lang}" class="mwl-silvester mwl-silvester-karte mwl-silvester-deko"><head></head><body><section id="svCard"></section></body></html>`,
        { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window;
    for (const k of Object.keys(ls)) w.localStorage.setItem(k, ls[k]);
    w.Date = fixedDateClass(now);
    const ev = [];
    w.mwlEvent = (n, p) => ev.push(n + ':' + p.aktion);
    const szene = { an: false };
    w.SilvesterSzene = { start: () => { szene.an = true; }, stop: () => { szene.an = false; } };
    if (daten) w.eval('var data = ' + JSON.stringify(daten) + ';');
    w.eval(JS);
    return { w, d: w.document, ev, szene };
}
const warte = () => new Promise((r) => setTimeout(r, 30));
const titel = async (now, lang) => { const { d } = aufbauen(now, {}, lang); await warte(); return d.getElementById('svTitle').textContent; };
ok('30.12.: morgen', (await titel('2026-12-30T15:00:00')) === 'Morgen ist Silvester');
ok('31.12. 17:30: Stunden und Minuten', (await titel('2026-12-31T17:30:00')) === 'Noch 6 Stunden und 30 Minuten bis 2027');
ok('31.12. 23:00: glatte Stunde', (await titel('2026-12-31T23:00:00')) === 'Noch 1 Stunde bis 2027');
ok('31.12. 23:58:30: Minuten', (await titel('2026-12-31T23:58:30')) === 'Noch 2 Minuten bis 2027');
ok('31.12. 23:59:15: Sekunden', (await titel('2026-12-31T23:59:15')) === 'Noch 45 Sekunden bis 2027');
ok('01.01.: Frohes neues Jahr', (await titel('2027-01-01T00:00:05')) === 'Frohes neues Jahr');
ok('EN', (await titel('2026-12-31T23:59:15', 'en')) === '45 seconds to 2027');
{
    const { d } = aufbauen('2026-12-31T20:00:00');
    await warte();
    ok('Abends: Hinweis aufs Feuerwerk um Mitternacht', d.querySelector('.sv-lead').textContent.includes('Mitternacht'));
}

console.log('\n3. Rueckblick');
{
    const daten = { entries: [
        { date: '2026-03-02', type: 'work', worked: 8 }, { date: '2026-03-03', type: 'work', worked: 7.6 },
        { date: '2026-03-03', type: 'work', worked: 1 },          // zweite Schicht am selben Tag
        { date: '2026-03-04', type: 'school', worked: 8 }, { date: '2026-08-10', type: 'vacation', worked: 8 },
        { date: '2025-12-30', type: 'work', worked: 9 },           // Vorjahr
        { date: '2026-05-05', type: 'korrektur', worked: 0, isPeriod: true }
    ] };
    const reports = JSON.stringify([
        { year: 2, week: 10, dateFrom: '2026-03-02' }, { year: 1, week: 50, dateFrom: '2026-12-07' },
        { year: 2, week: 1, dateFrom: '2027-01-04' }               // year ist das Ausbildungsjahr, nicht 2026
    ]);
    const { d } = aufbauen('2026-12-31T20:00:00', { berichtsheft_reports: reports }, 'de', daten);
    await warte();
    const werte = Object.fromEntries([...d.querySelectorAll('.sv-rb-wert')].map((z) => [z.querySelector('dt').textContent, z.querySelector('dd').textContent]));
    ok('Titel nennt das alte Jahr', d.querySelector('.sv-rb-titel').textContent === 'Dein 2026');
    ok('Stunden: nur Arbeit, nur 2026, gerundet (16,6 → 17)', werte['Stunden gearbeitet'] === '17');
    ok('Tage erfasst: Datum einmal, ohne Korrektur und Vorjahr', werte['Tage erfasst'] === '4');
    ok('Berichtsheft nach Kalenderjahr von dateFrom', werte['Wochen im Berichtsheft'] === '2');
    ok('Schule und Urlaub', werte['Tage Berufsschule'] === '1' && werte['Tage Urlaub'] === '1');
}
{
    const { d } = aufbauen('2027-01-01T12:00:00', {}, 'de', { entries: [{ date: '2026-02-02', type: 'work', worked: 8 }] });
    await warte();
    ok('Am 1.1. blickt er auf das ALTE Jahr', d.querySelector('.sv-rb-titel').textContent === 'Dein 2026');
    ok('Nullen fallen weg', d.querySelectorAll('.sv-rb-wert').length === 2);
}
{
    const { d } = aufbauen('2026-12-31T20:00:00', {}, 'de', { entries: [] });
    await warte();
    ok('Ohne Daten kein Rueckblick', !d.querySelector('.sv-rueckblick'));
}

console.log('\n4. Schalter');
{
    const { w, d, ev, szene } = aufbauen('2026-12-31T20:00:00');
    await warte();
    const deko = d.querySelector('.sv-btn');
    ok('Szene laeuft mit Deko', szene.an);
    ok('Knopf heisst „Feuerwerk aus“', deko.textContent === 'Feuerwerk aus');
    deko.click();
    ok('Feuerwerk aus: Szene, Klasse, Speicher mit neuem Jahr', !szene.an && !d.documentElement.classList.contains('mwl-silvester-deko') && w.localStorage.getItem('mwl_silvester_ruhe_2027') === '1');
    deko.click();
    ok('Wieder an', szene.an && !w.localStorage.getItem('mwl_silvester_ruhe_2027'));
    d.querySelector('.sv-close').click();
    ok('Ausblenden: alles weg, weg-Schluessel mit neuem Jahr', !szene.an && !d.documentElement.classList.contains('mwl-silvester-karte') && w.localStorage.getItem('mwl_silvester_2027') === 'weg');
    ok('Ereignisse ueber mwlEvent', ['deko_aus', 'deko_an', 'weg'].every((a) => ev.includes('silvester:' + a)));
}
{
    const dom = new JSDOM('<!doctype html><html lang="de" class="mwl-silvester mwl-silvester-karte mwl-silvester-deko"><head></head><body><section id="svCard"></section><p id="dnGreet">Guten Abend,</p><p id="dnName">Anna</p></body></html>',
        { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window, d = w.document;
    w.Date = fixedDateClass('2026-12-31T20:00:00');
    w.mwlAnzeigeName = () => 'Anna';
    w.eval('function dnRenderHero(){ document.getElementById("dnGreet").textContent = "Guten Abend,"; }');
    w.eval(JS);
    await warte();
    ok('Begruessung: Guten Rutsch', d.getElementById('dnGreet').textContent === 'Guten Rutsch,');
    d.querySelector('.sv-btn').click();
    ok('Feuerwerk aus bringt die normale Begruessung zurueck', d.getElementById('dnGreet').textContent === 'Guten Abend,');
}

console.log('\n5. Dichte');
{
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/', runScripts: 'outside-only' });
    dom.window.eval(SZENE);
    const rate = (iso) => dom.window.SilvesterSzene.rate(new Date(iso));
    const kette = ['2026-12-30T12:00:00', '2026-12-31T10:00:00', '2026-12-31T19:00:00', '2026-12-31T22:00:00', '2026-12-31T23:55:00', '2027-01-01T00:05:00'].map(rate);
    ok('steigt bis kurz nach Mitternacht: ' + kette.join(' < '), kette.every((v, i) => i === 0 || v > kette[i - 1]));
    const danach = ['2027-01-01T00:05:00', '2027-01-01T00:40:00', '2027-01-01T03:00:00', '2027-01-01T15:00:00', '2027-01-02T05:00:00'].map(rate);
    ok('klingt danach ab: ' + danach.join(' > '), danach.every((v, i) => i === 0 || v < danach[i - 1]));
}

console.log('\n6. Seiten, CSS, Szene');
{
    const seiten = readdirSync('pages').filter((n) => existsSync('pages/' + n + '/index.html'));
    const mit = (s) => seiten.filter((n) => readFileSync('pages/' + n + '/index.html', 'utf8').includes(s)).sort().join(',');
    const wn = mit('/components/weihnachten/weihnachten-seite.js');
    ok('dieselben Seiten wie Weihnachten (' + wn.split(',').length + ')', wn.length > 0 && wn === mit('/components/silvester/silvester-seite.js'));
    const seite = (now, ls = {}) => {
        const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/', runScripts: 'outside-only' });
        for (const k of Object.keys(ls)) dom.window.localStorage.setItem(k, ls[k]);
        dom.window.Date = fixedDateClass(now);
        dom.window.eval(SEITE);
        return dom.window.document.documentElement.classList.contains('mwl-silvester-seite');
    };
    ok('Seite 31.12.: an', seite('2026-12-31T20:00:00'));
    ok('Seite 02.01. 7 Uhr: aus', !seite('2027-01-02T07:00:00'));
    ok('Seite: Feuerwerk aus gilt (neues Jahr)', !seite('2026-12-31T20:00:00', { mwl_silvester_ruhe_2027: '1' }));
    ok('Seite im Juni: nichts', !seite('2026-06-10T12:00:00'));
    ok('Seiten-Stil nur am Bildschirm, nie im Druck', SEITE_CSS.indexOf('@media screen') > 0 && /@media print[^}]*\.sv-welt/.test(SEITE_CSS));
}
for (const k of ['sv-card', 'sv-kopf', 'sv-title', 'sv-lead', 'sv-btn', 'sv-close', 'sv-rueckblick', 'sv-rb-liste', 'sv-welt', 'is-da'])
    ok('.' + k + ' im CSS', CSS.includes('.' + k));
ok('Nie im Druck', /@media print[^}]*\.sv-welt, \.sv-card/.test(CSS));
ok('Szene hinter dem Inhalt, ohne Klicks', /\.sv-welt \{[^}]*z-index: -1[^}]*pointer-events: none/.test(CSS));
const hover = CSS.split('@media (hover: hover)');
ok('Hover nur hinter Medienabfrage', hover.length === 2 && !hover[0].includes(':hover'));
const ohneKommentare = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
ok('Kein eigener Akzent', !/--primary(-rgb|-dim)?\s*:/.test(ohneKommentare));
ok('Gegenprobe: Deko setzt Tokens', /html\.mwl-silvester-deko \{[^}]*--bg-surface:/.test(ohneKommentare));
ok('Szene: Fehler halten nur die Schleife an', SZENE.includes("console.warn('[SilvesterSzene]', e)"));
ok('Szene: steht in verdeckten Tabs', SZENE.includes('document.hidden') && SZENE.includes('visibilitychange'));
ok('Szene: nichts bei reduzierter Bewegung', SZENE.includes('prefers-reduced-motion') && SZENE.includes('if (RUHIG) return'));
ok('Szene: ohne Teilchen keine Bildschleife (warten)', SZENE.includes('function warten') && SZENE.includes('etwasInDerLuft()'));
ok('Szene: Obergrenze fuer Teilchen', SZENE.includes('st.max'));
ok('Template: CSS + beide JS, Szene zuerst', TEMPLATE.includes('/components/silvester/silvester.css') && TEMPLATE.indexOf('/components/silvester/silvester-szene.js') > 0 && TEMPLATE.indexOf('/components/silvester/silvester-szene.js') < TEMPLATE.indexOf('/components/silvester/silvester.js'));
ok('Altes Emoji-Feuerwerk ist weg', !existsSync('Assets/js/Event/New_Year/fireworks.js') && !existsSync('Assets/css/Event/New_Year/fireworks.css'));

console.log('\n' + pass + ' ok, ' + fail + ' fehlgeschlagen');
process.exit(fail ? 1 : 0);
