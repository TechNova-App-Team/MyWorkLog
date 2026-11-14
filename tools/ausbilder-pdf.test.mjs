// Gesamt-PDF auf /ausbilder/ (Assets/js/ausbilder-pdf.js) und die gemeinsame
// Abbildung Bericht → Vordruck (ihk-formulare.js ihkCtxAusBericht).
//
// Geprueft wird, was ohne Browser geht: welche Wochen hinein kommen, wann die
// Freigabe aufs Blatt darf, der Dateiname, die Nachlade-Adressen. Gezeichnet
// wird mit ihkFormToPdf — derselbe Code wie im Berichtsheft, dort geprueft.

import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

let ok = 0, fehler = 0;
const ist = (b, name, detail) => {
    if (b) { ok++; console.log('  ok    ' + name); }
    else { fehler++; console.log('  FEHLT ' + name + (detail ? '\n        ' + detail : '')); }
};
const lies = p => readFileSync(p, 'utf8').split('\r\n').join('\n');

// ── Module in einen Kontext laden ────────────────────────────────────
const win = { BHB2B: null };
const ctx = { window: win, document: { documentElement: { lang: 'de' }, head: { appendChild() {} }, createElement: () => ({}) }, console };
win.document = ctx.document;
vm.createContext(ctx);
vm.runInContext(lies('Assets/js/berichtsheft/ihk-formulare.js'), ctx);
vm.runInContext(lies('Assets/js/ausbilder-pdf.js'), ctx);
// zeileZuApproval aus bh-b2b.js — die echte Abbildung, nicht nachgebaut
const B2B = lies('Assets/js/berichtsheft/bh-b2b.js');
const za = B2B.slice(B2B.indexOf('    function zeileZuApproval('), B2B.indexOf('\n    }\n', B2B.indexOf('    function zeileZuApproval(')) + 6);
win.BHB2B = { _intern: { zeileZuApproval: new Function(za + '\nreturn zeileZuApproval;')() } };
ctx.BHB2B = win.BHB2B;

const P = win.AusbilderPdf && win.AusbilderPdf._intern;
ist(!!P, 'AusbilderPdf._intern ist da');
if (!P) process.exit(1);

console.log('\n▶ Auswahl der Wochen');
const fr = (ent, extra) => Object.assign({ entscheidung: ent, ausbilder_name: 'M. Weber', erstellt_at: '2026-10-12T09:00:00Z' }, extra || {});
const berichte = [
    { client_id: 'c', status: 'complete', datum_von: '2026-10-19', freigabe: null },
    { client_id: 'a', status: 'complete', datum_von: '2026-10-05', freigabe: fr('approved') },
    { client_id: 'b', status: 'signed', datum_von: '2026-10-12', freigabe: fr('approved'), veraendert: true },
    { client_id: 'd', status: 'incomplete', datum_von: '2026-10-26', freigabe: null },
    { client_id: 'e', status: 'complete', datum_von: '2026-11-02', freigabe: fr('rejected', { widerruft: 'x' }) }
];
const a = P.auswahl(berichte);
ist(a.berichte.map(b => b.client_id).join() === 'a,b,c,e', 'nur eingereichte Wochen, nach Datum', a.berichte.map(b => b.client_id).join());
ist(a.entwuerfe === 1, 'der Entwurf wird gezaehlt, nicht gedruckt');
ist(a.abgezeichnet === 1, 'abgezeichnet zaehlt nur gueltige Freigaben (nicht die geaenderte)', String(a.abgezeichnet));
ist(P.auswahl([]).berichte.length === 0 && P.auswahl(null).entwuerfe === 0, 'leer und null gehen');

console.log('\n▶ Freigabe aufs Blatt');
const ra = P.zeileZuBericht(berichte[1]);
ist(ra.approval && ra.approval.state === 'approved' && !ra.approval.stale, 'gueltige Freigabe wird mitgegeben');
const rb = P.zeileZuBericht(berichte[2]);
ist(rb.approval && rb.approval.stale === true, 'nach der Freigabe geaendert → stale');
ist(win.ihkCtxAusBericht(rb, {}).approval === null, 'stale kommt NICHT auf den Vordruck');
ist(win.ihkCtxAusBericht(ra, {}).approval !== null, 'Gegenprobe: die gueltige kommt drauf');
ist(!P.zeileZuBericht(berichte[4]).approval, 'Rueckgabe/Widerruf ergibt keine Freigabe');
ist(!P.zeileZuBericht(berichte[0]).approval, 'ohne Entscheidung keine Freigabe');

console.log('\n▶ Bericht → Vordruck');
const zeile = { client_id: 'z', jahr: 2, kw: 3, datum_von: '2026-01-12', datum_bis: '2026-01-16', status: 'complete',
    inhalt: { mode: 'daily', dailyActivities: { monday: 'Mo', tuesday: '', wednesday: 'Mi' }, dailySchool: { tuesday: true }, dailyHours: { monday: 8, tuesday: 6 }, department: 'IT' } };
const c = win.ihkCtxAusBericht(P.zeileZuBericht(zeile), { name: 'Lea', betrieb: 'Musterwerk', ausbilder: 'M. Weber' });
ist(c.name === 'Lea' && c.betrieb === 'Musterwerk' && c.ausbilder === 'M. Weber', 'Kopfwerte vom Server');
ist(c.jahr === '2' && c.nr === '3' && c.bereich === 'IT', 'Lehrjahr, KW, Bereich aus der Zeile');
ist(c.school.startsWith('Dienstag:') && !c.activities.includes('Dienstag'), 'Schultag im Schul-Block, nicht bei den Taetigkeiten');
ist(c.beruf === '' && c.beginn === '', 'Beruf und Beginn bleiben leer (stehen nirgends, nicht erfunden)');

console.log('\n▶ Dateiname');
ist(P.dateiname('Mira Özdemir-Weiß') === 'Ausbildungsnachweise_Mira_Ozdemir_Weiss.pdf', 'ASCII, Umlaute ohne Zeichen', P.dateiname('Mira Özdemir-Weiß'));
ist(P.dateiname('') === 'Ausbildungsnachweise_Azubi.pdf', 'ohne Namen');

console.log('\n▶ Verdrahtung');
const SRC = lies('Assets/js/ausbilder-pdf.js');
const urls = [...SRC.matchAll(/'(\/Assets\/js\/[^'?]+)\?v=[0-9a-f]+'/g)].map(m => m[1]);
ist(urls.length === 3, 'drei Nachlade-Adressen mit ?v= (Stempel-Opt-in)', urls.join(', '));
ist(urls.every(u => existsSync('.' + u)), 'alle Nachlade-Dateien existieren');
const MODAL = lies('Assets/js/berichtsheft/bh-pdf-modal.js');
ist(MODAL.includes('return ihkCtxAusBericht(report, {') && !MODAL.includes("'[Berufsschule] '"),
    'Berichtsheft nutzt dieselbe Abbildung (keine zweite Kopie)');
const AB = lies('pages/ausbilder/index.html');
ist(/<script defer src="\/Assets\/js\/ausbilder-pdf\.js\?v=[0-9a-f]+"><\/script>/.test(AB), 'Seite laedt das Modul (gestempelt)');
ist(AB.includes("else if (was === 'pdf') gesamtPdf(") && AB.includes("mwlEvent('b2b_gesamt_pdf'"), 'Knopf verdrahtet und gemessen');

console.log(`\nausbilder-pdf: ${ok} ok, ${fehler} fehlgeschlagen`);
if (ok < 20) { console.log('zu wenige Pruefungen gelaufen'); process.exit(1); }
process.exit(fehler ? 1 : 0);
