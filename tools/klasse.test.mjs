// ═══ KLASSE (/klasse/) ═══
//
// Warum es diesen Test gibt:
//
// 1. DIE BEITRITTSSEITE SCHREIBT NIE IN tg_pro_data. Sie merkt nur vor (mwl_klasse),
//    die App wendet an. Wuerde jemand das "vereinfachen", risse eine halbe Datei ohne
//    entries die App auf einem frischen Geraet. Statische Probe unten.
// 2. "FRAGT PRO FELD" MUSS STIMMEN: planen() meldet, was ersetzt wuerde, anwenden()
//    respektiert die Auswahl, und Faecher werden nur ERGAENZT (Noten bleiben).
// 3. DER APP-ABGLEICH: vorgemerkter Beitritt wird angewendet, neue Version erzeugt
//    EINE Meldung mit Link, jede Mitteilung meldet sich EINMAL.
// 4. BLOCKUNTERRICHT IN isVocSchoolForDate: Werktag im Block = Schule, Samstag nicht.
// 5. DATENSCHUTZ: der Geraete-Hash ist 64 hex und je Klasse verschieden.
//
// Lauf: node tools/klasse.test.mjs   (kein Netz — fetch ist eine Attrappe)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
const require = createRequire(import.meta.url);

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FEHLT ' + n)); };
const eq = (n, a, b) => ok(n + '  (' + JSON.stringify(a) + ' = ' + JSON.stringify(b) + ')', JSON.stringify(a) === JSON.stringify(b));
const lf = s => s.split('\r\n').join('\n');

// ── Umgebung fuer das Modul ───────────────────────────────────────────
const store = {};
globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
if (!globalThis.crypto) globalThis.crypto = webcrypto;
globalThis.SUPABASE_CONFIG = { URL: 'https://x.supabase.co', ANON_KEY: 'anon' };
let antwort = null, aufrufe = [];
globalThis.fetch = async (url, opt) => { aufrufe.push([url, JSON.parse(opt.body)]); return { ok: true, status: 200, text: async () => JSON.stringify(antwort) }; };
const meldungen = [];
globalThis.mwlKlassenMeldung = o => { if (o.key && meldungen.some(m => m.key === o.key)) return false; meldungen.push(o); return true; };
const K = require('../Assets/js/klasse-profil.js');

// ── 1. Code ───────────────────────────────────────────────────────────
console.log('\nCode');
eq('Kleinschreibung + Bindestrich', K.codeNorm('k7qp-m2xd'), 'K7QPM2XD');
eq('Leerzeichen egal', K.codeNorm(' K7QP M2XD '), 'K7QPM2XD');
eq('L ist nicht im Alphabet (Verwechsler)', K.codeNorm('TESTKL22'), null);
eq('0/O/1/I auch nicht', K.codeNorm('K0QP1M2I'), null);
eq('7 Zeichen zu kurz', K.codeNorm('K7QPM2X'), null);
eq('Format', K.codeFmt('K7QPM2XD'), 'K7QP-M2XD');
eq('aus #hash', K.codeAusAdresse({ hash: '#k7qp-m2xd', search: '' }), 'K7QPM2XD');
eq('aus ?k=', K.codeAusAdresse({ hash: '', search: '?k=K7QPM2XD' }), 'K7QPM2XD');
eq('#klassen ist kein Code', K.codeAusAdresse({ hash: '#klassen', search: '' }), null);
eq('#so-gehts ist kein Code', K.codeAusAdresse({ hash: '#so-gehts', search: '' }), null);

// ── 2. Planen / Anwenden ──────────────────────────────────────────────
console.log('\nPlanen und anwenden');
const P = {
    code: 'K7QPM2XD', name: 'FI 25a', version: 3, lehrjahr: 1, bundesland: 'NI',
    schultage: [1, 3], rhythmus: [{ weekday: 5, interval: 2, startDate: '2026-10-16' }],
    bloecke: [{ von: '2099-11-09', bis: '2099-11-20' }], faecher: ['LF1', 'LF2', 'Deutsch'],
    pruefungen: { ap1: '2027-03-02', ap2: '2028-05-05' }, mitteilungen: [{ id: 'm1', text: 'Hallo' }]
};
const leer = K.planen({}, P);
eq('leeres Geraet: fuenf Bereiche', leer.map(i => i.id), ['schultage', 'bloecke', 'bundesland', 'pruefungen', 'faecher']);
ok('leeres Geraet: nichts wird ersetzt', leer.every(i => !i.alt));
ok('Gegenprobe: es gibt ueberhaupt Bereiche', leer.length > 0);

const vorher = { schoolRules: { weeklyDays: [2], biweekly: [] }, bundesland: 'BY', ihk: { exam_zwischen: '2026-03-12' },
    school: { years: { '1': { grades: { lf1: [2], Mathe: [] } } } } };
const pl = K.planen(vorher, P);
const by = id => pl.find(i => i.id === id);
ok('Schultage: Ersetzt nennt den alten Dienstag', by('schultage').alt === 'Di');
ok('Bundesland: Ersetzt nennt Bayern', by('bundesland').alt === 'Bayern');
ok('Pruefung: Ersetzt nennt den alten Termin', /12\.03\.2026/.test(by('pruefungen').alt));
ok('Faecher: nie "ersetzt" (nur ergaenzt)', by('faecher').alt === null);
ok('Faecher: lf1 zaehlt als vorhanden (Gross/Klein egal)', /2 neu/.test(by('faecher').neu));

const gleich = K.planen({ schoolRules: { weeklyDays: [3, 1], biweekly: [{ weekday: 5, interval: 2, startDate: '2026-10-16' }] }, bundesland: 'NI' }, P);
ok('gleicher Stand: Schultage "gleich"', gleich.find(i => i.id === 'schultage').gleich === true);
ok('gleicher Stand: Bundesland "gleich"', gleich.find(i => i.id === 'bundesland').gleich === true);

const data = JSON.parse(JSON.stringify({ settings: vorher, entries: [{ id: 1 }] }));
const getan = K.anwenden(data, P, ['schultage', 'bloecke', 'pruefungen', 'faecher']);
eq('Auswahl ohne Bundesland', getan, ['schultage', 'bloecke', 'pruefungen', 'faecher']);
eq('Bundesland bleibt (abgewaehlt)', data.settings.bundesland, 'BY');
eq('Schultage ersetzt', data.settings.schoolRules.weeklyDays, [1, 3]);
eq('Bloecke gesetzt', data.settings.schoolRules.blocks, [{ von: '2099-11-09', bis: '2099-11-20' }]);
eq('AP1 -> exam_zwischen', data.settings.ihk.exam_zwischen, '2027-03-02');
eq('AP2 -> exam_abschluss', data.settings.ihk.exam_abschluss, '2028-05-05');
eq('Note in lf1 bleibt', data.settings.school.years['1'].grades.lf1, [2]);
ok('kein doppeltes LF1 neben lf1', !('LF1' in data.settings.school.years['1'].grades));
eq('Mathe bleibt', data.settings.school.years['1'].grades.Mathe, []);
ok('LF2 + Deutsch ergaenzt', 'LF2' in data.settings.school.years['1'].grades && 'Deutsch' in data.settings.school.years['1'].grades);
eq('entries unberuehrt', data.entries, [{ id: 1 }]);
const frisch = {}; K.anwenden(frisch, P, null);
ok('frisches Objekt ohne settings: alles angelegt', frisch.settings.schoolRules.weeklyDays.length === 2 && frisch.settings.bundesland === 'NI');

eq('Unterschiede: nur Pruefung', K.unterschiede(P, Object.assign({}, P, { pruefungen: { ap1: '2027-03-09', ap2: '2028-05-05' } })), ['Prüfungstermine']);
eq('Unterschiede: nichts', K.unterschiede(P, JSON.parse(JSON.stringify(P))), []);

// ── 3. App-Abgleich ───────────────────────────────────────────────────
console.log('\nApp-Abgleich');
globalThis.data = { settings: {}, entries: [] };
let gesichert = 0; globalThis.save = () => { gesichert++; };
K.vormerken(P, ['schultage', 'faecher']);
ok('vormerken legt mwl_klasse an, ausstehend', K.zustand().ausstehend === true);
ok('vormerken schreibt NICHT tg_pro_data', !('tg_pro_data' in store));
let r = await K.appAbgleich(false);
eq('angewendet nur die Auswahl', r.angewendet, ['schultage', 'faecher']);
eq('save() genau einmal', gesichert, 1);
ok('Bundesland nicht gesetzt', !globalThis.data.settings.bundesland);
eq('Version uebernommen', K.zustand().version, 3);
eq('Mitteilung beim Beitritt gemeldet', meldungen.map(m => m.key), ['klasse_m_m1']);

r = await K.appAbgleich(false);
eq('innerhalb 10 min kein Netzabruf', aufrufe.length, 0);
// Bis v8.5.5 fragte die App nur alle 6 h: eine Mitteilung kam Stunden spaeter an.
{
    const z = K.zustand(); z.geprueft = Date.now() - 11 * 60 * 1000; K.zustandSetzen(z);
    antwort = JSON.parse(JSON.stringify(Object.assign({}, P, { version: 3 })));
    await K.appAbgleich(false);
    eq('nach 11 min fragt die App wieder (nicht erst nach 6 h)', aufrufe.length, 1);
    aufrufe.length = 0;
}
// Ohne Meldungs-Modul darf nichts als gesehen abgehakt werden, sonst ist die Mitteilung weg.
{
    const melder = globalThis.mwlKlassenMeldung;
    delete globalThis.mwlKlassenMeldung;
    const z = { gesehen: [] };
    const n = K.mitteilungenMelden(z, { name: 'X', mitteilungen: [{ id: 'mx', text: 'Test' }] });
    eq('ohne Melder: nichts gemeldet', n, 0);
    eq('ohne Melder: nichts als gesehen abgehakt', z.gesehen, []);
    globalThis.mwlKlassenMeldung = melder;
    ok('Gegenprobe: mit Melder wird abgehakt', K.mitteilungenMelden({ gesehen: [] }, { name: 'X', mitteilungen: [{ id: 'my', text: 'Test' }] }) === 1);
}
antwort = Object.assign({}, P, { version: 4, pruefungen: { ap1: '2027-03-09' }, mitteilungen: [{ id: 'm2', text: 'Neu' }, { id: 'm1', text: 'Hallo' }] });
r = await K.appAbgleich(true);
eq('ein Abruf von klasse_oeffentlich', aufrufe.map(a => a[0].split('/').pop()), ['klasse_oeffentlich']);
const vm = meldungen.find(m => /^klasse_v_/.test(m.key));
ok('neue Version: Meldung mit Link auf die Klasse', vm && vm.link === '/klasse/#K7QPM2XD');
ok('neue Version: nennt was sich aendert', vm && /Prüfungstermine/.test(vm.message));
ok('neue Mitteilung gemeldet, alte nicht doppelt', meldungen.filter(m => m.key === 'klasse_m_m2').length === 1 && meldungen.filter(m => m.key === 'klasse_m_m1').length === 1);
const anzahl = meldungen.length;
await K.appAbgleich(true);
eq('zweiter Abgleich: keine neue Meldung', meldungen.length, anzahl);
antwort = null;
r = await K.appAbgleich(true);
ok('Code geloescht/erneuert: als "weg" vermerkt, kein Absturz', r && r.weg === true && K.zustand().weg === true);

// ── 4. Geraete-Hash ───────────────────────────────────────────────────
console.log('\nGeraete-Hash');
const h1 = await K.geraetHash('K7QPM2XD'), h2 = await K.geraetHash('K7QPM2XD'), h3 = await K.geraetHash('ABCDEFGH');
ok('64 hex', /^[0-9a-f]{64}$/.test(h1));
eq('gleiches Geraet + Klasse: gleicher Hash', h1, h2);
ok('andere Klasse: anderer Hash (nicht verknuepfbar)', h1 !== h3);

// ── 5. Blockunterricht in isVocSchoolForDate ──────────────────────────
console.log('\nBlockunterricht');
const SR = lf(readFileSync('components/core/school-rules.js', 'utf8'));
const start = SR.indexOf('    function isVocSchoolForDate(');
let tiefe = 0, ende = -1;
for (let i = SR.indexOf('{', start); i < SR.length; i++) { if (SR[i] === '{') tiefe++; else if (SR[i] === '}') { tiefe--; if (tiefe === 0) { ende = i + 1; break; } } }
ok('isVocSchoolForDate gefunden', start > 0 && ende > start);
const fn = new Function('data', 'getGermanHolidays', SR.slice(start, ende) + '; return isVocSchoolForDate;');
const d2 = { entries: [], settings: { schoolRules: { weeklyDays: [], biweekly: [], blocks: [{ von: '2026-11-09', bis: '2026-11-20' }] } } };
const voc = fn(d2, () => []);
eq('Do im Block', voc(new Date(2026, 10, 12)).isVocSchool, true);
eq('Sa im Block nicht', voc(new Date(2026, 10, 14)).isVocSchool, false);
eq('Tag nach dem Block nicht', voc(new Date(2026, 10, 23)).isVocSchool, false);
d2.entries.push({ date: '2026-11-12', type: 'vacation' });
eq('Urlaub schlaegt Block', voc(new Date(2026, 10, 12)).isVocSchool, false);

// ── 6. Statisch ───────────────────────────────────────────────────────
console.log('\nStatisch');
const noC = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PAGE = noC(lf(readFileSync('Assets/js/klasse.js', 'utf8')));
const PROF = noC(lf(readFileSync('Assets/js/klasse-profil.js', 'utf8')));
const schreibt = /setItem\(\s*['"]tg_pro_data['"]/;
ok('klasse.js schreibt tg_pro_data nicht', !schreibt.test(PAGE));
ok('klasse-profil.js schreibt tg_pro_data nicht', !schreibt.test(PROF));
ok('Gegenprobe: das Muster trifft wirklich', schreibt.test("localStorage.setItem('tg_pro_data', x)"));
ok('klasse.js liest tg_pro_data (fuer die Vorschau)', /getItem\('tg_pro_data'\)/.test(PAGE));
const HTML = lf(readFileSync('pages/klasse/index.html', 'utf8'));
const rel = [...HTML.matchAll(/(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"/g)].map(m => m[1]).filter(u => !/^(https?:)?\//.test(u));
eq('nur absolute Asset-Pfade', rel, []);
ok('JSON-LD traegt data-ld-id', (HTML.match(/application\/ld\+json/g) || []).length === (HTML.match(/data-ld-id=/g) || []).length);
for (const m of HTML.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let okJson = true; try { JSON.parse(m[1]); } catch (e) { okJson = false; }
    ok('JSON-LD parst', okJson);
}
ok('App bindet klasse-profil.js ein', /klasse-profil\.js/.test(readFileSync('index.template.html', 'utf8')));
const ALERTS = lf(readFileSync('components/core/alerts-toasts.js', 'utf8'));
ok('Meldungs-Torwaechter fragt die Kategorie klasse', /mwlAlertsOn\('klasse'\)/.test(ALERTS));
ok('Meldungs-Link nur auf dieser Domain', /function apSafeLink/.test(ALERTS));

console.log('\n' + pass + ' ok, ' + fail + ' fehlend\n');
if (fail) process.exit(1);
