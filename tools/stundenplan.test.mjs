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

abschluss("Stundenplan");
