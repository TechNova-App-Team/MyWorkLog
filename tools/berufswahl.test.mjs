// Berufswahl im Berichtsheft-Assistenten: alle amtlichen Ausbildungsberufe aus
// Assets/data/rahmenplaene/verzeichnis.json (seit 01.11.2026 statt 20 Kacheln).
//   1. Zuordnung amtlicher Name → Wortschatz der lokalen Engine (amtlichSchluessel)
//   2. Der gespeicherte Name findet im Rahmenplan-Abgleich denselben Beruf wieder
//   3. Verzeichnis ohne abgeschnittene Namen
// Lauf: node tools/berufswahl.test.mjs
import { readFileSync, existsSync } from 'node:fs';
import { ladeEngine } from './berichtsheft-laden.mjs';

let ok = 0, fail = 0;
const pruefe = (name, bed) => { if (bed) { ok++; console.log('  ok    ' + name); } else { fail++; console.log('  FEHLT ' + name); } };

const vz = JSON.parse(readFileSync(new URL('../Assets/data/rahmenplaene/verzeichnis.json', import.meta.url), 'utf8'));
const { BERUFE } = ladeEngine();
const { amtlichSchluessel, AMTLICH_EXTRA, PROFESSIONS } = BERUFE;

console.log('\n1. Zuordnung zum Engine-Wortschatz');
const faelle = [
    ['Fachinformatiker', 'Systemintegration', 'sysadmin'],
    ['Fachinformatiker', 'Digitale Vernetzung', 'sysadmin'],
    ['Fachinformatiker', 'Anwendungsentwicklung', 'software'],
    ['Fachinformatiker', 'Daten- und Prozessanalyse', 'software'],
    ['Kaufmann im Einzelhandel', null, 'einzelhandel'],
    ['Kaufmann für Büromanagement', null, 'kaufmann'],
    ['Kraftfahrzeugmechatroniker', null, 'kfz'],
    ['Anlagenmechaniker für Sanitär-, Heizungs- und Klimatechnik', null, 'sanitaer'],
    ['Elektroniker', 'Energie- und Gebäudetechnik', 'elektro'],
    ['Koch', null, 'gastronomie'],
    ['Medizinischer Fachangestellter', null, 'mfa'],
    // Die alte Stichwortsuche machte daraus 'software' — das darf nicht wiederkommen
    ['Binnenschifffahrtskapitän', null, 'custom'],
    ['Aufbereitungsmechaniker', 'Steinkohle', 'custom'],
    ['Bäcker', null, 'custom'],
];
for (const [m, v, soll] of faelle) pruefe(`${m}${v ? ' – ' + v : ''} → ${soll}`, amtlichSchluessel(m, v) === soll);

let alle = 0, unbekannt = [];
for (const b of vz.berufe) for (const v of (b.v.length ? b.v : [null])) {
    alle++;
    const k = amtlichSchluessel(b.m, v);
    if (k !== 'custom' && !PROFESSIONS[k]) unbekannt.push(b.m + ' → ' + k);
}
pruefe('jeder Schluessel existiert in PROFESSIONS oder ist custom', unbekannt.length === 0);
pruefe('es gibt ueberhaupt Berufe zum Pruefen (' + alle + ')', alle > 300);
pruefe('Extra-Berufe tragen einen gueltigen Schluessel', AMTLICH_EXTRA.length > 0 && AMTLICH_EXTRA.every(b => PROFESSIONS[b.k]));

console.log('\n2. Rahmenplan findet den gespeicherten Namen wieder');
// vorschlagen() liegt im Pass-Paket (gitignored); ohne pass/ wird dieser Teil uebersprungen
const passDatei = new URL('../pass/js/bh-rahmenplan.js', import.meta.url);
if (existsSync(passDatei)) {
    const src = readFileSync(passDatei, 'utf8').split('\r\n').join('\n');
    const fn = (name) => { const a = src.indexOf('function ' + name + '('); const e = src.indexOf('\n}\n', a); return src.slice(a, e + 2); };
    const kleinSrc = src.match(/const klein = [^\n]+/);
    // eslint-disable-next-line no-new-func
    const vorschlagen = new Function((kleinSrc ? kleinSrc[0] : 'const klein = (s) => String(s || "").toLowerCase();') + '\n' + fn('vorschlagen') + '\nreturn vorschlagen;')();
    let geprueft = 0, falsch = [];
    for (const b of vz.berufe) for (const v of (b.v.length ? b.v : [null])) for (const basis of [b.m, b.w].filter(Boolean)) {
        const name = v ? basis + ' – ' + v : basis;
        const top = vorschlagen(vz, name)[0];
        geprueft++;
        if (!top || top.b.id !== b.id || top.b.i !== b.i || (v && top.v !== v)) falsch.push(name + ' → ' + (top ? top.b.m + (top.v ? ' – ' + top.v : '') : 'nichts'));
    }
    pruefe(`alle ${geprueft} Namen (m/w, je Fachrichtung) treffen ihren Plan`, falsch.length === 0);
    if (falsch.length) console.log('        ' + falsch.slice(0, 15).join('\n        '));
    pruefe('es wurde ueberhaupt etwas geprueft', geprueft > 300);
} else {
    console.log('  (pass/ fehlt — uebersprungen)');
}

console.log('\n3. Verzeichnis');
const kaputt = vz.berufe.filter(b => /[-–]$/.test(b.m) || /[-–]$/.test(b.w || '') || b.v.some(x => /[-–]$/.test(x)));
pruefe('kein Name endet mit einem Ergaenzungsstrich', kaputt.length === 0);
pruefe('Fachkraft für Holz- und Bautenschutzarbeiten heil', vz.berufe.some(b => b.m === 'Fachkraft für Holz- und Bautenschutzarbeiten'));

console.log(`\n${ok} ok, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
