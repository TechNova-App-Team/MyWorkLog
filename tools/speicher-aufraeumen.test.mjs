// Prueft Assets/js/speicher-aufraeumen.js:
// 1. Kein Name auf der TOT-Liste wird irgendwo im Quelltext noch erwaehnt (sonst loescht das
//    Aufraeumen Daten, die jemand liest).
// 2. Verhalten in jsdom: tote + vergangene Saison-Schluessel weg, alles andere bleibt, einmal je STAND.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const DATEI = path.join(ROOT, 'Assets/js/speicher-aufraeumen.js');
const QUELLE = readFileSync(DATEI, 'utf8').split('\r\n').join('\n');

let fehler = 0;
const ok = (b, m) => { console.log((b ? '  ok   ' : '  FAIL ') + m); if (!b) fehler++; };

// TOT-Liste aus dem Quelltext holen
const block = QUELLE.slice(QUELLE.indexOf('var TOT = ['), QUELLE.indexOf('];', QUELLE.indexOf('var TOT = [')));
const TOT = [...block.matchAll(/'([^']+)'/g)].map(m => m[1]);
ok(TOT.length >= 30, `TOT-Liste gelesen (${TOT.length} Namen)`);

// Alle Quelldateien sammeln (ohne generierte Artefakte, Vendor, diese beiden Dateien)
const AUSGESCHLOSSEN = [/^pages[\\/]en[\\/]/, /^Assets[\\/]i18n[\\/]/, /[\\/]vendor[\\/]/, /^pages[\\/]archflow[\\/]graph[\\/]/,
    /archflow-data\.js$/, /speicher-aufraeumen/, /node_modules/];
const dateien = [];
function lauf(rel) {
    const abs = path.join(ROOT, rel);
    if (!existsSync(abs)) return;
    for (const n of readdirSync(abs)) {
        const r = path.join(rel, n);
        if (AUSGESCHLOSSEN.some(re => re.test(r))) continue;
        const s = statSync(path.join(ROOT, r));
        if (s.isDirectory()) lauf(r);
        else if (/\.(js|mjs|html)$/.test(n)) dateien.push(r);
    }
}
['components', 'Assets/js', 'pages', 'pass/js'].forEach(lauf);
['index.template.html', 'service-worker.js'].forEach(f => existsSync(path.join(ROOT, f)) && dateien.push(f));
ok(dateien.length > 100, `Quelldateien gefunden (${dateien.length})`);

const texte = dateien.map(f => [f, readFileSync(path.join(ROOT, f), 'utf8')]);
const treffer = [];
for (const k of TOT) for (const [f, t] of texte) if (t.includes(k)) treffer.push(k + ' in ' + f);
ok(treffer.length === 0, 'kein toter Schluessel wird noch gelesen' + (treffer.length ? ':\n        ' + treffer.join('\n        ') : ''));
// Gegenprobe: die Suche findet lebende Schluessel wirklich
ok(texte.some(([, t]) => t.includes('tg_pro_data_backups')) && texte.some(([, t]) => t.includes('api_status_logs')),
    'Gegenprobe: lebende Schluessel werden gefunden');

// Eingebunden auf App, Berichtsheft, Aufgaben
for (const f of ['index.template.html', 'pages/berichtsheft/index.html', 'pages/aufgaben/index.html'])
    ok(readFileSync(path.join(ROOT, f), 'utf8').includes('/Assets/js/speicher-aufraeumen.js'), 'eingebunden: ' + f);

// Verhalten
const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://myworklog.de/' });
const w = dom.window, ls = w.localStorage;
const jahr = new Date().getFullYear();
const LEBEND = ['tg_pro_data', 'tg_pro_data_backups', 'berichtsheft_reports', 'schatten_vault', 'sb-x-auth-token',
    'loglevel', 'mwl_fachgespraech_v1', 'mwl_halloween_test', `mwl_weihnachten_${jahr}`, `mwl_halloween_ruhe_${jahr}`];
LEBEND.forEach(k => ls.setItem(k, 'x'));
TOT.forEach(k => ls.setItem(k, 'x'));
['mwl_halloween_' + (jahr - 1), 'mwl_halloween_ruhe_' + (jahr - 1), 'mwl_geburtstag_' + (jahr - 2), 'mwl_weihnachten_tueren_' + (jahr - 1)]
    .forEach(k => ls.setItem(k, 'x'));
const ereignisse = [];
w.mwlEvent = (n, p) => ereignisse.push([n, p]);
w.requestIdleCallback = undefined; delete w.requestIdleCallback;
w.eval(QUELLE);
w.mwlSpeicherAufraeumen();

ok(TOT.every(k => ls.getItem(k) === null), 'alle toten Schluessel geloescht');
ok(LEBEND.every(k => ls.getItem(k) === 'x'), 'lebende, fremde und laufende Saison-Schluessel bleiben');
ok(ls.getItem('mwl_halloween_' + (jahr - 1)) === null && ls.getItem('mwl_weihnachten_tueren_' + (jahr - 1)) === null
    && ls.getItem('mwl_geburtstag_' + (jahr - 2)) === null, 'Saison-Schluessel vergangener Jahre geloescht');
ok(ls.getItem('mwl_speicher_aufgeraeumt') !== null, 'Merker gesetzt');
ok(ereignisse.length === 1 && ereignisse[0][1].anzahl === TOT.length + 4, 'ein Ereignis mit Anzahl (' + (ereignisse[0] || [])[1]?.anzahl + ')');

// Zweiter Lauf: nichts mehr tun, auch wenn ein toter Schluessel wieder auftaucht
ls.setItem(TOT[0], 'x');
w.mwlSpeicherAufraeumen();
ok(ls.getItem(TOT[0]) === 'x' && ereignisse.length === 1, 'laeuft nur einmal je STAND');

// Neues Jahr: Merker vom Vorjahr → laeuft wieder, damit Saison-Schluessel jeden Januar gehen
ls.setItem('mwl_speicher_aufgeraeumt', ls.getItem('mwl_speicher_aufgeraeumt').replace(String(jahr), String(jahr - 1)));
ls.setItem('mwl_silvester_' + (jahr - 1), 'weg');
ls.setItem('mwl_silvester_' + (jahr + 1), 'weg');
w.mwlSpeicherAufraeumen();
ok(ls.getItem('mwl_silvester_' + (jahr - 1)) === null && ls.getItem(TOT[0]) === null, 'neues Jahr: laeuft wieder, alter Silvester-Schluessel weg');
ok(ls.getItem('mwl_silvester_' + (jahr + 1)) === 'weg', 'Silvester-Schluessel mit dem NEUEN Jahr bleibt (gilt ab 30.12.)');

if (fehler) { console.log(`\n${fehler} Fehler`); process.exit(1); }
console.log('\nspeicher-aufraeumen: alles gruen');
