// Prueft die Wechsel-Bruecke aus components/import/import.js ohne Browser.
//
// Warum Tests hier besonders: Der Import schreibt Hunderte Eintraege auf
// einmal in data.entries. Rechnet er `expected`/`diff` auch nur leicht anders
// als handleEntry() in dashboard.js, stimmt der Saldo danach nicht mehr — und
// zwar unauffaellig, weil jeder einzelne Tag plausibel aussieht. Die Tabelle
// in Abschnitt 4 nagelt die Regeln fest.
//
// Aufruf:  node tools/import-wechsel.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const src = fs.readFileSync(path.join(ROOT, 'components/import/import.js'), 'utf8');

const dom = new JSDOM('<!doctype html><body>', { runScripts: 'outside-only' });
const { window } = dom;
// Node 18+ hat DecompressionStream global; jsdom nicht — durchreichen, damit
// der .xlsx-Pfad hier genauso laeuft wie im Browser.
window.DecompressionStream = globalThis.DecompressionStream;
window.Blob = globalThis.Blob;
window.Response = globalThis.Response;
window.TextDecoder = globalThis.TextDecoder;
window.eval(src);
const W = window;

let fails = 0;
function check(name, ok, detail = '') {
    if (!ok) fails++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? '   → ' + detail : ''}`);
}
const eq = (name, got, want) => check(name, got === want, `${JSON.stringify(got)} statt ${JSON.stringify(want)}`);

// ═══ 1. Werte deuten ════════════════════════════════════════════════════
console.log('\nDatum');
eq('deutsches Datum', W.mwlParseDateCell('03.08.2026'), '2026-08-03');
eq('ISO', W.mwlParseDateCell('2026-08-03'), '2026-08-03');
eq('Schrägstriche', W.mwlParseDateCell('3/8/2026'), '2026-08-03');
eq('zweistelliges Jahr', W.mwlParseDateCell('03.08.26'), '2026-08-03');
eq('Excel-Seriennummer', W.mwlParseDateCell('46237'), '2026-08-03');
eq('31. Februar wird abgelehnt', W.mwlParseDateCell('31.02.2026'), null);
eq('Stundenzahl ist kein Datum', W.mwlParseDateCell('8,5'), null);
eq('leer', W.mwlParseDateCell(''), null);

console.log('\nUhrzeit');
eq('HH:MM', W.mwlParseTimeCell('08:00'), '08:00');
eq('einstellig', W.mwlParseTimeCell('8:05'), '08:05');
eq('mit Sekunden', W.mwlParseTimeCell('16:30:00'), '16:30');
eq('Excel-Tagesbruchteil', W.mwlParseTimeCell('0.5'), '12:00');
eq('25:00 gibt es nicht', W.mwlParseTimeCell('25:00'), null);

console.log('\nStunden');
eq('Komma', W.mwlParseHours('8,5'), 8.5);
eq('Punkt', W.mwlParseHours('8.5'), 8.5);
eq('Doppelpunkt', W.mwlParseHours('8:30'), 8.5);
eq('mit Einheit', W.mwlParseHours('7,75 Std.'), 7.75);
eq('h und min', W.mwlParseHours('8h 15m'), 8.25);
eq('nur Minuten', W.mwlParseHours('90 min'), 1.5);
eq('negativ', W.mwlParseHours('-1:30'), -1.5);
eq('Text', W.mwlParseHours('krank'), null);

console.log('\nTyp-Zuordnung');
eq('Urlaub', W.mwlMapType('Urlaub'), 'vacation');
eq('Feiertag schlägt Urlaubstag nicht', W.mwlMapType('Feiertag'), 'holiday');
eq('krank', W.mwlMapType('Krankheit'), 'sick');
eq('Berufsschule', W.mwlMapType('Berufsschule'), 'school');
eq('Gleitzeit', W.mwlMapType('Zeitausgleich'), 'gleittag');
eq('englisch', W.mwlMapType('Annual leave'), 'vacation');
eq('leer nimmt den Vorgabewert', W.mwlMapType('', 'school'), 'school');
eq('Unbekanntes wird Arbeit', W.mwlMapType('Blafasel'), 'work');
// Kuerzel duerfen nur exakt treffen. Als Teilstring gesucht machte das "u"
// fuer Urlaub aus jedem Wort mit u einen Urlaubstag.
eq('Kürzel U exakt', W.mwlMapType('U'), 'vacation');
eq('Kürzel frisst nicht Berufsschule', W.mwlMapType('Berufsschule'), 'school');
eq('Kürzel frisst nicht Zeitausgleich', W.mwlMapType('Zeitausgleich'), 'gleittag');
eq('Kürzel frisst nicht Korrektur', W.mwlMapType('Korrektur'), 'korrektur');
eq('Kürzel frisst nicht Aussendienst', W.mwlMapType('Aussendienst'), 'work');

// ═══ 2. CSV ═════════════════════════════════════════════════════════════
console.log('\nCSV');
const csv = [
    'Datum;Von;Bis;Pause;Typ;Projekt;Bemerkung',
    '03.08.2026;08:00;16:30;30;Arbeit;Kunde A;"Ticket 4711; erledigt"',
    '04.08.2026;08:00;17:00;45;Arbeit;;Doku',
    '05.08.2026;;;;Berufsschule;;',
].join('\n');
eq('Trennzeichen erkannt', W.mwlSniffDelimiter(csv), ';');
const rows = W.mwlParseDelimited(csv);
eq('Zeilenzahl', rows.length, 4);
eq('Semikolon in Anführungszeichen bleibt im Feld', rows[1][6], 'Ticket 4711; erledigt');

const a = W.mwlAnalyzeRows(rows);
check('Kopfzeile erkannt', a.hadHeader === true);
eq('Datum-Spalte', a.mapping.date, 0);
eq('Von-Spalte', a.mapping.start, 1);
eq('Bis-Spalte', a.mapping.end, 2);
eq('Pause-Spalte', a.mapping.break, 3);
eq('Typ-Spalte', a.mapping.type, 4);
eq('Projekt-Spalte', a.mapping.project, 5);
eq('Notiz-Spalte', a.mapping.info, 6);

console.log('\nTabulator und fehlende Kopfzeile');
const tsv = '03.08.2026\t08:00\t16:00\n04.08.2026\t08:00\t16:00';
const b = W.mwlAnalyzeRows(W.mwlParseDelimited(tsv));
check('ohne Kopfzeile geht keine Zeile verloren', b.hadHeader === false && b.body.length === 2, `${b.body.length} Zeilen`);
eq('Datum am Inhalt erkannt', b.mapping.date, 0);
eq('Von am Inhalt erkannt', b.mapping.start, 1);
eq('Bis am Inhalt erkannt', b.mapping.end, 2);

// ═══ 3. Eintraege ableiten ══════════════════════════════════════════════
// Soll: Mo–Do 8, Fr 4 — bewusst NICHT die Vorgabewerte, damit auffaellt,
// wenn irgendwo eine feste Zahl steht statt der Einstellung.
const SOLL = [0, 8, 8, 8, 8, 4, 0];
const expectedFor = (dateStr) => SOLL[new Date(dateStr + 'T12:00:00').getDay()];
const bauen = (rows, mapping, extra = {}) =>
    W.mwlBuildPreview(rows, mapping, Object.assign({ expectedFor, jobId: 'primary' }, extra));

console.log('\nZeitspanne und Pause');
const p1 = bauen(a.body, a.mapping);
const e0 = p1[0].entry;
eq('Ist = Spanne minus Pause', e0.worked, 8);          // 08:00–16:30 = 8,5 − 0,5
eq('Soll aus den Einstellungen', e0.expected, 8);      // Montag
eq('Diff', e0.diff, 0);
eq('Startzeit übernommen', e0.start, '08:00');
eq('Pause in Minuten', e0.breakMins, 30);
eq('Projekt', e0.project, 'Kunde A');
eq('Notiz', e0.info, 'Ticket 4711; erledigt');

const e1 = p1[1].entry;
eq('Dienstag: 9h − 45min = 8,25', e1.worked, 8.25);
eq('Dienstag Diff', e1.diff, 0.25);

const e2 = p1[2].entry;
eq('Berufsschule zählt als voller Tag', e2.worked, 8);
eq('Berufsschule Diff immer 0', e2.diff, 0);

console.log('\nRegeln je Typ (gespiegelt aus handleEntry)');
// Freitag 07.08.2026, Soll 4 h
const mk = (typ, extra = '') => W.mwlParseDelimited(`Datum;Typ;Stunden\n07.08.2026;${typ};${extra}`);
const one = (typ, extra) => {
    const rr = mk(typ, extra);
    const aa = W.mwlAnalyzeRows(rr);
    return bauen(aa.body, aa.mapping)[0];
};
const urlaub = one('Urlaub', '');
eq('Urlaub: Ist = Soll', urlaub.entry.worked, 4);
eq('Urlaub: Diff 0', urlaub.entry.diff, 0);
const krank = one('Krankheit', '');
eq('Krank: Ist = Soll', krank.entry.worked, 4);
const feier = one('Feiertag', '');
eq('Feiertag: Diff 0', feier.entry.diff, 0);
const gleit = one('Gleittag', '');
eq('Gleittag: Ist 0', gleit.entry.worked, 0);
eq('Gleittag: Diff = -Soll', gleit.entry.diff, -4);
const korr = one('Korrektur', '2,5');
eq('Korrektur: Diff = Stunden', korr.entry.diff, 2.5);
eq('Korrektur: kein Soll', korr.entry.expected, 0);

console.log('\nSplit-Shift: das Tagessoll zählt einmal pro Tag');
const split = W.mwlParseDelimited(
    'Datum;Von;Bis\n03.08.2026;08:00;12:00\n03.08.2026;18:00;20:00');
const sa = W.mwlAnalyzeRows(split);
const sp = bauen(sa.body, sa.mapping);
eq('erster Block trägt das Soll', sp[0].entry.expected, 8);
eq('zweiter Block trägt keins', sp[1].entry.expected, 0);
eq('zweiter Block ist reine Zusatzzeit', sp[1].entry.diff, 2);
check('Zusatzzeit wird begründet', (sp[1].warn || []).some(w => /Zusatzzeit/.test(w)), (sp[1].warn || []).join());
eq('Saldo des Tages', sp[0].entry.diff + sp[1].entry.diff, -2);   // 4h + 2h gegen 8h Soll

console.log('\nÜber Mitternacht');
const nacht = W.mwlAnalyzeRows(W.mwlParseDelimited('Datum;Von;Bis\n03.08.2026;22:00;06:00'));
eq('Spätschicht = 8 h statt -16', bauen(nacht.body, nacht.mapping)[0].entry.worked, 8);

console.log('\nDubletten und kaputte Zeilen');
const dub = W.mwlAnalyzeRows(W.mwlParseDelimited(
    'Datum;Stunden\n03.08.2026;8\n03.08.2026;8\nkein Datum;8\n04.08.2026;\n'));
const dp = bauen(dub.body, dub.mapping, { bestehend: new Set(['2026-08-05|primary']) });
check('doppelter Tag markiert', dp[1].dublette === true);
check('doppelter Tag ist abgewählt', dp[1].take === false);
check('erster Tag bleibt gewählt', dp[0].take === true);
check('Zeile ohne Datum fliegt raus', dp[2].ok === false, dp[2].reason);
check('Zeile ohne Zeitangabe fliegt raus', dp[3].ok === false, dp[3].reason);

const vorhanden = W.mwlAnalyzeRows(W.mwlParseDelimited('Datum;Stunden\n05.08.2026;8'));
const vp = bauen(vorhanden.body, vorhanden.mapping, { bestehend: new Set(['2026-08-05|primary']) });
check('bereits vorhandener Tag wird erkannt', vp[0].dublette === true && vp[0].take === false);

// ═══ 4. xlsx ════════════════════════════════════════════════════════════
console.log('\nExcel (.xlsx)');
// Eine echte kleine Arbeitsmappe bauen: ZIP von Hand, deflate-raw ueber zlib.
function zip(files) {
    const enc = new TextEncoder();
    const locals = [], central = [];
    let offset = 0;
    for (const [name, text] of files) {
        const nameB = enc.encode(name);
        const raw = enc.encode(text);
        const comp = zlib.deflateRawSync(raw);
        const crc = zlib.crc32 ? zlib.crc32(raw) : crc32(raw);
        const lh = Buffer.alloc(30);
        lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8);
        lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22);
        lh.writeUInt16LE(nameB.length, 26);
        locals.push(lh, Buffer.from(nameB), comp);
        const ch = Buffer.alloc(46);
        ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6);
        ch.writeUInt16LE(8, 10); ch.writeUInt32LE(crc, 16);
        ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(raw.length, 24);
        ch.writeUInt16LE(nameB.length, 28); ch.writeUInt32LE(offset, 42);
        central.push(ch, Buffer.from(nameB));
        offset += 30 + nameB.length + comp.length;
    }
    const cd = Buffer.concat(central);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(files.length, 8); eocd.writeUInt16LE(files.length, 10);
    eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, cd, eocd]);
}
function crc32(buf) {
    let c, crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        c = (crc ^ buf[i]) & 0xff;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        crc = (crc >>> 8) ^ c;
    }
    return (crc ^ 0xffffffff) >>> 0;
}

const sharedXml = `<?xml version="1.0"?><sst count="5" uniqueCount="5">
<si><t>Datum</t></si><si><t>Stunden</t></si><si><t>Typ</t></si>
<si><t>Arbeit</t></si><si><t>Ur</t><t>laub</t></si></sst>`;
const sheetXml = `<?xml version="1.0"?><worksheet><sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>
<row r="2"><c r="A2"><v>46237</v></c><c r="B2"><v>8.5</v></c><c r="C2" t="s"><v>3</v></c></row>
<row r="3"><c r="A3"><v>46238</v></c><c r="C3" t="s"><v>4</v></c></row>
</sheetData></worksheet>`;
const buf = zip([
    ['xl/sharedStrings.xml', sharedXml],
    ['xl/worksheets/sheet1.xml', sheetXml],
    ['xl/theme/theme1.xml', '<theme/>'],
]);

const xrows = await W.mwlXlsxToRows(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
eq('Zeilen aus der Arbeitsmappe', xrows.length, 3);
eq('Kopfzeile aus sharedStrings', xrows[0][0], 'Datum');
eq('mehrteiliger Text zusammengesetzt', xrows[2][2], 'Urlaub');
eq('Lücke in der Zeile bleibt eine Lücke', xrows[2][1], '');

const xa = W.mwlAnalyzeRows(xrows);
const xp = bauen(xa.body, xa.mapping);
eq('Seriennummer wurde Datum', xp[0].entry.date, '2026-08-03');
eq('Stunden aus der Zelle', xp[0].entry.worked, 8.5);
eq('zweite Zeile ist Urlaub', xp[1].entry.type, 'vacation');
eq('Urlaub bekommt das Tagessoll', xp[1].entry.worked, 8);

console.log(fails ? `\n${fails} Pruefung(en) fehlgeschlagen\n` : '\nAlle Pruefungen bestanden\n');
process.exit(fails ? 1 : 0);
