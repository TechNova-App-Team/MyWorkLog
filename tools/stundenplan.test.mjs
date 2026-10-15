// Stundenplan der Klasse (v8.5.7): von der Lehrkraft (/klasse/) bis in die
// Berichtsheft-KI. Wunsch des Nutzers (14.10.2026): "die App weiss, wann wer
// Unterricht hat, und fuettert damit die Berichtsheft-KI — statt zu raten und
// Englisch zu schreiben, obwohl keins war."
//
//   1. klasse-profil.js: planNorm (sortiert, faengt Muell ab), planen (Vorschau
//      vor dem Beitritt), anwenden (schreibt settings.school.stundenplan),
//      unterschiede (Aenderungsmeldung)
//   2. Cloud-Prompt: mit Plan stehen die ECHTEN Faecher drin, ohne Plan bleibt
//      die alte Regel (Gegenprobe)
//   3. Cloud-Antwort: liefert das Modell ein anderes Fach, gewinnt der Plan
//   4. Lokale Engine: derselbe Plan, dasselbe Fach
import { createRequire } from 'node:module';
import { ladeEngine, pruefrahmen } from './berichtsheft-laden.mjs';

const require = createRequire(import.meta.url);
const { gruppe, ok, abschluss } = pruefrahmen();

// ── 1. klasse-profil.js ────────────────────────────────────────────────
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const K = require('../Assets/js/klasse-profil.js');
gruppe('klasse-profil.js');

const roh = { '3': [{ s: 3, b: 4, f: ' PuG ' }, { s: 1, b: 2, f: 'LF5' }, { s: 0, b: 2, f: 'Muell' }, { s: 5, b: 4, f: 'Muell' }, { s: 5, b: 5, f: '' }],
              '6': [{ s: 1, b: 1, f: 'Samstag gibt es nicht' }], '1': [] };
const norm = K.planNorm(roh);
ok(JSON.stringify(norm) === JSON.stringify({ '3': [{ s: 1, b: 2, f: 'LF5' }, { s: 3, b: 4, f: 'PuG' }] }),
    'planNorm: sortiert, getrimmt, Muell und Samstag raus, leere Tage weg', JSON.stringify(norm));
ok(K.planLeer({}) && K.planLeer(null) && !K.planLeer(norm), 'planLeer erkennt leer/nicht leer');

const P = { name: 'FI 25a', schultage: [3], rhythmus: [], bloecke: [], faecher: ['LF5', 'PuG'], pruefungen: {}, stundenplan: norm, lehrjahr: 1 };
const vorschau = K.planen({}, P).find(x => x.id === 'stundenplan');
ok(!!vorschau, 'planen: Stundenplan erscheint in der Vorschau vor dem Beitritt');
ok(vorschau && /Mi: LF5, PuG/.test(vorschau.neu), 'planen: Kurzfassung "Mi: LF5, PuG"', vorschau && vorschau.neu);
ok(!K.planen({}, Object.assign({}, P, { stundenplan: {} })).some(x => x.id === 'stundenplan'), 'Gegenprobe: ohne Plan kein Eintrag');

const data = { settings: {}, entries: [] };
const getan = K.anwenden(data, P, null);
ok(getan.includes('stundenplan'), 'anwenden: Stundenplan uebernommen');
ok(JSON.stringify(data.settings.school.stundenplan) === JSON.stringify(norm), 'anwenden: liegt unter settings.school.stundenplan');
const nichtGewaehlt = { settings: {} };
K.anwenden(nichtGewaehlt, P, ['schultage']);
ok(!(nichtGewaehlt.settings.school && nichtGewaehlt.settings.school.stundenplan), 'anwenden: abgewaehlt = nicht uebernommen');

ok(K.unterschiede(P, Object.assign({}, P, { stundenplan: { '3': [{ s: 1, b: 2, f: 'LF6' }] } })).includes('Stundenplan'), 'unterschiede: geaenderter Plan wird gemeldet');
ok(!K.unterschiede(P, JSON.parse(JSON.stringify(P))).includes('Stundenplan'), 'Gegenprobe: gleicher Plan meldet nichts');

// ── 2.–4. Berichtsheft ─────────────────────────────────────────────────
const appDaten = JSON.stringify({ settings: { school: { stundenplan: { '3': [{ s: 1, b: 2, f: 'LF5' }, { s: 3, b: 4, f: 'PuG' }] } } } });
let fetchAntwort = null;
const E = ladeEngine({
    speicher: { tg_pro_data: appDaten },
    fetchImpl: async () => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => fetchAntwort, text: async () => JSON.stringify(fetchAntwort) }),
});
const X = { ...E.CLOUD, ...E.intern };
const BASIS = { yearNum: 2, umfang: 'mittel', form: 'stichpunkte', selectedDays: [0, 1, 2, 3, 4], schoolDayIndices: [2], department: 'IT', calendarWeek: 42, customPrompt: '', dayStatus: {} };

gruppe('Cloud-Prompt');
const prompt = X._buildCloudPrompt('sysadmin', { ...BASIS });
ok(prompt.includes('STUNDENPLAN DER KLASSE'), 'mit Plan: Stundenplan-Block im Prompt');
ok(prompt.includes('Mittwoch: 1.–2. Std. LF5, 3.–4. Std. PuG'), 'mit Plan: echte Stunden und Faecher fuer Mittwoch');
ok(prompt.includes('"schoolTopic":"LF5, PuG"'), 'mit Plan: auch das Beispiel im Formatblock traegt das echte Fach');
ok(!prompt.includes('EIN konkretes Fach aus dieser Liste'), 'mit Plan: keine Rate-Anweisung mehr fuer diesen Tag');
const promptOhne = X._buildCloudPrompt('sysadmin', { ...BASIS, schoolDayIndices: [3] });
ok(!promptOhne.includes('STUNDENPLAN DER KLASSE') && promptOhne.includes('EIN konkretes Fach aus dieser Liste'),
    'Gegenprobe: Donnerstag hat keinen Plan, dort bleibt die alte Regel');

gruppe('Cloud-Antwort: der Plan gewinnt');
fetchAntwort = { candidates: [{ content: { parts: [{ text: JSON.stringify([0, 1, 2, 3, 4].map(i => ({
    day: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'][i],
    entries: i === 2 ? ['Im Unterricht Englisch-Vokabeln gelernt', 'Grammatikuebungen bearbeitet', 'Text uebersetzt'] : ['Serverschrank verkabelt', 'Netzwerkdose gepatcht', 'Stoerung dokumentiert'],
    hours: 8, isSchoolDay: i === 2, schoolTopic: i === 2 ? 'Englisch' : null,
}))) }] } }] };
const woche = await X.generateWithCloud('sysadmin', { ...BASIS });
const mi = woche.days.find(d => d.index === 2);
ok(mi && mi.isSchoolDay === true, 'Mittwoch ist Schultag');
ok(mi && mi.schoolTopic === 'LF5, PuG', 'Modell sagt "Englisch", der Plan sagt LF5 + PuG: der Plan gewinnt', mi && mi.schoolTopic);
ok(mi && !/englisch/i.test(mi.entries.join(' ')), 'erfundener Englisch-Stoff fliegt raus, der Tag wird aus dem Plan neu gebaut', mi && JSON.stringify(mi.entries));
ok(mi && /LF5|PuG/.test(mi.entries.join(' ')), 'neu gebauter Tag handelt von LF5/PuG', mi && JSON.stringify(mi.entries));

// Gegenprobe: nennt das Modell nur Plan-Faecher, bleibt sein Text stehen
const GUT = ['In LF5 Subnetze berechnet', 'In PuG ueber Mitbestimmung im Betrieb diskutiert', 'Uebungsaufgaben nachbereitet'];
fetchAntwort = { candidates: [{ content: { parts: [{ text: JSON.stringify([0, 1, 2, 3, 4].map(i => ({
    day: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'][i],
    entries: i === 2 ? GUT : ['Serverschrank verkabelt', 'Netzwerkdose gepatcht', 'Stoerung dokumentiert'],
    hours: 8, isSchoolDay: i === 2, schoolTopic: i === 2 ? 'LF5' : null,
}))) }] } }] };
const woche2 = await X.generateWithCloud('sysadmin', { ...BASIS });
const mi2 = woche2.days.find(d => d.index === 2);
ok(mi2 && JSON.stringify(mi2.entries.map(e => e.replace(/^[^A-Za-zÄÖÜ]+/, ''))) === JSON.stringify(GUT),
    'Gegenprobe: Text mit nur Plan-Faechern bleibt unveraendert', mi2 && JSON.stringify(mi2.entries));

gruppe('Lokale Engine');
const lokal = X.generateDayEntries('sysadmin', { yearNum: 2, umfang: 'mittel', form: 'stichpunkte', dayIndex: 2, isSchoolDay: true });
ok(lokal.schoolTopic === 'LF5, PuG', 'lokal: Fach aus dem Stundenplan', lokal.schoolTopic);
ok(lokal.entries.some(e => /LF5|PuG/.test(e)), 'lokal: die Eintraege handeln von den Plan-Faechern', JSON.stringify(lokal.entries));
const lokalDo = X.generateDayEntries('sysadmin', { yearNum: 2, umfang: 'mittel', form: 'stichpunkte', dayIndex: 3, isSchoolDay: true });
ok(lokalDo.schoolTopic && lokalDo.schoolTopic !== 'LF5, PuG', 'Gegenprobe: Donnerstag ohne Plan bekommt ein anderes Fach', lokalDo.schoolTopic);

// ── 5. Varianten + Uhrzeiten (v8.5.9) ──────────────────────────────────
// Anlass (15.10.2026): "einmal Mittwoch, naechste Woche Mi und Do", Blockwochen,
// Uhrzeiten und Pausen liessen sich nicht eintragen.
gruppe('Varianten: Woche B, Block, Sondertag, Uhrzeiten');
const VOLL_ROH = {
    '3': [{ s: 1, b: 2, f: 'LF5' }],
    raster: { start: '07:45', dauer: 45, pausen: [{ nach: 4, min: 15 }, { nach: 2, min: 20 }, { nach: 2, min: 5 }] },
    b: { wechsel: '2026-10-22', '3': [{ s: 1, b: 4, f: 'LF3' }], '4': [{ s: 1, b: 2, f: 'Englisch' }] },
    block: { '1': [{ s: 1, b: 6, f: 'LF7' }] },
    tage: { '2026-11-04': [{ s: 3, b: 4, f: 'Prüfungsvorbereitung' }] },
};
const V = K.planVoll(VOLL_ROH);
// Gemessen am 15.10.2026: dieselbe Eingabe durch private.klasse_stundenplan() der
// Live-Datenbank. Weichen beide ab, steigt die Klassen-Version bei JEDEM Speichern.
const SERVER = { '3': [{ s: 1, b: 2, f: 'LF5' }], b: { wechsel: '2026-10-19', '3': [{ s: 1, b: 4, f: 'LF3' }], '4': [{ s: 1, b: 2, f: 'Englisch' }] },
    tage: { '2026-11-04': [{ s: 3, b: 4, f: 'Prüfungsvorbereitung' }] }, block: { '1': [{ s: 1, b: 6, f: 'LF7' }] },
    raster: { start: '07:45', dauer: 45, pausen: [{ nach: 2, min: 20 }, { nach: 4, min: 15 }] } };
const kanon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.keys(v).sort().reduce((o, s) => (o[s] = v[s], o), {}) : v);
ok(kanon(V) === kanon(SERVER), 'planVoll normalisiert genau wie der Server (Wechsel auf Montag, Pausen sortiert, doppelte raus)', kanon(V));
ok(!K.planVoll({ b: { wechsel: '2026-10-19' } }).b, 'leere Woche B faellt beim Normalisieren weg');
ok(!K.planVoll({ raster: { start: '25:00', dauer: 45 } }).raster && !K.planVoll({ raster: { start: '08:00', dauer: 200 } }).raster, 'kaputtes Zeitraster faellt weg');
ok(K.planLeer({ raster: { start: '08:00', dauer: 45 } }), 'nur Uhrzeiten ohne Faecher zaehlt als leer');
ok(!K.planLeer({ tage: { '2026-11-04': [{ s: 1, b: 1, f: 'X' }] } }), 'nur ein Sondertag zaehlt als Plan');

const Z = K.stundenZeiten(V.raster);
ok(Z[1].von === '07:45' && Z[1].bis === '08:30' && Z[2].bis === '09:15', 'Uhrzeiten: 1. 07:45–08:30, 2. bis 09:15', JSON.stringify(Z.slice(1, 4)));
ok(Z[3].von === '09:35' && Z[5].von === '11:20', 'Pausen schieben die Folgestunden (20 min nach der 2., 15 nach der 4.)', JSON.stringify([Z[3], Z[5]]));

const BL = [{ von: '2026-11-09', bis: '2026-11-13' }];
const fuer = (iso) => K.planFuerDatum(V, iso, BL);
ok(K.istBWoche(V, '2026-10-21') && !K.istBWoche(V, '2026-10-28') && K.istBWoche(V, '2026-11-04'), 'B-Wochen im Wechsel ab 19.10.');
ok(fuer('2026-10-21').quelle === 'b' && fuer('2026-10-21').liste[0].f === 'LF3', 'Mi in Woche B: Plan B (LF3)');
ok(fuer('2026-10-22').liste[0].f === 'Englisch', 'Do in Woche B: Englisch — genau der Fall "naechste Woche Mi und Do"');
ok(fuer('2026-10-28').quelle === 'normal' && fuer('2026-10-28').liste[0].f === 'LF5', 'Mi in Woche A: normale Woche (LF5)');
ok(fuer('2026-10-29') === null, 'Gegenprobe: Do in Woche A hat keinen Plan');
ok(fuer('2026-11-09').quelle === 'block' && fuer('2026-11-09').liste[0].f === 'LF7', 'Mo im Block: Blockwochen-Plan');
ok(fuer('2026-11-11').quelle !== 'block', 'Mi im Block ohne Block-Eintrag: faellt auf A/B zurueck');
ok(fuer('2026-11-04').quelle === 'tag' && fuer('2026-11-04').liste[0].f === 'Prüfungsvorbereitung', 'Sondertag geht vor Woche B');
ok(fuer('2026-10-21').liste[0].von === '07:45' && fuer('2026-10-21').liste[0].bis === '11:05', 'Eintrag traegt Uhrzeiten (1.–4. Std. 07:45–11:05, Pause eingerechnet)', JSON.stringify(fuer('2026-10-21').liste[0]));
ok(K.planFuerDatum({ '3': [{ s: 1, b: 2, f: 'LF5' }] }, '2026-10-21', []).liste[0].von === undefined, 'Gegenprobe: ohne Raster keine erfundenen Uhrzeiten');

const datenV = { settings: {} };
K.anwenden(datenV, Object.assign({}, P, { stundenplan: VOLL_ROH }), null);
ok(kanon(datenV.settings.school.stundenplan) === kanon(SERVER), 'anwenden: die App bekommt den ganzen Plan (nicht nur die normale Woche)');
ok(K.unterschiede(Object.assign({}, P, { stundenplan: VOLL_ROH }), Object.assign({}, P, { stundenplan: Object.assign({}, VOLL_ROH, { block: {} }) })).includes('Stundenplan'),
    'unterschiede: geaenderte Blockwoche wird gemeldet');
ok(/Woche B/.test(K.planText(V)) && /Blockwoche/.test(K.planText(V)) && /ab 07:45/.test(K.planText(V)), 'planText nennt Woche B, Blockwoche und Beginn', K.planText(V));

gruppe('Berichtsheft: Plan je Datum');
const E2 = ladeEngine({ speicher: { tg_pro_data: JSON.stringify({ settings: { school: { stundenplan: V }, schoolRules: { blocks: BL } } }) }, globals: { MWLKlasse: K } });
const X2 = { ...E2.CLOUD, ...E2.intern };
const tagIso = X2._kwDatum(43, 2);
ok(new Date(tagIso + 'T12:00:00').getDay() === 3, '_kwDatum(43, Mittwoch) ist ein Mittwoch', tagIso);
const erwartet = K.planFuerDatum(V, tagIso, BL);
const ausKI = X2._klassenPlanFuer(2, 43);
ok(ausKI && erwartet && JSON.stringify(ausKI) === JSON.stringify(erwartet.liste), 'die KI nimmt die Fassung dieses Datums', JSON.stringify(ausKI));
const pB = X2._buildCloudPrompt('sysadmin', { ...BASIS, calendarWeek: 43 });
ok(pB.includes('(07:45–'), 'Prompt traegt die Uhrzeiten der Stunden');
const andereKW = X2._klassenPlanFuer(2, 44), andereErw = K.planFuerDatum(V, X2._kwDatum(44, 2), BL);
ok(JSON.stringify(andereKW) === JSON.stringify(andereErw && andereErw.liste) && JSON.stringify(andereKW) !== JSON.stringify(ausKI), 'Gegenprobe: die Nachbarwoche (A statt B) bekommt den anderen Plan');

abschluss("Stundenplan");
