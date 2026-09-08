// Prueft im Ausbilder-Cockpit, welche Woche als bereits unterschrieben gilt und
// welche wirklich wartet — und dass der Anteilsbalken danach immer noch genau
// 100 % ergibt (die Falle aus .claude/notes/berichtsheft-b2b.md: sich
// ueberschneidende Zaehler summieren darueber).
//
// 🔴 Der Anlass fuer diese Datei war ein Fehlgriff, der in den Unit-Tests GRUEN
// war und erst an echten Daten auffiel: die Bedingung hing an
// `quelle === 'ihk-import'`. Alles, was vor Einfuehrung der Herkunftsmarke
// importiert wurde, traegt aber `quelle = 'local'` — gemessen 36 signed + 17
// complete, keine einzige mit Herkunft. Die Regel griff also nie, waehrend der
// Test sie mit frisch erfundenen Zeilen bestaetigte. Deshalb prueft er unten
// ausdruecklich den BESTANDSFALL mit.
//
// Die Funktionen liegen inline in pages/ausbilder/index.html. Statt sie an
// Markern auszuschneiden (bricht an CRLF, siehe CLAUDE.md) wird die Datei
// eingelesen, auf LF normalisiert und die einzelne Funktion ueber ihren Namen
// geholt — sie stehen dort auf Einrueckung 8, also endet jede an der ersten
// Zeile, die nur aus '        }' besteht.
import { readFileSync } from 'node:fs';

const PFAD = 'pages/ausbilder/index.html';
const SRC = readFileSync(PFAD, 'utf8').split('\r\n').join('\n');

let ok = 0, fehler = 0;
function ist(bedingung, name) {
  if (bedingung) { ok++; console.log('  ok    ' + name); }
  else { fehler++; console.log('  FEHLT ' + name); }
}

function holeFunktion(name) {
  const start = SRC.indexOf('        function ' + name + '(');
  if (start === -1) throw new Error('Funktion nicht gefunden: ' + name);
  const ende = SRC.indexOf('\n        }\n', start);
  if (ende === -1) throw new Error('Funktionsende nicht gefunden: ' + name);
  return SRC.slice(start, ende + '\n        }'.length);
}

const quelle = [holeFunktion('schonUnterschrieben'), holeFunktion('istOffen'), holeFunktion('zahlenFuer')].join('\n');
const { schonUnterschrieben, istOffen, zahlenFuer } =
  new Function(quelle + '\nreturn { schonUnterschrieben, istOffen, zahlenFuer };')();

console.log('\n▶ schonUnterschrieben haengt am STATUS, nicht an der Herkunft');

ist(schonUnterschrieben({ quelle: 'ihk-import', status: 'signed' }) === true,
  'IHK-Import mit Status signed → bereits unterschrieben');
ist(schonUnterschrieben({ quelle: 'local', status: 'signed' }) === true,
  'BESTANDSFALL: signed OHNE Herkunftsmarke zaehlt genauso — daran ist der erste Anlauf gescheitert');
ist(schonUnterschrieben({ status: 'signed' }) === true,
  'auch ganz ohne quelle-Feld (aeltere Zeilen)');
ist(schonUnterschrieben({ quelle: 'ihk-import', status: 'complete' }) === false,
  'Import ohne Unterschrift im PDF wartet weiter');
ist(schonUnterschrieben({ quelle: 'local', status: 'complete' }) === false,
  'fertig, aber nicht unterschrieben → wartet');
ist(schonUnterschrieben({ quelle: 'local', status: 'signed', freigabe: { entscheidung: 'approved' } }) === false,
  'liegt hier eine Freigabe, gewinnt die (sonst verschwaende die Karte sie)');

console.log('\n▶ istOffen');

ist(istOffen({ quelle: 'local', status: 'signed' }) === false,
  'eine unterschriebene Woche steht nicht auf der Aufgabenliste');
ist(istOffen({ quelle: 'local', status: 'complete' }) === true,
  'eine fertige, nicht unterschriebene Woche schon');
ist(istOffen({ quelle: 'local', status: 'incomplete' }) === false,
  'unfertige Woche ist keine Aufgabe');

console.log('\n▶ Der gemeldete Fall: 36 signed + 17 complete, alle quelle=local');

const echt = [];
for (let i = 0; i < 36; i++) echt.push({ quelle: 'local', status: 'signed', kw: i + 1 });
for (let i = 0; i < 17; i++) echt.push({ quelle: 'local', status: 'complete', kw: i + 40 });
const e = zahlenFuer(echt);

ist(e.eingereicht === 53, '53 eingereichte Wochen (ist ' + e.eingereicht + ')');
ist(e.ihk === 36, '36 gelten als bereits unterschrieben (ist ' + e.ihk + ')');
ist(e.offen === 17, 'nur 17 warten wirklich — vorher meldete die Seite 53 (ist ' + e.offen + ')');
ist(e.abgezeichnet === 0, 'null von diesem Ausbilder abgezeichnet — das war korrekt und bleibt so');
ist(e.abgezeichnet + e.ihk + e.geaendert + e.zurueck + e.unentschieden === e.eingereicht,
  'Segmente summieren auf die eingereichten Wochen');

console.log('\n▶ zahlenFuer — gemischter Bestand, Balken muss 100 % ergeben');

const bestand = [
  { quelle: 'ihk-import', status: 'signed' },                                     // unterschrieben
  { quelle: 'local', status: 'signed' },                                          // unterschrieben (Bestand)
  { quelle: 'ihk-import', status: 'complete' },                                   // offen
  { quelle: 'local', status: 'complete' },                                        // offen
  { quelle: 'local', status: 'signed', freigabe: { entscheidung: 'approved' } },   // abgezeichnet
  { quelle: 'local', status: 'complete', freigabe: { entscheidung: 'rejected' } }, // zurueck
  { quelle: 'local', status: 'complete', freigabe: { entscheidung: 'approved' }, veraendert: true },
  { quelle: 'local', status: 'complete', freigabe: { entscheidung: 'rejected' }, nachgebessert: true },
  { quelle: 'local', status: 'incomplete' }                                       // in Arbeit
];
const z = zahlenFuer(bestand);

ist(z.ihk === 2, 'zwei bereits unterschriebene (ist ' + z.ihk + ')');
ist(z.ihkGesamt === 2, 'zwei stammen aus dem Import — unabhaengig vom Status (ist ' + z.ihkGesamt + ')');
ist(z.eingereicht === 8, 'acht eingereichte Wochen (ist ' + z.eingereicht + ')');
ist(z.inArbeit === 1, 'eine Woche in Arbeit');
ist(z.abgezeichnet === 1, 'eine selbst abgezeichnet');
ist(z.zurueck === 1, 'eine zurueckgegeben');
ist(z.geaendert === 1, 'eine nach der Freigabe geaendert');
ist(z.ueberarbeitet === 1, 'eine ueberarbeitet');

const summe = z.abgezeichnet + z.ihk + z.geaendert + z.zurueck + z.unentschieden;
ist(summe === z.eingereicht,
  'Segmente summieren auf die eingereichten Wochen: ' + summe + ' von ' + z.eingereicht);
ist(z.unentschieden >= 0, 'unentschieden wird nicht negativ (ist ' + z.unentschieden + ')');
ist(z.offen === 4, 'vier Wochen warten (nicht 6 wie ohne die Unterscheidung) — ist ' + z.offen);

console.log('\n▶ Gegenprobe');
ist(ok + fehler >= 24, 'es sind genug Pruefungen gelaufen (' + (ok + fehler) + ')');

console.log('\nausbilder-unterschrieben: ' + ok + ' ok, ' + fehler + ' fehlgeschlagen');
process.exit(fehler ? 1 : 0);
