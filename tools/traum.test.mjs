// Prueft /traum/: die Ja/Nein-Frage (jsdom, echte traum.js) und drei statische
// Fallen, die man im Bild nicht sieht — fehlende Bilddateien, Fotos ohne
// Bildnachweis, CJK-Zeichen ausserhalb der geladenen Font-Teilmenge (&text=).
// Aufruf:  node tools/traum.test.mjs
import fs from 'fs';
import { JSDOM } from 'jsdom';

const SEITE = 'pages/traum/index.html';
const HTML = fs.readFileSync(SEITE, 'utf8').split('\r\n').join('\n');
const JS = fs.readFileSync('Assets/js/traum.js', 'utf8');

let fails = 0, n = 0;
const ok = (c, msg) => { n++; if (c) console.log('  ✓ ' + msg); else { fails++; console.log('  ✗ ' + msg); } };

/* ── 1. Statisch ───────────────────────────────────────── */
const ohneKommentare = HTML.replace(/<!--[\s\S]*?-->/g, '');
const bilder = [...ohneKommentare.matchAll(/(?:src|data-hd)="(\/Grafiken\/traum\/[^"?]+)(?:\?[^"]*)?"/g)].map((m) => m[1]);
ok(bilder.length > 20, `es gibt ueberhaupt Bilder zu pruefen (${bilder.length})`);
const fehlend = bilder.filter((b) => !fs.existsSync('.' + b));
ok(fehlend.length === 0, 'jede Bilddatei liegt auf der Platte' + (fehlend.length ? ': ' + fehlend.join(', ') : ''));

// Jedes verwendete Foto (Slug ohne -900/-1800) braucht eine Zeile im Bildnachweis.
// Die Wolke im Einstieg steht nur in traum.js — die Slugs dort zaehlen mit.
const slugs = new Set(bilder.map((b) => b.replace(/^.*\//, '').replace(/-(900|1800)\.webp$/, '')));
for (const m of JS.matchAll(/\['([a-z-]+)', -?\d/g)) slugs.add(m[1]);
const nachweis = (ohneKommentare.match(/<ul class="tr-credits__list"[\s\S]*?<\/ul>/) || [''])[0];
const zeilen = (nachweis.match(/<li>/g) || []).length;
ok(zeilen > 0, `Bildnachweis hat Zeilen (${zeilen})`);
ok(zeilen === slugs.size, `jedes Foto hat genau eine Nachweiszeile (${slugs.size} Fotos, ${zeilen} Zeilen)`);
ok(!/CC BY/.test(nachweis) || /rel="license/.test(nachweis), 'CC-Lizenzen sind verlinkt');

// CJK: alles, was im Markup steht, muss in einer der beiden &text=-Teilmengen sein
const teilmenge = [...ohneKommentare.matchAll(/family=Noto\+Serif\+(?:JP|SC)[^"]*&text=([^&"]+)/g)]
    .map((m) => decodeURIComponent(m[1])).join('');
const cjk = new Set((ohneKommentare.replace(/<head>[\s\S]*<\/head>/, '').match(/[一-鿿]/g) || []));
ok(cjk.size > 5, `es gibt ueberhaupt CJK-Zeichen (${cjk.size})`);
const ohneFont = [...cjk].filter((c) => !teilmenge.includes(c));
ok(ohneFont.length === 0, 'jedes CJK-Zeichen steht in der Font-Teilmenge' + (ohneFont.length ? ': ' + ohneFont.join('') : ''));

// Gemischte Knoten verschluckt die i18n-Pipeline still (CLAUDE.md)
const dom0 = new JSDOM(HTML).window.document;
const gemischt = [...dom0.body.querySelectorAll('*')].filter((el) => {
    if (el.closest('script,style,svg,[translate="no"]')) return false;
    const k = [...el.childNodes];
    return k.some((x) => x.nodeType === 1) && k.some((x) => x.nodeType === 3 && x.textContent.trim().length > 1);
});
ok(gemischt.length === 0, 'kein Text neben Kind-Elementen (i18n)' + (gemischt.length ? ': ' + gemischt.map((e) => e.className).join(', ') : ''));
ok(dom0.querySelectorAll('.tr-st').length === 6 && dom0.querySelectorAll('.tr-giant').length === 6 && dom0.querySelectorAll('.tr-stop').length === 6,
    'sechs Stationen in Reise, Riesenschrift und Plan');

/* ── 2. Die Frage (jsdom, ruhige Fassung) ───────────────── */
function seite(host, gemerkt, fetchImpl, jaZahl = 0, extra) {
    const dom = new JSDOM(HTML.replace(/<script defer src="\/Assets\/js\/traum\.js[^"]*"><\/script>/, ''), {
        url: 'https://' + host + '/traum/', runScripts: 'outside-only', pretendToBeVisual: true,
    });
    const w = dom.window;
    w.document.documentElement.classList.add('tr-js', 'tr-flat');
    if (gemerkt) w.localStorage.setItem('mwl_traum_antwort', gemerkt);
    // Der oeffentliche Zahl-Abruf (?zahl) ist Lesen, keine Stimme — getrennt beantworten
    const stimme = fetchImpl || (() => Promise.reject(new Error('kein Netz im Test')));
    w.fetch = (url, opt) => String(url).includes('?zahl')
        ? Promise.resolve({ ok: true, json: () => Promise.resolve({ ja: jaZahl }) })
        : stimme(url, opt);
    if (extra) extra(w);
    w.eval(JS);
    return w;
}
const warte = () => new Promise((r) => setTimeout(r, 20));

{   // localhost: zaehlt nicht, zeigt aber den Dank
    let aufrufe = 0;
    const w = seite('localhost', null, () => { aufrufe++; return Promise.resolve({ ok: true }); });
    const box = w.document.getElementById('trAsk');
    ok(box.getAttribute('data-state') === 'frage', 'Start: Frage offen');
    w.document.querySelector('.tr-pick--ja').click();
    await warte();
    ok(box.getAttribute('data-state') === 'ja', 'Ja-Klick zeigt den Dank mit Stempel');
    ok(w.localStorage.getItem('mwl_traum_antwort') === 'ja', 'Antwort wird gemerkt');
    ok(aufrufe === 0, 'von localhost geht keine Stimme an den echten Zaehler');
    w.document.getElementById('trAendern').click();
    ok(box.getAttribute('data-state') === 'frage', '"Antwort ändern" oeffnet die Frage wieder');
}
{   // echte Domain: sendet genau id + antwort + lang
    let body = null;
    const w = seite('myworklog.de', null, (url, opt) => { body = { url, ...JSON.parse(opt.body) }; return Promise.resolve({ ok: true }); });
    w.document.querySelector('.tr-pick--nein').click();
    await warte();
    ok(body && body.url === 'https://ai-proxy.myworklog.de/traum', 'sendet an den Worker-Pfad /traum');
    ok(body && Object.keys(body).filter((k) => k !== 'url').sort().join() === 'antwort,id,lang', 'gesendet wird nur id, antwort, lang');
    ok(body && body.antwort === 'nein' && /^[a-zA-Z0-9-]{8,64}$/.test(body.id), 'Antwort und Geraete-Id sind gueltig');
    ok(w.document.getElementById('trAsk').getAttribute('data-state') === 'nein', 'Nein zeigt den eigenen Dank');
}
{   // Fehler: Knoepfe bleiben, Hinweis erscheint, nichts gemerkt
    const w = seite('myworklog.de', null, () => Promise.resolve({ ok: false, status: 500 }));
    w.document.querySelector('.tr-pick--ja').click();
    await warte();
    ok(w.document.getElementById('trAsk').getAttribute('data-state') === 'fehler', 'Serverfehler zeigt den Fehlerhinweis');
    ok(w.localStorage.getItem('mwl_traum_antwort') === null, 'bei Fehler wird nichts gemerkt');
    ok(!w.document.querySelector('.tr-pick--ja').disabled, 'Knoepfe sind danach wieder bedienbar');
}
{   // Wiederkehrer sieht seine Antwort
    const w = seite('myworklog.de', 'ja');
    ok(w.document.getElementById('trAsk').getAttribute('data-state') === 'ja', 'gemerkte Antwort steht beim naechsten Besuch da');
}

{   // Sozialer Beweis: erst ab 3 sichtbar, eigenes Ja zaehlt sofort mit
    const w2 = seite('myworklog.de', null, null, 2);
    await warte();
    ok(!w2.document.getElementById('trProof').classList.contains('is-an'), 'bei 2 Ja bleibt der Zaehler unsichtbar (keine leere Party)');
    const w5 = seite('myworklog.de', null, () => Promise.resolve({ ok: true }), 5);
    await warte();
    ok(w5.document.getElementById('trProof').classList.contains('is-an') && w5.document.getElementById('trProofN').textContent === '5', 'ab 3 steht die echte Zahl da (5)');
    w5.document.querySelector('.tr-pick--ja').click();
    await warte();
    ok(w5.document.getElementById('trProofN').textContent === '6', 'eigenes Ja zaehlt sofort mit (6)');
    ok(w5.document.getElementById('trEnde').getAttribute('data-state') === 'ja', 'Schluss spricht nach dem Ja persoenlich an');
    const wl = seite('localhost', null, () => Promise.resolve({ ok: true }), 5);
    await warte();
    wl.document.querySelector('.tr-pick--ja').click();
    await warte();
    ok(wl.document.getElementById('trProofN').textContent === '5', 'von localhost zaehlt das eigene Ja auch optisch nicht mit');
}
{   // Antwort direkt im Schluss (emotionaler Hoehepunkt, kein Zurueckscrollen noetig)
    let gesendet = 0;
    const w = seite('myworklog.de', null, () => { gesendet++; return Promise.resolve({ ok: true }); }, 4);
    await warte();
    w.document.querySelector('#trEnde [data-antwort="ja"]').click();
    await warte();
    ok(gesendet === 1, 'Ja im Schluss geht genau einmal an den Worker');
    ok(w.document.getElementById('trAsk').getAttribute('data-state') === 'ja', 'Ja im Schluss setzt auch die Frage oben auf Ja');
    ok(w.document.getElementById('trEnde').getAttribute('data-state') === 'ja', 'Schluss zeigt danach "Du bist dabei"');
    ok(w.document.getElementById('trProofN').textContent === '5', 'Zaehler zaehlt das Ja aus dem Schluss mit (4 -> 5)');
    w.document.querySelector('#trEnde .tr-end__dabei') && w.document.getElementById('trAendern').click();
    w.document.querySelector('#trEnde [data-antwort="nein"]').click();
    await warte();
    ok(w.document.getElementById('trEnde').getAttribute('data-state') === 'nein', 'Nein im Schluss zeigt den eigenen, freundlichen Abschluss');
    ok(w.document.getElementById('trProofN').textContent === '4', 'Umentscheiden auf Nein nimmt das Ja wieder aus dem Zaehler');
}
{   // Teilen: ohne Web Share wird der saubere Link kopiert
    let kopiert = null;
    const w = seite('myworklog.de', 'ja', null, 0, (win) => {
        Object.defineProperty(win.navigator, 'clipboard', { value: { writeText: (t) => { kopiert = t; return Promise.resolve(); } } });
    });
    w.history.replaceState(null, '', '/traum/?utm=x#frage');
    w.document.querySelector('#trDankJa [data-teilen]').click();
    await warte();
    ok(kopiert === 'https://myworklog.de/traum/', 'kopiert wird der Link ohne Query und Anker (' + kopiert + ')');
    ok(w.document.querySelector('#trDankJa [data-teilen-ok]').classList.contains('is-an'), '"Link kopiert" wird bestaetigt');
}
{   // Kilometer: aus echten Koordinaten, Hin- und Rueckflug
    const w = seite('myworklog.de');
    const km = Number(w.document.getElementById('trPlanKm').textContent.replace(/\D/g, ''));
    ok(km > 18000 && km < 26000, 'Gesamtstrecke ist plausibel (' + km + ' km)');
    const p = w.document.querySelector('#trBriefText p');
    ok(p && !p.querySelector('.tr-wort'), 'ruhige Fassung laesst den Brief als normalen Text stehen');
}

console.log(`\n${n - fails}/${n} bestanden`);
if (n < 15) { console.log('✗ zu wenige Pruefungen gelaufen'); process.exit(1); }
process.exit(fails ? 1 : 0);
