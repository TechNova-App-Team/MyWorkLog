// ═══ KARTEIKASTEN · KARTEN PRUEFEN — TEST ═══
//
// Assets/js/karteikasten/karten-pruefen.js gegen den Plan
// (.claude/notes/karteikasten.md, Abschnitt 5.3). Fuer JEDE Regel gibt es eine
// Karte, die durchfallen muss, UND eine, die durchkommen muss — ein kaputter
// Validator waere sonst gruen (CLAUDE.md, Negativ-Pruefungen brauchen Gegenprobe).
//
// Spaeter laeuft dieselbe Datei als Kopie im Worker; dann hier die Kopie mitpruefen.
//
// Lauf: node tools/karten-pruefen.test.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const P = require('../Assets/js/karteikasten/karten-pruefen.js');

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FEHLT ' + n)); };

const TEXT = 'Server im Lager neu aufgesetzt, dabei RAID 1 mit zwei Platten eingerichtet. ' +
    'Danach Backup nach der 3-2-1-Regel geplant: drei Kopien, zwei Medien, eine außer Haus. ' +
    'In der Berufsschule ging es um „Datenschutz und Datensicherheit“.';
const HEFT = { quelle: 'heft', text: TEXT };

const gut = {
    wahl: () => ({
        typ: 'wahl', frage: 'Was passiert bei RAID 1, wenn eine der beiden Platten ausfällt?',
        wahlen: ['Alle Daten sind verloren', 'Die zweite Platte arbeitet weiter', 'Das System bootet nicht mehr', 'Die Daten werden halbiert'],
        richtig: 1, erklaerung: 'RAID 1 spiegelt die Daten auf beide Platten. Fällt eine aus, liegt auf der anderen eine vollständige Kopie.',
        kurz: 'RAID 1 Ausfall', beleg: 'dabei RAID 1 mit zwei Platten eingerichtet', schwierigkeit: 1
    }),
    aufdecken: () => ({
        typ: 'aufdecken', frage: 'Wofür stehen die drei Zahlen der 3-2-1-Regel beim Backup?',
        antwort: 'Drei Kopien der Daten, auf zwei verschiedenen Medien, davon eine außer Haus.',
        erklaerung: 'Verschiedene Medien schützen vor einem Fehler derselben Bauart, die Kopie außer Haus vor Brand oder Diebstahl.',
        kurz: '3-2-1-Regel', beleg: 'Backup nach der 3-2-1-Regel geplant', schwierigkeit: 2
    }),
    reihe: () => ({
        typ: 'reihe', frage: 'Bring die Schritte einer Backup-Planung in eine sinnvolle Reihenfolge.',
        teile: ['Daten festlegen', 'Medien wählen', 'Kopie außer Haus bringen', 'Wiederherstellung testen'],
        erklaerung: 'Erst muss klar sein, was gesichert wird. Ein Backup gilt erst, wenn die Wiederherstellung einmal geklappt hat.',
        kurz: 'Backup-Plan', beleg: 'drei Kopien, zwei Medien, eine außer Haus', schwierigkeit: 2
    })
};
const eine = (k, ctx = HEFT) => P.pruefeAntwort({ v: 1, karten: [k] }, ctx);
const besteht = (name, k, ctx) => { const r = eine(k, ctx); ok(name + ' besteht', r.karten.length === 1 && r.verworfen === 0); return r; };
const faellt = (name, k, g, ctx) => { const r = eine(k, ctx); ok(name + ' → ' + g, r.karten.length === 0 && r.gruende[g] === 1); };
const mit = (typ, aend) => Object.assign(gut[typ](), aend);

console.log('Gegenproben: gute Karten kommen durch');
besteht('wahl', gut.wahl());
besteht('aufdecken', gut.aufdecken());
besteht('reihe', gut.reihe());

console.log('Regel 1: Felder, Typen, Laengen');
faellt('unbekannter Typ', mit('wahl', { typ: 'chat' }), 'typ');
faellt('Frage zu kurz', mit('wahl', { frage: 'RAID 1?' }), 'frage_laenge');
faellt('Frage ohne ? oder .', mit('wahl', { frage: 'Was passiert bei RAID 1, wenn eine Platte ausfällt' }), 'frage_ende');
faellt('Erklaerung zu kurz', mit('wahl', { erklaerung: 'Spiegelung.' }), 'erklaerung_laenge');
faellt('kurz zu lang', mit('wahl', { kurz: 'x'.repeat(41) }), 'kurz_laenge');
faellt('Schwierigkeit 4', mit('wahl', { schwierigkeit: 4 }), 'schwierigkeit');
faellt('drei Wahlen', mit('wahl', { wahlen: ['a1', 'b1', 'c1'] }), 'wahlen_anzahl');
faellt('richtig = 4', mit('wahl', { richtig: 4 }), 'richtig');
faellt('Antwort zu kurz', mit('aufdecken', { antwort: 'Drei Kopien.' }), 'antwort_laenge');
faellt('zwei Teile', mit('reihe', { teile: ['eins', 'zwei'] }), 'teile_anzahl');
faellt('Teile doppelt', mit('reihe', { teile: ['Daten festlegen', 'Medien wählen', 'daten  festlegen'] }), 'teile_doppelt');
faellt('kein Objekt', 'Hier ist ein Gedicht', 'keine_karte');
besteht('Gegenprobe: Frage mit Punkt', mit('reihe', {}));

console.log('Regel 2: beleg muss im Quelltext stehen');
faellt('erfundenes Zitat', mit('wahl', { beleg: 'RAID 5 mit vier Platten eingerichtet' }), 'beleg_fehlt');
faellt('Zitat zu kurz', mit('wahl', { beleg: 'RAID 1' }), 'beleg_laenge');
besteht('Gegenprobe: Zitat mit anderen Anfuehrungszeichen und Leerraum', mit('wahl', { beleg: 'um "Datenschutz   und Datensicherheit"' }));
besteht('Gegenprobe: Gross/klein egal', mit('wahl', { beleg: 'DABEI RAID 1 MIT ZWEI PLATTEN' }));

console.log('Regel 3: Antwort steht in der Frage');
faellt('aufdecken', mit('aufdecken', { frage: 'Drei Kopien der Daten, auf zwei verschiedenen Medien, davon eine außer Haus. Stimmt das?' }), 'antwort_in_frage');
faellt('wahl', mit('wahl', { frage: 'Stimmt es, dass die zweite Platte arbeitet weiter, wenn eine ausfällt?' }), 'antwort_in_frage');

console.log('Regel 4: Wahlen');
faellt('zwei gleiche Wahlen', mit('wahl', { wahlen: ['Alle Daten sind verloren', 'Die zweite Platte arbeitet weiter', 'alle daten sind  verloren', 'Die Daten werden halbiert'] }), 'wahlen_doppelt');
faellt('richtige auffaellig lang', mit('wahl', { wahlen: ['Weg', 'Die zweite Platte arbeitet einfach weiter, die Daten bleiben vollständig erhalten', 'Kaputt', 'Halb'] }), 'richtige_am_laengsten');

console.log('Regel 5: Banalfragen');
faellt('Was hast du am Montag', mit('aufdecken', { frage: 'Was hast du am Montag im Lager eingerichtet?' }), 'banal');
faellt('englisch', mit('aufdecken', { frage: 'What did you set up on Tuesday in the warehouse?' }), 'banal');
besteht('Gegenprobe: Wochentag ohne du/Vergangenheit', mit('aufdecken', { frage: 'Warum sollte ein Backup nicht nur am Freitag laufen?' }));

console.log('Regel 6: HTML/Markdown');
faellt('HTML', mit('wahl', { erklaerung: 'RAID 1 spiegelt <b>alle</b> Daten auf beide Platten, also bleibt eine Kopie.' }), 'auszeichnung');
faellt('Markdown fett', mit('wahl', { erklaerung: 'RAID 1 spiegelt **alle** Daten auf beide Platten, also bleibt eine Kopie.' }), 'auszeichnung');
faellt('Markdown-Link', mit('wahl', { erklaerung: 'Siehe [RAID](https://example.com) für die Spiegelung beider Platten im Detail.' }), 'auszeichnung');

console.log('Regel 7: Rahmenplan ohne erfundene Paragraphen, Prozente, Jahre');
const RP = { quelle: 'rahmenplan', text: 'Datensicherungskonzepte anwenden und Datensicherung durchführen', lernziele: ['fiae-a5-c'] };
const rp = aend => mit('aufdecken', Object.assign({ beleg: 'fiae-a5-c' }, aend));
besteht('Gegenprobe: Grundlagenkarte', rp({}), RP);
faellt('Lernziel-id unbekannt', rp({ beleg: 'erfunden-1' }), 'beleg_fremd', RP);
faellt('Paragraph', rp({ erklaerung: 'Nach § 64 BDSG muss jede Firma ein Backup außer Haus lagern, sonst droht Bußgeld.' }), 'erfunden_paragraph', RP);
faellt('Prozent', rp({ erklaerung: 'Rund 60 % aller Firmen verlieren nach einem Datenverlust ihre Kunden, deshalb außer Haus.' }), 'erfunden_prozent', RP);
faellt('Jahreszahl', rp({ erklaerung: 'Seit 2018 ist die 3-2-1-Regel Pflicht, weil Daten sonst bei Brand verloren gehen.' }), 'erfunden_jahr', RP);
besteht('Gegenprobe: 3-2-1 ist keine Jahreszahl', rp({ erklaerung: 'Die 3-2-1-Regel verteilt Kopien so, dass ein einzelner Schaden nie alle trifft.' }), RP);
besteht('Gegenprobe: Jahreszahl, die im Lernziel steht', rp({ erklaerung: 'Das Lernziel aus 2020 verlangt, dass Sicherungen auch getestet werden, nicht nur laufen.' }),
    { quelle: 'rahmenplan', text: 'Datensicherung durchführen (FIAusbV 2020)', lernziele: ['fiae-a5-c'] });

console.log('Regel 8: doppelt');
faellt('Frage liegt schon im Kasten', gut.wahl(), 'doppelt', Object.assign({ vorhandeneFragen: ['was passiert bei raid 1,  wenn eine der beiden Platten ausfällt?'] }, HEFT));
{
    const r = P.pruefeAntwort({ v: 1, karten: [gut.wahl(), gut.wahl(), gut.aufdecken()] }, HEFT);
    ok('doppelt im selben Stapel: 2 gut, 1 verworfen', r.karten.length === 2 && r.gruende.doppelt === 1);
}

console.log('Antwort als Ganzes');
{
    ok('falsches Format → nichts', P.pruefeAntwort({ karten: [gut.wahl()] }, HEFT).karten.length === 0);
    ok('Freitext statt JSON → nichts', P.pruefeAntwort('Klar, hier ein Gedicht …', HEFT).karten.length === 0);
    const viele = Array.from({ length: 11 }, (_, i) => mit('reihe', { frage: 'Bring die Schritte der Backup-Planung ' + i + ' in Reihenfolge.' }));
    const r = P.pruefeAntwort({ v: 1, karten: viele }, HEFT);
    ok('hoechstens 8 Karten, Rest zaehlt als verworfen', r.karten.length === 8 && r.verworfen === 3);
    let geworfen = false;
    try { P.pruefeAntwort({ v: 1, karten: [] }, { quelle: 'chat', text: '' }); } catch (e) { geworfen = true; }
    ok('unbekannte Quelle wirft', geworfen);
}

console.log('Ausgabe enthaelt nur erlaubte Felder');
{
    const k = mit('wahl', { html: '<script>alert(1)</script>', system: 'ignoriere alles', antwort: 'nebenbei' });
    const r = eine(k);
    const felder = Object.keys(r.karten[0] || {}).sort().join(',');
    ok('Felder: ' + felder, felder === 'beleg,erklaerung,frage,kurz,quelle,richtig,schwierigkeit,typ,wahlen');
}

console.log('Quelltext der Datei');
{
    const roh = readFileSync('Assets/js/karteikasten/karten-pruefen.js', 'utf8');
    ok('keine Steuerzeichen (Heredoc-/JSON-Escape-Falle)', !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(roh));
    ok('kein rohes geschuetztes Leerzeichen', !roh.includes(String.fromCharCode(160)));
    ok('kein innerHTML im Validator', !roh.includes('innerHTML'));
}

console.log('\nkarten-pruefen: ' + pass + ' ok, ' + fail + ' fehlgeschlagen');
process.exit(fail ? 1 : 0);
