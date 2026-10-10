// ═══ EINTRAG-BEARBEITEN TEST ═══
//
// Laedt das echte Markup (#editEntryModal aus modals.html) und die echte
// entry-edit.js in jsdom; die Helfer aus anderen Modulen sind Attrappen.
//
// Warum es diesen Test gibt:
//
// 1. EIGENE EINTRAGSTYPEN GINGEN BEIM SPEICHERN VERLOREN. Das Typ-Feld kannte
//    nur die sechs festen Typen. Ein Eintrag mit eigenem Typ fand seinen Wert
//    nicht, select.value wurde '' — und saveEditEntry() schrieb type: ''.
//    Kein Fehler, kein Log; der Eintrag hatte danach einfach keinen Typ mehr.
//
// 2. WAS DER DIALOG ZEIGT, MUSS ZU DEM PASSEN, WAS saveEditEntry() RECHNET.
//    Schule/Urlaub/Krank/Feiertag/Gleittag rechnen ihre Stunden selbst; dort
//    gibt es keine Zeiten, nur den erklaerenden Satz. Arbeit und eigene Typen
//    uebernehmen die Stunden aus dem Feld — dort muessen die Zeiten stehen.
//
// Lauf: node tools/entry-edit.test.mjs
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FEHLT ' + n + (d ? '  → ' + d : ''))); };
const eq = (n, a, b) => ok(n + '  (' + JSON.stringify(a) + ' = ' + JSON.stringify(b) + ')', a === b);

const lf = p => readFileSync(p, 'utf8').split('\r\n').join('\n');
const MODALS = lf('components/modals/modals.html');
const JS = lf('components/core/entry-edit.js');

const a = MODALS.indexOf('<div class="modal ed" id="editEntryModal"');
const e = MODALS.indexOf('<!-- WEATHER EXPERIENCE', a);
ok('Dialog im Markup gefunden', a > 0 && e > a);

const dom = new JSDOM('<!doctype html><html lang="de"><body>' + MODALS.slice(a, e) + '</body></html>', { runScripts: 'outside-only' });
const w = dom.window;

// Attrappen der Nachbarmodule — nur was entry-edit.js wirklich aufruft.
w.eval(`
  var data = { entries: [], settings: { hours: [0, 7.75, 7.75, 7.75, 7.75, 7.75, 0], projects: ['Halle 3'] } };
  var gespeichert = 0;
  function save() { gespeichert++; }
  function updateUI() {} function renderLists() {}
  function showCustomMessage() {}
  function mwlLocale() { return 'de-DE'; }
  function getAllEntryTypes() {
    return [{ id: 'work', label: 'Arbeit' }, { id: 'school', label: 'Berufsschule' }, { id: 'vacation', label: 'Urlaub' },
            { id: 'gleittag', label: 'Gleittag' }, { id: 'sick', label: 'Krank' }, { id: 'holiday', label: 'Feiertag' },
            { id: 'korrektur', label: 'Korrektur' }, { id: 'werkstatt', label: 'Werkstatt' }];
  }
  function getTypeIconHTML() { return '<svg></svg>'; }
  function getTypeRgb() { return '1, 2, 3'; }
  function getJobs() { return [{ id: 'primary', name: 'Haupt' }]; }
  function getEntryJobId(e) { return e.jobId || 'primary'; }
  function getJobHours(j, d) { return data.settings.hours[d]; }
`);
w.eval(JS);
const $ = id => w.document.getElementById(id);
const sel = () => [...$('editInpType').options].map(o => o.value);

// ── 1. eigener Typ bleibt erhalten ──
console.log('\n1. Eigener Eintragstyp');
w.eval(`data.entries.push({ id: 'a', date: '2026-10-05', type: 'werkstatt', start: '08:00', end: '14:30', endIsRaw: true, breakMins: 30, worked: 6, expected: 7.75, diff: -1.75 });`);
w.openEditModal('a');
ok('Typ-Feld kennt den eigenen Typ', sel().includes('werkstatt'), sel().join(','));
eq('Wert steht auf dem eigenen Typ', $('editInpType').value, 'werkstatt');
ok('"korrektur" ist kein waehlbarer Typ', !sel().includes('korrektur'));
eq('Chip des eigenen Typs ist gewaehlt', w.document.querySelector('#edTypes [aria-checked="true"]')?.dataset.value, 'werkstatt');
ok('eigener Typ zeigt Zeiten (Stunden kommen aus dem Feld)', $('editTimeSection').style.display !== 'none');
w.saveEditEntry();
eq('nach dem Speichern: Typ unveraendert', w.eval(`data.entries.find(x => x.id === 'a').type`), 'werkstatt');

// Gegenprobe: das alte Verhalten — nur sechs feste Optionen — haette '' geliefert.
const probe = w.document.createElement('select');
['work', 'school', 'vacation', 'gleittag', 'sick', 'holiday'].forEach(v => { const o = w.document.createElement('option'); o.value = v; probe.appendChild(o); });
probe.value = 'werkstatt';
eq('Gegenprobe: altes Feld haette den Typ verloren', probe.value, '');

// ── 2. Rechnen + Anzeige je Typ ──
console.log('\n2. Arbeit: Zeiten, Band, Saldo');
w.eval(`data.entries.push({ id: 'b', date: '2026-10-02', type: 'work', start: '07:30', end: '16:15', endIsRaw: true, breakMins: 30, worked: 8.25, expected: 7.75, diff: 0.5 });`);
w.openEditModal('b');
eq('Titel ist das ausgeschriebene Datum', $('editModalSubtitle').textContent, 'Freitag, 2. Oktober 2026');
eq('Stunden aus den Zeiten', $('editInpHours').value, '8.25');
eq('Saldo-Anzeige', $('edSaldo').textContent, '+0,50 h');
ok('Schichtband gesetzt', /inset\(/.test($('edShift').style.clipPath), $('edShift').style.clipPath);
ok('Stundenmarken da', $('edTicks').children.length >= 5, String($('edTicks').children.length));
// jsdom fuehrt die on…-Attribute nicht aus: die Funktion rufen, an der das
// Attribut haengt — dass es daran haengt, prueft Abschnitt 5 statisch.
$('editInpEnd').value = '17:00'; w.recalcEditWorked();
eq('Ende spaeter → Stunden folgen', $('editInpHours').value, '9.00');
$('editInpHours').value = '8'; w.editHoursManualChanged(); w.edSummary();
ok('von Hand gesetzt → Hinweis sichtbar', !$('edOverride').hidden);
$('editInpStart').value = '07:00'; w.recalcEditWorked();
eq('von Hand gesetzt → Zeiten ueberschreiben die Stunden NICHT', $('editInpHours').value, '8');
w.edHoursFromTimes();
eq('"Aus den Zeiten berechnen" holt die Rechnung zurueck', $('editInpHours').value, '9.50');
ok('… und der Hinweis verschwindet', $('edOverride').hidden);
w.saveEditEntry();
eq('gespeichert: worked', w.eval(`data.entries.find(x => x.id === 'b').worked`), 9.5);
eq('gespeichert: diff', w.eval(`data.entries.find(x => x.id === 'b').diff`), 1.75);

console.log('\n3. Typen mit fester Rechnung');
for (const t of ['school', 'vacation', 'gleittag', 'sick', 'holiday']) {
  w.eval(`data.entries.push({ id: 't_${t}', date: '2026-10-06', type: '${t}', worked: 7.75, expected: 7.75, diff: 0 });`);
  w.openEditModal('t_' + t);
  ok(t + ': keine Zeiten', $('editTimeSection').style.display === 'none');
  ok(t + ': erklaerender Satz sichtbar', !$('editFooterInfo').hidden && $('editInfoText').textContent.length > 20, $('editInfoText').textContent);
}
w.openEditModal('t_gleittag');
ok('Gleittag-Satz sagt, dass der Saldo sinkt (passt zu diff = -expected)', /zieht .* vom Saldo ab/.test($('editInfoText').textContent));
w.saveEditEntry();
eq('Gleittag gespeichert: diff', w.eval(`data.entries.find(x => x.id === 't_gleittag').diff`), -7.75);

console.log('\n4. Bedienung');
w.openEditModal('b');
const chips = [...w.document.querySelectorAll('#edTypes .ed__type')];
ok('Chips gebaut, ohne "korrektur"', chips.length === 7, String(chips.length));
eq('genau ein Chip im Tab-Fluss', chips.filter(c => c.tabIndex === 0).length, 1);
chips[0].dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
eq('Pfeil rechts waehlt den naechsten Typ', $('editInpType').value, 'school');
w.closeEditModal();
ok('Schliessen nimmt .active', !$('editEntryModal').classList.contains('active'));
ok('save() wurde aufgerufen', w.eval('gespeichert') >= 3);

console.log('\n5. Verdrahtung im Markup');
const attr = (id, ev) => (w.document.getElementById(id).getAttribute(ev) || '');
for (const id of ['editInpStart', 'editInpEnd', 'editInpBreak']) {
  ok(id + ' oninput → recalcEditWorked', attr(id, 'oninput').includes('recalcEditWorked()'));
}
ok('editInpHours onchange → editHoursManualChanged', attr('editInpHours', 'onchange').includes('editHoursManualChanged()'));
ok('editInpType onchange → editTypeChanged', attr('editInpType', 'onchange').includes('editTypeChanged()'));
ok('editInpDate onchange → edDateChanged', attr('editInpDate', 'onchange').includes('edDateChanged()'));

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
