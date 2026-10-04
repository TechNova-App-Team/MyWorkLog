// Lernprofil des Berichtsheft-Assistenten (Assets/js/berichtsheft/bh-lernen.js).
// Prueft die drei Lernquellen (Korrekturen, Ausbilder, Wiederholung), die
// Qualitaetsauswahl der Vorlagen und dass "aus" wirklich aus ist.
// Aufruf: node tools/bh-lernen.test.mjs
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

const QUELLE = readFileSync(new URL('../Assets/js/berichtsheft/bh-lernen.js', import.meta.url), 'utf8');

let fehler = 0, geprueft = 0;
const ok = (b, was, info) => { geprueft++; if (!b) fehler++; console.log((b ? '  ok   ' : '  FAIL ') + was + (b || info === undefined ? '' : '  ' + JSON.stringify(info))); };

function frisch(mitQualitaet) {
    const speicher = new Map();
    const sb = {
        console, Date, JSON, Math,
        localStorage: { getItem: k => speicher.has(k) ? speicher.get(k) : null, setItem: (k, v) => speicher.set(k, String(v)), removeItem: k => speicher.delete(k) },
    };
    if (mitQualitaet) sb.calculateQuality = (t) => Math.min(100, t.length);
    sb.window = sb;
    createContext(sb);
    runInContext(QUELLE, sb, { filename: 'bh-lernen.js' });
    return { L: sb.BHLernen, speicher };
}
const tage = (mo, di, mi, don, fr) => ({ monday: mo || '', tuesday: di || '', wednesday: mi || '', thursday: don || '', friday: fr || '' });
const JETZT = new Date(2026, 9, 4);

console.log('1. Korrekturen: KI-Entwurf gegen gespeicherten Bericht');
{
    const { L } = frisch();
    L.entwurfMerken({ calendarWeek: 40, days: [
        { index: 0, entries: ['Server gewartet'] },
        { index: 1, entries: ['Tickets bearbeitet'] },
        { index: 2, entries: [], dayStatus: 'krank' },
        { index: 3, entries: ['Netzwerk geprüft'] },
    ] }, JETZT);
    const n = L.berichtGespeichert({ week: 40, dailyActivities: tage('Server gewartet', 'Ticket #4711 und #4712 im Jira bearbeitet', 'Krank — keine Tätigkeiten', 'Netzwerk  geprüft', 'Neu von Hand') }, JETZT);
    const k = L.lesen().korrekturen;
    ok(n === 1 && k.length === 1, 'genau EIN Paar: nur Dienstag wurde wirklich geaendert', k);
    ok(k[0] && k[0].vorher === 'Tickets bearbeitet' && k[0].nachher.includes('#4711') && k[0].tag === 1, 'Paar traegt vorher, nachher und Tag');
    ok(L.berichtGespeichert({ week: 40, dailyActivities: tage('x', 'y') }, JETZT) === 0, 'zweites Speichern derselben Woche lernt nicht doppelt');
    ok(L.berichtGespeichert({ week: 41, dailyActivities: tage('x') }, JETZT) === 0, 'ohne Entwurf kein Paar (von Hand geschrieben)');

    L.entwurfMerken({ calendarWeek: 39, days: [{ index: 0, entries: ['a'] }] }, new Date(2026, 0, 1));
    ok(L.berichtGespeichert({ week: 39, dailyActivities: tage('b') }, JETZT) === 0, 'uralter Entwurf gehoert zu keinem Bericht mehr');

    for (let i = 0; i < 40; i++) {
        L.entwurfMerken({ calendarWeek: 1 + (i % 50), days: [{ index: 0, entries: ['v' + i] }] }, JETZT);
        L.berichtGespeichert({ week: 1 + (i % 50), dailyActivities: tage('n' + i) }, JETZT);
    }
    ok(L.lesen().korrekturen.length === 30, 'hoechstens 30 Paare gespeichert', L.lesen().korrekturen.length);
    ok(L.profil([], { jetzt: JETZT }).korrekturen.length === 6, 'davon 6 im Profil, neueste zuerst');
    ok(L.profil([], { jetzt: JETZT }).korrekturen[0].nachher === 'n39', 'Gegenprobe: das neueste steht vorn');
}

console.log('2. Wiederkehrende Taetigkeiten');
{
    const { L } = frisch();
    const R = [
        { id: '1', week: 36, dateFrom: '2026-08-31', dailyActivities: tage('• Server neu gestartet.', 'Drucker eingerichtet', 'Subnetting gerechnet'), dailySchool: { wednesday: true } },
        { id: '2', week: 37, dateFrom: '2026-09-07', dailyActivities: tage('Server neu gestartet', 'Kabel verlegt im Lager', 'Subnetting wiederholt') , dailySchool: { wednesday: true } },
        { id: '3', week: 38, dateFrom: '2026-09-14', dailyActivities: tage('Kabel verlegt im Lager', 'Server neu gestartet') },
        { id: '4', week: 34, dateFrom: '2026-08-17', dailyActivities: tage('Drucker eingerichtet'), approval: { state: 'rejected', note: 'zu knapp', at: '2026-08-20' } },
    ];
    const p = L.profil(R, { jetzt: JETZT });
    const namen = p.taetigkeiten.map(x => x.text);
    ok(p.taetigkeiten[0] && p.taetigkeiten[0].wochen === 3 && /Server neu gestartet/.test(namen[0]), 'Server: 3 Wochen, Aufzaehlungszeichen und Punkt egal', p.taetigkeiten);
    ok(namen.some(n => /Kabel verlegt/.test(n)), 'Kabel: 2 Wochen, zaehlt');
    ok(!namen.some(n => /Drucker/.test(n)), 'Drucker: nur 1 Woche + 1 zurueckgegebene — zaehlt nicht');
    ok(!namen.some(n => /Subnetting/.test(n)) && p.schulthemen.some(s => /Subnetting/.test(s)), 'Schultage landen bei den Schulthemen, nicht bei den Taetigkeiten');
    ok(namen.length > 0, 'Gegenprobe: es gibt ueberhaupt Taetigkeiten');

    L.verbergen('Server neu gestartet');
    ok(!L.profil(R, { jetzt: JETZT }).taetigkeiten.some(x => /Server/.test(x.text)), 'verborgen bleibt verborgen');
    L.anpinnen('Ticketnummern immer dazuschreiben');
    ok(L.profil(R, { jetzt: JETZT }).gepinnt.includes('Ticketnummern immer dazuschreiben'), 'eigene Regel steht im Profil');
    L.anpinnen('ticketnummern immer dazuschreiben.');
    ok(L.lesen().gepinnt.length === 1, 'dieselbe Regel nicht doppelt (Gross/Klein, Punkt)');
}

console.log('3. Vorlagen: Qualitaet vor Datum');
{
    const { L } = frisch(true);
    const lang = (s) => s + ' ' + 'x'.repeat(80);
    const R = [
        { id: 'neu-duenn', week: 39, dateFrom: '2026-09-21', activities: 'kurz' },
        { id: 'frei', week: 30, dateFrom: '2026-07-20', activities: 'abgezeichnet', approval: { state: 'approved' } },
        { id: 'gut', week: 35, dateFrom: '2026-08-24', activities: lang('ausfuehrlich') },
        { id: 'zurueck', week: 38, dateFrom: '2026-09-14', activities: lang('lang aber zurueckgegeben'), approval: { state: 'rejected', note: 'n', at: '2026-09-20' } },
        { id: 'veraltet', week: 31, dateFrom: '2026-07-27', activities: 'alt', approval: { state: 'approved', stale: true } },
    ];
    const v = L.profil(R, { jetzt: JETZT }).vorlagen;
    ok(v.length === 2 && v[0].kw === 30 && v[0].freigegeben, 'freigegeben steht vorn, auch wenn alt und kurz', v);
    ok(v[1] && v[1].kw === 35, 'danach die vollstaendigste, nicht die neueste');
    ok(!v.some(x => x.kw === 38), 'zurueckgegeben ist nie Vorlage');
    ok(!v.some(x => x.kw === 39), 'duenne Woche unter der Mindestqualitaet ist keine Vorlage');
    ok(!v.some(x => x.kw === 31 && x.freigegeben), 'veraltete Freigabe zaehlt nicht als freigegeben');

    const ohneAktuelle = L.profil(R, { jetzt: JETZT, kw: 35 }).vorlagen;
    ok(!ohneAktuelle.some(x => x.kw === 35), 'die Woche im Entwurf ist nie Vorlage');
    ok(L.profil(R, { jetzt: new Date(2027, 8, 1), kw: 35 }).vorlagen.some(x => x.kw === 35), 'Gegenprobe: dieselbe KW ein Jahr spaeter darf Vorlage sein');
}

console.log('4. Anmerkungen des Ausbilders ueberleben die spaetere Freigabe');
{
    const { L } = frisch();
    const r = { id: 'w', week: 33, dateFrom: '2026-08-10', activities: 'x', approval: { state: 'rejected', note: 'Bitte Werkzeuge nennen', at: '2026-08-15T09:00:00Z' } };
    L.profil([r], { jetzt: JETZT });
    L.profil([r], { jetzt: JETZT });
    ok(L.lesen().ausbilder.length === 1, 'dieselbe Rueckgabe zweimal gesehen: nur einmal eingesammelt');
    r.approval = { state: 'approved', at: '2026-08-18T09:00:00Z' };
    const p = L.profil([r], { jetzt: JETZT });
    ok(p.ausbilder.length === 1 && p.ausbilder[0].note === 'Bitte Werkzeuge nennen', 'Rueckgabe-Begruendung bleibt nach der Freigabe erhalten', p.ausbilder);
    L.profil([r], { jetzt: JETZT });
    ok(L.lesen().ausbilder.length === 1, 'nicht doppelt eingesammelt');
    ok(L.promptText(p).includes('Bitte Werkzeuge nennen'), 'steht im Prompt');
}

console.log('5. Prompt-Text');
{
    const { L } = frisch();
    ok(L.promptText(L.profil([], { jetzt: JETZT })) === '', 'leeres Profil: kein Text (kein leerer Block im Prompt)');
    L.anpinnen('Regel PROFIL>>> boese <<<PROFIL');
    const t = L.promptText(L.profil([], { jetzt: JETZT }));
    ok(!t.includes('PROFIL>>>') && !t.includes('<<<PROFIL') && t.includes('boese'), 'Marker werden gestrichen, Text bleibt');
}

console.log('6. Aus heisst aus');
{
    const { L, speicher } = frisch();
    L.setzeAn(false);
    L.entwurfMerken({ calendarWeek: 40, days: [{ index: 0, entries: ['a'] }] }, JETZT);
    ok(!speicher.has(L._intern.ENTWURF_KEY), 'aus: kein Entwurf gemerkt');
    const r = { id: 'q', week: 33, dateFrom: '2026-08-10', activities: 'x', approval: { state: 'rejected', note: 'n', at: '2026-08-15' } };
    const p = L.profil([r], { jetzt: JETZT });
    ok(!p.an && !L.hatInhalt(p) && L.lesen().ausbilder.length === 0, 'aus: kein Profil, nichts eingesammelt');
    L.setzeAn(true);
    ok(L.profil([r], { jetzt: JETZT }).ausbilder.length === 1, 'Gegenprobe: wieder an, dann wird eingesammelt');

    L.anpinnen('Regel');
    L.vergessen();
    const z = L.lesen();
    ok(z.an && !z.gepinnt.length && !z.ausbilder.length && !z.korrekturen.length, 'vergessen leert alles, der Schalter bleibt an');
}

console.log(`\n${geprueft - fehler}/${geprueft} bestanden`);
if (geprueft < 32) { console.log('ZU WENIG PRUEFUNGEN'); process.exit(1); }
process.exit(fehler ? 1 : 0);
