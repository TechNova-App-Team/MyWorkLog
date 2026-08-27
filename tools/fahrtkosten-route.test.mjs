// ═══ FAHRTKOSTEN — EIGENE STRECKE (WEGPUNKTE) ═══
// Warum es diesen Test gibt: Die Einsortierung eines neuen Wegpunkts ist die
// einzige Stelle des Features, die man beim Bedienen nicht sieht. Haengt ein
// Punkt an der falschen Stelle der Liste, faehrt die Route erst ans Ziel und
// dann zurueck — die Strecke ist dann viel zu lang, aber die Karte sieht
// „irgendwie nach Umweg" aus und die Zahl ist trotzdem plausibel. Genau die
// Sorte Fehler, die niemandem auffaellt.
//
// Zweitens laesst sich die Karte im Automations-Browser gar nicht pruefen:
// dort ist `document.hidden` wahr, MapLibre malt nicht, und
// `queryRenderedFeatures` findet die Linie nie (gemessen: 0 rAF-Frames in
// 800 ms). Was man dort nicht klicken kann, gehoert hierher.
//
// Geprueft wird gegen die ECHTE Quelle, nicht gegen einen Nachbau: die
// betroffenen Bloecke werden aus fahrtkosten.js geschnitten und mit
// Attrappen fuer Speichern/Zeichnen/Routing ausgefuehrt.
//
// Lauf: node tools/fahrtkosten-route.test.mjs
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FEHLT ' + n)); };

const SRC = readFileSync('Assets/js/fahrtkosten.js', 'utf8');
const CSS = readFileSync('Assets/css/fahrtkosten.css', 'utf8');

function cut(startMarker, endMarker) {
  const from = SRC.indexOf(startMarker);
  const to   = SRC.indexOf(endMarker);
  if (from < 0 || to < 0 || to <= from) {
    console.error(`Block nicht gefunden — Marker geaendert? (${startMarker.slice(0, 40)})`);
    process.exit(1);
  }
  return SRC.slice(from, to);
}

// nearestOnRoute + insertWaypoint + removeWaypoint, ohne die Marker-Fabrik
// (die braucht MapLibre).
const GEO_SRC   = cut('/* ─── Geometrie ─', '    function renderWaypoints()');
const HAVER_SRC = cut('    function haversineKm(c1, c2)', '    // ===== EINGANGSGROESSEN =====');

// Eine „Sitzung" = eigener Zustand, dieselben Funktionen aus der Quelle.
function makeSession(geometry, waypoints) {
  const calls = { save: 0, render: 0, fetch: 0 };
  const state = {
    waypoints: waypoints.slice(),
    currentRoute: geometry ? { geometry: { type: 'LineString', coordinates: geometry } } : null
  };
  const build = new Function('state', 'calls', `
    let waypoints = state.waypoints;
    let currentRoute = state.currentRoute;
    function saveCoords()      { calls.save++; }
    function renderWaypoints() { calls.render++; }
    function fetchRoute()      { calls.fetch++; }
    ${GEO_SRC}
    ${HAVER_SRC}
    return {
      nearestOnRoute, insertWaypoint, removeWaypoint,
      haversineKm, chainHaversineKm,
      list: () => waypoints
    };
  `);
  return { ...build(state, calls), calls };
}

// ── Eine Route von West nach Ost auf konstanter Breite. Der Segment-Index
//    waechst damit monoton mit der Laenge — das macht die Erwartungen
//    nachrechenbar statt geraten.
const LINE = [];
for (let i = 0; i <= 10; i++) LINE.push([9.0 + i * 0.1, 48.8]);   // 9.0 … 10.0

console.log('\nnearestOnRoute — Punkt auf die Linie ziehen');
{
  const s = makeSession(LINE, []);
  const hit = s.nearestOnRoute([9.35, 48.9]);        // 0,1° noerdlich der Linie
  ok('projiziert auf die Breite der Linie', Math.abs(hit.point[1] - 48.8) < 1e-9);
  ok('haelt die Laenge des Lots',           Math.abs(hit.point[0] - 9.35) < 1e-6);
  ok('findet das richtige Segment',         hit.seg === 3);       // 9.3 → 9.4

  const start = s.nearestOnRoute([8.5, 48.8]);       // weit vor dem Anfang
  ok('klemmt vor dem Anfang auf den Startpunkt', start.seg === 0 &&
     Math.abs(start.point[0] - 9.0) < 1e-9);

  const end = s.nearestOnRoute([12.0, 48.8]);        // weit hinter dem Ende
  ok('klemmt hinter dem Ende auf den Endpunkt', Math.abs(end.point[0] - 10.0) < 1e-9);
}

console.log('\ninsertWaypoint — die Reihenfolge ist die ganze Frage');
{
  const s = makeSession(LINE, []);
  s.insertWaypoint([9.5, 48.9], [9.5, 48.8]);
  ok('erster Punkt landet in einer leeren Liste', s.list().length === 1);
  ok('Einfuegen speichert, zeichnet und routet neu',
     s.calls.save === 1 && s.calls.render === 1 && s.calls.fetch === 1);
}
{
  // Ein Punkt liegt schon in der Mitte (bei 9.5). Der neue wird VOR ihm
  // gegriffen — er muss vor ihm einsortiert werden.
  const s = makeSession(LINE, [[9.5, 48.85]]);
  s.insertWaypoint([9.2, 48.95], [9.2, 48.8]);
  ok('vorn gegriffen → vorn eingefuegt', Math.abs(s.list()[0][0] - 9.2) < 1e-9);
}
{
  // Derselbe Aufbau, aber hinter dem vorhandenen Punkt gegriffen.
  const s = makeSession(LINE, [[9.5, 48.85]]);
  s.insertWaypoint([9.8, 48.95], [9.8, 48.8]);
  ok('hinten gegriffen → hinten angehaengt', Math.abs(s.list()[1][0] - 9.8) < 1e-9);
}
{
  // Drei vorhandene Punkte, der neue gehoert genau in die Mitte.
  const s = makeSession(LINE, [[9.1, 48.85], [9.5, 48.85], [9.9, 48.85]]);
  s.insertWaypoint([9.7, 48.95], [9.7, 48.8]);
  ok('mittig gegriffen → an dritter Stelle',
     s.list().length === 4 && Math.abs(s.list()[2][0] - 9.7) < 1e-9);
  ok('Reihenfolge bleibt aufsteigend',
     s.list().every((c, i, a) => i === 0 || c[0] > a[i - 1][0]));
}
{
  // Ohne Geometrie (Route noch nicht da) darf nichts verlorengehen —
  // dann haengt der Punkt hinten an, statt still zu verschwinden.
  const s = makeSession(null, [[9.5, 48.85]]);
  s.insertWaypoint([9.2, 48.95], [9.2, 48.8]);
  ok('ohne Route wird angehaengt statt verworfen', s.list().length === 2);
}

console.log('\nremoveWaypoint');
{
  const s = makeSession(LINE, [[9.2, 48.85], [9.5, 48.85], [9.8, 48.85]]);
  s.removeWaypoint(1);
  ok('nimmt genau den benannten Punkt',
     s.list().length === 2 && Math.abs(s.list()[1][0] - 9.8) < 1e-9);
  ok('Entfernen routet ebenfalls neu', s.calls.fetch === 1);
}

console.log('\nchainHaversineKm — der Rueckfall darf den Umweg nicht schlucken');
{
  const s = makeSession(LINE, []);
  const home = [9.0, 48.8], work = [10.0, 48.8], detour = [9.5, 49.3];
  const direkt = s.chainHaversineKm([home, work]);
  const ueber  = s.chainHaversineKm([home, detour, work]);
  ok('direkte Kette entspricht der Luftlinie',
     Math.abs(direkt - s.haversineKm(home, work)) < 1e-9);
  ok('Kette mit Umweg ist laenger als die direkte', ueber > direkt + 10);
}

// ── Zusagen der Seite ───────────────────────────────────────────────────────
// Die Quelle wird vorher von Kommentaren befreit: in dieser Codebase erklaeren
// Dateikoepfe ausdruecklich, was drinsteht und was nicht — sonst prueft der
// Test seine eigene Beschreibung.
const noComments = SRC
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ');

console.log('\nWas die Seite dem Nutzer zusagt');
ok('der Befundsatz kennt einen eigenen Zweig fuer die gezeichnete Strecke',
   /deine eingezeichnete Strecke/.test(noComments) && /route you drew yourself/.test(noComments));
ok('der Vergleich mit der kuerzesten Verbindung wird ausgegeben',
   /Kürzeste Verbindung/.test(noComments) && /Shortest route/.test(noComments));
// § 9 Abs. 1 Satz 3 Nr. 4 EStG: Massstab ist die kuerzeste Strassenverbindung.
// Faellt dieser Satz weg, verspricht die Jahressumme oben einen Abzug, den es
// unter dieser Bedingung nicht gibt.
ok('die Bedingung aus § 9 EStG steht drin, wenn die eigene Strecke laenger ist',
   /§ 9 Abs\. 1 Satz 3 Nr\. 4 EStG/.test(noComments) &&
   /verkehrsgünstiger/.test(noComments) && /regelmäßig/.test(noComments));
ok('englische Fassung der Bedingung ist mitgepflegt',
   /German Income Tax Act/.test(noComments) && /clearly quicker in practice/.test(noComments));
ok('der Vergleichswert wird bei neuem Start oder Ziel verworfen',
   /suggestedKm = null/.test(noComments));
ok('fkResetRoute haengt am window', /window\.fkResetRoute\s*=/.test(noComments));

console.log('\nJedes Verkehrsmittel hat seinen eigenen Routing-Dienst');
// Bis v6.3.15 lief alles gegen router.project-osrm.org — dort ist nur das
// Auto-Profil geladen. "Fahrrad" lieferte deshalb eine Autoroute, und ein
// Wegpunkt auf einem Radweg rutschte auf die naechste Autostrasse.
ok('der Demoserver mit nur einem Profil ist raus',
   !/router\.project-osrm\.org/.test(noComments));
for (const [modus, host] of [['car', 'routed-car'], ['bike', 'routed-bike'], ['walk', 'routed-foot']]) {
  ok(`${modus} zeigt auf ${host}`,
     new RegExp(modus + ":\\s*'https://routing\\.openstreetmap\\.de/" + host + "'").test(noComments));
}
// Der Profilname im Pfad heisst bei allen drei Hosts "driving" — wer dort
// "cycling" einsetzt, bekommt einen Fehler statt einer Radroute.
ok('der Pfad benutzt bei allen Hosts driving', /route\/v1\/driving/.test(noComments));
ok('es gibt keinen cycling-/foot-Pfad mehr', !/route\/v1\/(cycling|foot)/.test(noComments));
// Sonst vergleicht der Beleg die Radstrecke mit der Autostrecke.
ok('der Moduswechsel verwirft den Vergleichswert',
   /saveSettings\(\);[\s\S]{0,80}suggestedKm = null/.test(noComments));
// ÖPNV hat keinen Linienrouter — eine Autozeit als Busfahrt auszugeben waere
// dieselbe Luege wie vorher beim Fahrrad.
ok('die Fahrzeit haengt am vorhandenen Dienst, nicht mehr am Auto',
   /function hasTravelTime\(\)\s*\{\s*return !!OSRM_HOSTS\[activeMode\]/.test(noComments));
ok('ÖPNV wird als Luecke benannt statt ueberdeckt',
   /activeMode !== 'transit'/.test(noComments) && /Linienführung/.test(noComments));

console.log('\nMarkup und CSS passen zusammen');
// Ein Klassenname, den es nur im JS gibt, faellt nie auf: das Element ist da,
// es sieht nur aus wie nichts.
for (const cls of ['fk-basis', 'fk-basis__head', 'fk-basis__tag', 'fk-basis__cmp',
                   'fk-basis__k', 'fk-basis__v', 'fk-basis__undo', 'fk-basis__note',
                   'fk-wp', 'fk-wp-ghost']) {
  ok(`.${cls} ist in fahrtkosten.css definiert`,
     new RegExp('\\.' + cls.replace(/([_-])/g, '\\$1') + '[\\s,.:{]').test(CSS));
}
// Touch hat kein :hover — der Greifpunkt auf der Linie erscheint dort nie.
// Der Hinweistext ist damit die einzige Stelle, die das Bedienen erklaert,
// und er darf auf schmalen Schirmen nicht ausgeblendet sein.
const schmal = CSS.slice(CSS.indexOf('@media (max-width: 620px)'));
ok('der Kartenhinweis bleibt auf schmalen Schirmen sichtbar',
   !/\.fk-map-hint\s*\{[^}]*display:\s*none/.test(schmal));

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
