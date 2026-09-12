// ═══ BERUFSSCHULE — LEHRJAHRE ═══
//
// Warum es diesen Test gibt:
//
// 1. DER ALTBESTAND HAT KEINE JAHRES-DIMENSION. Bis v7.0.2 lagen alle Noten flach
//    unter school.grades. scNormalizeSchool() hebt sie ins 1. Lehrjahr und loescht
//    die flache Ablage — ein zweiter Schreiber darauf waere „zwei Regler auf einen
//    Zustand". Der Test stellt sicher, dass nach der Hebung KEINE Note fehlt und
//    dass ein aelterer Client, der flach nachschreibt, nichts ueberschreibt.
//
// 2. EINE TABELLE MIT EINER SPALTE JE JAHR IST DIE PHANTOMSPALTEN-FALLE (CLAUDE.md):
//    Kopf und Zeile muessen exakt gleich viele Zellen haben — sonst rutscht alles
//    hinter der ersten `1fr`-Spalte, ohne dass eine Regel es erklaert.
//
// 3. „+ NOTE" HAT BIS v7.0.2 GETIPPTE NOTEN GELOESCHT: die Karten wurden aus `data`
//    neu gezeichnet, ohne die Felder vorher einzusammeln. Hier steht die Gegenprobe.
//
// Lauf: node tools/school-lehrjahre.test.mjs
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FEHLT ' + n)); };
const eq = (n, a, b) => ok(n + '  (' + a + ' = ' + b + ')', a === b);

const lf = s => s.split('\r\n').join('\n');
const JS     = lf(readFileSync('components/school/school.js', 'utf8'));
const MARKUP = lf(readFileSync('components/school/school.html', 'utf8'));
const CSS    = lf(readFileSync('components/school/school.css', 'utf8'));

// ── Sandbox ──────────────────────────────────────────────────────────────────
function boot({ school, lang = 'de', lehrjahr = null } = {}) {
    const dom = new JSDOM(
        '<!doctype html><html lang="' + lang + '"><body><main>' + MARKUP + '</main></body></html>',
        { pretendToBeVisual: true });
    const doc = dom.window.document;
    const data = { entries: [], settings: { school } };
    const store = new Map();
    const localStorage = {
        getItem: k => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: k => store.delete(k)
    };
    const calls = { save: 0, confirm: [], prompt: [], message: [], toast: [] };
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const build = new Function(
        'data', 'document', 'window', 'localStorage', 'CSS', 'esc', 'mwlIconFromEmoji', 'mwlLocale',
        'save', 'showCustomConfirm', 'showCustomPrompt', 'showCustomMessage', 'showToast', 'ihkLehrjahrHeute',
        JS + '\nreturn { scNormalizeSchool, scYears, scNextYear, scGradesOf, schoolAllGrades, schoolYearsWithGrades,'
           + ' scScope, setSchoolScope, renderSchoolGradesInputs, calculateSchoolKPIs, addSchoolGrade, addNewSchoolSubject,'
           + ' saveSchoolGrades, moveSchoolSubject, copySchoolSubjects, addSchoolYear, removeSchoolYear, scCollectInputs };'
    );
    const api = build(
        data, doc, dom.window, localStorage, { escape: s => s.replace(/"/g, '\\"') }, esc,
        v => v, () => (lang === 'en' ? 'en-US' : 'de-DE'),
        () => { calls.save++; },
        (title, msg, onConfirm) => { calls.confirm.push(title); onConfirm(); },       // bestaetigt immer
        async (title, msg, def) => { calls.prompt.push(title); return def; },
        (title) => { calls.message.push(title); },
        (title) => { calls.toast.push(title); },
        lehrjahr ? (() => ({ lehrjahr, years: 3 })) : undefined
    );
    return { ...api, doc, data, store, calls };
}

const legacy = () => ({ grades: { 'IT-Systeme': ['2.0', '1.7'], 'Deutsch': ['3.0'], 'Leer': [] } });

// ═══════════════════════════════════════════════════════════════════════════
console.log('\nSpeicher — Altbestand heben, Struktur absichern');

{
    const t = boot({ school: legacy() });
    const s = t.scNormalizeSchool(t.data.settings);
    ok('flaches grades ist nach der Hebung weg', !('grades' in s));
    eq('alles liegt im 1. Lehrjahr', JSON.stringify(t.scYears()), '[1]');
    eq('keine Note verloren', JSON.stringify(t.scGradesOf(1)['IT-Systeme']), '["2.0","1.7"]');
    eq('leeres Fach bleibt als Fach erhalten', Array.isArray(t.scGradesOf(1)['Leer']), true);
    eq('Hebung ist idempotent', JSON.stringify(t.scNormalizeSchool(t.data.settings)), JSON.stringify(s));
}

{
    const t = boot({ school: undefined });
    t.scNormalizeSchool(t.data.settings);
    eq('frischer Speicher: 1. Lehrjahr mit Vorgabe-Faechern', Object.keys(t.scGradesOf(1)).length, 4);
    eq('… und nichts darueber hinaus', t.scYears().length, 1);
}

{
    // Aelterer Client hat nach der Umstellung flach nachgeschrieben: je Fach gewinnt
    // die Liste mit Noten, ein neues Fach kommt dazu, nichts wird ueberschrieben.
    const t = boot({ school: {
        years: { '1': { grades: { 'IT-Systeme': ['1.0'], 'Ohne': [] } }, '2': { grades: { 'Mathe': ['2.0'] } } },
        grades: { 'IT-Systeme': ['5.0', '5.0'], 'Ohne': ['2.5'], 'Neu': ['3.3'] }
    } });
    t.scNormalizeSchool(t.data.settings);
    eq('Fach mit Noten im Jahr bleibt unangetastet', JSON.stringify(t.scGradesOf(1)['IT-Systeme']), '["1.0"]');
    eq('Fach ohne Noten im Jahr uebernimmt den Altbestand', JSON.stringify(t.scGradesOf(1)['Ohne']), '["2.5"]');
    eq('unbekanntes Fach kommt ins 1. Lehrjahr', JSON.stringify(t.scGradesOf(1)['Neu']), '["3.3"]');
    eq('2. Lehrjahr unberuehrt', JSON.stringify(t.scGradesOf(2)), '{"Mathe":["2.0"]}');
}

{
    const t = boot({ school: { years: { '1': { grades: {} }, 'x': {}, '0': {}, '3': { grades: { 'A': 'kaputt' } } } } });
    t.scNormalizeSchool(t.data.settings);
    eq('ungueltige Schluessel fliegen raus', JSON.stringify(t.scYears()), '[1,3]');
    eq('kaputte Notenliste wird zum leeren Array', JSON.stringify(t.scGradesOf(3)['A']), '[]');
    eq('naechstes Lehrjahr fuellt die Luecke', t.scNextYear(), 2);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\nKennzahlen — je Lehrjahr und ueber alle');

const zwei = () => ({ years: {
    '1': { grades: { 'IT-Systeme': ['3.0', '3.0'], 'Deutsch': ['2.0'] } },
    '2': { grades: { 'IT-Systeme': ['2.0', '2.0'], 'Englisch': ['1.0'] } }
} });

{
    const t = boot({ school: zwei() });
    const k1 = t.calculateSchoolKPIs(1), k2 = t.calculateSchoolKPIs(2), ka = t.calculateSchoolKPIs('all');
    eq('Schnitt 1. Lehrjahr', k1.overallAvg.toFixed(2), '2.67');
    eq('Schnitt 2. Lehrjahr', k2.overallAvg.toFixed(2), '1.67');
    eq('Schnitt ueber alle = alle 6 Noten', ka.overallAvg.toFixed(2), '2.17');
    eq('schoolAllGrades liefert alle 6', t.schoolAllGrades().length, 6);
    eq('zwei Lehrjahre mit Noten', t.schoolYearsWithGrades(), 2);
    eq('bestes Fach ueber alle: Englisch', ka.bestSubject, 'Englisch');
    ok('Trend ueber die Jahre: IT-Systeme 3,0 → 2,0 ist eine Verbesserung', /is-up/.test(ka.gradeRowsHTML) && /IT-Systeme/.test(ka.gradeRowsHTML));
    ok('Trend im Jahr: IT-Systeme 3,0/3,0 ist flach', !/is-up|is-down/.test(k1.gradeRowsHTML));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\nAnsicht — Leiste, Reiter, Tabelle');

{
    const t = boot({ school: zwei(), lehrjahr: 2 });
    t.renderSchoolGradesInputs();
    const chips = [...t.doc.querySelectorAll('#schoolYearBar [data-scope]')].map(b => b.dataset.scope);
    eq('Leiste: 1, 2 und „alle"', JSON.stringify(chips), '["1","2","all"]');
    eq('Voreinstellung ist das laufende Lehrjahr (IHK)', t.scScope(), 2);
    eq('laufendes Lehrjahr ist markiert', t.doc.querySelector('.sc-year-chip.is-current').dataset.scope, '2');
    eq('genau ein aktiver Reiter', t.doc.querySelectorAll('[aria-selected="true"]').length, 1);
    ok('Reiter tragen den Schnitt', /Ø\s*2,67/.test(t.doc.querySelector('[data-scope="1"]').textContent));
    ok('Verwalten-Panel sichtbar, Hinweis versteckt',
        !t.doc.querySelector('.sc-config-panel').hidden && t.doc.getElementById('schoolAllHint').hidden);
    const remBtn = t.doc.querySelector('#schoolYearBar [data-action="remove"]');
    ok('Entfernen-Knopf sitzt in der Leiste neben „+ Lehrjahr" und nennt das aktive Jahr',
        !!remBtn && /2\. Lehrjahr entfernen/.test(remBtn.textContent)
        && remBtn.previousElementSibling === t.doc.querySelector('#schoolYearBar [data-action="add"]'));
    eq('Karten des 2. Lehrjahrs', t.doc.querySelectorAll('.sc-subject-card').length, 2);
    // Verschieben-Auswahl: anderes Jahr + „neues"
    const opts = [...t.doc.querySelector('.school-move-select').options].map(o => o.value);
    eq('Verschieben bietet 1. Lehrjahr und ein neues an', JSON.stringify(opts), '["","1","new"]');

    t.setSchoolScope('all');
    eq('Auswahl gemerkt', t.store.get('mwl_school_year'), 'all');
    ok('Gesamt: Verwalten-Panel weg, Hinweis da',
        t.doc.querySelector('.sc-config-panel').hidden && !t.doc.getElementById('schoolAllHint').hidden);
    eq('Gesamt: keine Eingabekarten', t.doc.querySelectorAll('.sc-subject-card').length, 0);
    eq('Gesamt: kein Entfernen-Knopf', t.doc.querySelectorAll('#schoolYearBar [data-action="remove"]').length, 0);

    // Phantomspalten-Probe: Kopf und jede Zeile gleich viele Zellen
    const th = t.doc.querySelectorAll('#schoolGradesList thead th').length;
    const rows = [...t.doc.querySelectorAll('#schoolSubjectsBody tr')];
    eq('Gesamt: Kopf hat Fach + 2 Jahre + Gesamt + Trend', th, 5);
    ok('Gesamt: jede Zeile hat so viele Zellen wie der Kopf (' + rows.length + ' Zeilen)',
        rows.length === 3 && rows.every(r => r.children.length === th));
    const yl = t.doc.getElementById('schoolYearList');
    eq('Jahresliste sichtbar mit zwei Zeilen', !yl.hidden && yl.querySelectorAll('.sc-year-row').length, 2);
    // Vorzeichen wie in der Trend-Spalte: positiv = besser
    ok('Jahresliste: 2. Lehrjahr um 1,00 besser', /is-up[^>]*>[^<]*<svg[^>]*>[\s\S]*?<\/svg>\+1,00/.test(yl.innerHTML));

    t.setSchoolScope('1');
    eq('zurueck im Jahr: Kopf wieder fuenfspaltig (Fach, Schnitt, Trend, Noten, Bewertung)',
        [...t.doc.querySelectorAll('#schoolGradesList thead th')].map(e => e.textContent.trim()).join('|'),
        'Fach|Schnitt|Trend|Noten|Bewertung');
    const rows1 = [...t.doc.querySelectorAll('#schoolSubjectsBody tr')];
    ok('Jahr: jede Zeile fuenf Zellen', rows1.length === 2 && rows1.every(r => r.children.length === 5));
}

{
    const t = boot({ school: { years: { '1': { grades: { 'A': ['2.0'] } } } } });
    t.renderSchoolGradesInputs();
    eq('ein Lehrjahr: kein „alle"-Reiter', t.doc.querySelectorAll('[data-scope="all"]').length, 0);
    eq('ein Lehrjahr: kein Entfernen-Knopf', t.doc.querySelectorAll('#schoolYearBar [data-action="remove"]').length, 0);
    // gemerktes „alle" ohne zweites Jahr faellt auf das Jahr zurueck
    t.store.set('mwl_school_year', 'all');
    const t2 = boot({ school: { years: { '1': { grades: { 'A': ['2.0'] } } } } });
    t2.store.set('mwl_school_year', 'all');
    eq('„alle" gemerkt, aber nur ein Jahr → Jahr 1', t2.scScope(), 1);
}

{
    const t = boot({ school: zwei(), lang: 'en' });
    t.renderSchoolGradesInputs();
    ok('/en/: Reiter englisch', /Year 1/.test(t.doc.querySelector('[data-scope="1"]').textContent));
    ok('/en/: Dezimalpunkt statt Komma im Reiter', /2\.67/.test(t.doc.querySelector('[data-scope="1"]').textContent));
    t.setSchoolScope('all');
    ok('/en/: Gesamt-Kopf englisch', /Overall/.test(t.doc.querySelector('#schoolGradesList thead').textContent));
    const de = t.doc.querySelector('#schoolYearBar').textContent + t.doc.querySelector('#schoolGradesList thead').textContent;
    ok('/en/: kein deutsches Wort in Leiste und Kopf', !/Lehrjahr|Noten|Gesamt|Fach\b/.test(de));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\nAktionen — anlegen, verschieben, uebernehmen, entfernen');

{
    const t = boot({ school: zwei() });
    t.renderSchoolGradesInputs();
    t.setSchoolScope('2');

    // 🔴 Getippte, ungespeicherte Note ueberlebt „+ Note" (bis v7.0.2 nicht)
    const feld = t.doc.querySelector('.school-grade-input[data-subject="Englisch"]');
    feld.value = '1.3';
    t.addSchoolGrade('Deutsch-neu');   // fremdes Fach: legt es an, zeichnet neu
    eq('getippte Note ist im Datenmodell', t.scGradesOf(2)['Englisch'][0], '1.3');
    eq('… und steht nach dem Neuzeichnen wieder im Feld', t.doc.querySelector('.school-grade-input[data-subject="Englisch"]').value, '1.3');
    eq('+ Note haengt ein leeres Feld an', JSON.stringify(t.scGradesOf(2)['Deutsch-neu']), '[""]');
    delete t.scGradesOf(2)['Deutsch-neu'];

    // Verschieben mit Zusammenfuehren
    t.moveSchoolSubject('IT-Systeme', '1');
    eq('Fach ist aus dem 2. Lehrjahr weg', 'IT-Systeme' in t.scGradesOf(2), false);
    // Die Felder normalisieren beim Einsammeln ("2.0" → "2"), deshalb numerisch vergleichen.
    eq('Noten haengen im 1. Lehrjahr an den vorhandenen', t.scGradesOf(1)['IT-Systeme'].map(Number).join(','), '3,3,2,2');
    eq('Verschieben speichert', t.calls.save >= 1, true);
    eq('Verschieben meldet sich', t.calls.toast.length, 1);

    // Verschieben in ein neues Lehrjahr
    t.moveSchoolSubject('Englisch', 'new');
    eq('neues Lehrjahr ist 3', JSON.stringify(t.scYears()), '[1,2,3]');
    eq('Englisch liegt im 3.', JSON.stringify(t.scGradesOf(3)['Englisch']), '["1.3"]');
    eq('2. Lehrjahr ist jetzt leer', Object.keys(t.scGradesOf(2)).length, 0);

    // Leeres Jahr bietet Uebernahme aus dem naechsten darunter an
    t.setSchoolScope('2');
    const copyBtn = t.doc.querySelector('.school-copy-btn');
    ok('leeres Lehrjahr: Uebernahme aus dem 1. angeboten', copyBtn && copyBtn.dataset.from === '1');
    t.copySchoolSubjects(1, 2);
    eq('Fachnamen uebernommen, ohne Noten', JSON.stringify(t.scGradesOf(2)), '{"IT-Systeme":[],"Deutsch":[]}');

    // Entfernen: mit Faechern → Rueckfrage; ohne → direkt
    const saves = t.calls.save;
    t.removeSchoolYear();
    eq('Entfernen mit Faechern fragt nach', t.calls.confirm.length, 1);
    eq('2. Lehrjahr weg', JSON.stringify(t.scYears()), '[1,3]');
    ok('nach dem Entfernen steht ein vorhandenes Jahr', [1, 3].includes(t.scScope()));
    eq('Entfernen speichert', t.calls.save, saves + 1);
    t.addSchoolYear();
    eq('+ Lehrjahr fuellt die Luecke und waehlt sie', t.scScope(), 2);
    t.removeSchoolYear();
    eq('leeres Lehrjahr geht ohne Rueckfrage', t.calls.confirm.length, 1);

    // Fach anlegen im gewaehlten Jahr
    t.setSchoolScope('3');
    t.doc.getElementById('newSubjectName').value = 'Sport';
    t.doc.getElementById('newSubjectGrade').value = '1.0';
    t.addNewSchoolSubject();
    eq('neues Fach landet im gewaehlten Lehrjahr', JSON.stringify(t.scGradesOf(3)['Sport']), '["1"]');
    eq('nicht in einem anderen', 'Sport' in t.scGradesOf(1), false);

    // In der Gesamtansicht sind alle Schreibpfade gesperrt
    t.setSchoolScope('all');
    const vorher = JSON.stringify(t.data.settings.school);
    t.addSchoolGrade('IT-Systeme'); t.addNewSchoolSubject(); t.removeSchoolYear(); t.moveSchoolSubject('Sport', '1');
    eq('Gesamtansicht schreibt nichts', JSON.stringify(t.data.settings.school), vorher);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\nStatik — jede id hat ein Element, jede Klasse eine Regel');

{
    // CLAUDE.md-Probe: getElementById ohne Element im Markup (dynamische ids gibt es hier nicht)
    const ids = [...new Set([...JS.matchAll(/getElementById\('([a-zA-Z][a-zA-Z0-9_]*)'\)/g)].map(m => m[1]))];
    const fehlend = ids.filter(id => !new RegExp('id="' + id + '"').test(MARKUP) && !/^(sch_week_|biweeklyRulesList)/.test(id));
    ok('alle ids aus school.js stehen in school.html (' + ids.length + ' geprueft)', fehlend.length === 0);
    if (fehlend.length) console.log('        fehlend: ' + fehlend.join(', '));
    ok('es gibt ueberhaupt ids zu pruefen', ids.length >= 20);

    // Inline-Handler im Markup muessen definiert sein
    const handler = [...MARKUP.matchAll(/onclick="([a-zA-Z]+)\(/g)].map(m => m[1]);
    const undef = handler.filter(h => !new RegExp('function ' + h + '\\(').test(JS));
    ok('alle onclick-Namen sind definiert (' + handler.join(', ') + ')', undef.length === 0 && handler.length >= 2);

    // Zustandsklassen aus dem JS gegen die CSS-Selektoren
    const cssSet = new Set([...CSS.matchAll(/\.([a-zA-Z][\w-]*)(?=[\s,.:>#{\[])/g)].map(m => m[1]));
    const jsClasses = new Set();
    for (const m of JS.matchAll(/class="([^"]*)"/g)) m[1].replace(/\$\{[^}]*\}/g, ' ').split(/\s+/).forEach(c => { if (/^sc-[\w-]+$/.test(c)) jsClasses.add(c); });
    for (const m of JS.matchAll(/' is-([\w-]+)'/g)) jsClasses.add('is-' + m[1]);
    // sc-col-* sind semantische Haken ohne eigene Regel; ein Praefix vor `${}` (sc-status-) ist dynamisch.
    const ohneRegel = [...jsClasses].filter(c => !cssSet.has(c) && !/^sc-col-(grade|trend|status)$/.test(c) && !/-$/.test(c));
    ok('jede sc-Klasse aus dem JS hat eine CSS-Regel (' + jsClasses.size + ' geprueft)', ohneRegel.length === 0);
    if (ohneRegel.length) console.log('        ohne Regel: ' + ohneRegel.join(', '));

    // [hidden] gegen display:flex — ohne die Regel blieb die Trennlinie der
    // versteckten Jahresliste im Jahres-Modus stehen (im Browser gemessen).
    ok('school.css laesst [hidden] gewinnen', /#view-school \[hidden\]\s*\{\s*display:\s*none\s*!important/.test(CSS));
    ok('die Jahresliste ist wirklich display:flex (sonst prueft die Zeile oben nichts)', /\.sc-year-list\s*\{[^}]*display:\s*flex/.test(CSS));

    // Kein zweiter Schreiber auf den Altbestand
    const flach = (JS.match(/school\.grades\b/g) || []).filter(() => true);
    const flachCode = JS.replace(/^\s*\/\/.*$/gm, '').match(/\.school\.grades\b/g) || [];
    ok('school.grades wird im Code nur in der Hebung angefasst', flachCode.length <= 0 && flach.length > 0);
}

console.log('\n' + pass + ' ok, ' + fail + ' fehlend');
process.exit(fail ? 1 : 0);
