// WebUntis → Klassenprofil (v8.5.11): klasse-profil.js ausUntis() / untisLink().
// Synthetischer iCal-Export einer Teilzeitklasse ueber zwoelf Wochen:
//   Woche A: nur Mittwoch, Woche B: Mittwoch + Donnerstag (im Wechsel)
//   zwei Blockwochen am Stueck (Mo–Fr), eine Ferienwoche ohne Termine
//   Raster 07:45, 45 min, Pausen nach der 2. (15 min) und 4. Stunde (20 min)
//   Stoerungen: eine ausgefallene Stunde, eine Vertretung, eine einmalige Pruefung 08:10,
//   Doppelstunde als EIN 90-min-Termin, ein Termin in UTC (Z), Samstag
// Lauf: node tools/untis-klasse.test.mjs
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const K = require('../Assets/js/klasse-profil.js');

let fehler = 0, n = 0;
const ok = (b, msg, extra) => { n++; console.log((b ? '  ok   ' : '  FAIL ') + msg + (b || extra === undefined ? '' : '  → ' + extra)); if (!b) fehler++; };
const J = JSON.stringify;

// ── Stundenraster der Schule ──
const BEGINN = [465, 510, 570, 615, 680, 725];   // 07:45 08:30 | 09:30 10:15 | 11:20 12:05
const pad = (x) => String(x).padStart(2, '0');
const lokal = (d, min) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(Math.floor(min / 60))}${pad(min % 60)}00`;
let uid = 0;
const termin = (d, von, bis, fach, extra = '') =>
    `BEGIN:VEVENT\r\nUID:t${uid++}\r\nDTSTART;TZID=Europe/Berlin:${lokal(d, von)}\r\nDTEND;TZID=Europe/Berlin:${lokal(d, bis)}\r\nSUMMARY:${fach}\r\n${extra}END:VEVENT\r\n`;
const stunde = (d, h, fach, extra) => termin(d, BEGINN[h - 1], BEGINN[h - 1] + 45, fach, extra);

const MI = ['LF5', 'LF5', 'Deutsch', 'Deutsch', 'Politik', 'Politik'];
const DO = ['LF6', 'LF6', 'Englisch', 'Englisch'];
const BLOCK = ['LF7', 'LF7', 'LF7', 'LF7'];
const start = new Date(2026, 8, 7);   // Mo 07.09.2026 (gerade Paritaet: siehe Rechnung im Code)
const tag = (w, wt) => { const d = new Date(start); d.setDate(d.getDate() + w * 7 + wt - 1); return d; };
let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Untis//DE\r\n';
const BLOCKWOCHEN = [6, 7], FERIEN = [3];
for (let w = 0; w < 12; w++) {
    if (FERIEN.includes(w)) continue;
    if (BLOCKWOCHEN.includes(w)) { for (let wt = 1; wt <= 5; wt++) BLOCK.forEach((f, i) => { ics += stunde(tag(w, wt), i + 1, f); }); continue; }
    const mi = tag(w, 3);
    MI.forEach((f, i) => {
        if (w === 0 && i === 0) { ics += termin(mi, BEGINN[0], BEGINN[1] + 45, 'LF5'); return; }          // Doppelstunde als ein Termin
        if (w === 1 && i === 1) return;                                                                 // im 2. Termin der Doppelstunde unten
        if (w === 2 && i === 4) { ics += stunde(mi, 5, 'Politik', 'STATUS:CANCELLED\r\n'); return; }      // Ausfall
        if (w === 4 && i === 2) { ics += stunde(mi, 3, 'Sport'); return; }                               // Vertretung
        if (w === 5 && i === 3) {                                                                       // dieselbe Stunde in UTC
            const d = new Date(mi); d.setHours(10, 15, 0, 0);
            const z = (x) => `${x.getUTCFullYear()}${pad(x.getUTCMonth() + 1)}${pad(x.getUTCDate())}T${pad(x.getUTCHours())}${pad(x.getUTCMinutes())}00Z`;
            const e = new Date(d.getTime() + 45 * 60000);
            ics += `BEGIN:VEVENT\r\nDTSTART:${z(d)}\r\nDTEND:${z(e)}\r\nSUMMARY:Deutsch\r\nEND:VEVENT\r\n`; return;
        }
        ics += stunde(mi, i + 1, f);
    });
    if (w === 1) ics += termin(mi, BEGINN[0], BEGINN[1] + 45, 'LF5').replace('UID:', 'UID:x');
    if (w % 2 === 1) DO.forEach((f, i) => { ics += stunde(tag(w, 4), i + 1, f); });
    if (w === 8) ics += termin(tag(w, 3), 490, 580, 'Zwischenpruefung');                                    // einmalig 08:10
}
ics += stunde(tag(1, 6), 1, 'Samstagskurs');
ics += 'END:VCALENDAR\r\n';

// ── untisLink ──
console.log('untisLink');
ok(K.untisLink('webcal://neilo.webuntis.com/WebUntis/Ical.do?school=bbs&elemType=1&elemId=7') === 'https://neilo.webuntis.com/WebUntis/Ical.do?school=bbs&elemType=1&elemId=7', 'webcal-Kalenderlink wird https, bleibt sonst gleich');
ok(K.untisLink('https://neilo.webuntis.com/WebUntis/?school=bbs-x#/basic/timetable?entityType=1&entityId=123') ===
    'https://neilo.webuntis.com/WebUntis/ical?school=bbs-x&elementType=1&elementId=123', 'Seitenadresse einer Klasse → Kalenderlink mit elementType 1');
ok(K.untisLink('https://evil.example.com/ical?x=1') === null, 'fremder Host → null');
ok(K.untisLink('https://webuntis.com.evil.example/ical') === null, 'webuntis.com nur als echtes Domainende');
ok(K.untisLink('kein link') === null, 'Muell → null');

// ── ausUntis ──
console.log('ausUntis');
ok(K.ausUntis('hallo', '2026-10-16').fehler === 'kein_kalender', 'kein Kalender erkannt');
ok(K.ausUntis('BEGIN:VCALENDAR\r\nEND:VCALENDAR', '2026-10-16').fehler === 'keine_stunden', 'leerer Kalender erkannt');
const r = K.ausUntis(ics, '2026-10-16');   // Fr in Woche 5 ab Start (ungerade Seite: siehe unten)
ok(!r.fehler, 'Auswertung ohne Fehler', r.fehler);
const sp = r.stundenplan;
ok(J(sp.raster) === J({ start: '07:45', dauer: 45, pausen: [{ nach: 2, min: 15 }, { nach: 4, min: 20 }] }),
    'Raster: 07:45, 45 min, Pausen nach 2. (15) und 4. (20) — Pruefung um 08:10 ist keine eigene Stunde', J(sp.raster));
ok(r.info.stunden === 6, 'sechs Stunden erkannt', r.info.stunden);
ok(J(sp['3']) === J([{ s: 1, b: 2, f: 'LF5' }, { s: 3, b: 4, f: 'Deutsch' }, { s: 5, b: 6, f: 'Politik' }]),
    'Mittwoch (Woche A): Doppelstunde als ein Termin, Vertretung und Ausfall ueberstimmt', J(sp['3']));
ok(!sp['4'], 'Donnerstag steht NICHT in Woche A', J(sp['4']));
ok(r.info.mitB && sp.b && J(sp.b['4']) === J([{ s: 1, b: 2, f: 'LF6' }, { s: 3, b: 4, f: 'Englisch' }]), 'Woche B hat den Donnerstag', J(sp.b));
ok(sp.b && J(sp.b['3']) === J(sp['3']), 'Woche B hat denselben Mittwoch');
// B-Wochen im Test sind die ungeraden Wochen ab Start (w = 1, 3, 5 …): 14.09., 28.09., …
const bWochen = [1, 5, 9, 11].map((w) => K.montagVon(`${tag(w, 1).getFullYear()}-${pad(tag(w, 1).getMonth() + 1)}-${pad(tag(w, 1).getDate())}`));
ok(sp.b && bWochen.every((m) => K.istBWoche(sp, m)), 'Wechsel-Montag liegt so, dass genau die Donnerstags-Wochen B sind', sp.b && sp.b.wechsel);
ok(sp.b && !K.istBWoche(sp, '2026-09-07') && K.istBWoche(sp, '2026-09-14'), 'Gegenprobe: 07.09. ist A, 14.09. ist B');
ok(sp.b && sp.b.wechsel >= '2026-10-12', 'Wechsel-Montag liegt nicht in der Vergangenheit', sp.b && sp.b.wechsel);
ok(J(sp.block) === J({ 1: [{ s: 1, b: 4, f: 'LF7' }], 2: [{ s: 1, b: 4, f: 'LF7' }], 3: [{ s: 1, b: 4, f: 'LF7' }], 4: [{ s: 1, b: 4, f: 'LF7' }], 5: [{ s: 1, b: 4, f: 'LF7' }] }),
    'Blockwoche: Mo–Fr LF7', J(sp.block));
ok(J(r.bloecke) === J([{ von: '2026-10-19', bis: '2026-10-30' }]), 'zwei Blockwochen am Stueck = EIN Block 19.10.–30.10.', J(r.bloecke));
ok(J(r.schultage) === J([3]), 'Schultag jede Woche: Mittwoch', J(r.schultage));
ok(r.rhythmus.length === 1 && r.rhythmus[0].weekday === 4 && r.rhythmus[0].interval === 2, 'Donnerstag alle 2 Wochen', J(r.rhythmus));
ok(r.rhythmus[0] && K.istBWoche(sp, r.rhythmus[0].startDate), 'Rhythmus beginnt an einem Donnerstag in einer B-Woche', r.rhythmus[0] && r.rhythmus[0].startDate);
ok(J(r.faecher) === J(['LF5', 'Deutsch', 'Politik', 'LF6', 'Englisch', 'LF7']), 'Faecher in Reihenfolge, ohne Vertretung/Pruefung/Samstag', J(r.faecher));
ok(r.info.abgesagt === 1 && r.info.wochen === 11, 'Info: 1 Ausfall, 11 Wochen mit Unterricht', J(r.info));
ok(J(K.planVoll(sp)) === J(sp), 'Ergebnis ist schon normalisiert (Speichern aendert nichts)');
const heute = K.planFuerDatum(sp, '2026-10-01', r.bloecke);   // Do in einer B-Woche
ok(heute && heute.quelle === 'b' && heute.liste[0].von === '07:45' && heute.liste[1].von === '09:30', 'planFuerDatum: Do 01.10. ist B, mit Uhrzeiten', J(heute));
const imBlock = K.planFuerDatum(sp, '2026-10-21', r.bloecke);
ok(imBlock && imBlock.quelle === 'block', 'planFuerDatum: 21.10. liegt im Block', J(imBlock));

// Vollzeitklasse: jede Woche Mo–Fr → kein Block, keine Woche B
let voll = 'BEGIN:VCALENDAR\r\n';
for (let w = 0; w < 4; w++) for (let wt = 1; wt <= 5; wt++) voll += stunde(tag(w, wt), 1, 'Mathe');
const rv = K.ausUntis(voll + 'END:VCALENDAR', '2026-09-07');
ok(!rv.fehler && !rv.stundenplan.block && !rv.stundenplan.b && rv.bloecke.length === 0 && J(rv.schultage) === J([1, 2, 3, 4, 5]),
    'Vollzeitklasse: Mo–Fr jede Woche, weder Block noch Woche B', J(rv));

console.log(fehler ? `\n${fehler} von ${n} FAIL` : `\nalle ${n} gruen`);
process.exit(fehler ? 1 : 0);
