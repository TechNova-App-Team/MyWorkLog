// ═══ GEBURTSTAG TEST ═══
//
// Die Kerze am 12.09. (components/geburtstag/) laesst sich im Automations-
// Browser nicht messen: dort ist document.hidden wahr, requestAnimationFrame
// steht still, und die Feder auf der Flamme sieht damit aus wie kaputt, obwohl
// nur die Umgebung schlaeft (CLAUDE.md, "Im Automations-Browser ist
// document.hidden wahr"). Deshalb jsdom mit pretendToBeVisual.
//
// Geprueft wird:
//   1. der Torwaechter im <head> (Fenster 12.09. 0 Uhr – 13.09. 13 Uhr, Test-Schalter,
//      'weg' blendet nur die Karte aus)
//   2. die Kerze als Uhr (Wachshoehe faellt ueber das ganze Fenster), Favicon bleibt
//   3. die Flamme reagiert auf eine schnelle Zeigerbewegung und kommt zur Ruhe
//   4. Tippen loescht, Zustand wird gespeichert, Formular kommt
//   5. Wunsch: leer = kein Abruf (Gegenprobe!), gueltig = genau ein Abruf mit Id
//   6. Wiederaufnahme nach Reload (aus / gesendet / weg)
//   7. jede Klasse, die das JS setzt, hat eine Regel im CSS
//   8. jeder JS-String hat einen englischen Eintrag in i18n-runtime.js
//
// Lauf: node tools/geburtstag.test.mjs
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FEHLT ' + n)); };
const eq = (n, a, b) => ok(n + '  (' + JSON.stringify(a) + ' = ' + JSON.stringify(b) + ')', a === b);
const lf = s => s.split('\r\n').join('\n');

const TEMPLATE  = lf(readFileSync('index.template.html', 'utf8'));
const DASH      = lf(readFileSync('components/dashboard/dashboard.html', 'utf8'));
const JS        = lf(readFileSync('components/geburtstag/geburtstag.js', 'utf8'));
const CSS       = lf(readFileSync('components/geburtstag/geburtstag.css', 'utf8'));
const RUNTIME   = lf(readFileSync('Assets/js/i18n-runtime.js', 'utf8'));

function fixedDateClass(iso) {
    const FIXED = new Date(iso).getTime();
    return class extends Date {
        constructor(...a) { if (a.length === 0) super(FIXED); else super(...a); }
        static now() { return FIXED; }
    };
}

// Das Karten-Markup aus dashboard.html schneiden (von der Kopfzeile bis zum Raster)
const kStart = DASH.indexOf('<section id="gbCard"');
const kEnd   = DASH.indexOf('</section>', kStart) + '</section>'.length;
const KARTE  = DASH.slice(kStart, kEnd);
ok('Karten-Markup gefunden', kStart > 0 && KARTE.length > 1000);

// ═════════════════════════════════════════════════════════════════════
console.log('\n1. Torwaechter im <head>');

const gStart = TEMPLATE.indexOf('<script>(function(){\n  // 1. Sidebar collapse pre-apply');
const gEnd   = TEMPLATE.indexOf('})();</script>', gStart);
ok('Pre-Apply-Skript gefunden', gStart > 0 && gEnd > gStart);
const GATE = TEMPLATE.slice(gStart + '<script>'.length, gEnd + '})();'.length);
ok('Schritt 6 (Geburtstag) steht im Pre-Apply', GATE.includes('mwl-geburtstag-karte'));

function gate({ now, ls = {} }) {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/', runScripts: 'outside-only' });
    const w = dom.window;
    for (const k of Object.keys(ls)) w.localStorage.setItem(k, ls[k]);
    w.Date = fixedDateClass(now);
    w.eval(GATE);
    return w.document.documentElement.className.split(/\s+/).filter(Boolean);
}
{
    const am = gate({ now: '2026-09-12T09:30:00' });
    ok('12.09.: Marken + Karte', am.includes('mwl-geburtstag') && am.includes('mwl-geburtstag-karte'));
    const tag2 = gate({ now: '2026-09-13T12:59:00' });
    ok('13.09. 12:59: noch an', tag2.includes('mwl-geburtstag') && tag2.includes('mwl-geburtstag-karte'));
    const ende = gate({ now: '2026-09-13T13:00:00' });
    ok('13.09. 13:00: aus', !ende.includes('mwl-geburtstag') && !ende.includes('mwl-geburtstag-karte'));
    const vorher = gate({ now: '2026-09-11T23:59:00' });
    ok('11.09. 23:59: noch nichts', !vorher.includes('mwl-geburtstag'));
    const nicht = gate({ now: '2026-09-14T09:30:00' });
    ok('14.09.: nichts', !nicht.includes('mwl-geburtstag') && !nicht.includes('mwl-geburtstag-karte'));
    const dez = gate({ now: '2026-12-09T09:30:00' });
    ok('09.12. (Tag/Monat vertauscht): nichts', !dez.includes('mwl-geburtstag'));
    const test = gate({ now: '2026-03-01T09:30:00', ls: { mwl_geburtstag_test: '1' } });
    ok('Test-Schalter an einem anderen Tag', test.includes('mwl-geburtstag-karte'));
    const weg = gate({ now: '2026-09-12T09:30:00', ls: { mwl_geburtstag_2026: 'weg' } });
    ok("'weg': Marken bleiben gold, Karte weg", weg.includes('mwl-geburtstag') && !weg.includes('mwl-geburtstag-karte'));
    const alt = gate({ now: '2027-09-12T09:30:00', ls: { mwl_geburtstag_2026: 'weg' } });
    ok("'weg' von 2026 gilt 2027 nicht mehr", alt.includes('mwl-geburtstag-karte'));
}

// ═════════════════════════════════════════════════════════════════════
// Karte + Skript in jsdom hochfahren
// jsdom setzt readyState erst im naechsten Tick auf 'interactive' — init() haengt
// bis dahin an DOMContentLoaded. Deshalb ist boot() async und wartet kurz.
async function boot({ now = '2026-09-12T09:30:00', ls = {}, fetchImpl, reduced = false } = {}) {
    const dom = new JSDOM(
        '<!doctype html><html lang="de" class="mwl-geburtstag mwl-geburtstag-karte"><head>'
        + '<link rel="icon" href="favicon.ico"><link rel="icon" href="/Grafiken/image.jpg"></head>'
        + '<body><main><div id="view-dashboard">' + KARTE + '</div></main></body></html>',
        { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'outside-only' });
    const w = dom.window;
    for (const k of Object.keys(ls)) w.localStorage.setItem(k, ls[k]);
    w.Date = fixedDateClass(now);
    w.matchMedia = () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} });
    const calls = [];
    // fetchImpl bekommt das Fenster: ein TypeError muss aus DERSELBEN Realm kommen,
    // sonst greift instanceof nicht (im Browser ist es immer dieselbe).
    w.fetch = fetchImpl ? ((...a) => fetchImpl(w, ...a)) : (async (url, opt) => { calls.push({ url, body: JSON.parse(opt.body) }); return { ok: true, status: 200, json: async () => ({ ok: true }) }; });
    const events = [];
    w.mwlEvent = (n, p) => events.push([n, p]);
    // pagehide/scroll/resize existieren; PointerEvent nicht in jedem jsdom → MouseEvent reicht
    w.eval(JS);
    await new Promise(r => setTimeout(r, 15));
    const d = w.document;
    return { w, d, calls, events, q: s => d.querySelector(s), id: s => d.getElementById(s) };
}
const schlaf = ms => new Promise(r => setTimeout(r, ms));
const sichtbar = (d) => [...d.querySelectorAll('.gb-state')].filter(s => !s.hidden).map(s => s.dataset.gbState);

// ═════════════════════════════════════════════════════════════════════
console.log('\n2. Die Kerze ist eine Uhr');
{
    const frueh = await boot({ now: '2026-09-12T00:10:00' });
    const mitte = await boot({ now: '2026-09-12T23:50:00' });
    const spaet = await boot({ now: '2026-09-13T12:50:00' });
    const hF = parseFloat(frueh.id('gbWax').getAttribute('height'));
    const hM = parseFloat(mitte.id('gbWax').getAttribute('height'));
    const hS = parseFloat(spaet.id('gbWax').getAttribute('height'));
    ok('12.09. 0:10 fast voll (' + hF + ')', hF > 111 && hF <= 112);
    // 23 h 50 min von 37 h verbraucht → 35,6 % Rest → 40 + 72 * 0,356 ≈ 65,6
    ok('12.09. 23:50 gut ein Drittel (' + hM + ')', hM > 64 && hM < 67);
    ok('13.09. 12:50 fast heruntergebrannt (' + hS + ')', hS >= 40 && hS < 41);
    ok('13.09.: Ueberschrift sagt „gestern"', /hatte gestern Geburtstag/.test(spaet.id('gbTitleLit').textContent));
    ok('12.09.: Ueberschrift sagt „heute"', /hat heute Geburtstag/.test(frueh.id('gbTitleLit').textContent));
    ok('title nennt die Restzeit (13.09. 12:50 → 0 h 10 min)', /noch 0 h 10 min/.test(spaet.id('gbCandle').title));
    ok('Docht/Flamme sitzen auf der Wachsoberkante',
        frueh.id('gbTop').getAttribute('transform') === 'translate(60 ' + frueh.id('gbWax').getAttribute('y') + ')');
    ok('title nennt die Restzeit (12.09. 0:10 → 36 h 50 min)', /noch 36 h 50 min/.test(frueh.id('gbCandle').title));
    // Wunsch des Nutzers (12.09.2026): das Tab-Symbol bleibt das normale.
    eq('Favicon bleibt unangetastet (beide Links, kein SVG)',
        [...frueh.d.querySelectorAll('link[rel="icon"]')].map(l => l.getAttribute('href')).join(), 'favicon.ico,/Grafiken/image.jpg');
    ok('kein Favicon-Code mehr im Modul', !/rel *= *'icon'|link\[rel="icon"\]/.test(JS));
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n3. Flamme reagiert auf Luftzug und kommt zur Ruhe');
{
    const { w, d, id } = await boot();
    const lean = id('gbLean');
    eq('vorher kein Inline-Transform', lean.style.transform, '');
    // schnelle Bewegung nahe der Flamme (jsdom: Rect ist 0/0 → Flamme bei 0/0)
    for (let i = 0; i < 8; i++) {
        d.dispatchEvent(new w.MouseEvent('pointermove', { clientX: -100 + i * 30, clientY: 10, bubbles: true }));
        await schlaf(16);
    }
    await schlaf(60);
    const t = lean.style.transform;
    const m = /rotate\((-?[\d.]+)deg\)/.exec(t);
    ok('Flamme neigt sich (' + t + ')', !!m && Math.abs(parseFloat(m[1])) > 1);
    ok('… in Bewegungsrichtung (nach rechts = positiv)', !!m && parseFloat(m[1]) > 0);
    await schlaf(1800);
    eq('… und kommt zur Ruhe (Inline-Transform wieder leer)', lean.style.transform, '');

    // Gegenprobe: weit weg von der Flamme passiert nichts
    for (let i = 0; i < 8; i++) {
        d.dispatchEvent(new w.MouseEvent('pointermove', { clientX: 2000 + i * 30, clientY: 900, bubbles: true }));
        await schlaf(16);
    }
    await schlaf(60);
    eq('weit weg: keine Reaktion', lean.style.transform, '');
}
{
    const { w, d, id } = await boot({ reduced: true });
    for (let i = 0; i < 8; i++) {
        d.dispatchEvent(new w.MouseEvent('pointermove', { clientX: -100 + i * 30, clientY: 10, bubbles: true }));
        await schlaf(16);
    }
    await schlaf(60);
    eq('prefers-reduced-motion: Flamme bleibt still', id('gbLean').style.transform, '');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n4. Tippen loescht die Kerze');
{
    const { w, d, id, events } = await boot();
    eq('Start: nur der brennende Zustand sichtbar', sichtbar(d).join(), 'lit');
    id('gbCandle').click();
    ok('Karte traegt is-out', id('gbCard').classList.contains('is-out'));
    eq("gespeichert: 'aus'", w.localStorage.getItem('mwl_geburtstag_2026'), 'aus');
    ok('Kerze nicht mehr bedienbar', id('gbCandle').disabled === true);
    await schlaf(900);
    eq('nach dem Rauch: Wunsch-Formular', sichtbar(d).join(), 'out');
    eq('Eingabefeld hat den Fokus', d.activeElement && d.activeElement.id, 'gbWish');
    eq('Ereignis gemeldet', JSON.stringify(events[0]), JSON.stringify(['geburtstag_kerze', { weg: 'tippen' }]));
    id('gbCandle').click();
    eq('zweites Tippen aendert nichts', w.localStorage.getItem('mwl_geburtstag_2026'), 'aus');
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n5. Wunsch schicken');
{
    const { w, d, id, calls, events } = await boot({ ls: { mwl_geburtstag_2026: 'aus' } });
    eq('Wiederaufnahme: Formular direkt da', sichtbar(d).join(), 'out');
    const form = id('gbForm');
    const submit = () => form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));

    id('gbWish').value = '   ';
    submit(); await schlaf(20);
    eq('leer: kein Abruf', calls.length, 0);
    ok('leer: Fehlertext steht da', !id('gbError').hidden && id('gbError').textContent.length > 5);

    id('gbWish').value = '  Bitte   eine Wochenansicht \n für Schichten  ';
    submit(); await schlaf(50);
    eq('gueltig: genau ein Abruf', calls.length, 1);
    eq('… an /wunsch', calls[0] && calls[0].url, 'https://ai-proxy.myworklog.de/wunsch');
    eq('… Text geglaettet', calls[0] && calls[0].body.text, 'Bitte eine Wochenansicht für Schichten');
    eq('… Sprache de', calls[0] && calls[0].body.lang, 'de');
    eq('… Jahr', calls[0] && calls[0].body.jahr, 2026);
    ok('… Id 8–64 Zeichen [a-zA-Z0-9-]', calls[0] && /^[a-zA-Z0-9-]{8,64}$/.test(calls[0].body.id));
    eq('… Id liegt im localStorage', w.localStorage.getItem('mwl_wunsch_id'), calls[0] && calls[0].body.id);
    ok('Fehler ausgeblendet', id('gbError').hidden);
    eq("gespeichert: 'gesendet'", w.localStorage.getItem('mwl_geburtstag_2026'), 'gesendet');
    await schlaf(250);
    eq('Dank-Zustand sichtbar', sichtbar(d).join(), 'sent');
    eq('Ereignis ohne Inhalt (nur Sprache)', JSON.stringify(events[0]), JSON.stringify(['geburtstag_wunsch', { sprache: 'de' }]));
}
{
    // Netzfehler: Zustand bleibt, Fehlertext kommt, Knopf wieder frei
    const { w, d, id } = await boot({ ls: { mwl_geburtstag_2026: 'aus' }, fetchImpl: async (w) => { throw new w.TypeError('Failed to fetch'); } });
    id('gbWish').value = 'Dark Mode für den Druck';
    id('gbForm').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    await schlaf(50);
    ok('Netzfehler: Meldung', !id('gbError').hidden && /Verbindung/.test(id('gbError').textContent));
    eq("Netzfehler: Stand bleibt 'aus'", w.localStorage.getItem('mwl_geburtstag_2026'), 'aus');
    eq('Netzfehler: Knopf wieder frei', id('gbSend').disabled, false);
    eq('Netzfehler: Formular bleibt', sichtbar(d).join(), 'out');
}
{
    // Worker sagt 429 → eigener Text
    const { w, d, id } = await boot({ ls: { mwl_geburtstag_2026: 'aus' }, fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({}) }) });
    id('gbWish').value = 'Noch ein Wunsch';
    id('gbForm').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    await schlaf(50);
    ok('429: "Zu viele Anfragen"', /Zu viele/.test(id('gbError').textContent));
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n6. Wiederaufnahme und Ausblenden');
{
    const { d, id } = await boot({ ls: { mwl_geburtstag_2026: 'gesendet' } });
    eq("'gesendet': Dank sichtbar", sichtbar(d).join(), 'sent');
    ok("'gesendet': Kerze aus, ohne Rauch (is-still)", id('gbCard').classList.contains('is-out') && id('gbCard').classList.contains('is-still'));
}
{
    const { w, d, id } = await boot();
    id('gbClose').click();
    eq("Ausblenden speichert 'weg'", w.localStorage.getItem('mwl_geburtstag_2026'), 'weg');
    ok('Karten-Klasse weg, Marken-Klasse bleibt',
        !d.documentElement.classList.contains('mwl-geburtstag-karte') && d.documentElement.classList.contains('mwl-geburtstag'));
}
{
    const { d, id } = await boot({ ls: { mwl_geburtstag_2026: 'weg' } });
    // Der Torwaechter haette die Karten-Klasse gar nicht gesetzt; das Skript
    // darf trotzdem nichts anfassen.
    ok("'weg': Skript laesst die Kerze in Ruhe", !id('gbCard').classList.contains('is-out') && id('gbCandle').disabled === false);
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n7. Klassen aus dem JS haben eine Regel im CSS');
{
    const css = new Set([...CSS.matchAll(/\.([a-zA-Z][\w-]*)(?=[\s,.:>#{[)])/g)].map(m => m[1]));
    const js = new Set();
    for (const m of JS.matchAll(/classList\.(?:add|toggle|remove)\(\s*'([\w-]+)'(?:\s*,\s*'([\w-]+)')?/g)) { js.add(m[1]); if (m[2]) js.add(m[2]); }
    for (const m of JS.matchAll(/className = '([\w-]+)'/g)) js.add(m[1]);
    js.delete('mwl-geburtstag-karte');   // Torwaechter-Klasse, im CSS als html.mwl-… vorhanden
    const tot = [...js].filter(c => !css.has(c));
    ok('gesetzte Klassen: ' + [...js].join(', '), js.size >= 6);
    ok('alle im CSS bekannt' + (tot.length ? ' — FEHLT: ' + tot.join(', ') : ''), tot.length === 0);
    // Gegenrichtung: Zustandsklassen im CSS, die das JS nie schreibt
    const zustand = [...css].filter(c => /^is-/.test(c) && !js.has(c));
    ok('keine is-Klasse im CSS ohne Schreiber' + (zustand.length ? ' — TOT: ' + zustand.join(', ') : ''), zustand.length === 0);
}

// ═════════════════════════════════════════════════════════════════════
console.log('\n8. Jeder JS-String hat einen englischen Eintrag');
{
    const tBlock = JS.slice(JS.indexOf('const T = {'), JS.indexOf('};', JS.indexOf('const T = {')));
    const strings = [...tBlock.matchAll(/^\s*\w+:\s*'([^']+)'/gm)].map(m => m[1]);
    ok('Strings gefunden (' + strings.length + ')', strings.length >= 12);
    const fehlt = strings.filter(s => !RUNTIME.includes("'" + s + "'"));
    ok('alle in i18n-runtime.js' + (fehlt.length ? ' — FEHLT: ' + fehlt.join(' | ') : ''), fehlt.length === 0);
    ok('Restzeit-Regel (mit Zahlen) vorhanden', /Die Kerze brennt herunter, noch/.test(RUNTIME));
    ok('Server-Status-Regel vorhanden', /Server antwortete mit/.test(RUNTIME));
}

console.log(`\n${pass} ok, ${fail} fehlt`);
process.exit(fail ? 1 : 0);
