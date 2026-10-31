// ═══ RAHMENPLÄNE — DATEN ═══
//
// Prüft die erzeugten Dateien in Assets/data/rahmenplaene/ (tools/rahmenplaene/bauen.mjs).
// Die Pass-Funktion „Rahmenplan-Lücken" verspricht auf /preise/, für JEDEN Beruf zu zeigen,
// welche Lernziele im Heft noch fehlen (Wunsch des Nutzers 31.10.2026: „auch ein Maurer").
// Ein Parser-Fehler fällt dort nicht auf — ein Beruf ohne Plan sieht aus wie ein Beruf ohne
// Lücken. Deshalb hier: Mindestmengen, Stichproben bekannter Berufe gegen den Gesetzestext,
// und Gegenproben, dass die Negativ-Prüfungen überhaupt etwas zu prüfen hatten.
//
// Lauf: node tools/rahmenplaene.test.mjs
import { readFileSync, readdirSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FEHLT ' + n)); };

const DIR = 'Assets/data/rahmenplaene/';
const dateien = readdirSync(DIR).filter(f => f.endsWith('.json') && f !== 'verzeichnis.json');
const vz = JSON.parse(readFileSync(DIR + 'verzeichnis.json', 'utf8'));
const plan = id => JSON.parse(readFileSync(DIR + id + '.json', 'utf8'));
const finde = name => vz.berufe.find(b => b.m === name);

console.log('Umfang');
ok(`mindestens 260 Verordnungen (${dateien.length})`, dateien.length >= 260);
ok(`mindestens 300 Berufe im Verzeichnis (${vz.berufe.length})`, vz.berufe.length >= 300);
ok('Verzeichnis hat Stand und Quelle', /^\d{4}-\d{2}-\d{2}$/.test(vz.stand) && vz.quelle.includes('gesetze-im-internet.de'));
ok('jeder Verzeichnis-Eintrag zeigt auf eine vorhandene Datei', vz.berufe.every(b => dateien.includes(b.id + '.json')));

console.log('Aufbau jeder Datei');
let positionen = 0, ziele = 0, ohnePflicht = [], leereZiele = 0, steuer = 0;
for (const f of dateien) {
  const roh = readFileSync(DIR + f, 'utf8');
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(roh)) steuer++;
  const p = JSON.parse(roh);
  p.berufe.forEach((b, i) => {
    const eigene = p.abschnitte.filter(a => a.pflicht && (a.berufe === null || a.berufe.includes(i)));
    if (!eigene.length) ohnePflicht.push(p.id + '#' + b.m);
  });
  for (const a of p.abschnitte) for (const pos of a.positionen) {
    positionen++;
    ziele += pos.ziele.length;
    if (!pos.titel || pos.ziele.some(z => !z || z.length < 3)) leereZiele++;
    if (pos.zeit.length !== a.fenster.length) leereZiele++;
  }
}
ok(`keine Steuerzeichen in den Daten (${steuer} Dateien betroffen)`, steuer === 0);
ok(`jeder Beruf hat mindestens einen Pflicht-Abschnitt (fehlt: ${ohnePflicht.slice(0, 5).join(', ')})`, ohnePflicht.length === 0);
ok(`mindestens 6000 Positionen (${positionen})`, positionen >= 6000);
ok(`mindestens 35000 Lernziele (${ziele})`, ziele >= 35000);
ok(`keine leeren Positionen/Lernziele, Zeitspalten passen (${leereZiele} Abweichungen)`, leereZiele === 0);

console.log('Stichproben gegen den Gesetzestext');
// Maurer: HochbauBAusbV § 5 — Stufenausbildung über den Hochbaufacharbeiter
const maurer = finde('Maurer');
ok('Maurer ist im Verzeichnis', !!maurer && maurer.id === 'hochbaubausbv');
if (maurer) {
  const p = plan(maurer.id);
  const eigene = p.abschnitte.filter(a => a.berufe === null || a.berufe.includes(maurer.i));
  const titel = eigene.flatMap(a => a.positionen.map(x => x.titel));
  ok('Maurer: „Herstellen von Baukörpern aus Steinen" ist drin', titel.some(t => /Baukörpern aus Steinen/.test(t)));
  ok('Maurer: integrative Position „Sicherheit und Gesundheit bei der Arbeit"', titel.some(t => /Sicherheit und Gesundheit bei der Arbeit/.test(t)));
  ok('Maurer: hat keine Schwerpunkt-Auswahl (die hat nur der Hochbaufacharbeiter)', maurer.v.length === 0);
}
const hfa = finde('Hochbaufacharbeiter');
ok('Hochbaufacharbeiter wählt seinen Schwerpunkt (4)', !!hfa && hfa.v.length === 4 && hfa.v.includes('Maurerarbeiten'));
const fi = finde('Fachinformatiker');
ok('Fachinformatiker: die vier Fachrichtungen', !!fi && ['Anwendungsentwicklung', 'Systemintegration', 'Daten- und Prozessanalyse', 'Digitale Vernetzung'].every(v => fi.v.includes(v)));
if (fi) {
  const p = plan(fi.id);
  const si = p.abschnitte.filter(a => a.variante === 'Systemintegration');
  ok('Fachinformatiker SI: eigener Abschnitt mit Zeitfenstern 1–18 / 19–36', si.length === 1 && si[0].fenster.map(f => f.von + '-' + f.bis).join(',') === '1-18,19-36');
  ok('Fachinformatiker: Abschnitt A gilt für alle Fachrichtungen (variante null)', p.abschnitte.some(a => a.variante === null && a.positionen.length >= 10));
  // Bis 31.10.2026 landeten alle Wochen in der ERSTEN Zeitspalte (Monate überschrieben die
  // Rasterspalten im Extraktor) — jede Position galt als „ab Monat 1 fällig".
  const a = p.abschnitte.find(x => x.variante === null && x.positionen.length >= 10);
  ok('FIAusbV Abschnitt A Nr. 9: 0 Wochen in 1–18, 5 Wochen in 19–36 (wie im Gesetz)', a && JSON.stringify(a.positionen.find(x => x.nr === '9').zeit) === '[0,5]');
  ok('Gegenprobe: in den Daten gibt es überhaupt Wochen in der zweiten Zeitspalte',
    dateien.some(f => plan(f.replace('.json', '')).abschnitte.some(x => x.fenster.length > 1 && x.positionen.some(q => q.zeit[1] > 0))));
}
ok('Koch / Köchin (Umlaut-Genitiv repariert)', vz.berufe.some(b => b.m === 'Koch' && b.w === 'Köchin'));
ok('Kaufmann für Büromanagement', !!finde('Kaufmann für Büromanagement'));
ok('Medizinischer Fachangestellter (Nominativ, nicht „Medizinischen")', !!finde('Medizinischer Fachangestellter'));
ok('Industriemechaniker hat die gemeinsamen Kernqualifikationen', (() => {
  const b = finde('Industriemechaniker'); if (!b) return false;
  return plan(b.id).abschnitte.some(a => a.berufe === null && a.positionen.some(x => /Berufsbildung/.test(x.titel)));
})());
ok('Fleischer (Schreibmaschinen-Tabelle) hat Positionen', (() => {
  const b = finde('Fleischer'); return !!b && plan(b.id).abschnitte.reduce((n, a) => n + a.positionen.length, 0) >= 10;
})());

console.log('Namen');
// Gegenprobe zuerst: es gibt überhaupt Namen zu prüfen
const namen = vz.berufe.map(b => b.m);
ok('es gibt Namen zu prüfen', namen.length > 0);
const genitiv = namen.filter(n => /(?:[^s]s|ers)$/.test(n.split(' ')[0]) && !/(ss|us|is|Kaufmanns)$/.test(n.split(' ')[0]) && /[a-zäöü]s$/.test(n.split(' ')[0]) && !/^(Asphaltbauer)$/.test(n));
ok(`kein Genitiv-s am Berufsnamen (${genitiv.slice(0, 5).join(', ')})`, genitiv.length === 0);
const reste = namen.filter(n => /\b(des|zum|zur|wird|werden|Ausbildungsberuf)\b/.test(n));
ok(`keine Satzreste im Namen (${reste.slice(0, 3).join(' | ')})`, reste.length === 0);
const varianten = vz.berufe.flatMap(b => b.v);
ok('es gibt Varianten zu prüfen', varianten.length > 50);
ok('Varianten nicht abgeschnitten (kein Ende auf „-")', varianten.every(v => !/-$/.test(v)));

console.log(`\n${pass} ok, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
