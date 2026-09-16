// Berichtsheft: Vorbelegung des Anlege-Formulars und Wochen-Rechnung.
// Prueft die vier Fallen aus v7.2.3, die jeden Azubi ab dem 2. Lehrjahr trafen:
//   - Soll-Stunden je Tag kommen aus der Haupt-App, nicht fest „8"
//   - Ausbildungsjahr aus dem Ausbildungsbeginn, nicht immer „1"
//   - KW -> Datum im Jahr des Formulars, nicht im Jahr der Uhr
//   - der 1.1.2027 liegt in KW 53 von 2026 (ISO-Wochenjahr)
// Laeuft ohne DOM: die Funktionen werden per funktion() aus den echten Dateien
// geschnitten und in einem vm-Kontext mit localStorage-Attrappe ausgefuehrt.
import { createContext, runInContext } from 'node:vm';
import { funktion } from './berichtsheft-laden.mjs';

let okZ = 0, fehlZ = 0;
function ok(bed, text) {
    if (bed) { okZ++; console.log('  ok    ' + text); }
    else { fehlZ++; console.log('  FEHL  ' + text); }
}

function kontext(speicher, dom = {}) {
    const map = new Map(Object.entries(speicher));
    const sb = {
        console,
        localStorage: { getItem: k => (map.has(k) ? map.get(k) : null) },
        document: { documentElement: { lang: 'de' }, getElementById: id => dom[id] || null },
        reports: [],
    };
    sb.window = sb;
    createContext(sb);
    const src = [
        funktion('bh-basis.js', 'ihkCalculateAusbildungsjahr'),
        funktion('bh-basis.js', 'bhHauptAppSettings'),
        funktion('bh-basis.js', 'bhParseDatum'),
        funktion('bh-basis.js', 'bhSollStunden'),
        funktion('bh-basis.js', 'bhAusbildungsZeitraum'),
        funktion('bh-bericht.js', 'getWeekNumber'),
        funktion('bh-bericht.js', 'isoWeekMonday'),
        funktion('bh-bericht.js', 'isoWeekYear'),
        funktion('bh-bericht.js', 'bhFormularJahr'),
        funktion('bh-bericht.js', 'bhAusbildungsjahrFuer'),
        funktion('bh-bericht.js', 'bhAusbildungsjahrVorbelegen'),
        funktion('bh-bericht.js', 'getWeekDates'),
    ].join('\n');
    runInContext(src, sb, { filename: 'formular.js' });
    return sb;
}

console.log('Soll-Stunden');
{
    const sb = kontext({ tg_pro_data: JSON.stringify({ settings: { hours: [0, 8.75, 8.75, 8.75, 8.75, 4.5, 0] } }) });
    const soll = [0, 1, 2, 3, 4].map(i => runInContext(`bhSollStunden(${i})`, sb));
    ok(JSON.stringify(soll) === '[8.75,8.75,8.75,8.75,4.5]', 'liest settings.hours Mo-Fr (Index 1-5, Sonntag-basiert)');
    ok(runInContext('bhSollStunden(0)', kontext({})) === 8, 'ohne Haupt-App bleibt es bei 8');
    ok(runInContext('bhSollStunden(0)', kontext({ tg_pro_data: '{kaputt' })) === 8, 'kaputtes JSON wirft nicht');
    ok(runInContext('bhSollStunden(4)', kontext({ tg_pro_data: JSON.stringify({ settings: { hours: [0, 8, 8, 8, 8, 0, 0] } }) })) === 8,
        'Soll 0 (freier Tag) faellt auf 8 zurueck — leer im Feld waere schlimmer');
}

console.log('Ausbildungszeitraum');
{
    const a = runInContext('bhAusbildungsZeitraum()', kontext({ pdf_personal_cfg: JSON.stringify({ beginn: '01.09.2024', ende: '31.08.2027' }) }));
    ok(a.beginn && a.beginn.getFullYear() === 2024 && a.beginn.getMonth() === 8, 'Deckblatt TT.MM.JJJJ');
    ok(a.ende && a.ende.getFullYear() === 2027, 'Ende aus dem Deckblatt');
    const b = runInContext('bhAusbildungsZeitraum()', kontext({ tg_pro_data: JSON.stringify({ settings: { ihk: { start: '2025-08-01', end: '2027-07-31' } } }) }));
    ok(b.beginn && b.beginn.getFullYear() === 2025 && b.beginn.getMonth() === 7, 'Haupt-App JJJJ-MM-TT als Rueckfall');
    const c = runInContext('bhAusbildungsZeitraum()', kontext({ pdf_personal_cfg: JSON.stringify({ beginn: '', ende: '' }), tg_pro_data: JSON.stringify({ settings: { ihk: { start: '', end: '' } } }) }));
    ok(c.beginn === null && c.ende === null, 'leere Felder an beiden Orten -> null, kein Invalid Date');
}

console.log('Ausbildungsjahr');
{
    const sb = kontext({ pdf_personal_cfg: JSON.stringify({ beginn: '01.09.2024' }) });
    ok(runInContext(`bhAusbildungsjahrFuer('2026-09-14')`, sb) === 3, 'Sep 2026 bei Beginn Sep 2024 = 3. Jahr');
    ok(runInContext(`bhAusbildungsjahrFuer('2025-08-25')`, sb) === 1, 'Woche vor dem ersten Jahrestag = 1. Jahr (Stichtag Donnerstag)');
    ok(runInContext(`bhAusbildungsjahrFuer('2025-09-01')`, sb) === 2, 'Woche des Jahrestags = 2. Jahr');
    ok(runInContext(`bhAusbildungsjahrFuer('2024-03-04')`, sb) === 1, 'vor Beginn = 1');
    ok(runInContext(`bhAusbildungsjahrFuer('2026-09-14')`, kontext({})) === null, 'ohne Beginn: null, nicht geraten');

    // Vorbelegung: mit Beginn setzt sie; ohne Beginn nimmt sie den juengsten Bericht —
    // aber nur, wenn nurMitBeginn nicht gesetzt ist (Wochenwechsel darf nichts raten).
    const sel = { value: '1' };
    const sb2 = kontext({}, { reportYear: sel });
    sb2.reports = [{ year: 2, dateFrom: '2025-10-06' }, { year: 3, dateFrom: '2026-09-07' }];
    runInContext(`bhAusbildungsjahrVorbelegen('2026-09-14', false)`, sb2);
    ok(sel.value === '3', 'ohne Beginn: Jahr des juengsten Berichts (nach dateFrom, nicht Reihenfolge)');
    sel.value = '1';
    runInContext(`bhAusbildungsjahrVorbelegen('2026-09-14', true)`, sb2);
    ok(sel.value === '1', 'nurMitBeginn: ohne Beginn bleibt die Auswahl unangetastet');
}

console.log('ISO-Wochenjahr');
{
    const sb = kontext({});
    ok(runInContext(`isoWeekYear(new Date(2027, 0, 1))`, sb) === 2026, '1.1.2027 gehoert zu 2026 (KW 53)');
    ok(runInContext(`getWeekNumber(new Date(2027, 0, 1))`, sb) === 53, '… und ist KW 53');
    ok(runInContext(`isoWeekYear(new Date(2024, 11, 30))`, sb) === 2025, '30.12.2024 gehoert zu 2025 (KW 1)');
    ok(runInContext(`getWeekDates(53, 2026).monday`, sb) === '2026-12-28', 'KW 53/2026 beginnt am 28.12.');
    ok(runInContext(`getWeekDates(50, 2025).monday`, sb) === '2025-12-08', 'KW 50/2025 beginnt am 08.12.');
}

console.log('Jahr des Formulars');
{
    const sb = kontext({}, { reportDateFrom: { value: '2025-12-10' } });
    ok(runInContext('bhFormularJahr()', sb) === 2025, 'kommt aus „Datum von", nicht aus der Uhr');
    const sb2 = kontext({}, { reportDateFrom: { value: '' } });
    ok(runInContext('bhFormularJahr()', sb2) === runInContext('isoWeekYear(new Date())', sb2), 'leer -> ISO-Wochenjahr von heute');
}

console.log(`\nFormular: ${okZ} ok, ${fehlZ} fehlgeschlagen`);
if (fehlZ || okZ < 20) process.exit(1);
