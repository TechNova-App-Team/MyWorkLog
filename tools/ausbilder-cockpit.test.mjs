// Prueft die Logik des Ausbilder-Cockpits seit v7.8.0: EIN Stapel ueber alle
// Azubis statt einer Klappkarte je Azubi.
//
//   node tools/ausbilder-cockpit.test.mjs
//
// Was hier festgehalten wird, weil es beim Umbau leicht kippt:
//  - standVon() ist die EINE Quelle fuer den Stand einer Woche. Liste, Detail,
//    Filter und Wochen-Streifen lesen sie — weicht eine Stelle ab, zeigt die
//    Zeile links etwas anderes als die Woche rechts.
//  - Sammel-Abzeichnen nur fuer die unauffaellige Woche. Eine geaenderte oder
//    ueberarbeitete Woche traegt einen Vergleich, den man ANSEHEN muss.
//  - "Zu pruefen" sortiert die AELTESTE Woche nach oben (§14 BBiG), alle
//    anderen Sichten die neueste.
//  - Die Suche liest nur die WERTE des Inhalts, nicht die Schluessel —
//    sonst traefe "mon" jede Woche (dailyActivities.monday).
//
// Die Funktionen liegen inline in pages/ausbilder/index.html auf Einrueckung 8
// und enden an der ersten Zeile '        }' (Muster aus
// ausbilder-ihk-herkunft.test.mjs; CRLF vorher normalisieren).
import { readFileSync } from 'node:fs';

const SRC = readFileSync('pages/ausbilder/index.html', 'utf8').split('\r\n').join('\n');

let ok = 0, fehler = 0;
function ist(bedingung, name) {
  if (bedingung) { ok++; console.log('  ok    ' + name); }
  else { fehler++; console.log('  FEHLT ' + name); }
}

function hole(name) {
  const start = SRC.indexOf('        function ' + name + '(');
  if (start === -1) throw new Error('Funktion nicht gefunden: ' + name);
  const ende = SRC.indexOf('\n        }\n', start);
  return SRC.slice(start, ende + '\n        }'.length);
}

// FILTER ist eine Tabelle, keine Funktion — als Ganzes aus der Quelle holen.
const fa = SRC.indexOf('        var FILTER = [');
const fe = SRC.indexOf('\n        ];\n', fa);
if (fa === -1 || fe === -1) throw new Error('FILTER-Tabelle nicht gefunden');
const FILTER_SRC = SRC.slice(fa, fe + '\n        ];'.length);

const namen = ['esc', 'fmtDate', 'monogramm', 'stateLabel', 'schonUnterschrieben', 'istOffen', 'zahlenFuer',
  'standVon', 'standLabel', 'sammelFaehig', 'filterFn', 'eintraege', 'passtAzubi', 'suchText', 'passtSuche',
  'sichtbar', 'tageSeit', 'alterText', 'azubiKarte'];
const mod = new Function(
  'function abL(de, en) { return de; }\nfunction abLocale() { return "de-DE"; }\n' +
  'function anteilsBalken() { return "<BALKEN>"; }\nfunction wochenStreifen() { return "<STREIFEN>"; }\n' +
  'var kontoDaten = null; var filter = { status: "offen", azubi: "", q: "" };\n' +
  FILTER_SRC + '\n' + namen.map(hole).join('\n') +
  '\nreturn { ' + namen.join(', ') + ', setze: function (d, f) { kontoDaten = d; filter = f; } };')();

// ── Testdaten ─────────────────────────────────────────────────────────
let n = 0;
function w(kw, bis, extra) {
  return Object.assign({ id: 'w' + (++n), kw, jahr: 2, datum_von: bis, datum_bis: bis, status: 'complete', quelle: 'local',
    inhalt: { dailyActivities: { monday: 'Switch konfiguriert', tuesday: '' }, department: 'IT' }, freigabe: null }, extra || {});
}
const ok_ = { entscheidung: 'approved' }, zurueck = { entscheidung: 'rejected' };

console.log('\n▶ standVon: eine Quelle fuer den Stand');
ist(mod.standVon(w(1, '2026-01-02')) === 'open', 'fertig, ohne Entscheidung → open');
ist(mod.standVon(w(1, '2026-01-02', { status: 'incomplete' })) === 'arbeit', 'Entwurf → arbeit (nicht "offen")');
ist(mod.standVon(w(1, '2026-01-02', { freigabe: ok_ })) === 'approved', 'abgezeichnet');
ist(mod.standVon(w(1, '2026-01-02', { freigabe: zurueck })) === 'rejected', 'zurueckgegeben');
ist(mod.standVon(w(1, '2026-01-02', { freigabe: ok_, veraendert: true })) === 'geaendert', 'nach Freigabe geaendert schlaegt approved');
ist(mod.standVon(w(1, '2026-01-02', { freigabe: zurueck, nachgebessert: true })) === 'nachgebessert', 'ueberarbeitet schlaegt rejected');
ist(mod.standVon(w(1, '2026-01-02', { status: 'signed' })) === 'ihk', 'unterschrieben ohne Freigabe → ihk');
ist(mod.standLabel('arbeit', {})[1] === 'In Arbeit', 'Entwurf heisst "In Arbeit", nicht "Offen"');

console.log('\n▶ Sammel-Abzeichnen nur fuer die unauffaellige Woche');
const faelle = [
  [w(1, '2026-01-02'), true, 'offen'],
  [w(1, '2026-01-02', { freigabe: ok_, veraendert: true }), false, 'geaendert'],
  [w(1, '2026-01-02', { freigabe: zurueck, nachgebessert: true }), false, 'ueberarbeitet'],
  [w(1, '2026-01-02', { status: 'incomplete' }), false, 'Entwurf'],
  [w(1, '2026-01-02', { freigabe: ok_ }), false, 'schon abgezeichnet'],
  [w(1, '2026-01-02', { status: 'signed' }), false, 'bereits unterschrieben'],
];
faelle.forEach(([b, soll, was]) => ist(mod.sammelFaehig(b) === soll, was + ' → ' + (soll ? 'waehlbar' : 'NICHT waehlbar')));
// Gegenprobe: die Liste enthaelt wirklich beide Sorten, sonst prueft sie nichts.
ist(faelle.some(f => f[1]) && faelle.some(f => !f[1]), 'Gegenprobe: waehlbare UND nicht waehlbare Faelle geprueft');
// Jede geaenderte/ueberarbeitete Woche ist offen, aber nie sammelfaehig.
ist(mod.istOffen(faelle[1][0]) && !mod.sammelFaehig(faelle[1][0]), 'geaendert: steht in "Zu prüfen", aber nicht im Sammel-Abzeichnen');

console.log('\n▶ Stapel: Filter, Sortierung, Azubi');
const lena = { name: 'Lena Brückner', berichte: [
  w(30, '2026-07-24'), w(31, '2026-07-31', { freigabe: ok_, veraendert: true }), w(34, '2026-08-21'),
  w(20, '2026-05-15', { freigabe: ok_ }), w(38, '2026-09-18', { status: 'incomplete' }) ] };
const mehmet = { name: 'Mehmet Yıldız', berichte: [ w(29, '2026-07-17'), w(36, '2026-09-04', { freigabe: zurueck }) ] };
const daten = { azubis: [lena, mehmet] };

mod.setze(daten, { status: 'offen', azubi: '', q: '' });
let s = mod.sichtbar();
ist(s.map(e => e.b.kw).join(',') === '29,30,31,34', 'Zu prüfen: alle Azubis, aelteste zuerst (29,30,31,34) — ist ' + s.map(e => e.b.kw).join(','));
ist(s.every(e => mod.istOffen(e.b)), 'Zu prüfen enthaelt nur offene Wochen');

mod.setze(daten, { status: 'alle', azubi: '', q: '' });
s = mod.sichtbar();
ist(s.length === 7, 'Alle: sieben Wochen');
ist(s[0].b.kw === 38 && s[s.length - 1].b.kw === 20, 'Alle: neueste zuerst');

mod.setze(daten, { status: 'offen', azubi: '1', q: '' });
s = mod.sichtbar();
ist(s.length === 1 && s[0].a === mehmet, 'Azubi-Filter: nur Mehmets offene Woche');

mod.setze(daten, { status: 'zurueck', azubi: '', q: '' });
ist(mod.sichtbar().map(e => e.b.kw).join() === '36', '"Beim Azubi" = zurueckgegebene Woche');
mod.setze(daten, { status: 'geaendert', azubi: '', q: '' });
ist(mod.sichtbar().map(e => e.b.kw).join() === '31', '"Geändert" = nach der Freigabe geaendert');
mod.setze(daten, { status: 'arbeit', azubi: '', q: '' });
ist(mod.sichtbar().map(e => e.b.kw).join() === '38', '"In Arbeit" = Entwurf');

console.log('\n▶ Suche');
function suche(q) { mod.setze(daten, { status: 'alle', azubi: '', q }); return mod.sichtbar().map(e => e.b.kw).sort((a, b) => a - b).join(','); }
ist(suche('30') === '30', '"30" ist die Kalenderwoche, nicht jede Zahl im Text');
ist(suche('KW 30') === '30', '"KW 30" ebenso');
ist(suche('week 36') === '36', '"week 36" (EN) ebenso');
ist(suche('mehmet') === '29,36', 'Name des Azubis');
ist(suche('switch') === '20,29,30,31,34,36,38', 'Tätigkeit im Inhalt');
ist(suche('monday') === '', 'Schluessel des Inhalts (monday) treffen NICHT');
ist(suche('dailyactivities') === '', 'Feldnamen treffen NICHT');
ist(suche('') === '20,29,30,31,34,36,38', 'leere Suche = alles');

console.log('\n▶ Alter der Woche');
ist(mod.alterText(0) === 'seit heute', '0 Tage');
ist(mod.alterText(1) === 'seit 1 Tag', 'Einzahl');
ist(mod.alterText(9) === 'seit 9 Tagen', 'unter zwei Wochen in Tagen');
ist(mod.alterText(64) === 'seit 9 Wochen', 'ab zwei Wochen in Wochen');
ist(mod.alterText(null) === '', 'ohne Datum kein Text');

console.log('\n▶ Monogramm');
ist(mod.monogramm('Lena Test (E2E)') === 'LT', 'Klammerwort zaehlt nicht mit (war "L(")');
ist(mod.monogramm('Mehmet Yıldız') === 'MY', 'normaler Name');
ist(mod.monogramm('Özge Ünal') === 'ÖÜ', 'Umlaute sind Buchstaben');
ist(mod.monogramm('') === '?', 'leer bleibt "?"');

console.log('\n▶ Azubi-Karte: drei Zustaende, nicht zwei');
const leer = mod.azubiKarte({ name: 'Sophie Krämer', berichte: [] }, 3);
ist(leer.includes('noch nichts eingereicht'), 'ohne Wochen: "noch nichts eingereicht"');
ist(!leer.includes('nichts offen'), 'ohne Wochen NICHT "nichts offen" (las sich wie "alles erledigt")');
const fertig = mod.azubiKarte({ name: 'Jonas', berichte: [w(1, '2026-01-02', { freigabe: ok_ })] }, 2);
ist(fertig.includes('nichts offen') && fertig.includes('is-ok'), 'alles entschieden: "nichts offen"');
ist(!fertig.includes('data-q="az-offen"'), 'ohne offene Woche kein "prüfen"-Knopf');
const offen = mod.azubiKarte(lena, 0);
ist(offen.includes('3 offen') && offen.includes('data-q="az-offen" data-ai="0"'), 'mit offenen Wochen: Zahl und Knopf in den Stapel, gefiltert auf diesen Azubi');
// Gepruefte wird NICHT in der Karte: kein Bestaetigen-Knopf, keine Wochenliste.
ist(!offen.includes('data-k="approve"'), 'die Karte selbst zeichnet nichts ab (eine Stelle zum Prüfen)');

// Freigabe widerrufen (v8.0.11): der Knopf steht NUR beim Unterzeichner. Der
// Trigger freigaben_widerruf prueft dasselbe — ein Knopf fuer alle waere ein
// Versprechen, das am Server scheitert.
console.log('\n▶ Widerruf: nur wer abgezeichnet hat, und nie ohne Grund');
const fuss = new Function(
  'function abL(de, en) { return de; }\nfunction abLocale() { return "de-DE"; }\n' +
  'var kontoIch = { name: "Hans", userId: "u-hans" };\n' +
  ['esc', 'fmtDate', 'kbd', 'rueckgabeFeld', 'wochenFuss', 'stateLabel', 'standLabel', 'schonUnterschrieben', 'standVon']
    .map(hole).join('\n') +
  '\nreturn { wochenFuss, standLabel };')();
const meine = { id: 'f1', ausbilder_id: 'u-hans', ausbilder_name: 'Hans', entscheidung: 'approved', erstellt_at: '2026-09-30T10:00:00Z' };
const fremde = Object.assign({}, meine, { ausbilder_id: 'u-peter', ausbilder_name: 'Peter' });
const fussMeine = fuss.wochenFuss(w(1, '2026-01-02', { freigabe: meine }), 'approved');
const fussFremd = fuss.wochenFuss(w(1, '2026-01-02', { freigabe: fremde }), 'approved');
const fussAlt = fuss.wochenFuss(w(1, '2026-01-02', { freigabe: { entscheidung: 'approved', ausbilder_id: 'u-hans' } }), 'approved');
ist(fussMeine.includes('data-k="revoke"') && fussMeine.includes('data-k="revoke-do"'), 'eigene Freigabe: Knopf + Feld zum Widerrufen');
ist(!fussFremd.includes('data-k="revoke'), 'Freigabe der Vertretung: kein Widerruf-Knopf');
ist(fussFremd.includes('von Peter') && fussFremd.includes('nur, wer abgezeichnet hat'), 'stattdessen steht, wer abgezeichnet hat und warum es keinen Knopf gibt');
ist(!fussAlt.includes('data-k="revoke'), 'ohne Freigabe-id (alter Stand) kein Knopf, der am Server scheitert');
ist(!fussMeine.includes('data-k="approve"') && !fussMeine.includes('data-k="reject"'), 'abgezeichnet: weder Bestaetigen noch einfaches Zurueckgeben');
ist(fussMeine.includes('abk-note-fehlt'), 'Widerruf traegt den Hinweis fuer ein leeres Grund-Feld');
ist(fuss.wochenFuss(w(1, '2026-01-02'), 'open').includes('abk-note-fehlt'), 'auch die normale Rueckgabe verlangt einen Text');
ist(fuss.standLabel('rejected', { freigabe: { entscheidung: 'rejected', widerruft: 'f1' } })[1] === 'Widerrufen', 'widerrufene Woche heisst "Widerrufen", nicht "Zurückgegeben"');
ist(fuss.standLabel('rejected', { freigabe: zurueck })[1] === 'Zurückgegeben', 'Gegenprobe: normale Rueckgabe heisst weiter "Zurückgegeben"');

// Der Klick-Handler darf eine leere Rueckgabe nicht abschicken.
const hStart = SRC.indexOf("if (k === 'reject-do' || k === 'revoke-do')");
const handler = hStart === -1 ? '' : SRC.slice(hStart);
const vorAbschicken = handler.slice(0, handler.indexOf('kontoEntscheiden('));
ist(hStart !== -1 && vorAbschicken.includes('if (!note)') && vorAbschicken.slice(vorAbschicken.indexOf('if (!note)')).includes('return;'),'Klick auf Zurückgeben/Widerrufen mit leerem Feld schickt nichts ab');

console.log(`\nausbilder-cockpit: ${ok} ok, ${fehler} fehlgeschlagen`);
if (ok === 0) process.exit(1);
process.exit(fehler ? 1 : 0);
