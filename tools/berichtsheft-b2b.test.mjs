// Die reine Logik von Assets/js/berichtsheft/bh-b2b.js — die Teile, die ohne
// Supabase pruefbar sind: die Abbildung Bericht -> Zeile, Freigabe -> approval,
// die Code-Erzeugung, die Fehlertexte.
//
// Der Rest (RPCs, RLS, upsert) haengt am Server und ist dort per SQL gegen die
// zwei Rollen geprueft worden (Migration b2b_berichtsheft_datenmodell).
//
// Zwei Fallen aus CLAUDE.md, gegen die hier bewusst gearbeitet wird:
//  - Jede Negativ-Behauptung braucht eine Gegenprobe, dass ueberhaupt etwas
//    geprueft wurde (sonst ist ein leerer Lauf gruen).
//  - `zeileZuApproval` muss GENAU die Felder liefern, die bh-freigabe.js aus
//    `report.approval` liest — sonst bleibt eine serverseitige Freigabe im
//    Badge und im PDF unsichtbar.

import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { webcrypto } from 'node:crypto';

let bestanden = 0, fehlgeschlagen = 0;
const gruppe = (t) => console.log('\n▶ ' + t);
const ok = (bed, name, detail) => {
    if (bed) { bestanden++; console.log('  ok    ' + name); }
    else { fehlgeschlagen++; console.log('  FEHL  ' + name + (detail ? '\n        ' + detail : '')); }
};

// ── bh-b2b.js in einen vm-Kontext laden ────────────────────────────────────
const SRC = readFileSync(
    new URL('../Assets/js/berichtsheft/bh-b2b.js', import.meta.url), 'utf8'
).split('\r\n').join('\n');

const sandbox = {
    console,
    SUPABASE_CONFIG: { URL: 'https://example.supabase.co', ANON_KEY: 'x' },
    crypto: {
        getRandomValues: (a) => { for (let i = 0; i < a.length; i++) a[i] = (i * 37 + 11) % 256; return a; },
        subtle: webcrypto.subtle,
    },
    TextEncoder,
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    document: { createElement: () => ({}), head: { appendChild: () => {} } },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
createContext(sandbox);
runInContext(SRC, sandbox, { filename: 'bh-b2b.js' });

const B = sandbox.BHB2B;
const I = B && B._intern;

ok(!!B, 'window.BHB2B ist da');
ok(!!I, 'BHB2B._intern ist da');
if (!I) { console.log('\nAbbruch: kein _intern'); process.exit(1); }

// ── berichtZuZeile: Spaltennamen ──────────────────────────────────────────
gruppe('berichtZuZeile — Zeilenform');

const bsp = {
    id: 12345, year: 2, week: 10, dateFrom: '2026-03-02', dateTo: '2026-03-06',
    department: 'Netzwerk', activities: 'Woche 10', mode: 'weekly',
    instruction: 'AD gehaertet', school: 'IT-Systeme', hours: 38.5,
    status: 'complete', source: 'cloud', updatedAt: '2026-03-06T18:00:00.000Z'
};
const zeile = I.berichtZuZeile(bsp, 'B-1', 'AZ-1');

const SOLL_KEYS = ['betrieb_id', 'azubi_id', 'client_id', 'jahr', 'kw', 'datum_von',
    'datum_bis', 'inhalt', 'status', 'quelle', 'ki_erzeugt', 'updated_at'].sort();
ok(Object.keys(zeile).sort().join() === SOLL_KEYS.join(),
    'Zeile hat genau die erwarteten Spalten',
    'ist: ' + Object.keys(zeile).sort().join());

ok(zeile.client_id === '12345' && typeof zeile.client_id === 'string',
    'client_id ist die report.id als String');
ok(zeile.betrieb_id === 'B-1' && zeile.azubi_id === 'AZ-1', 'betrieb_id / azubi_id durchgereicht');
ok(zeile.jahr === 2 && zeile.kw === 10, 'jahr / kw uebernommen');
ok(zeile.status === 'complete', 'status uebernommen');
ok(zeile.quelle === 'cloud', 'quelle uebernommen');
ok(zeile.ki_erzeugt === true, 'ki_erzeugt aus source=cloud abgeleitet');
ok(zeile.inhalt && zeile.inhalt.instruction === 'AD gehaertet' && zeile.inhalt.school === 'IT-Systeme',
    'inhalt traegt Anleitung und Berufsschule');
ok(!('activities' in zeile) && !('approval' in zeile),
    'roher activities-/approval-Rest bleibt aus der Zeile');

gruppe('berichtZuZeile — Grenzen und Vokabular');

ok(I.berichtZuZeile({ id: 'a', year: 9, week: 99 }, 'b', 'z').jahr === 5,
    'jahr > 5 wird auf 5 geklemmt (Tabellen-Check jahr between 1 and 5)');
ok(I.berichtZuZeile({ id: 'a', year: 0, week: 0 }, 'b', 'z').kw === 1,
    'kw < 1 wird auf 1 geklemmt');
ok(I.berichtZuZeile({ id: 'a', year: 1, week: 60 }, 'b', 'z').kw === 53,
    'kw > 53 wird auf 53 geklemmt');
ok(I.berichtZuZeile({ id: 'a', status: 'draft' }, 'b', 'z').status === 'incomplete',
    "unbekannter Status faellt auf 'incomplete' (nicht 'draft' — das kennt die Seite nicht)");
ok(I.berichtZuZeile({ id: 'a', status: 'quatsch' }, 'b', 'z').status === 'incomplete',
    'Mist-Status faellt auf incomplete');
['incomplete', 'complete', 'signed'].forEach(s =>
    ok(I.berichtZuZeile({ id: 'a', status: s }, 'b', 'z').status === s, `Status '${s}' bleibt`));
ok(I.berichtZuZeile({ id: 'a', source: 'geraten' }, 'b', 'z').quelle === 'local',
    "unbekannte quelle faellt auf 'local'");
ok(I.berichtZuZeile({ id: 'a' }, 'b', 'z').datum_von === null,
    'fehlendes dateFrom wird null (nicht leerer String — date-Spalte)');

gruppe('berichtZuZeile — Tagesmodus');
const tag = I.berichtZuZeile({
    id: 't', mode: 'daily',
    dailyActivities: { monday: 'x' }, dailyHours: { monday: 8 }, dailySchool: { wednesday: 'Mathe' }
}, 'b', 'z');
ok(tag.inhalt.mode === 'daily' && tag.inhalt.dailyActivities && tag.inhalt.dailyHours && tag.inhalt.dailySchool,
    'Tagesfelder landen komplett in inhalt');

// ── zeileZuApproval: exakt die Felder, die bh-freigabe.js liest ───────────
gruppe('zeileZuApproval — Form, die der Rest der Seite kennt');

const f = {
    entscheidung: 'approved', ausbilder_name: 'Frau Schneider',
    anmerkung: 'Passt.', pruefsumme: 'abc', erstellt_at: '2026-03-07T09:00:00.000Z',
    signatur: { g: 'SIG', k: 'PUB' }
};
const a = I.zeileZuApproval(f);

// bh-freigabe.js: bhIsLocked liest a.state; bhApprovalBadge liest a.state + a.by;
// bhApprovalNote liest a.state + a.by + a.note; der PDF-Pfad reicht approval
// durch buildIhkFormModel -> drawSignatures.
ok(a.state === 'approved', 'state (bhIsLocked / Badge)');
ok(a.by === 'Frau Schneider', 'by  (Badge / Note)');
ok(a.note === 'Passt.', 'note (Note / Rueckgabegrund)');
ok(a.at === '2026-03-07T09:00:00.000Z', 'at');
ok(a.trust === 'server' && a.server === true,
    "trust='server' grenzt die Server-Freigabe vom Link-Weg ab ('first'/'known'/'other-device')");
ok(a.sig === 'SIG' && a.pub === 'PUB', 'ECDSA-Signatur durchgereicht, wenn vorhanden');
ok(a.pruefsumme === 'abc', 'pruefsumme fuer die Ketten-Pruefung (Schritt 2)');

const r = I.zeileZuApproval({ entscheidung: 'rejected', anmerkung: '' });
ok(r.state === 'rejected' && r.by === '' && r.sig === '',
    'Rueckgabe ohne Name/Signatur ergibt leere Strings, nicht undefined');
ok(I.zeileZuApproval(null) === null, 'null rein -> null raus (kein Wurf)');

// bhIsLocked-Nachbau: nur 'approved' sperrt.
const bhIsLocked = (rep) => !!(rep && rep.approval && rep.approval.state === 'approved');
ok(bhIsLocked({ approval: I.zeileZuApproval(f) }) === true, 'approved sperrt den Bericht');
ok(bhIsLocked({ approval: I.zeileZuApproval({ entscheidung: 'rejected' }) }) === false,
    'rejected sperrt nicht');

// ── neuerCode ────────────────────────────────────────────────────────────
gruppe('neuerCode — lesbar und kollisionsarm');

const codes = new Set();
let formOk = 0;
for (let i = 0; i < 500; i++) {
    // deterministische Attrappe oben liefert immer denselben Code — fuer die
    // Formpruefung reicht das; fuer Kollision echte Zufallswerte einspielen.
    sandbox.crypto.getRandomValues = (arr) => { for (let j = 0; j < arr.length; j++) arr[j] = Math.floor(Math.random() * 256); return arr; };
    const c = I.neuerCode();
    if (/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{3}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{3}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{3}$/.test(c)) formOk++;
    codes.add(c);
}
ok(formOk === 500, 'jeder Code ist XXX-XXX-XXX aus dem verwechslungsarmen Alphabet', formOk + '/500');
ok(!/[01OIl]/.test([...codes].join('')), 'kein 0, O, I, 1, l in den Codes');
ok(codes.size >= 498, `500 Codes, ${codes.size} verschieden (praktisch keine Kollision)`);

// ── freundlich ───────────────────────────────────────────────────────────
gruppe('freundlich — Fehlertexte');
ok(/abgelaufen/i.test(I.freundlich('Einladungscode ist abgelaufen')), 'abgelaufen');
ok(/schon verwendet/i.test(I.freundlich('Einladungscode wurde bereits benutzt')), 'bereits benutzt');
ok(/gibt es nicht/i.test(I.freundlich('Einladungscode unbekannt')), 'unbekannt');
ok(I.freundlich('irgendein Rohtext') === 'irgendein Rohtext', 'unbekannter Text bleibt unveraendert');

// ── ganzzahl ─────────────────────────────────────────────────────────────
gruppe('ganzzahl');
ok(I.ganzzahl('3', 1, 5, 1) === 3, 'String-Zahl');
ok(I.ganzzahl(undefined, 1, 5, 2) === 2, 'undefined -> Fallback');
ok(I.ganzzahl('abc', 1, 5, 1) === 1, 'Unsinn -> Fallback');
ok(I.ganzzahl(10, 1, 5, 1) === 5, 'ueber max -> max');

// ── kanonisch / pruefsumme ──────────────────────────────────────────────
gruppe('kanonisch — stabile Serialisierung');
ok(I.kanonisch({ b: 1, a: 2 }) === I.kanonisch({ a: 2, b: 1 }),
    'Schluesselreihenfolge egal');
ok(I.kanonisch({ x: { d: 1, c: 2 } }) === '{"x":{"c":2,"d":1}}',
    'auch verschachtelte Objekte werden sortiert');
ok(I.kanonisch(undefined) === 'null' && I.kanonisch(null) === 'null',
    'undefined und null werden beide zu null');
ok(I.kanonisch([3, 1, 2]) === '[3,1,2]', 'Array-Reihenfolge bleibt (kein Sortieren)');

gruppe('pruefsumme — reproduzierbar und inhaltsabhaengig');
const ber1 = { jahr: 2, kw: 10, datum_von: '2026-03-02', datum_bis: '2026-03-06', inhalt: { activities: 'x', hours: 38 } };
const ber1b = { kw: 10, jahr: 2, datum_bis: '2026-03-06', datum_von: '2026-03-02', inhalt: { hours: 38, activities: 'x' } };
const s1 = await B.pruefsumme(ber1);
const s1b = await B.pruefsumme(ber1b);
const s2 = await B.pruefsumme(Object.assign({}, ber1, { inhalt: { activities: 'y', hours: 38 } }));
ok(/^[0-9a-f]{64}$/.test(s1), 'SHA-256 als 64 Hexzeichen');
ok(s1 === s1b, 'gleiche Daten, andere Feldreihenfolge → gleiche Summe');
ok(s1 !== s2, 'geaenderter Inhalt → andere Summe (Schritt-2-Fundament)');
ok(await B.pruefsumme({ jahr: 1, kw: 1 }) === await B.pruefsumme({ jahr: 1, kw: 1, inhalt: {} }),
    'fehlendes inhalt zaehlt wie leeres Objekt');

// ── berichtKern deckt sich mit berichtZuZeile ──────────────────────────
// Der Azubi hasht ueber berichtKern(report), der Ausbilder ueber die
// Server-Zeile. Beide muessen exakt dieselbe Summe ergeben, sonst meldet
// jede abgezeichnete Woche „geaendert".
gruppe('berichtKern <-> berichtZuZeile — identische Grundlage');
const rep = {
    id: 7, year: 2, week: 10, dateFrom: '2026-03-02', dateTo: '2026-03-06',
    activities: 'Woche 10', mode: 'weekly', instruction: 'AD', school: 'IT', department: 'Netz',
    hours: 38, status: 'complete', source: 'local'
};
const kern = I.berichtKern(rep);
const zk = I.berichtZuZeile(rep, 'B', 'AZ');
ok(JSON.stringify(kern.inhalt) === JSON.stringify(zk.inhalt), 'inhalt identisch');
ok(kern.jahr === zk.jahr && kern.kw === zk.kw
    && kern.datum_von === zk.datum_von && kern.datum_bis === zk.datum_bis,
    'jahr / kw / datum identisch');
// Die Summe aus dem lokalen Bericht == Summe aus der (gespiegelten) Server-Zeile
const summeLokal = await B.pruefsumme(kern);
const summeServer = await B.pruefsumme({
    jahr: zk.jahr, kw: zk.kw, datum_von: zk.datum_von, datum_bis: zk.datum_bis, inhalt: zk.inhalt
});
ok(summeLokal === summeServer, 'Azubi- und Ausbilder-Pruefsumme stimmen ueberein');

// ── berichtVeraendert ─────────────────────────────────────────────────
gruppe('berichtVeraendert');
const approvedReport = Object.assign({}, rep, { approval: { state: 'approved', pruefsumme: summeLokal } });
ok(await B.berichtVeraendert(approvedReport) === false, 'unveraenderte Woche → false');
const editedReport = Object.assign({}, rep, { activities: 'jetzt anders', approval: { state: 'approved', pruefsumme: summeLokal } });
ok(await B.berichtVeraendert(editedReport) === true, 'nach Textaenderung → true');
ok(await B.berichtVeraendert(Object.assign({}, rep, { approval: { state: 'approved' } })) === false,
    'ohne gespeicherte Pruefsumme (alte Freigabe) → false, keine falsche Warnung');
ok(await B.berichtVeraendert(Object.assign({}, rep, { approval: { state: 'rejected', pruefsumme: 'x' } })) === false,
    'rejected → false (nur approved wird geprueft)');
ok(await B.berichtVeraendert(rep) === false, 'ohne approval → false');

// ── ketteVerifizieren ─────────────────────────────────────────────────
gruppe('ketteVerifizieren — prev_pruefsumme-Kette');
ok(I.ketteVerifizieren([]).ok === true, 'leere Liste → ok');
ok(I.ketteVerifizieren([{ pruefsumme: 'A', prev_pruefsumme: null }]).ok === true,
    'erste Freigabe mit prev = null → ok');
ok(I.ketteVerifizieren([{ pruefsumme: 'A', prev_pruefsumme: 'irgendwas' }]).ok === false,
    'erste Freigabe mit prev != null → Bruch');
ok(I.ketteVerifizieren([
    { pruefsumme: 'A', prev_pruefsumme: null },
    { pruefsumme: 'B', prev_pruefsumme: 'A' },
    { pruefsumme: 'C', prev_pruefsumme: 'B' }
]).ok === true, 'intakte Kette über drei Freigaben → ok');
const bruch = I.ketteVerifizieren([
    { pruefsumme: 'A', prev_pruefsumme: null },
    { pruefsumme: 'B', prev_pruefsumme: 'A' },
    { pruefsumme: 'C', prev_pruefsumme: 'X' }   // sollte 'B' sein
]);
ok(bruch.ok === false && bruch.befund === 'kette-unterbrochen' && bruch.bei === 2,
    'Bruch an Position 2 wird erkannt');

// ── Gegenprobe: es wurde ueberhaupt etwas geprueft ───────────────────────
gruppe('Gegenprobe');
ok(bestanden >= 62, `es sind genug Pruefungen gelaufen (${bestanden})`);

console.log(`\nbh-b2b: ${bestanden} ok, ${fehlgeschlagen} fehlgeschlagen`);
process.exit(fehlgeschlagen ? 1 : 0);
