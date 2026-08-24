/* ═══ AUFGABEN — Abnahme ══════════════════════════════════════════════
 *
 *   node tools/aufgaben.test.mjs
 *
 * Prueft die Zusagen, die beim Neubau von /aufgaben/ gemacht wurden. Die
 * ersten drei sind Regressionen: sie waren in der alten Fassung KAPUTT und
 * sahen im Screenshot trotzdem richtig aus.
 *
 *  1. Jede Zahl gehorcht dem gewaehlten Tag. Alt: `updateKPIs()` filterte
 *     immer mit `isCatVisibleToday()`, auch wenn die Liste Samstag zeigte.
 *  2. Ein Tag, der nicht heute ist, traegt keinen Erledigt-Zustand — der
 *     wird in `mwl_tasks_states` flach je id gefuehrt, nicht je Datum.
 *  3. "Insgesamt abgehakt" zaehlt kumuliert. Alt: `dc >= 50`, also 50
 *     GLEICHZEITIG abgehakte — Label und Wert meinten Verschiedenes.
 *  4. Kein Emoji im gerenderten DOM (Projektregel), auch nicht aus
 *     Altbestand: gespeicherte Emoji-Symbole gehen durch agIcon().
 *  5. Jeder Symbolname, den der Code zeichnet, existiert wirklich — ein
 *     Tippfehler faellt sonst still auf ein Ersatz-Symbol zurueck.
 *  6. esc() maskiert auch Anfuehrungszeichen (Attribut-Ausbruch).
 *
 * 🔴 Falle aus CLAUDE.md: mit `runScripts:'outside-only'` bleibt
 * `document.readyState` auf 'loading'. Das Modul startet sofort (kein
 * DOMContentLoaded-Warten), aber die Regel gilt trotzdem — deshalb wird
 * hier nach dem eval nichts vorausgesetzt, was ein Ereignis braucht.
 */
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const HTML = readFileSync(new URL('../pages/aufgaben/index.html', import.meta.url), 'utf8');
const JS   = readFileSync(new URL('../Assets/js/aufgaben.js', import.meta.url), 'utf8');
const CSS  = readFileSync(new URL('../Assets/css/aufgaben.css', import.meta.url), 'utf8');

/* Die Quellen sind absichtlich stark kommentiert, und die Kommentare NENNEN,
   was entfernt wurde ("kein festes #a855f7", "kein viewMode", "kein
   schwebender Werkzeugbalken"). Wer roh greppt, prueft damit die
   Dokumentation statt des Codes und meldet Fehler, die keine sind. */
const noComments = src => src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
const noHtmlComments = src => src.replace(/<!--[\s\S]*?-->/g, '');

const JS_CODE   = noComments(JS);
// Die HTML-Datei traegt beides: <!-- --> im Markup und /* */ in <style>
// und <script>. Der Hinweis "nie wieder ein festes #a855f7" steht in der
// zweiten Sorte — beide muessen raus, sonst prueft der Test seinen eigenen
// Kommentar.
const HTML_CODE = noComments(noHtmlComments(HTML));
const CSS_CODE  = noComments(CSS);

let pass = 0, fail = 0;
const ok  = (n, c, extra = '') => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (extra ? '\n       ' + extra : ''))); };

/* ─── Umgebung ──────────────────────────────────────────────────────── */
const DOW = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function boot(store = {}) {
    // runScripts:'outside-only' gibt window.eval die DOM-Globals. Die Inline-
    // <script> der Seite laufen dabei NICHT — genau richtig, sonst wuerde das
    // Maintenance-Gate hier ins Netz greifen.
    const dom = new JSDOM(HTML, {
        url: 'https://myworklog.de/aufgaben/',
        runScripts: 'outside-only',
        pretendToBeVisual: true
    });
    const { window } = dom;

    // localStorage-Attrappe: jsdom bringt eine mit, sie ist aber pro DOM neu.
    Object.keys(store).forEach(k => window.localStorage.setItem(k, store[k]));

    // Kein Netz im Test.
    window.fetch = () => Promise.reject(new Error('offline'));
    // Nicht auf undefined setzen: dann ist "'Notification' in window" WAHR
    // und der Guard laeuft ins Leere. Die Eigenschaft muss wirklich fehlen.
    delete window.Notification;

    window.eval(JS);
    return window;
}

const today = new Date().getDay();
const other = (today + 3) % 7;          // sicher ein anderer Wochentag

/* Bestand: eine Kategorie nur fuer HEUTE, eine nur fuer den anderen Tag. */
const cats = [
    { id: 'c1', name: 'Heute-Kram', icon: 'clipboardList', days: [today], autoReset: '',
      tasks: [ { id: 't1', name: 'A', days: [], subtasks: [] },
               { id: 't2', name: 'B', days: [], subtasks: [] } ] },
    { id: 'c2', name: 'Anderer Tag', icon: '📚', days: [other], autoReset: '',
      tasks: [ { id: 't3', name: 'C', days: [], subtasks: [] } ] }
];
const store = {
    mwl_tasks_cats:   JSON.stringify(cats),
    mwl_tasks_states: JSON.stringify({ t1: true, t3: true }),
    mwl_tasks_stats:  JSON.stringify({ done: 34 }),
    mwl_tasks_streak: JSON.stringify({ streak: 2, lastDate: null, best: 5 })
};


/* ─── 1 · Der gewaehlte Tag steuert JEDE Zahl ───────────────────────── */
console.log('\n1 · Ein Regler, und alle Zahlen gehorchen ihm');
{
    const w = boot(store);
    const d = w.document;

    const num   = () => d.getElementById('agNum').firstChild.nodeValue.trim();
    const total = () => d.getElementById('agTotal').textContent;
    const done  = () => d.getElementById('agDone').textContent;

    // Start = heute: 2 geplant, 1 erledigt, also 1 offen.
    ok('heute: 1 offen',            num() === '1', 'ist ' + num());
    ok('heute: 1 von 2 erledigt',   done() === '1' && total() === '2', done() + '/' + total());
    ok('heute zeigt nur c1',        d.querySelectorAll('.ag-cat').length === 1);

    // Auf den anderen Tag umschalten.
    const btn = d.querySelector('.ag-day[data-dow="' + other + '"]');
    ok('Tagesknopf ' + DOW[other] + ' vorhanden', !!btn);
    btn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

    ok(DOW[other] + ': 1 geplant',   num() === '1', 'ist ' + num());
    ok(DOW[other] + ': zeigt c2',    d.querySelector('.ag-cat__name').value === 'Anderer Tag',
       'ist ' + d.querySelector('.ag-cat__name').value);
    ok('Kopfzahl folgt der Liste',   d.getElementById('agDayName').textContent !== 'Heute');

    // 🔴 Das war der Kern des alten Fehlers: die Kopfzeile blieb auf heute.
    const kicker = d.getElementById('agKicker').textContent;
    ok('Beschriftung heisst "geplant", nicht "offen"', /geplant|planned/i.test(kicker), 'ist ' + kicker);
}


/* ─── 2 · Ein Plantag macht keine Zusage ueber Erledigt ─────────────── */
console.log('\n2 · Kein Erledigt-Zustand fuer Tage ausser heute');
{
    const w = boot(store);
    const d = w.document;
    d.querySelector('.ag-day[data-dow="' + other + '"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

    const cb = d.querySelector('.ag-cb');
    ok('Haken ist abgeschaltet',      cb.disabled === true);
    ok('Balken ist ausgeblendet',     d.getElementById('agMeter').classList.contains('is-plan'));
    ok('Grund steht als Satz da',     d.getElementById('agNote').textContent.length > 30);
    ok('Filter Offen/Erledigt aus',
       d.querySelector('.ag-seg__btn[data-f="open"]').disabled === true &&
       d.querySelector('.ag-seg__btn[data-f="done"]').disabled === true);

    // t3 steht in states auf true — die Zeile darf trotzdem nicht "erledigt" sein.
    ok('Zeile zeigt NICHT erledigt',  !d.querySelector('.ag-row').classList.contains('is-done'));

    // Zurueck auf heute: dort greift der Zustand wieder.
    d.querySelector('.ag-day[data-dow="' + today + '"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    ok('heute: Haken wieder bedienbar', d.querySelector('.ag-cb').disabled === false);
    ok('heute: eine Zeile ist erledigt', d.querySelectorAll('.ag-row.is-done').length === 1);
}


/* ─── 3 · "Insgesamt abgehakt" zaehlt wirklich kumuliert ────────────── */
console.log('\n3 · Label und Wert meinen dasselbe');
{
    const w = boot(store);
    const d = w.document;

    ok('Startstand 34 uebernommen', d.getElementById('agTotalDone').textContent === '34');

    // Die offene Aufgabe abhaken → Zaehler muss auf 35 gehen.
    const openRow = [...d.querySelectorAll('.ag-row')].find(r => !r.classList.contains('is-done'));
    openRow.querySelector('.ag-cb').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

    ok('nach einem Haken: 35',      d.getElementById('agTotalDone').textContent === '35',
       'ist ' + d.getElementById('agTotalDone').textContent);
    ok('Zaehler ist gespeichert',   JSON.parse(w.localStorage.getItem('mwl_tasks_stats')).done === 35);

    // Wieder abwaehlen darf NICHT zurueckzaehlen (es wurde ja abgehakt).
    openRow.querySelector('.ag-cb');
    const after = [...d.querySelectorAll('.ag-row.is-done')].length;
    ok('jetzt sind beide erledigt', after === 2, 'sind ' + after);

    // Meilenstein "Fuenfzig abgehakt" zeigt 35 / 50, nicht "erreicht".
    const goal = [...d.querySelectorAll('.ag-goal')].pop();
    ok('Meilenstein zeigt 35 / 50', goal.querySelector('.ag-goal__p').textContent.replace(/\s/g, '') === '35/50',
       'ist ' + goal.querySelector('.ag-goal__p').textContent);

    // Verlauf: heute muss als voll aufgezeichnet sein.
    const hist = JSON.parse(w.localStorage.getItem('mwl_tasks_history'));
    const key = Object.keys(hist)[0];
    ok('Verlauf fuer heute geschrieben', hist[key] && hist[key].d === hist[key].t && hist[key].t === 2,
       JSON.stringify(hist));
}


/* ─── 4 · Kein Emoji im gerenderten DOM ─────────────────────────────── */
console.log('\n4 · Nur gezeichnete Symbole');
{
    const w = boot(store);
    const d = w.document;

    // Der Bestand traegt '📚' als Kategoriesymbol. Es darf nicht durchschlagen.
    const EMO = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
    const walk = d.createTreeWalker(d.body, w.NodeFilter.SHOW_TEXT);
    const hits = [];
    let n;
    while ((n = walk.nextNode())) {
        if (EMO.test(n.nodeValue || '') && !n.parentElement.closest('script,style')) {
            hits.push(n.parentElement.tagName + ' ' + n.nodeValue.trim().slice(0, 24));
        }
    }
    ok('kein Emoji im Text', hits.length === 0, hits.join(' | '));

    // Auch nicht in Attributen (title, aria-label, value).
    const attrHits = [...d.querySelectorAll('*')].filter(el =>
        [...el.attributes].some(a => EMO.test(a.value))).map(el => el.tagName);
    ok('kein Emoji in Attributen', attrHits.length === 0, attrHits.join(', '));

    // Das gespeicherte '📚' wurde zu einem SVG uebersetzt, nicht verschluckt.
    d.querySelector('.ag-day[data-dow="' + other + '"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    ok('Alt-Emoji wird zu einem SVG', !!d.querySelector('.ag-cat__ico svg'));
    ok('Bestandsdaten bleiben unveraendert',
       JSON.parse(w.localStorage.getItem('mwl_tasks_cats'))[1].icon === '📚');

    // Und der CODE traegt keine Emojis mehr. Zwei Ausnahmen, beide bewusst:
    // Kommentare (dort steht 🔴 als Projektmarkierung) und FROM_EMOJI — das
    // ist die Uebersetzungstabelle fuer den Altbestand, also Daten.
    const code = JS_CODE.slice(0, JS_CODE.indexOf('var FROM_EMOJI'))
               + JS_CODE.slice(JS_CODE.indexOf('function svg'));
    const srcHits = (code.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []);
    ok('keine Emojis im Code', srcHits.length === 0, srcHits.join(' '));
}


/* ─── 5 · Jeder gezeichnete Symbolname existiert ────────────────────── */
console.log('\n5 · Kein stiller Rueckfall auf ein Ersatz-Symbol');
{
    // Die Tabelle P aus der Quelle lesen.
    const block = JS.slice(JS.indexOf('var P = {'), JS.indexOf('var PICKABLE'));
    const known = new Set([...block.matchAll(/^\s{8}([a-zA-Z]+):\s*'/gm)].map(m => m[1]));
    ok('Symboltabelle gefunden (' + known.size + ')', known.size > 30);

    // Alle svg('name')-Aufrufstellen dagegen pruefen.
    const used = [...JS.matchAll(/\bsvg\('([a-zA-Z]+)'/g)].map(m => m[1]);
    const bad = [...new Set(used)].filter(n => !known.has(n));
    ok('alle svg()-Namen existieren', bad.length === 0, bad.join(', '));

    // Die Auswahlliste ebenso.
    const pick = JS.slice(JS.indexOf('var PICKABLE'), JS.indexOf('/* 🔴 Bruecke'));
    const picks = [...pick.matchAll(/'([a-zA-Z]+)'/g)].map(m => m[1]);
    const badPick = picks.filter(n => !known.has(n));
    ok('alle Auswahl-Symbole existieren', badPick.length === 0, badPick.join(', '));

    // Und die Emoji-Bruecke zeigt nur auf echte Namen.
    const bridge = JS.slice(JS.indexOf('var FROM_EMOJI'), JS.indexOf('function svg'));
    const targets = [...bridge.matchAll(/:\s*'([a-zA-Z]+)'/g)].map(m => m[1]);
    const badBridge = [...new Set(targets)].filter(n => !known.has(n));
    ok('alle Bruecken-Ziele existieren', badBridge.length === 0, badBridge.join(', '));
}


/* ─── 6 · Maskierung und Aufbau ─────────────────────────────────────── */
console.log('\n6 · Maskierung, Struktur, tote Zusagen');
{
    const evil = [{ id: 'cx', name: 'Test" onmouseover="alert(1)', icon: 'star', days: [], autoReset: '',
                    tasks: [{ id: 'tx', name: '<img src=x onerror=alert(1)>', days: [], subtasks: [] }] }];
    const w = boot({ mwl_tasks_cats: JSON.stringify(evil) });
    const d = w.document;

    ok('Attribut bricht nicht auf',
       d.querySelector('.ag-cat__name').getAttribute('onmouseover') === null);
    ok('Name kommt vollstaendig an',
       d.querySelector('.ag-cat__name').value === 'Test" onmouseover="alert(1)');
    ok('kein injiziertes <img>', d.querySelectorAll('img').length === 0);
    ok('Aufgabentext steht als Text da',
       d.querySelector('.ag-row__txt').textContent === '<img src=x onerror=alert(1)>');
}

/* ─── 7 · Was die Seite NICHT mehr enthaelt ─────────────────────────── */
console.log('\n7 · Die alte Fassung ist wirklich weg');
{
    ok('kein zweiter Ansichtsmodus', !/viewMode/.test(JS_CODE) && !/viewMode/.test(HTML_CODE));
    ok('kein zweites "Reset"-Label', (HTML_CODE.match(/>Reset</g) || []).length === 0);
    ok('kein hartes Lila mehr', !/#a855f7/i.test(HTML_CODE) && !/#a855f7/i.test(CSS_CODE));
    ok('Schrift ist die der App', /Plus\+Jakarta\+Sans/.test(HTML) && !/family=Inter/.test(HTML));
    ok('Motivationsspruch ist weg', !/MOTS/.test(JS_CODE) && !/mot-text/.test(HTML_CODE));

    // position:fixed darf es geben, aber nur fuer Dialog-Grund und Meldung —
    // nicht fuer einen Werkzeugbalken, der ueber der letzten Zeile liegt.
    const fixedSel = [...CSS_CODE.matchAll(/([^{}]+)\{[^}]*position:\s*fixed/g)]
        .map(m => m[1].trim().split('\n').pop().trim());
    ok('fixed nur fuer Dialog und Meldung',
       fixedSel.length > 0 && fixedSel.every(sel => /ag-ov|ag-toast/.test(sel)),
       fixedSel.join(' | '));
    ok('keine Klasse .ctrl mehr',
       !/\.ctrl\b/.test(CSS_CODE) && !/class="[^"]*\bctrl\b/.test(HTML_CODE));

    // 🔴 CLAUDE.md: rgba(255,255,255,…) als Hover-Hintergrund entsaettigt,
    // statt aufzuhellen. Erlaubt bleibt Weiss INNERHALB des Akzentknopfes.
    const whiteHover = [...CSS_CODE.matchAll(/:hover[^{]*\{[^}]*background:\s*rgba\(255/g)];
    ok('kein weisser Hover-Schleier', whiteHover.length === 0, String(whiteHover.length));

    // Das Aussehen liegt in der eigenen Datei; inline steht nur der Token-Kopf.
    const inline = (HTML.match(/<style>([\s\S]*?)<\/style>/) || ['', ''])[1];
    ok('CSS ausgelagert (' + inline.length + ' Zeichen inline, ' + CSS.length + ' in der Datei)',
       /aufgaben\.css/.test(HTML) && inline.length < 3000 && CSS.length > 12000);

    // Jede id, die die Seite beschriftet, muss auch beschrieben werden —
    // sonst ist es ein Anzeigefeld mit fest eingebautem Ergebnis.
    const ids = [...HTML.matchAll(/id="(ag[A-Z][a-zA-Z]*)"/g)].map(m => m[1]);
    const readonly = ['agModalCatT', 'agModalTaskT', 'agModalCatEditT', 'agWeek', 'agList',
                      'agEmpty', 'agVerdict', 'agMeter', 'agIcons', 'agCatDays', 'agTaskDays',
                      'agCatEditDays', 'agTaskRepeat', 'agSearch', 'agUnit'];
    const dead = ids.filter(i => !readonly.includes(i) && !new RegExp("'" + i + "'").test(JS));
    ok('kein Feld ohne Schreibstelle', dead.length === 0, dead.join(', '));
}

console.log('\n' + (fail ? 'FEHLGESCHLAGEN' : 'ALLE GRUEN') + ' — ' + pass + ' ok, ' + fail + ' fehlgeschlagen\n');
process.exit(fail ? 1 : 0);
