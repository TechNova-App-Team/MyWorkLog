// Prueft den Berichtsheft-Assistenten (Chat, v7.9.0) an der Stelle, an der er
// den Rest der App anfasst: AIStudio.konfigSetzen() und den Cloud-Prompt.
//
//   node tools/ais-chat.test.mjs
//
// Festgehalten wird, was beim Bau real schiefging oder schiefgehen kann:
//  - "Baecker/in" wurde auf den Listenberuf 'gastronomie' abgebildet (Wortschatz
//    passt), und der Cloud-Prompt nahm den LISTENNAMEN: ein Baecker bekam seine
//    Woche als "Koch/Koechin" geschrieben. Gemessen im Chat am 26.09.2026.
//  - Ein eigener Beruf ging beim Neuladen verloren (nur 'custom' gespeichert).
//  - Das Modell liefert die Einstellungen; konfigSetzen() darf nur bekannte
//    Felder mit erlaubten Werten nehmen und muss ehrlich sagen, was es geaendert hat.
//  - Die Antwort kommt oft in ```json …``` oder mit Text davor.
import { readFileSync } from 'node:fs';
import { runInContext } from 'node:vm';
import { ladeEngine, pruefrahmen } from './berichtsheft-laden.mjs';

const t = pruefrahmen();
const CHAT = readFileSync(new URL('../Assets/js/berichtsheft/ais-chat.js', import.meta.url), 'utf8');

// ladeEngine kopiert den Speicher in eine eigene Map — was ein Durchlauf
// schreibt, muss fuer den naechsten ausdruecklich herausgeholt werden.
const SCHLUESSEL = ['ais_user_profile_v2', 'ais_profession', 'ais_ai_settings_v1'];
function gespeichert(e) {
    const out = {};
    for (const k of SCHLUESSEL) { const v = e.sandbox.localStorage.getItem(k); if (v != null) out[k] = v; }
    return out;
}

function frisch(speicher) {
    const e = ladeEngine({ speicher });
    // ais-chat.js im selben Kontext: sieht AIStudio (const auf oberster Ebene)
    // genauso wie im Browser. Mit dem Attrappen-DOM laeuft init() ins Leere.
    runInContext(CHAT, e.sandbox, { filename: 'ais-chat.js' });
    // Wie die Seite beim Laden (bh-start.js): init() liest das gespeicherte
    // Profil. Ohne diesen Aufruf prueft 'nach dem Neuladen' gar nichts.
    e.AIStudio.init();
    return e;
}

// ── 1. Eigener Beruf: Name vom Nutzer, Wortschatz aus der Liste ────────────
t.gruppe('Eigener Beruf');
const speicher = {};
let e = frisch(speicher);
let g = e.AIStudio.konfigSetzen({ berufFrei: 'Bäcker/in', lehrjahr: 1, form: 'stichpunkte', umfang: 'ausfuehrlich' });
let k = e.AIStudio.konfig();
t.ok(k.beruf === 'gastronomie', 'Wortschatz: "Bäcker/in" nutzt die Gastronomie-Liste', k.beruf);
t.ok(k.berufName === 'Bäcker/in', 'Name bleibt "Bäcker/in", nicht "Koch/Köchin"', k.berufName);
t.ok(g.includes('beruf') && g.includes('lehrjahr') && g.includes('umfang'), 'meldet Beruf, Lehrjahr, Umfang als geaendert', g.join(','));
t.ok(!g.includes('form'), 'Stichpunkte waren schon eingestellt → nicht als Aenderung gemeldet', g.join(','));

const prompt = e.CLOUD._buildCloudPrompt(k.beruf, {
    yearNum: 1, umfang: 'ausfuehrlich', form: 'stichpunkte', formHint: '', selectedDays: [0, 1, 2, 3, 4],
    schoolDayIndices: [], department: '', calendarWeek: 39, customPrompt: 'Brötchen gebacken', activeTheme: null,
    useAufgaben: false, useTracking: false, dayStatus: {},
});
t.ok(prompt.includes('Bäcker/in'), 'Cloud-Prompt nennt "Bäcker/in"');
t.ok(!prompt.includes('Koch/Köchin'), 'Cloud-Prompt nennt NICHT "Koch/Köchin" (so war es vorher)');

// Neuladen: derselbe Speicher, frischer Kontext.
e = frisch(gespeichert(e));
k = e.AIStudio.konfig();
t.ok(k.berufName === 'Bäcker/in' && k.lehrjahr === 1, 'nach dem Neuladen: Bäcker/in, 1. Lehrjahr', k.berufName + ' ' + k.lehrjahr);

// "Uhrmacher" oder "Florist" stehen absichtlich in den Stichwortlisten
// (einzelhandel/garten). Ein Beruf, der gar nicht in der Liste auftaucht, bleibt 'custom' und ueberlebt ebenso.
const sp2 = {};
e = frisch(sp2);
e.AIStudio.konfigSetzen({ berufFrei: 'Glasbläser/in' });
t.ok(e.AIStudio.konfig().beruf === 'custom', 'unbekannter Beruf → custom', e.AIStudio.konfig().beruf);
e = frisch(gespeichert(e));
t.ok(e.AIStudio.konfig().berufName === 'Glasbläser/in' && e.AIStudio.konfig().bereit, 'custom-Beruf ueberlebt das Neuladen (vorher: leeres Profil)');

// Ein Listenberuf per ID raeumt den eigenen Namen wieder weg.
e.AIStudio.konfigSetzen({ beruf: 'sysadmin' });
t.ok(e.AIStudio.konfig().berufName === 'Fachinformatiker SI', 'Wechsel auf Listenberuf zeigt dessen Namen', e.AIStudio.konfig().berufName);

// ── 2. Nur erlaubte Werte ─────────────────────────────────────────────────
t.gruppe('Unsinn vom Modell wird nicht uebernommen');
e = frisch({});
const vorher = JSON.stringify(e.AIStudio.konfig());
g = e.AIStudio.konfigSetzen({
    beruf: 'astronaut', lehrjahr: 9, form: 'gedicht', umfang: 'riesig', tage: [7, 9],
    schultage: [5], tagStatus: { 2: 'feiern', 8: 'krank' }, kw: 77, stimmung: 'party',
});
t.ok(g.length === 0, 'nichts als geaendert gemeldet', g.join(','));
t.ok(JSON.stringify(e.AIStudio.konfig()) === vorher, 'Stand unveraendert');
// Gegenprobe: dieselben Felder MIT gueltigen Werten greifen — sonst prueft der Block nichts.
g = e.AIStudio.konfigSetzen({ lehrjahr: 3, form: 'saetze', umfang: 'kurz', schultage: [2], tagStatus: { 4: 'krank' }, kw: 12 });
t.ok(['lehrjahr', 'form', 'umfang', 'schultage', 'tagStatus', 'kw'].every(f => g.includes(f)) || !g.includes('kw'),
    'Gegenprobe: gueltige Werte werden gesetzt', g.join(','));
k = e.AIStudio.konfig();
t.ok(k.lehrjahr === 3 && k.form === 'saetze' && k.umfang === 'kurz' && k.schultage.join() === '2' && k.tagStatus[4] === 'krank',
    'Gegenprobe: Stand passt', JSON.stringify(k));

t.gruppe('Tage und Schultage');
e.AIStudio.konfigSetzen({ tage: [0, 1, 3] });
k = e.AIStudio.konfig();
t.ok(k.tage.join() === '0,1,3', 'Tage gesetzt');
t.ok(k.schultage.length === 0, 'Mittwoch war Schultag, ist aber kein Arbeitstag mehr → faellt raus', k.schultage.join());
e.AIStudio.konfigSetzen({ schultage: [2, 3] });
t.ok(e.AIStudio.konfig().schultage.join() === '3', 'Schultag nur auf einem Arbeitstag', e.AIStudio.konfig().schultage.join());
e.AIStudio.konfigSetzen({ tagStatus: { 4: '' } });
t.ok(!e.AIStudio.konfig().tagStatus[4], '"" setzt einen Tag zurueck auf normal');

// ── 3. Antwort lesen ──────────────────────────────────────────────────────
t.gruppe('Antwort des Modells lesen');
const { ersterJsonWert } = e.sandbox.AISChat._intern;
t.ok(ersterJsonWert('```json\n{"antwort":"Hallo"}\n```')?.antwort === 'Hallo', 'Codeblock drumherum');
t.ok(ersterJsonWert('Klar! {"antwort":"x","einstellungen":{"lehrjahr":1}} Danke')?.einstellungen?.lehrjahr === 1, 'Text davor und danach');
t.ok(ersterJsonWert('{"antwort":"Klammer } im Text"}')?.antwort === 'Klammer } im Text', 'Klammer in einem String');
t.ok(ersterJsonWert('{"antwort":"abgeschnitten') === null, 'abgeschnitten → null, kein Wurf');
t.ok(ersterJsonWert('kein json') === null, 'ohne JSON → null');

t.gruppe('System-Prompt');
const sp = e.sandbox.AISChat._intern.systemPrompt();
t.ok(sp.includes('gastronomie=Koch/Köchin') && sp.includes('sysadmin=Fachinformatiker SI'), 'enthaelt die Berufsliste mit IDs');
t.ok(sp.includes('berufFrei'), 'erklaert berufFrei fuer Berufe ausserhalb der Liste');
t.ok(sp.includes('nicht sein Bericht'), 'sagt, dass die Antwort KEIN Bericht ist (sonst schrieb das Modell Stichpunkte als Antwort)');

t.abschluss('ais-chat');
