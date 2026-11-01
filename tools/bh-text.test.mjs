// ═══ BH-TEXT (Assets/js/berichtsheft/bh-text.js) ═══
// Formatierter Berichtstext: Auszeichnung lesen, als HTML zeigen, aus dem Editor zurück,
// fürs PDF umbrechen und WinAnsi-sicher machen.
//
// Warum es diesen Test gibt:
// 1. RUNDLAUF: Was der Editor anzeigt, muss beim Speichern genau so zurückkommen — sonst
//    verliert jedes Öffnen und Speichern eines Berichts Formatierung oder verschiebt Listen.
// 2. ALTBESTAND: "   - Unterpunkt" (bhEntriesAlsText seit v8.6.3) und "    ◦ " (IHK-Import)
//    müssen ohne Umwandlung als Unterpunkte erscheinen.
// 3. PDF: "◦" kam als „%æ" ins PDF (01.11.2026). Nichts über WinAnsi darf durchgehen.
// 4. Ein einzelnes "*" („5 * 3") ist kein Kursiv.
//
// Lauf: node tools/bh-text.test.mjs
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FEHLT ' + n)); };
const eq = (n, a, b) => ok(n + '  (' + JSON.stringify(a) + ' = ' + JSON.stringify(b) + ')', JSON.stringify(a) === JSON.stringify(b));

const dom = new JSDOM('<!doctype html><html><body><div id="e"></div></body></html>', { runScripts: 'outside-only' });
const w = dom.window;
w.eval(readFileSync(new URL('../Assets/js/berichtsheft/bh-text.js', import.meta.url), 'utf8'));
const T = w.BHText;
ok('Modul lädt', T && typeof T.zuHtml === 'function');

console.log('\n1. Zeilen und Inline');
eq('Aufzählung', T.zeilen('- Server gepatcht')[0].art, 'ul');
eq('Unterpunkt aus bhEntriesAlsText ("   - ")', [T.zeilen('   - Rechnungen erfasst')[0].art, T.zeilen('   - Rechnungen erfasst')[0].ebene], ['ul', 2]);
eq('Unterpunkt aus dem IHK-Import ("    ◦ ")', [T.zeilen('    ◦ Lieferscheine')[0].art, T.zeilen('    ◦ Lieferscheine')[0].ebene], ['ul', 2]);
eq('Nummerierung', [T.zeilen('2. Backup prüfen')[0].art, T.zeilen('2. Backup prüfen')[0].nr], ['ol', 2]);
eq('normaler Satz bleibt Absatz', T.zeilen('Router konfiguriert')[0].art, 'p');
eq('fett, unterstrichen, kursiv', T.laeufe('**A** __B__ *C*').filter(l => l.t.trim()).map(l => [l.t, l.b, l.u, l.i]), [['A', true, false, false], ['B', false, true, false], ['C', false, false, true]]);
eq('fett + kursiv ("***x***")', T.laeufe('**fett** ***und kursiv***').filter(l => l.t.trim()).map(l => [l.t, l.b, l.i]), [['fett', true, false], ['und kursiv', true, true]]);
eq('fett + kursiv: was der Editor schreibt, liest er wieder', T.laeufeAlsMarkup(T.laeufe(T.laeufeAlsMarkup([{ t: 'a', b: true, i: true, u: true }]))), T.laeufeAlsMarkup([{ t: 'a', b: true, i: true, u: true }]));
eq('einzelnes Sternchen bleibt Text', T.laeufe('5 * 3 = 15').map(l => [l.t, l.i]), [['5 * 3 = 15', false]]);
eq('Klartext ohne Marker', T.klartext('- **Server** neu *gestartet*'), 'Server neu gestartet');

console.log('\n2. Rundlauf Markup → Editor-HTML → Markup');
const proben = [
    'Montag: Netzwerk geprüft',
    '- Switch getauscht\n- VLAN eingerichtet',
    'ELO betreut\n   - Rechnungen erfasst\n   - Lieferscheine zugeordnet',
    '1. Backup prüfen\n2. Wiederherstellung testen\n   - einzelne Datei\n   - ganzer Server\n3. Protokoll schreiben',
    '**Wichtig:** Firewall-Regeln __dokumentiert__ und *getestet*',
    'Absatz eins\n\nAbsatz zwei',
];
const e = w.document.getElementById('e');
for (const p of proben) {
    e.innerHTML = T.zuHtml(p);
    eq('Rundlauf: ' + p.split('\n')[0], T.ausDom(e), p);
}
e.innerHTML = T.zuHtml('    ◦ Altbestand-Unterpunkt');
eq('Altbestand "◦" wird beim Speichern zu "   - "', T.ausDom(e), '   - Altbestand-Unterpunkt');

console.log('\n3. Was der Browser im Editor erzeugt');
e.innerHTML = '<div class="bt-z" data-art="ul">Eins</div><div class="bt-z" data-art="ul">Zwei</div>';
eq('zwei Listenzeilen', T.ausDom(e), '- Eins\n- Zwei');
e.innerHTML = '<div class="bt-z">Hallo <b>fett</b> und <span style="font-weight:700">auch</span> <i>k</i> <u>u</u></div>';
eq('b, span(700), i, u', T.ausDom(e), 'Hallo **fett** und **auch** *k* __u__');
e.innerHTML = 'Text direkt im Editor';
eq('Text ohne Zeile', T.ausDom(e), 'Text direkt im Editor');
e.innerHTML = '<div class="bt-z" data-art="ol">A</div><div class="bt-z" data-art="ol">B</div><div class="bt-z" data-art="ol" data-ebene="2">B1</div><div class="bt-z" data-art="ol">C</div>';
eq('Nummern werden neu gezählt', T.ausDom(e), '1. A\n2. B\n   1. B1\n3. C');
e.innerHTML = '<div class="bt-z"><br></div>';
eq('leerer Editor', T.ausDom(e), '');

console.log('\n4. PDF: WinAnsi und Umbruch');
eq('◦ wird –, Pfeil wird ->, Haken und Emoji fallen weg', T.pdfSicher('◦ A → B ✓ 🚀'), '– A -> B  ');
eq('Umlaute, €, „“, – bleiben', T.pdfSicher('Größe 5 € „gut“ – ok'), 'Größe 5 € „gut“ – ok');
// Attrappe: 1 mm je Zeichen, fett 1,2 mm
const doc = { _f: { fontName: 'helvetica', fontStyle: 'normal' }, gezeichnet: [], linien: 0,
    setFont(n, s) { this._f = { fontName: n, fontStyle: s }; }, getFont() { return this._f; },
    getTextWidth(t) { return t.length * (/bold/.test(this._f.fontStyle) ? 1.2 : 1); },
    text(t, x, y) { this.gezeichnet.push({ t, x, y, s: this._f.fontStyle }); }, line() { this.linien++; }, setLineWidth() {} };
const zl = T.pdfUmbruch(doc, '- **Firewall** regeln für das Netz dokumentiert und getestet', 30);
ok('lange Listenzeile bricht um', zl.length >= 2);
ok('Marker nur auf der ersten Teilzeile', zl[0].marker === '•' && zl.slice(1).every(z => z.marker === ''));
ok('Teilzeilen halten die Breite', zl.every(z => z.laeufe.map(l => l.t).join('').trimEnd().length <= 30));
eq('Unterpunkt bekommt "–" und mehr Einzug', [T.pdfUmbruch(doc, '   - Kind', 80)[0].marker, T.pdfUmbruch(doc, '   - Kind', 80)[0].einzug > zl[0].einzug], ['–', true]);
const nz = T.pdfZeilen(doc, '1. A\n2. B', 80);
eq('Nummern im PDF', nz.map(z => z.marker), ['1.', '2.']);
doc.gezeichnet = []; doc.linien = 0;
T.pdfText(doc, T.pdfUmbruch(doc, 'Text __unterstrichen__ und **fett**', 100)[0], 10, 20);
ok('Unterstrich wird als Linie gezeichnet', doc.linien === 1);
ok('fetter Lauf in fetter Schrift', doc.gezeichnet.some(g => g.t.includes('fett') && g.s === 'bold'));
ok('Schrift danach zurück', doc._f.fontStyle === 'normal');
doc.gezeichnet = [];
T.pdfText(doc, '◦ Altbestand', 0, 0);
eq('schlichter String wird auch WinAnsi-sicher', doc.gezeichnet[0].t, '– Altbestand');
const alle = T.pdfZeilen(doc, '    ◦ Altbestand mit ◦ und → drin', 200).flatMap(z => z ? z.laeufe.map(l => l.t) : []).join('');
ok('nichts über WinAnsi im PDF-Text', [...alle].every(c => c.codePointAt(0) <= 0xff || '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'.includes(c)));
ok('es gab überhaupt etwas zu prüfen', alle.length > 10);

console.log(`\n${pass} ok, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
