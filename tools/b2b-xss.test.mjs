// Fremdtext im Betriebs-Weg darf kein HTML werden.
//
// Anlass (Audit 2026-09-24): Zwei Stellen setzten einen Namen, den ein ANDERES
// Konto geschrieben hat, roh in innerHTML:
//   - /ausbilder/ `azubiKarte()`: der Anzeigename des Azubis (frei waehlbar beim
//     Einloesen des Codes) im Leerzustand "Noch keine Woche eingereicht".
//     Ein Azubi-Konto haette damit Skript im Ausbilder-Cockpit ausgefuehrt —
//     samt dessen Supabase-Sitzung (Freigaben schreiben, alle Azubis lesen).
//   - Berichtsheft `bh-b2b-ui.js`: der Name des Ausbilders im Freigabe-Verlauf.
//     Dessen esc() fiel ausserdem auf den ROHEN Text zurueck, wenn escapeHtml()
//     fehlte.
// Aufruf: node tools/b2b-xss.test.mjs
import { readFileSync } from 'node:fs';

let ok = 0, fehler = 0;
function ist(b, name) { if (b) { ok++; console.log('  ok    ' + name); } else { fehler++; console.log('  FEHLT ' + name); } }

const BOESE = '<img src=x onerror="alert(1)">';

// ── /ausbilder/: azubiKarte ──────────────────────────────────────
// Funktionen stehen auf Einrueckung 8 und enden an der ersten Zeile '        }'
// (Muster aus ausbilder-ihk-herkunft.test.mjs; CRLF vorher normalisieren).
const AB = readFileSync('pages/ausbilder/index.html', 'utf8').split('\r\n').join('\n');
function hole(name) {
  const start = AB.indexOf('        function ' + name + '(');
  if (start === -1) throw new Error('Funktion nicht gefunden: ' + name);
  const ende = AB.indexOf('\n        }\n', start);
  return AB.slice(start, ende + '\n        }'.length);
}

console.log('\n▶ /ausbilder/: Anzeigename des Azubis');
const namen = ['esc', 'monogramm', 'schonUnterschrieben', 'istOffen', 'zahlenFuer', 'fmtDate', 'azubiKarte'];
const { azubiKarte } = new Function(
  'function abL(de, en) { return de; }\nfunction abLocale() { return "de-DE"; }\n' +
  namen.map(hole).join('\n') + '\nreturn { azubiKarte };')();

const leer = azubiKarte({ name: BOESE, berichte: [] }, false);
ist(!leer.includes('<img'), 'Leerzustand: kein rohes <img> aus dem Namen');
ist(leer.includes('&lt;img'), 'Gegenprobe: der Name steht escaped im Ergebnis (sonst prueft der Test nichts)');

// ── Berichtsheft: esc() in bh-b2b-ui.js ──────────────────────────
console.log('\n▶ Berichtsheft: esc() im Betriebs-UI');
const UI = readFileSync('Assets/js/berichtsheft/bh-b2b-ui.js', 'utf8').split('\r\n').join('\n');
const m = UI.match(/\n    function esc\(s\) \{[\s\S]*?\n    \}\n/);
ist(!!m, 'esc() gefunden');
const esc = new Function(m[0] + '\nreturn esc;')();   // escapeHtml bewusst NICHT definiert
ist(esc(BOESE) === '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;', 'escaped auch ohne escapeHtml() — kein Rueckfall auf Rohtext');

// Jede Verwendung von approval.by, die in einen HTML-String geht, laeuft durch esc().
// Verkettet = "' + <wert> +'"; ein blosses "&& report.approval.by ?" ist eine Bedingung.
const byStellen = [...UI.matchAll(/^.*' \+ (esc\()?report\.approval\.by\)? \+ '.*$/gm)].map(x => x[0]);
ist(byStellen.length > 0, 'Gegenprobe: es gibt ueberhaupt verkettete approval.by-Stellen');
const roh = byStellen.filter(z => !z.includes('esc(report.approval.by)'));
ist(roh.length === 0, 'jede verkettete approval.by-Stelle ist escaped' + (roh.length ? ': ' + roh.join(' | ') : ''));

console.log(`\n${ok} ok, ${fehler} fehlgeschlagen`);
process.exit(fehler ? 1 : 0);
