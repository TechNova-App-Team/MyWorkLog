// Prueft die Nutzungs-Schwelle, ab der die Preis-Umfrage und die Cloud-KI-
// Ankuendigung ueberhaupt erscheinen duerfen.
//
// WARUM DAS EINEN TEST BRAUCHT: beides ist eine Regel ueber ABWESENHEIT — die
// richtige Fassung zeigt nichts. Faellt die Schwelle irgendwann weg, sieht die
// Seite fuer den Entwickler (der immer Daten hat) exakt gleich aus, und der
// Fehler trifft nur Fremde beim allerersten Besuch. Genau die Sorte, die
// niemandem auffaellt, bis sie Reichweite kostet.
//
// Aufruf:  node tools/umfrage-schwelle.test.mjs

import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const UMFRAGE = 'components/umfrage/umfrage.js';
const SEITE = 'pages/berichtsheft/index.html';

let ok = 0;
const fehler = [];
function pruefe(name, bedingung, detail) {
  if (bedingung) { ok++; console.log('  ok    ' + name); }
  else { fehler.push(name + (detail ? ' — ' + detail : '')); console.log('  FEHL  ' + name + (detail ? ' — ' + detail : '')); }
}

// ── Teil 1: der Banner ───────────────────────────────────────────────────────
// umfrage.js laeuft als IIFE und exportiert nur ueber window. Also im DOM laden
// und ueber window.umfApplyBanner testen — das ist auch der Weg, den die Seiten
// selbst nehmen.
const quelle = fs.readFileSync(UMFRAGE, 'utf8');

function bannerBei(bestand) {
  const dom = new JSDOM('<!doctype html><body><div id="umfrageBanner" style="display:none"></div></body>', {
    url: 'https://myworklog.de/berichtsheft/', runScripts: 'outside-only',
  });
  const w = dom.window;
  // localStorage-Attrappe: nur was `bestand` nennt, sonst null.
  Object.defineProperty(w, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k) => (k in bestand ? bestand[k] : null),
      setItem: () => {}, removeItem: () => {},
    },
  });
  w.eval(quelle);
  w.umfApplyBanner();
  return w.document.getElementById('umfrageBanner').style.display;
}

console.log('\nUmfrage-Banner');
pruefe('Erstbesucher ohne jeden Bestand sieht ihn nicht',
  bannerBei({}) === 'none');
pruefe('leere Listen zaehlen nicht als Nutzung',
  bannerBei({ berichtsheft_reports: '[]', tg_pro_data: '{"entries":[]}' }) === 'none');
pruefe('ein Bericht reicht',
  bannerBei({ berichtsheft_reports: '[{"id":"x"}]' }) === 'flex');
pruefe('Zeiterfassungs-Eintraege reichen auch (die Datei laeuft auf vier Seiten)',
  bannerBei({ tg_pro_data: '{"entries":[{"date":"2026-08-24"}]}' }) === 'flex');
pruefe('kaputtes JSON fuehrt nicht zum Anzeigen',
  bannerBei({ berichtsheft_reports: '{kaputt', tg_pro_data: '{kaputt' }) === 'none');
pruefe('wer abgelehnt hat, sieht ihn trotz Nutzung nicht',
  bannerBei({ berichtsheft_reports: '[{"id":"x"}]', mwl_umfrage_dismissed: '2026-08-30' }) === 'none');
pruefe('wer abgestimmt hat, sieht ihn trotz Nutzung nicht',
  bannerBei({ berichtsheft_reports: '[{"id":"x"}]', mwl_umfrage_voted: '2026-08-30' }) === 'none');

// ── Teil 2: die Ankuendigung auf der Berichtsheft-Seite ──────────────────────
// Der Block ist ein IIFE im Seitenquelltext; hier wird die Bedingung geprueft,
// nicht das Rendern — es genuegt, dass die Schwelle VOR dem Aufbau steht.
const seite = fs.readFileSync(SEITE, 'utf8');
const block = seite.slice(seite.indexOf("const KEY = 'ais_cloud_v2_announcement_dismissed'"));
const bisInit = block.slice(0, block.indexOf('function init('));

console.log('\nCloud-KI-Ankuendigung');
pruefe('liest den Berichtsbestand, bevor sie etwas anzeigt',
  /berichtsheft_reports/.test(bisInit),
  'kein Zugriff auf berichtsheft_reports vor init()');
pruefe('steigt ohne Berichte aus',
  /if \(!hatBerichte && !force\) return;/.test(bisInit));
pruefe('?showAnnouncement=1 umgeht die Schwelle weiterhin (zum Testen)',
  /!force/.test(bisInit) && /showAnnouncement=1/.test(bisInit));
pruefe('liest den Speicher direkt, nicht das reports-Global',
  /localStorage\.getItem\('berichtsheft_reports'\)/.test(bisInit),
  'haengt sonst an der Ladereihenfolge zweier <script>-Bloecke');

// ── Teil 3: der Nachzieher ───────────────────────────────────────────────────
// Der Banner wird sonst nur beim Laden ausgewertet. Wer seinen ersten Bericht in
// derselben Sitzung anlegt, saehe ihn erst beim naechsten Aufruf.
console.log('\nNachzieher beim Speichern');
const speicher = seite.slice(seite.indexOf('function saveToStorage()'));
pruefe('saveToStorage() wertet den Banner neu aus',
  /umfApplyBanner\(\)/.test(speicher.slice(0, speicher.indexOf('function updateUI'))),
  'sonst erscheint der Banner erst beim naechsten Laden');
pruefe('der Name existiert wirklich (typeof-Guard verbirgt sonst einen Tippfehler)',
  /window\.umfApplyBanner\s*=/.test(quelle));

console.log(`\n${ok} bestanden, ${fehler.length} fehlgeschlagen`);
process.exit(fehler.length ? 1 : 0);
