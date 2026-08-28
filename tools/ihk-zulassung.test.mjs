// ═══ IHK-ANSICHT TEST ═══
//
// Warum es diesen Test gibt — drei Fehlerklassen, die alle drei symptomlos sind:
//
// 1. DIE FEHLQUOTE TEILTE DURCH KALENDERTAGE. Bis v6.3.17 rechnete die Ansicht
//    `sickDays / vergangene Kalendertage`. Bei einer Fuenf-Tage-Woche sind das
//    rund 40 % zu viel im Nenner — die Quote sah harmlos aus, wo sie es nicht
//    war, und im Screenshot ist eine zu kleine Prozentzahl von einer richtigen
//    nicht zu unterscheiden. Der Nenner sind AUSBILDUNGSTAGE.
//
// 2. EIN HAKEN, DEN NIEMAND AUSLIEST, UND EIN FELD, DAS NIEMAND BESCHREIBT.
//    Die Vorgaenger-Ansicht hatte drei Audit-Karten mit fest eingebautem "OK"
//    im Markup (CLAUDE.md). Deshalb pruefen die statischen Faelle hier: jedes
//    Feld, dessen Inhalt ein ERGEBNIS ist, braucht eine Schreibstelle in
//    ihk.js, und jedes Eingabefeld braucht einen Leser in saveIHKSettings().
//
// 3. "NICHT MESSBAR" DARF NICHT GRUEN WERDEN. Die Eintragung ins Verzeichnis
//    der Berufsausbildungsverhaeltnisse kann diese Seite nicht wissen. Sie
//    steht deshalb als offen da, bis der Nutzer sie selbst bestaetigt — ein
//    plausibles Ergebnis ist hier schlimmer als eine Luecke.
//
// Lauf: node tools/ihk-zulassung.test.mjs
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FEHLT ' + n)); };
const eq = (n, a, b) => ok(n + '  (' + a + ' = ' + b + ')', a === b);

const JS     = readFileSync('components/ihk/ihk.js', 'utf8');
const CSS    = readFileSync('components/ihk/ihk.css', 'utf8');
const MARKUP = readFileSync('components/ihk/ihk.html', 'utf8');

// ── Sandbox ──────────────────────────────────────────────────────────────────
// `new Date()` muss steuerbar sein, sonst haengt jede Fristenrechnung am
// Kalender des Rechners und der Test wird irgendwann von allein rot.
function fixedDateClass(isoNow) {
    const FIXED = new Date(isoNow + 'T12:00:00').getTime();
    return class extends Date {
        constructor(...a) { if (a.length === 0) super(FIXED); else super(...a); }
        static now() { return FIXED; }
    };
}

function boot({ now, settings, entries }) {
    const dom = new JSDOM(
        '<!doctype html><html lang="de"><body><main>' + MARKUP + '</main></body></html>',
        { pretendToBeVisual: true });
    const doc = dom.window.document;
    const data = { entries: entries || [], settings };

    const store = new Map();
    const localStorage = {
        getItem: k => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v))
    };

    const build = new Function(
        'data', 'document', 'window', 'localStorage', 'Date',
        'mwlLocale', 'getJobHours', 'mwlIcon', 'getTypeRgb', 'getTypeLabel', 'save',
        JS + '\nreturn { ihkComputeFacts, ihkCriteria, ihkStations, renderIHKView, saveIHKSettings, ihkRel };'
    );
    const api = build(
        data, doc, dom.window, localStorage, fixedDateClass(now),
        () => 'de-DE',
        (job, day) => (settings.hours || [])[day] || 0,
        () => '<svg></svg>',
        () => '148,163,184',
        t => t,
        () => {}
    );
    return { ...api, doc, data, store };
}

const BASE_HOURS = [0, 8, 8, 8, 8, 8, 0];   // Mo–Fr
// 🔴 NICHT toISOString(): das rechnet nach UTC und schiebt in Europa jedes
// lokale Mitternachtsdatum auf den Vortag — der Test hat sich damit selbst
// eine Woche verschoben und dann nichts mehr gefunden.
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
                 + '-' + String(d.getDate()).padStart(2, '0');

// Wochentage im Zeitraum als Eintraege erzeugen; `overrides` setzt einzelne Tage.
function weekdayEntries(fromIso, toIso, overrides = {}) {
    const out = [];
    for (let d = new Date(fromIso + 'T00:00:00'); d <= new Date(toIso + 'T00:00:00'); d.setDate(d.getDate() + 1)) {
        const dow = d.getDay();
        if (dow === 0 || dow === 6) continue;
        const key = iso(d);
        const type = overrides[key] || 'work';
        out.push({ date: key, type, worked: 8, expected: 8, diff: 0 });
    }
    return out;
}

const cfg = extra => ({
    hours: BASE_HOURS,
    ihk: Object.assign({
        start: '2025-01-06', end: '2026-01-02',
        exam_zwischen: '', exam_abschluss: '', note_zwischen: '', note_abschluss: ''
    }, extra || {}),
    school: { grades: {} }
});

// ═══════════════════════════════════════════════════════════════════════════
console.log('\nFehlquote — Nenner sind Ausbildungstage, nicht Kalendertage');

{
    const sick = { '2025-01-08': 'sick', '2025-01-09': 'sick', '2025-02-04': 'sick',
                   '2025-02-05': 'sick', '2025-02-06': 'sick' };
    const hol  = { '2025-01-01': 'holiday' };
    const entries = weekdayEntries('2025-01-06', '2025-02-28', Object.assign({}, sick, hol));
    const t = boot({ now: '2025-03-03', settings: cfg(), entries });
    const f = t.ihkComputeFacts();

    // Mo–Fr vom 06.01. bis 03.03.2025 = 41 Werktage, keine Feiertage im Zeitraum
    eq('Ausbildungstage werden gezaehlt, nicht Kalendertage', f.ausbTage, 41);
    eq('Krankheitstage', f.sickDays, 5);
    ok('Quote = krank / Ausbildungstage', Math.abs(f.absPct - (5 / 41) * 100) < 0.001);

    // Die alte, falsche Rechnung waere krank / Kalendertage — sie muss sich
    // messbar unterscheiden, sonst prueft der Test nichts.
    const kalender = Math.round((new Date('2025-03-03') - new Date('2025-01-06')) / 86400000);
    ok('unterscheidet sich sichtbar von der Kalendertag-Rechnung ('
       + f.absPct.toFixed(1) + ' % statt ' + ((5 / kalender) * 100).toFixed(1) + ' %)',
       f.absPct - (5 / kalender) * 100 > 3);
}

{
    // Feiertage und Urlaub sind keine Ausbildungstage und muessen aus dem
    // Nenner fallen — sonst verduennen sie die Quote.
    const marks = {};
    for (const d of ['2025-01-06', '2025-01-07', '2025-01-08']) marks[d] = 'vacation';
    marks['2025-01-09'] = 'holiday';
    marks['2025-01-10'] = 'sick';
    // Zeitraum 06.01.–13.01.: sechs Tage mit Sollzeit (Mo–Fr plus der heutige
    // Montag). Drei Urlaubstage und ein Feiertag fallen heraus, es bleiben zwei.
    const t = boot({ now: '2025-01-13', settings: cfg(), entries: weekdayEntries('2025-01-06', '2025-01-10', marks) });
    const f = t.ihkComputeFacts();
    eq('Urlaub und Feiertag fallen aus dem Nenner', f.ausbTage, 2);
    eq('Quote = 1 von 2', Math.round(f.absPct), 50);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\nAusbildungsnachweis — Luecken');

{
    // Beginn an einem SONNTAG. Der Montag der Kalenderwoche liegt damit vor dem
    // ersten Ausbildungstag; diese Woche kann keinen Eintrag haben und wurde
    // frueher trotzdem als Luecke gezaehlt.
    const t = boot({
        now: '2025-03-03',
        settings: cfg({ start: '2025-01-05' }),
        entries: weekdayEntries('2025-01-06', '2025-02-28')
    });
    const f = t.ihkComputeFacts();
    eq('kein Phantom-Loch in der angebrochenen ersten Woche', f.gaps.length, 0);
    ok('Wochen werden ueberhaupt gezaehlt', f.weeksTotal >= 7);
}

{
    const marks = {};
    // eine komplette Woche herausnehmen (10.–14.02.2025)
    const entries = weekdayEntries('2025-01-06', '2025-02-28', marks)
        .filter(e => !(e.date >= '2025-02-10' && e.date <= '2025-02-14'));
    const t = boot({ now: '2025-03-03', settings: cfg(), entries });
    const f = t.ihkComputeFacts();
    eq('genau eine Luecke gefunden', f.gaps.length, 1);
    eq('Luecke ist als Kalenderwoche benannt', f.gaps[0].label, 'KW 7/25');

    const crit = t.ihkCriteria(f).find(c => c.id === 'ihkCrit2b');
    eq('Nachweis-Kriterium schlaegt an', crit.state, 'warn');
}

{
    const t = boot({ now: '2025-03-03', settings: cfg(), entries: weekdayEntries('2025-01-06', '2025-02-28') });
    const crit = t.ihkCriteria(t.ihkComputeFacts()).find(c => c.id === 'ihkCrit2b');
    eq('luckenlos = erfuellt', crit.state, 'ok');
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n§ 43 Abs. 1 BBiG — die vier Punkte');

{
    // Nr. 1: Vertragsende hoechstens zwei Monate nach dem Pruefungstermin.
    // Nur pruefbar, weil Pruefungstermin und Vertragsende getrennte Felder sind.
    const nah = boot({ now: '2025-06-01', settings: cfg({ exam_abschluss: '2025-11-10', end: '2025-12-31' }) });
    const weit = boot({ now: '2025-06-01', settings: cfg({ exam_abschluss: '2025-11-10', end: '2026-03-31' }) });
    eq('Ende innerhalb der Frist → erfuellt',
       nah.ihkCriteria(nah.ihkComputeFacts()).find(c => c.id === 'ihkCrit1').state, 'ok');
    eq('Ende mehr als zwei Monate danach → Hinweis',
       weit.ihkCriteria(weit.ihkComputeFacts()).find(c => c.id === 'ihkCrit1').state, 'warn');
}

{
    // Nr. 3: nicht messbar. Ohne Bestaetigung NIE gruen.
    const t = boot({ now: '2025-06-01', settings: cfg() });
    const c = t.ihkCriteria(t.ihkComputeFacts()).find(x => x.id === 'ihkCrit3');
    eq('Eintragung ohne Bestaetigung bleibt offen', c.state, 'open');
    ok('und sagt, dass sie nicht messbar ist', /nicht messbar/i.test(c.text));

    const t2 = boot({ now: '2025-06-01', settings: cfg({ eingetragen: true }) });
    eq('mit Bestaetigung erfuellt',
       t2.ihkCriteria(t2.ihkComputeFacts()).find(x => x.id === 'ihkCrit3').state, 'ok');
}

{
    // Nr. 2 erste Bedingung: eine eingetragene Note belegt die Teilnahme,
    // sonst muss der Nutzer bestaetigen.
    const mitNote = boot({ now: '2025-12-01', settings: cfg({ exam_zwischen: '2025-09-24', note_zwischen: '2.3' }) });
    const ohne    = boot({ now: '2025-12-01', settings: cfg({ exam_zwischen: '2025-09-24' }) });
    const a = mitNote.ihkCriteria(mitNote.ihkComputeFacts()).find(c => c.id === 'ihkCrit2a');
    const b = ohne.ihkCriteria(ohne.ihkComputeFacts()).find(c => c.id === 'ihkCrit2a');
    eq('Note belegt die Teilnahme', a.state, 'ok');
    eq('ohne Note: offen', b.state, 'open');
    ok('und bietet die Bestaetigung an', b.confirm === true);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\nStationen & Probezeit');

{
    const t = boot({ now: '2025-06-01', settings: cfg({ probeMonths: 4 }) });
    const f = t.ihkComputeFacts();
    eq('Probezeit endet am Vortag des Monatsjubilaeums', iso(f.probeEnd), '2025-05-05');

    const st = t.ihkStations(f);
    ok('Stationen sind chronologisch', st.every((s, i) => i === 0 || st[i - 1].date <= s.date));
    eq('genau eine Station ist die naechste', st.filter(s => s.state === 'next').length, 1);
    ok('alles vor heute ist erledigt', st.filter(s => s.date < f.today).every(s => s.state === 'done'));
}

{
    // Monatsueberlauf: 31.10. + 1 Monat darf nicht auf den 01.12. rutschen.
    const t = boot({ now: '2025-12-01', settings: cfg({ start: '2025-10-31', probeMonths: 1 }) });
    eq('Ueberlauf wird geklemmt', iso(t.ihkComputeFacts().probeEnd), '2025-11-29');
}

{
    // Faellt der Pruefungstermin auf das Vertragsende, darf nicht zweimal
    // dieselbe Marke an derselben Stelle stehen.
    const t = boot({ now: '2025-06-01', settings: cfg({ exam_abschluss: '2026-01-02' }) });
    const st = t.ihkStations(t.ihkComputeFacts());
    eq('gleiche Daten werden zu einer Station', new Set(st.map(s => +s.date)).size, st.length);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\nFormular — jedes Feld hat einen Leser und einen Schreiber');

{
    const ids = [...MARKUP.matchAll(/id="(confIHK[A-Za-z]+)"/g)].map(m => m[1]);
    ok('Formularfelder gefunden (' + ids.length + ')', ids.length >= 7);
    ids.forEach(id => {
        const gelesen    = JS.includes("v('" + id + "')");
        const vorbelegt  = JS.includes("'" + id + "'");
        ok(id + ' wird in saveIHKSettings gelesen', gelesen);
        ok(id + ' wird beim Rendern vorbelegt', vorbelegt);
    });
}

{
    // Jedes Feld, dessen Inhalt ein ERGEBNIS ist, muss nach dem Rendern etwas
    // anderes zeigen als seinen Platzhalter. Bewusst GEMESSEN statt gegrept:
    // die Ids entstehen teils aus zusammengesetzten Namen ($ihk(c.id + 'Val')),
    // die ein grep nie findet — und ein Feld, das niemand beschreibt, faellt
    // sonst nie auf (CLAUDE.md, Audit-Karten mit eingebautem "OK").
    const t = boot({
        now: '2025-03-03',
        settings: Object.assign(cfg({ exam_zwischen: '2025-02-12', note_zwischen: '2.3',
                        exam_abschluss: '2025-11-10', note_abschluss: '1.7' }),
                        { school: { grades: { 'IT-Systeme': [2.0, 1.7] } } }),
        entries: weekdayEntries('2025-01-06', '2025-02-28', { '2025-01-08': 'sick' })
    });
    const platzhalter = [...t.doc.querySelectorAll('[id]')]
        .filter(el => el.children.length === 0 && /^(—|0 %)$/.test(el.textContent.trim()))
        .map(el => el.id);
    t.renderIHKView();
    const sichtbar = id => { let n = t.doc.getElementById(id); while (n) { if (n.hidden) return false; n = n.parentElement; } return true; };
    const stumm = platzhalter.filter(id => sichtbar(id) && /^(—|0 %)$/.test(t.doc.getElementById(id).textContent.trim()));
    ok('Platzhalter im Markup gefunden (' + platzhalter.length + ')', platzhalter.length >= 8);
    eq('kein Ergebnisfeld bleibt beim Platzhalter stehen', stumm.join(', ') || '(keins)', '(keins)');
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\nOberflaeche — die Altlasten der Vorgaengerfassung');

{
    // 🔴 Erst Kommentare strippen, DANN behaupten. Die Dateikoepfe zaehlen auf,
    // was bewusst nicht mehr drinsteht ("kein @import", "nicht ueber
    // requestAnimationFrame") — ein Test gegen die rohe Quelle findet seine
    // eigene Erklaerung und faellt durch, obwohl der Code sauber ist. Genau
    // dieser Fall ist hier eingetreten.
    const cssNoComments  = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
    const jsNoComments   = JS.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const htmlNoComments = MARKUP.replace(/<!--[\s\S]*?-->/g, '');
    ok('kein @import fremder Schriften mehr in der CSS', !/@import/.test(cssNoComments));
    ok('kein hartes Dunkel-Fundament (#070810)', !cssNoComments.includes('#070810'));
    ok('Light-Theme wird bedient', /\[data-theme="light"\]/.test(cssNoComments));
    ok('keine Textzeichen als Icons im Markup',
       !/[▶▼◈ⓘ✓✗✖]/.test(htmlNoComments));
    ok('Pruefungstermin ist ein eigenes, bedienbares Feld',
       /id="confIHKExamAbschluss"/.test(htmlNoComments) && !/id="confIHKExamAbschluss"[^>]*disabled/.test(htmlNoComments));
    ok('Fortschritt haengt nicht an requestAnimationFrame',
       !/requestAnimationFrame/.test(jsNoComments));
    ok('jede Karte nennt ihre Herkunft', (htmlNoComments.match(/class="ihk-src/g) || []).length >= 5);
}

{
    // Rendern gegen das echte Markup — wirft es, faellt die ganze Ansicht aus.
    const t = boot({
        now: '2025-03-03',
        settings: cfg({ exam_zwischen: '2025-02-12', note_zwischen: '2.3', exam_abschluss: '2025-11-10' }),
        entries: weekdayEntries('2025-01-06', '2025-02-28', { '2025-01-08': 'sick' })
    });
    let threw = null;
    try { t.renderIHKView(); } catch (e) { threw = e; }
    ok('renderIHKView laeuft durch' + (threw ? ': ' + threw.message : ''), !threw);
    eq('Ansicht schaltet auf "eingerichtet"', t.doc.getElementById('view-ihk').dataset.ihkState, 'ready');
    ok('Kopfzeile traegt eine Aussage', /Tage? bis zur Abschlusspr/.test(t.doc.getElementById('ihkHeadLede').textContent));
    ok('Zeitband ist gefuellt', parseFloat(t.doc.getElementById('ihkBandFill').style.width) > 0);
    ok('Stationen sind gerendert', t.doc.getElementById('ihkStations').children.length >= 4);

    // Leerer Zustand: das Formular ist die Hauptsache, nicht ein Feld mit "---".
    const leer = boot({ now: '2025-03-03', settings: cfg({ start: '', end: '' }) });
    leer.renderIHKView();
    eq('ohne Daten: leerer Zustand', leer.doc.getElementById('view-ihk').dataset.ihkState, 'empty');
    ok('und der Inhalt bleibt weg', leer.doc.getElementById('ihkStack').hidden === true);
}

{
    // Speichern muss das Deckblatt des Berichtshefts nachziehen — sonst stehen
    // Beginn und Ende an zwei Stellen und driften auseinander.
    const t = boot({ now: '2025-03-03', settings: cfg() });
    t.renderIHKView();
    t.doc.getElementById('confIHKStart').value = '2025-01-06';
    t.doc.getElementById('confIHKEnd').value = '2026-01-02';
    t.doc.getElementById('confIHKExamAbschluss').value = '2025-11-10';
    t.saveIHKSettings();
    eq('Pruefungstermin wird getrennt gespeichert', t.data.settings.ihk.exam_abschluss, '2025-11-10');
    const p = JSON.parse(t.store.get('pdf_personal_cfg') || '{}');
    eq('Berichtsheft-Deckblatt zieht den Beginn nach', p.beginn, '2025-01-06');
    eq('… und das Ende', p.ende, '2026-01-02');
}

// ===========================================================================
console.log('\nNoten - Farbe und Wort duerfen sich nicht widersprechen');

{
    // Eine 2,3 heisst "gut". Faerbt man sie nach der Stufe 2,0 / 3,0 ein, steht
    // Bernstein neben dem Wort "gut" - beide Angaben sitzen vier Pixel
    // auseinander und widersprechen sich. Farbe und Wort kommen deshalb aus
    // derselben Tabelle (IHK_GRADE_BANDS).
    const paare = [[1.0,'sehr gut','good'], [1.4,'sehr gut','good'], [1.5,'gut','good'],
                   [2.3,'gut','good'], [2.4,'gut','good'], [2.5,'befriedigend','mid'],
                   [3.4,'befriedigend','mid'], [3.6,'ausreichend','mid'],
                   [4.6,'mangelhaft','bad'], [5.6,'ungenuegend','bad'], [6.0,'ungenuegend','bad']];
    paare.forEach(([n, wort, ton]) => {
        const t = boot({ now: '2026-01-05', settings: cfg({ exam_zwischen: '2025-06-02', note_zwischen: String(n) }) });
        t.renderIHKView();
        const gezeigt  = t.doc.getElementById('ihkGradeZWord').textContent;
        const gefaerbt = t.doc.getElementById('ihkGradeZ').getAttribute('data-tone');
        ok('Note ' + n.toFixed(1) + ' -> "' + gezeigt + '" / ' + gefaerbt,
           gezeigt.normalize('NFC') === wort.replace('ue','ü').replace('gruen','grün') && gefaerbt === ton);
    });

    // Die Marke sitzt auf der POSITION der Note, nicht auf einem Fuellstand:
    // die Vorgaengerfassung fuellte einen Balken zu (6 - n) / 5 und liess damit
    // eine Fuenf wie einen fast vollen Fortschritt aussehen.
    const t = boot({ now: '2026-01-05', settings: cfg({ exam_zwischen: '2025-06-02', note_zwischen: '3.5' }) });
    t.renderIHKView();
    const links = t.doc.getElementById('ihkGradeZMark').style.left;
    // jsdom normalisiert das calc() um, deshalb den Faktor herausrechnen statt
    // die Zeichenkette zu vergleichen.
    const faktor = parseFloat((links.match(/([0-9.]+)\s*\*|\*\s*([0-9.]+)/) || []).slice(1).find(Boolean));
    ok('Marke steht bei (n-1)/5 = 0,5 der Spur  (' + links + ')', Math.abs(faktor - 0.5) < 1e-6);
    const o = boot({ now: '2026-01-05', settings: cfg() });
    o.renderIHKView();
    ok('ohne Note keine Marke', o.doc.getElementById('ihkGradeZMark').hidden === true);
}

console.log('\n' + pass + ' ok, ' + fail + ' fehlend\n');
process.exit(fail ? 1 : 0);
