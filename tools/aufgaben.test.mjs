/* ═══ AUFGABEN — Abnahme ══════════════════════════════════════════════
 *
 *   node tools/aufgaben.test.mjs
 *
 * Prueft die Zusagen des Arbeitsplatz-Umbaus (v7.2.0). Die ersten sind
 * Regressionen aus frueheren Fassungen, die im Screenshot richtig aussahen:
 *
 *  1. Jede Zahl gehorcht der Ansicht: Heute = ueberfaellig + heute + heute
 *     erledigt, und der Fortschritt zaehlt genau das.
 *  2. Fuer andere Tage gibt es keinen Erledigt-Zustand — Geplant zeigt nur
 *     DATIERTE Aufgaben mit Haken, Routinen als Zahl (CLAUDE.md-Falle
 *     „Datumswaehler ueber Zustand ohne Datums-Dimension").
 *  3. „insgesamt" zaehlt kumuliert und jeder Haken schreibt `doneAt`.
 *  4. Wiederholung WIRKT: eine gestern erledigte taegliche Aufgabe steht
 *     heute wieder offen. Bis v7.1.1 war `recurring` ein Etikett.
 *  5. Schnelleingabe: „Fr", „!!", „#Liste", „24.09." — und „so" ist KEIN
 *     Sonntag (nur gross geschriebene Kuerzel zaehlen).
 *  6. Ohne Liste entsteht „Eingang"; loeschen laesst sich rueckgaengig machen.
 *  7. Das Berichtsheft liest `mwl_tasks_cats` mit cat.days/task.days/task.name
 *     — die Form bleibt nach jeder Operation erhalten.
 *  8. Kein Emoji im DOM, jeder svg()-Name existiert, esc() maskiert Quotes.
 *  9. Kein Textknoten-Element ist ein Grid/Flex-Container: `.tk-sub` war
 *     gleichzeitig Kopf-Untertitel und Unteraufgaben-Zeile (Grid mit 18-px-
 *     Spalte), der Datumstext brach wortweise um. Selbe Falle wie doppelte
 *     Selektoren in CLAUDE.md, nur ueber zwei Rollen einer Klasse.
 * 10. Notizen (v7.2.1) zaehlen NIRGENDS mit: nicht in Heute, nicht im
 *     Fortschritt, nicht in der Serie, nicht im Berichtsheft-Schluessel.
 *     Sie haben keinen Haken, stehen unter Heute zuletzt, und der Schalter
 *     im Detail wandelt verlustfrei um (Unteraufgaben und Notiztext werden
 *     Zeilen; zurueck wird die erste Zeile der Name).
 *
 * 🔴 Falle aus CLAUDE.md: mit `runScripts:'outside-only'` bleibt
 * `document.readyState` auf 'loading'; das Modul startet sofort, ohne
 * DOMContentLoaded — deshalb nichts voraussetzen, was ein Ereignis braucht.
 */
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const HTML = readFileSync(new URL('../pages/aufgaben/index.html', import.meta.url), 'utf8').split('\r\n').join('\n');
const JS   = readFileSync(new URL('../Assets/js/aufgaben.js', import.meta.url), 'utf8').split('\r\n').join('\n');
const CSS  = readFileSync(new URL('../Assets/css/aufgaben.css', import.meta.url), 'utf8').split('\r\n').join('\n');

/* Die Quellen NENNEN in Kommentaren, was entfernt wurde. Wer roh greppt,
   prueft die Dokumentation statt des Codes. Beide Kommentarsorten raus. */
const noComments = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const noHtmlComments = src => src.replace(/<!--[\s\S]*?-->/g, '');
const JS_CODE   = noComments(JS);
const HTML_CODE = noComments(noHtmlComments(HTML));
const CSS_CODE  = noComments(CSS);

let pass = 0, fail = 0;
const ok = (n, c, extra = '') => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (extra ? '\n       ' + extra : ''))); };

/* ─── Umgebung ──────────────────────────────────────────────────────── */
const p2 = n => String(n).padStart(2, '0');
const isoOf = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
const NOW = new Date(); NOW.setHours(0, 0, 0, 0);
const TODAY = isoOf(NOW);
const shift = n => { const d = new Date(NOW); d.setDate(d.getDate() + n); return d; };
const dow = NOW.getDay();
const otherDow = (dow + 3) % 7;

function boot(store = {}) {
    const dom = new JSDOM(HTML, { url: 'https://myworklog.de/aufgaben/', runScripts: 'outside-only', pretendToBeVisual: true });
    const { window } = dom;
    Object.keys(store).forEach(k => window.localStorage.setItem(k, typeof store[k] === 'string' ? store[k] : JSON.stringify(store[k])));
    window.fetch = () => Promise.reject(new Error('offline'));
    delete window.Notification;          // die Eigenschaft muss wirklich fehlen (CLAUDE.md)
    window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
    window.eval(JS);
    return window;
}
const q  = (w, s) => w.document.querySelector(s);
const qa = (w, s) => [...w.document.querySelectorAll(s)];
const click = (w, s) => { const el = typeof s === 'string' ? q(w, s) : s; el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); return el; };
const rows  = w => qa(w, '.tk-row').map(r => r.dataset.id);
const secs  = w => qa(w, '.tk-sec').map(h => h.textContent.replace(/\s+/g, ' ').trim());

function cats() {
    return [
        { id: 'c1', name: 'Betrieb', icon: 'briefcase', days: [], autoReset: '', tasks: [
            { id: 'over', name: 'Überfällig', priority: 'high', days: [], due: isoOf(shift(-3)), recurring: 'none', subtasks: [] },
            { id: 'dueT', name: 'Heute fällig', priority: '', days: [], due: TODAY, recurring: 'none', subtasks: [] },
            { id: 'fut',  name: 'Übermorgen', priority: '', days: [], due: isoOf(shift(2)), recurring: 'none', subtasks: [] },
            { id: 'rout', name: 'Routine jeden Tag', priority: '', days: [], due: '', recurring: 'none', subtasks: [] },
            { id: 'doneT', name: 'Schon erledigt', priority: '', days: [], due: '', recurring: 'none', subtasks: [], doneAt: TODAY + 'T09:00:00' }
        ] },
        { id: 'c2', name: 'Berufsschule', icon: '📚', days: [otherDow], autoReset: '', tasks: [
            { id: 'school', name: 'Nur am anderen Tag', priority: '', days: [], due: '', recurring: 'none', subtasks: [] }
        ] }
    ];
}
const base = () => ({
    mwl_tasks_cats: cats(),
    mwl_tasks_states: { doneT: true },
    mwl_tasks_stats: { done: 34 },
    mwl_tasks_lastReset: NOW.toDateString()
});


/* ─── 1 · Heute: die Zahlen gehorchen der Ansicht ───────────────────── */
console.log('\n1 · Heute zaehlt ueberfaellig + heute + heute erledigt');
{
    const w = boot(base());
    ok('Ansicht Heute ist aktiv', q(w, '.tk-nav__it.is-on').dataset.view === 'today');
    const r = rows(w);
    ok('ueberfaellig, heute faellig, Routine, erledigt — genau die vier', r.length === 4 && r.includes('over') && r.includes('dueT') && r.includes('rout') && r.includes('doneT'), r.join(','));
    ok('Uebermorgen steht NICHT unter Heute', !r.includes('fut'));
    ok('Liste des anderen Tages steht NICHT unter Heute', !r.includes('school'));
    ok('Abschnitte: Ueberfaellig, Heute, Heute erledigt', /Überfällig/.test(secs(w)[0]) && /Heute erledigt/.test(secs(w)[2]), secs(w).join(' | '));
    ok('Fortschritt 1 von 4', q(w, '#tkProgDone').textContent === '1' && q(w, '#tkProgTotal').textContent === '4');
    ok('Sidebar: Heute 3, Geplant 1, Alle 5, Erledigt 1',
        q(w, '#tkNToday').textContent === '3' && q(w, '#tkNUpcoming').textContent === '1' && q(w, '#tkNAll').textContent === '5' && q(w, '#tkNDone').textContent === '1',
        [q(w, '#tkNToday').textContent, q(w, '#tkNUpcoming').textContent, q(w, '#tkNAll').textContent, q(w, '#tkNDone').textContent].join('/'));
    ok('ueberfaellige Zeile traegt das rote Datum', !!q(w, '.tk-row[data-id="over"] .tk-meta.is-over'));
    ok('Prioritaet steht als data-prio an der Zeile', q(w, '.tk-row[data-id="over"]').dataset.prio === 'high');
    ok('erledigte Zeile ist durchgestrichen', q(w, '.tk-row[data-id="doneT"]').classList.contains('is-done'));
}


/* ─── 2 · Geplant: nur datierte Aufgaben, Routinen als Zahl ─────────── */
console.log('\n2 · Geplant kennt keinen Erledigt-Zustand fuer fremde Tage');
{
    const w = boot(base());
    click(w, '[data-view="upcoming"]');
    const r = rows(w);
    ok('nur die datierte Aufgabe hat eine Zeile', r.length === 1 && r[0] === 'fut', r.join(','));
    ok('die Routine hat KEINE Zeile (kein Haken fuer fremde Tage)', !r.includes('rout') && !r.includes('school'));
    const s = secs(w);
    ok('Routinen erscheinen als Zahl im Abschnittskopf', s.some(x => /Routine/.test(x)), s.join(' | '));
    ok('kein Fortschrittsbalken ohne Nenner', q(w, '#tkProg').hidden === true);
    ok('Schnelleingabe bleibt (Standard: morgen)', q(w, '#tkAddBox').hidden === false);
}


/* ─── 3 · Haken: kumuliert, mit Zeitpunkt, mit Feedback ─────────────── */
console.log('\n3 · Abhaken zaehlt kumuliert und schreibt doneAt');
{
    const w = boot(base());
    click(w, '.tk-check[data-id="rout"]');
    const st = JSON.parse(w.localStorage.getItem('mwl_tasks_states'));
    ok('Flag gesetzt', st.rout === true);
    ok('Zaehler 34 → 35 gespeichert', JSON.parse(w.localStorage.getItem('mwl_tasks_stats')).done === 35);
    const t = JSON.parse(w.localStorage.getItem('mwl_tasks_cats'))[0].tasks.find(x => x.id === 'rout');
    ok('doneAt traegt heute', t.doneAt && t.doneAt.slice(0, 10) === TODAY, String(t.doneAt));
    ok('Haken sofort gedrueckt (vor dem Neuzeichnen)', q(w, '.tk-check[data-id="rout"]').getAttribute('aria-pressed') === 'true');
    ok('Verlauf fuer heute: 2 von 4', (() => { const h = JSON.parse(w.localStorage.getItem('mwl_tasks_history'))[TODAY]; return h && h.d === 2 && h.t === 4; })());
    click(w, '.tk-check[data-id="rout"]');
    ok('zurueck: Flag weg, doneAt weg, Zaehler bleibt 35',
        !JSON.parse(w.localStorage.getItem('mwl_tasks_states')).rout
        && !JSON.parse(w.localStorage.getItem('mwl_tasks_cats'))[0].tasks.find(x => x.id === 'rout').doneAt
        && JSON.parse(w.localStorage.getItem('mwl_tasks_stats')).done === 35);
}


/* ─── 4 · Wiederholung wirkt ────────────────────────────────────────── */
console.log('\n4 · Wiederholte Aufgaben stehen in der naechsten Periode wieder offen');
{
    const yesterday = isoOf(shift(-1)) + 'T18:00:00';
    const lastMonth = new Date(NOW); lastMonth.setMonth(lastMonth.getMonth() - 1);
    const s = base();
    s.mwl_tasks_cats = [{ id: 'c1', name: 'Betrieb', icon: 'briefcase', days: [], autoReset: '', tasks: [
        { id: 'd', name: 'Täglich', days: [], due: '', recurring: 'daily', doneAt: yesterday, subtasks: [] },
        { id: 'dd', name: 'Täglich mit Datum', days: [], due: isoOf(shift(-1)), recurring: 'daily', doneAt: yesterday, subtasks: [] },
        { id: 'm', name: 'Monatlich', days: [], due: '', recurring: 'monthly', doneAt: isoOf(lastMonth) + 'T10:00:00', subtasks: [] },
        { id: 'n', name: 'Einmalig gestern', days: [], due: '', recurring: 'none', doneAt: yesterday, subtasks: [] },
        { id: 'h', name: 'Heute schon', days: [], due: '', recurring: 'daily', doneAt: TODAY + 'T08:00:00', subtasks: [] }
    ] }];
    s.mwl_tasks_states = { d: true, dd: true, m: true, n: true, h: true };
    const w = boot(s);
    const st = JSON.parse(w.localStorage.getItem('mwl_tasks_states'));
    ok('taeglich, gestern erledigt → heute offen', !st.d);
    ok('monatlich, letzten Monat erledigt → offen', !st.m);
    ok('einmalig bleibt erledigt', st.n === true);
    ok('heute schon erledigt bleibt erledigt', st.h === true);
    const dd = JSON.parse(w.localStorage.getItem('mwl_tasks_cats'))[0].tasks.find(x => x.id === 'dd');
    ok('Datum wandert auf heute (' + dd.due + ')', dd.due === TODAY && !st.dd);
    ok('die wieder offene Aufgabe steht unter Heute', rows(w).includes('d'));
}


/* ─── 5 · Schnelleingabe ────────────────────────────────────────────── */
console.log('\n5 · Schnelleingabe versteht Datum, Prioritaet und Liste');
{
    const w = boot(base());
    const type = text => { const i = q(w, '#tkAdd'); i.value = text; i.dispatchEvent(new w.Event('input', { bubbles: true })); return i; };
    const enter = () => q(w, '#tkAdd').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const hints = () => qa(w, '.tk-hint').map(h => h.textContent.trim());

    type('Bericht abgeben Fr !! #Beruf');
    ok('drei Chips beim Tippen', hints().length === 3, hints().join(' | '));
    ok('Chip Prioritaet Mittel', hints().some(h => h === 'Mittel'));
    ok('Chip Liste Berufsschule', hints().some(h => /Berufsschule/.test(h)));
    enter();
    const c2 = JSON.parse(w.localStorage.getItem('mwl_tasks_cats')).find(c => c.id === 'c2');
    const t = c2.tasks[c2.tasks.length - 1];
    ok('Name ohne die Steuerwoerter', t.name === 'Bericht abgeben', t.name);
    ok('Prioritaet mittel', t.priority === 'medium');
    const fr = new Date(NOW); fr.setDate(fr.getDate() + ((5 - dow + 7) % 7));
    ok('faellig am naechsten Freitag (' + isoOf(fr) + ')', t.due === isoOf(fr), t.due);
    ok('createdAt gesetzt', typeof t.createdAt === 'string' && t.createdAt.length > 10);

    type('so schnell wie möglich anrufen');
    ok('„so" ist kein Sonntag', hints().length === 0, hints().join(' | '));
    enter();
    const c1 = JSON.parse(w.localStorage.getItem('mwl_tasks_cats')).find(c => c.id === 'c1');
    ok('ohne #Liste in Heute → Eingang mit Datum heute', (() => { const inbox = JSON.parse(w.localStorage.getItem('mwl_tasks_cats')).find(c => c.id === 'cat_inbox'); return inbox && inbox.tasks[0].name === 'so schnell wie möglich anrufen' && inbox.tasks[0].due === TODAY; })());

    type('Doku 24.09. !!!');
    const h = hints();
    ok('24.09. wird als Datum erkannt', h.some(x => /Fällig/.test(x)), h.join(' | '));
    ok('!!! ist Hoch', h.some(x => x === 'Hoch'));
    enter();
    const inbox = JSON.parse(w.localStorage.getItem('mwl_tasks_cats')).find(c => c.id === 'cat_inbox');
    const doku = inbox.tasks.find(x => x.name === 'Doku');
    ok('24.09. liegt in diesem oder naechstem Jahr, nie in der Vergangenheit', doku && /-09-24$/.test(doku.due) && doku.due >= TODAY, doku && doku.due);
    ok('Eingang steht in der Sidebar', qa(w, '#tkLists .tk-nav__it').some(b => b.dataset.list === 'cat_inbox'));
}


/* ─── 6 · Loeschen mit Rueckgaengig, Auswahl, Detail ────────────────── */
console.log('\n6 · Detail, Loeschen, Rueckgaengig');
{
    const w = boot(base());
    click(w, '.tk-row[data-id="dueT"]');
    ok('Zeile ausgewaehlt', q(w, '.tk-row[data-id="dueT"]').classList.contains('is-sel'));
    ok('Detail offen, Aufgabenformular sichtbar', q(w, '#tkDetail').classList.contains('is-open') && q(w, '#tkFTask').hidden === false && q(w, '#tkFCat').hidden === true);
    ok('Name im Formular', q(w, '#tkFName').value === 'Heute fällig');
    q(w, '#tkFPrio [data-p="high"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    ok('Prioritaet per Klick gespeichert (Autosave)', JSON.parse(w.localStorage.getItem('mwl_tasks_cats'))[0].tasks.find(x => x.id === 'dueT').priority === 'high');
    click(w, '[data-a="deldetail"]');
    ok('Aufgabe weg', !JSON.parse(w.localStorage.getItem('mwl_tasks_cats'))[0].tasks.find(x => x.id === 'dueT'));
    ok('Detail zu', !q(w, '#tkDetail').classList.contains('is-open'));
    const undo = q(w, '.tk-toast__undo');
    ok('Toast mit Rueckgaengig', !!undo);
    click(w, undo);
    const back = JSON.parse(w.localStorage.getItem('mwl_tasks_cats'))[0].tasks;
    ok('Rueckgaengig stellt sie an alter Stelle wieder her', back[1] && back[1].id === 'dueT', back.map(x => x.id).join(','));
}


/* ─── 7 · Berichtsheft-Format bleibt ────────────────────────────────── */
console.log('\n7 · mwl_tasks_cats behaelt die Form, die das Berichtsheft liest');
{
    const w = boot(base());
    const i = q(w, '#tkAdd'); i.value = 'Neu'; i.dispatchEvent(new w.Event('input', { bubbles: true }));
    i.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    click(w, '.tk-check[data-id="rout"]');
    const cs = JSON.parse(w.localStorage.getItem('mwl_tasks_cats'));
    ok('Array von Listen', Array.isArray(cs) && cs.length === 3);
    ok('jede Liste: id, name, days-Array, tasks-Array', cs.every(c => typeof c.id === 'string' && typeof c.name === 'string' && Array.isArray(c.days) && Array.isArray(c.tasks)));
    ok('jede Aufgabe: id, name, days-Array', cs.every(c => c.tasks.every(t => typeof t.id === 'string' && typeof t.name === 'string' && Array.isArray(t.days))));
    ok('Alt-Emoji in cat.icon bleibt unveraendert in den Daten', cs.find(c => c.id === 'c2').icon === '📚');
    const bs = JS.includes("'mwl_tasks_cats'") && readFileSync(new URL('../Assets/js/berichtsheft/ais-studio.js', import.meta.url), 'utf8').includes("'mwl_tasks_cats'");
    ok('Berichtsheft und Aufgaben nennen denselben Schluessel', bs);
}


/* ─── 8 · Keine Emojis, Symbole existieren, Escaping ────────────────── */
console.log('\n8 · Symbole und Escaping');
{
    const s = base();
    s.mwl_tasks_cats[0].tasks.push({ id: 'q', name: 'Name mit "Quote" & <b>', days: [], due: '', recurring: 'none', subtasks: [] });
    const w = boot(s);
    const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    const texts = [...w.document.body.querySelectorAll('*')].map(e => e.childNodes.length && e.firstChild.nodeType === 3 ? e.firstChild.textContent : '').filter(t => EMOJI.test(t));
    ok('kein Emoji im Text', texts.length === 0, texts.join(' | '));
    ok('Alt-Emoji wird zum SVG', !!q(w, '#tkLists .tk-nav__it[data-list="c2"] svg'));
    ok('keine Emojis im Code (ausser Bruecken-Tabelle)', !EMOJI.test(JS_CODE.replace(/var FROM_EMOJI = \{[\s\S]*?\};/, '')));
    const known = new Set([...JS.matchAll(/^\s{8}([a-zA-Z]+):\s*'<(?:path|polyline|circle|rect|line)/gm)].map(m => m[1]));
    ok('Symboltabelle gefunden (' + known.size + ')', known.size > 30);
    const used = [...JS_CODE.matchAll(/svg\('([a-zA-Z]+)'/g)].map(m => m[1]);
    const bad = [...new Set(used)].filter(n => !known.has(n));
    ok('alle svg()-Namen existieren (' + used.length + ' Aufrufe)', bad.length === 0 && used.length > 5, bad.join(', '));
    const pick = JS.match(/var PICKABLE = \[([\s\S]*?)\];/)[1].match(/'([a-zA-Z]+)'/g).map(x => x.replace(/'/g, ''));
    ok('alle Auswahl-Symbole existieren', pick.every(n => known.has(n)));
    const cb = q(w, '.tk-check[data-id="q"]');
    ok('Quote im aria-label bricht das Attribut nicht auf', cb && cb.getAttribute('aria-label').includes('"Quote"'));
    ok('Name steht als Text, nicht als Markup', q(w, '.tk-row[data-id="q"] .tk-row__name').textContent === 'Name mit "Quote" & <b>' && !q(w, '.tk-row[data-id="q"] b'));
}


/* ─── 9 · Statische Proben ──────────────────────────────────────────── */
console.log('\n9 · Statische Proben');
{
    // Jede $('id') im JS hat ein Element im HTML.
    const ids = [...new Set([...JS_CODE.matchAll(/\$\('([a-zA-Z][a-zA-Z0-9_]*)'\)/g)].map(m => m[1]))];
    const missing = ids.filter(i => !new RegExp('id="' + i + '"').test(HTML));
    ok('jede $(id) hat ein Element (' + ids.length + ')', missing.length === 0 && ids.length > 20, missing.join(', '));

    // Kein Ergebnisfeld ohne Schreibstelle.
    const outIds = [...HTML.matchAll(/id="(tkN[A-Z]\w*|tkProg\w+|tkStreak|tkTitle|tkSub|tkEmpty[TS])"/g)].map(m => m[1]);
    const dead = outIds.filter(i => !JS_CODE.includes("'" + i + "'"));
    ok('kein Anzeigefeld ohne Schreiber (' + outIds.length + ')', dead.length === 0 && outIds.length > 8, dead.join(', '));

    // Undefinierte Tokens.
    const src = CSS + HTML;
    const used = new Set([...src.matchAll(/var\(\s*(--[\w-]+)/g)].map(m => m[1]));
    const defd = new Set([...src.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map(m => m[1]));
    const undef = [...used].filter(x => !defd.has(x));
    ok('alle Tokens definiert (' + used.size + ')', undef.length === 0, undef.join(', '));

    ok('kein hartes Lila', !/#a855f7/i.test(HTML_CODE) && !/#a855f7/i.test(CSS_CODE));
    ok('kein weisser Hover-Schleier', !/hover[^{]*\{[^}]*rgba\(255,\s*255,\s*255/i.test(CSS_CODE));
    ok('keine Entrance-Animation ab opacity 0 (LCP-Falle)', !/@keyframes/.test(CSS_CODE));
    ok('font-family: inherit fuer Bedienelemente', /button, input, select, textarea \{ font-family: inherit; \}/.test(HTML));
    ok('Schrift ist die der App', /Plus\+Jakarta\+Sans/.test(HTML) && !/family=Inter/.test(HTML));
    ok('Sidebar/Detail sind deckend (kein Alpha-Token)', /--bg-side: #[0-9a-f]{6};/.test(HTML) && /--bg-panel: #[0-9a-f]{6};/.test(HTML));

    // i18n: kein gemischter Textknoten (Element + nackter Text im selben Elternteil).
    const w = boot(base());
    const mixed = [];
    w.document.body.querySelectorAll('*').forEach(el => {
        if (el.closest('script,style,svg,template')) return;
        const k = [...el.childNodes];
        if (k.some(x => x.nodeType === 1) && k.some(x => x.nodeType === 3 && x.textContent.trim().length > 1)) mixed.push(el.tagName + '.' + el.className);
    });
    ok('kein gemischter Textknoten im gerenderten DOM (i18n)', mixed.length === 0, mixed.join(', '));

    // Die .tk-sub-Lehre: kein Element mit reinem Textinhalt ist Grid/Flex.
    const gridClasses = new Set([...CSS_CODE.matchAll(/\.([a-zA-Z][\w-]*)\s*\{[^}]*display:\s*(?:grid|flex|inline-flex)/g)].map(m => m[1]));
    const textOnly = [...w.document.body.querySelectorAll('*')].filter(el =>
        el.childNodes.length === 1 && el.firstChild.nodeType === 3 && el.textContent.trim().length > 3
        && [...el.classList].some(c => gridClasses.has(c)));
    ok('kein reiner Textknoten in einem Grid-/Flex-Container (' + gridClasses.size + ' Container-Klassen)', textOnly.length === 0,
        textOnly.map(e => e.className + ': ' + e.textContent.trim().slice(0, 30)).join(' | '));
    ok('es gibt ueberhaupt Container-Klassen zu pruefen', gridClasses.size > 10);

    // Modifikator NACH der Basis: `.tk-fname--note { font-weight: 400 }` vor
    // `.tk-fname { font-weight: 600 }` verliert bei gleicher Spezifitaet — kein
    // Fehler, kein Log, nur fette Notizen. Beim Bau von v7.2.1 zweimal passiert
    // (.tk-fname--note, .tk-seg--kind). Fuer jede Regel `.x--mod {` muss die
    // letzte Regel `.x {` davor stehen.
    // Basisname: Woerter mit EINFACHEM Bindestrich und optionalem __element; `\w` allein kennt kein `-`.
    const BASE = '[a-zA-Z]\\w*(?:-\\w+)*(?:__\\w+(?:-\\w+)*)?';
    const baseLast = {}, modFirst = {};
    for (const m of CSS_CODE.matchAll(new RegExp('^\\s*\\.(' + BASE + ') \\{', 'gm'))) baseLast[m[1]] = m.index;
    for (const m of CSS_CODE.matchAll(new RegExp('^\\s*\\.(' + BASE + ')(--[\\w-]+) \\{', 'gm'))) if (!(m[1] + m[2] in modFirst)) modFirst[m[1] + m[2]] = { base: m[1], at: m.index };
    const early = Object.keys(modFirst).filter(k => baseLast[modFirst[k].base] != null && modFirst[k].at < baseLast[modFirst[k].base]);
    ok('jeder Modifikator steht nach seiner Basisregel (' + Object.keys(modFirst).length + ' Modifikatoren)', early.length === 0, early.join(', '));
    ok('es gibt ueberhaupt Modifikatoren mit Basisregel zu pruefen', Object.keys(modFirst).filter(k => baseLast[modFirst[k].base] != null).length >= 3);

    // Reminder: kein nackter new Notification() ausserhalb von try.
    const naked = [...JS_CODE.matchAll(/new Notification\(/g)].length;
    const guarded = [...JS_CODE.matchAll(/try \{ new Notification\(/g)].length;
    ok('new Notification() nur in try/catch (' + naked + ')', naked > 0 && naked === guarded);
}

/* ─── 10 · Notizen: zweite Sorte, zaehlt nirgends ───────────────────── */
console.log('\n10 · Notizen zaehlen nirgends mit und wandeln sich verlustfrei um');
{
    const s = base();
    s.mwl_tasks_notes = [
        { id: 'n1', text: 'Brush-PC ansehen', createdAt: TODAY + 'T08:00:00' },
        { id: 'n2', text: 'Erste Zeile\nzweite Zeile', createdAt: TODAY + 'T08:01:00' }
    ];
    const w = boot(s);
    const type = text => { const i = q(w, '#tkAdd'); i.value = text; i.dispatchEvent(new w.Event('input', { bubbles: true })); return i; };
    const key = (k, extra = {}) => q(w, '#tkAdd').dispatchEvent(new w.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true }, extra)));
    const notesLS = () => JSON.parse(w.localStorage.getItem('mwl_tasks_notes'));

    // Heute: Notizen sind da, aber in keiner Zahl.
    ok('Notiz-Zeilen stehen unter Heute', qa(w, '.tk-row--note').length === 2);
    ok('Notizen stehen ZULETZT (nach Heute erledigt)', /Notizen/.test(secs(w)[secs(w).length - 1]), secs(w).join(' | '));
    ok('Notiz-Zeile hat keinen Haken', !q(w, '.tk-row--note .tk-check') && !!q(w, '.tk-row--note .tk-row__glyph svg'));
    ok('Fortschritt bleibt 1 von 4 (Notizen zaehlen nicht)', q(w, '#tkProgDone').textContent === '1' && q(w, '#tkProgTotal').textContent === '4');
    ok('Sidebar: Heute 3 unveraendert, Notizen 2', q(w, '#tkNToday').textContent === '3' && q(w, '#tkNNotes').textContent === '2');
    ok('Zeilenumbruch bleibt als Text erhalten', q(w, '.tk-row[data-id="n2"] .tk-row__name').textContent === 'Erste Zeile\nzweite Zeile');

    // Abhaken einer Notiz per Leertaste ist ein No-op.
    click(w, '.tk-row[data-id="n1"]');
    ok('Klick oeffnet das Notiz-Formular, nicht das Aufgaben-Formular', q(w, '#tkFNoteForm').hidden === false && q(w, '#tkFTask').hidden === true);
    ok('Art-Schalter zeigt Notiz', q(w, '#tkDetailKindSw [data-kind="note"]').getAttribute('aria-pressed') === 'true');
    ok('Text im Formular', q(w, '#tkFNoteText').value === 'Brush-PC ansehen');
    w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    ok('Leertaste erzeugt keinen Erledigt-Zustand fuer eine Notiz', !JSON.parse(w.localStorage.getItem('mwl_tasks_states')).n1 && JSON.parse(w.localStorage.getItem('mwl_tasks_stats')).done === 34);

    // Notiz → Aufgabe: erste Zeile wird Name, Rest Notiztext, Eingang, kein Datum.
    click(w, '.tk-row[data-id="n2"]');
    click(w, '#tkDetailKindSw [data-kind="task"]');
    const inbox = JSON.parse(w.localStorage.getItem('mwl_tasks_cats')).find(c => c.id === 'cat_inbox');
    const t2 = inbox && inbox.tasks.find(x => x.id === 'n2');
    ok('Notiz wurde Aufgabe im Eingang', !!t2);
    ok('erste Zeile ist der Name, der Rest die Notiz', t2 && t2.name === 'Erste Zeile' && t2.note === 'zweite Zeile');
    ok('ohne Datum, Berichtsheft-Form (days-Array)', t2 && t2.due === '' && Array.isArray(t2.days));
    ok('aus den Notizen verschwunden', !notesLS().some(n => n.id === 'n2') && notesLS().length === 1);
    ok('Detail zeigt jetzt das Aufgaben-Formular, Auswahl bleibt', q(w, '#tkFTask').hidden === false && q(w, '.tk-row[data-id="n2"]').classList.contains('is-sel'));

    // Aufgabe → Notiz: Name, Unteraufgaben und Notiztext werden Zeilen; Flag weg.
    const cs = JSON.parse(w.localStorage.getItem('mwl_tasks_cats'));
    const c1 = cs.find(c => c.id === 'c1');   // der Eingang steht inzwischen vorn
    c1.tasks.find(x => x.id === 'dueT').subtasks = [{ name: 'Teil A', done: false }];
    c1.tasks.find(x => x.id === 'dueT').note = 'Merke dir das';
    w.localStorage.setItem('mwl_tasks_cats', JSON.stringify(cs));
    w.dispatchEvent(new w.StorageEvent('storage', { key: 'mwl_tasks_cats' }));
    click(w, '.tk-row[data-id="dueT"]');
    click(w, '#tkDetailKindSw [data-kind="note"]');
    const nn = notesLS().find(n => n.id === 'dueT');
    ok('Aufgabe wurde Notiz', !!nn);
    ok('Text = Name, Unteraufgabe, Leerzeile, Notiz', nn && nn.text === 'Heute fällig\n– Teil A\n\nMerke dir das', nn && JSON.stringify(nn.text));
    ok('aus der Liste verschwunden', !JSON.parse(w.localStorage.getItem('mwl_tasks_cats')).some(c => c.tasks.some(x => x.id === 'dueT')));
    // over + rout + die aus n2 gewordene Aufgabe (ohne Datum → Heute) = 3 offen, mit doneT 4 gesamt; dueT zaehlt als Notiz nicht mehr.
    ok('Heute zaehlt 3, Fortschritt 1 von 4 — die Notiz fehlt in beiden', q(w, '#tkNToday').textContent === '3' && q(w, '#tkProgTotal').textContent === '4',
        q(w, '#tkNToday').textContent + ' / ' + q(w, '#tkProgTotal').textContent);

    // Schnelleingabe: Shift+Enter und der Umschalter machen Notizen; Enter in Heute weiterhin Aufgaben.
    type('Passwort läuft im Oktober ab');
    key('Enter', { shiftKey: true });
    ok('Shift+Enter legt eine Notiz an (vorne)', notesLS()[0].text === 'Passwort läuft im Oktober ab');
    ok('keine Aufgabe daraus', !JSON.parse(w.localStorage.getItem('mwl_tasks_cats')).some(c => c.tasks.some(t => t.name === 'Passwort läuft im Oktober ab')));
    click(w, '#tkAddKind');
    ok('Umschalter gedrueckt, Platzhalter sagt Notiz', q(w, '#tkAddKind').getAttribute('aria-pressed') === 'true' && q(w, '#tkAdd').placeholder === 'Notiz hinzufügen');
    type('Schlüssel liegt bei Frau Müller');
    ok('Chip sagt Notiz statt Faelligkeit', qa(w, '.tk-hint').length === 1 && /Notiz/.test(q(w, '.tk-hint').textContent));
    key('Enter');
    ok('Enter im Notiz-Modus legt eine Notiz an', notesLS()[0].text === 'Schlüssel liegt bei Frau Müller');
    ok('Modus faellt danach auf Aufgabe zurueck', q(w, '#tkAddKind').getAttribute('aria-pressed') === 'false' && q(w, '#tkAdd').placeholder === 'Aufgabe hinzufügen');

    // Ansicht Notizen: festgestellt, kein Fortschritt, Enter = Notiz.
    click(w, '[data-view="notes"]');
    ok('Ansicht Notizen: Umschalter festgestellt', q(w, '#tkAddKind').disabled === true && q(w, '#tkAddKind').getAttribute('aria-pressed') === 'true');
    ok('kein Fortschrittsbalken, keine Ueberschrift, alle Notizen als Zeilen', q(w, '#tkProg').hidden === true && secs(w).length === 0 && qa(w, '.tk-row--note').length === notesLS().length);
    type('Noch eine'); key('Enter');
    ok('Enter in der Ansicht Notizen legt eine Notiz an', notesLS()[0].text === 'Noch eine');

    // Loeschen mit Rueckgaengig, Export traegt die Notizen.
    const before = notesLS().length;
    click(w, '.tk-row[data-id="n1"]');
    click(w, '[data-a="deldetail"]');
    ok('Notiz geloescht', notesLS().length === before - 1 && !notesLS().some(n => n.id === 'n1'));
    click(w, '.tk-toast__undo');
    ok('Rueckgaengig stellt sie wieder her', notesLS().length === before && notesLS().some(n => n.id === 'n1'));
    ok('Export nennt die Notizen', /notes: notes/.test(JS_CODE) && /d\.notes/.test(JS_CODE));

    // Das Berichtsheft liest nur mwl_tasks_cats — Notizen liegen woanders.
    const ais = readFileSync(new URL('../Assets/js/berichtsheft/ais-studio.js', import.meta.url), 'utf8');
    ok('Berichtsheft kennt den Notiz-Schluessel nicht (liest ihn also nie als Aufgaben)', !ais.includes('mwl_tasks_notes'));
    ok('es gibt ueberhaupt Notizen zu pruefen', notesLS().length > 3);

    // Leerzustand: Heute ohne Aufgaben, aber mit Notizen → kompakt, ueber den Notizen.
    const w2 = boot({ mwl_tasks_cats: [], mwl_tasks_notes: [{ id: 'x', text: 'Nur eine Notiz', createdAt: TODAY }], mwl_tasks_lastReset: NOW.toDateString() });
    ok('Leerzustand kompakt, Notiz darunter sichtbar', q(w2, '#tkEmpty').hidden === false && q(w2, '#tkEmpty').classList.contains('is-compact') && qa(w2, '.tk-row--note').length === 1);
    ok('Leerzustand steht im DOM vor der Liste', q(w2, '#tkEmpty').compareDocumentPosition(q(w2, '#tkList')) & 4);
}

console.log('\n' + (fail ? `✗ ${fail} von ${pass + fail} Pruefungen fehlgeschlagen` : `✓ ${pass}/${pass + fail}`));
process.exit(fail ? 1 : 0);
