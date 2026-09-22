#!/usr/bin/env node
/**
 * publish-graph.js — macht aus graphify-out/graph.html eine veroeffentlichbare
 * Seite unter pages/archflow/graph/index.html.
 *
 * WARUM UEBERHAUPT EIN SKRIPT:
 * graphify erzeugt graph.html bei jedem `graphify update .` neu. Jede Anpassung
 * von Hand waere beim naechsten Lauf weg. Deshalb wird die Veroeffentlichung
 * hier einmal beschrieben und laesst sich beliebig oft wiederholen.
 *
 * WAS ANGEPASST WIRD:
 *  1. vis-network kommt bei graphify von unpkg.com. Die Archflow-Seite hat
 *     sonst KEIN einziges Fremd-Skript — ein CDN-Aufruf wuerde die IP jedes
 *     Besuchers an einen US-Dienst schicken, auf einer Seite, die mit
 *     Datenschutz wirbt. Wird deshalb auf die lokale Kopie umgebogen.
 *     Der Integrity-Hash bleibt: die lokale Datei ist byte-identisch.
 *  2. Kopfleiste im Projekt-Stil mit Rueckweg nach /archflow/ und dem Stand
 *     des Graphen (Commit + Datum). Ohne die Angabe koennte niemand sehen,
 *     wie alt die Darstellung ist.
 *  3. Kopfdaten: Titel, Beschreibung, Maintenance-Gate wie auf jeder Seite,
 *     robots=noindex (2 MB Werkzeug-Ansicht; die indexierbare Seite ist
 *     /archflow/).
 *
 * Aufruf: node tools/publish-graph.js   (bzw. npm run graph:publish)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'graphify-out/graph.html');
const GRAPH_JSON = path.join(ROOT, 'graphify-out/graph.json');
const OUT_DIR = path.join(ROOT, 'pages/archflow/graph');
const OUT = path.join(OUT_DIR, 'index.html');
const VENDOR = '/Assets/js/vendor/vis-network-9.1.6.min.js';

if (!fs.existsSync(SRC)) {
  console.error('[publish-graph] ✗ graphify-out/graph.html fehlt.');
  console.error('                Erst den Graphen bauen:  graphify update .');
  process.exit(1);
}
if (!fs.existsSync(path.join(ROOT, VENDOR.slice(1)))) {
  console.error('[publish-graph] ✗ ' + VENDOR + ' fehlt (vis-network nicht lokal abgelegt).');
  process.exit(1);
}

let html = fs.readFileSync(SRC, 'utf8');

// ── Kennzahlen + Stand ───────────────────────────────────────────────────────
let nodes = 0, edges = 0, communities = 0;
try {
  const g = JSON.parse(fs.readFileSync(GRAPH_JSON, 'utf8'));
  nodes = (g.nodes || []).length;
  edges = (g.links || g.edges || []).length;
  communities = new Set((g.nodes || []).map((n) => n.community)).size;
} catch (e) { /* Kennzahlen sind Beiwerk, kein Abbruchgrund */ }

// Knoten-Budget — eine Warnung, kein Verbot. vis rechnet die Anordnung vor dem
// ersten Bild; gemessen am 22.09.2026 (Desktop, localhost): 2.337 Knoten / 2,0 MB
// → Graph nach 4,7 s sichtbar, 4.307 Knoten / 3,6 MB → nach 6,9 s. Beides
// erträglich, aber ein `graphify update .` verdoppelt den Umfang leicht, und die
// Seite laedt jedes Byte im HTML mit. Ab hier lohnt die Frage, ob der Graph
// wirklich das ganze Repo zeigen muss.
const KNOTEN_BUDGET = 3000;

let commit = '';
try { commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch (e) {}
const datum = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
const de = (n) => n.toLocaleString('de-DE');

if (nodes > KNOTEN_BUDGET) {
  console.warn(`[publish-graph] ⚠ ${de(nodes)} Knoten — ueber dem Richtwert von ${de(KNOTEN_BUDGET)}.`);
  console.warn('                Der Aufbau dauert dann laenger und die Seite wird schwerer;');
  console.warn('                am Handy zaehlt beides. Wird trotzdem veroeffentlicht.');
}

// ── 1. Fremd-Skript auf die lokale Kopie umbiegen ────────────────────────────
// crossorigin faellt weg (gleiche Herkunft), integrity bleibt als Pruefsumme.
const before = html;
html = html.replace(
  /<script\s+src="https:\/\/unpkg\.com\/vis-network[^"]*"\s*\n?\s*(integrity="[^"]*")?\s*\n?\s*(crossorigin="[^"]*")?\s*><\/script>/,
  (m, integrity) => `<script src="${VENDOR}" ${integrity || ''}></script>`
);
if (html === before) {
  console.error('[publish-graph] ✗ unpkg-Skripttag nicht gefunden — hat graphify sein Ausgabeformat geaendert?');
  console.error('                Abgebrochen, damit keine Seite mit CDN-Aufruf online geht.');
  process.exit(1);
}

// ── 1b. Oberflaeche eindeutschen ─────────────────────────────────────────────
// graphify beschriftet seine Bedienelemente englisch. Auf einer deutschen Seite
// liest sich das wie ein hineinkopiertes Fremdstueck.
// Bewusst eng gefasste Muster: "Communities" steht 9x in der Datei, unter
// anderem in der Funktion toggleAllCommunities() — ein globales Ersetzen wuerde
// das Skript zerlegen. Ersetzt wird nur, was wirklich Beschriftung ist.
const UI = [
  ['<h3>Node Info</h3>', '<h3>Knoten-Details</h3>'],
  ['Click a node to inspect it', 'Klick einen Knoten an, um ihn zu untersuchen'],
  ['<h3>Communities</h3>', '<h3>Gruppen</h3>'],
  ['>Select All</label>', '>Alle auswählen</label>'],
  ['placeholder="Search nodes..."', 'placeholder="Knoten suchen …"'],
];
const fehlend = [];
for (const [from, to] of UI) {
  if (!html.includes(from)) { fehlend.push(from); continue; }
  html = html.split(from).join(to);
}
if (fehlend.length) {
  console.warn('[publish-graph] ⚠ Beschriftung(en) nicht gefunden, bleiben englisch:');
  fehlend.forEach((f) => console.warn('                 ' + f));
  console.warn('                 (graphify hat vermutlich sein Ausgabeformat geaendert)');
}

// ── 2. Kopfdaten ─────────────────────────────────────────────────────────────
const MAINT_GATE = `<script>
/* Maintenance-Gate: prueft /config/maintenance.json, leitet bei active:true auf /maintenance/ um. */
(function(){if(/^\\/maintenance/.test(location.pathname))return;document.documentElement.style.visibility='hidden';var r=false;function re(){if(!r){r=true;document.documentElement.style.visibility='';}}fetch('/config/maintenance.json?t='+Date.now(),{cache:'no-store'}).then(function(x){return x.ok?x.json():null;}).then(function(c){if(c && c.active===true){location.replace('/maintenance/');}else{re();}}).catch(re);setTimeout(re,1200);})();
</script>`;

html = html.replace('<html lang="en">', '<html lang="de">');
html = html.replace(
  /<title>[^<]*<\/title>/,
  `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${MAINT_GATE}
<title>MyWorkLog | Code-Graph</title>
<meta name="description" content="Der Quellcode von MyWorkLog als Wissensgraph: ${de(nodes)} Knoten, ${de(edges)} Kanten, ${de(communities)} Gruppen. Ergaenzung zur ArchFlow-Karte.">
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="https://myworklog.de/archflow/graph/">`
);

// ── 3. Kopfleiste ────────────────────────────────────────────────────────────
// body ist bei graphify ein Flex-Container mit height:100vh. Eine feste Leiste
// plus padding-top am body reicht deshalb aus — kein Umbau des Markups noetig
// (box-sizing:border-box setzt graphify selbst per *-Regel).
const BAR_CSS = `
  body { padding-top: 46px; }
  .mwl-bar {
    position: fixed; top: 0; left: 0; right: 0; height: 46px; z-index: 20;
    display: flex; align-items: center; gap: 14px; padding: 0 14px;
    background: #030305; border-bottom: 1px solid rgba(255,255,255,0.08);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .mwl-back {
    display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0;
    font-size: 13px; font-weight: 500; color: #94a3b8; text-decoration: none;
    padding: 7px 12px; border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.022);
    transition: color .18s ease, border-color .18s ease, background .18s ease;
  }
  .mwl-back:hover { color: #f8fafc; border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); }
  .mwl-back svg { width: 14px; height: 14px; }
  .mwl-title { font-size: 13.5px; font-weight: 600; color: #f8fafc; letter-spacing: -0.01em; }
  .mwl-meta {
    margin-left: auto; font-size: 11px; color: #64748b;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  @media (max-width: 700px) { .mwl-meta { display: none; } }

  /* ── Handy ───────────────────────────────────────────────────────────────
     graphify legt body als Flex-ZEILE an: #graph{flex:1} neben #sidebar mit
     festen 280px. Auf 390px Breite bleiben dem Graphen damit 110px — gemessen,
     und genau das sieht aus wie "der Graph kommt nicht". Untereinander statt
     nebeneinander: der Graph oben mit voller Breite, die Liste darunter.
     min-height:0 muss sein, sonst verweigert das Flex-Kind das Schrumpfen und
     die Liste wird aus dem Bild geschoben. */
  @media (max-width: 768px) {
    body { flex-direction: column; }
    #graph { width: 100%; min-height: 0; }
    #sidebar {
      width: 100%; flex: 0 0 auto; max-height: 38vh;
      border-left: none; border-top: 1px solid #2a2a4e;
    }
    #info-panel { min-height: 0; }
  }

  /* ── Aufbau-Hinweis ──────────────────────────────────────────────────────
     vis rechnet vor dem ERSTEN Bild 200 Iterationen Kraefteverteilung ueber
     2.337 Knoten. Bis dahin ist die Flaeche leer — ohne diesen Hinweis ist
     eine rechnende Seite von einer kaputten nicht zu unterscheiden. */
  #graph { position: relative; }
  #mwlLade {
    position: absolute; inset: 0; z-index: 10;
    display: flex; align-items: center; justify-content: center;
    background: #0f0f1a; padding: 24px;
    transition: opacity .25s ease;
  }
  #mwlLade.weg { opacity: 0; pointer-events: none; }
  .mwl-lade-in { width: 100%; max-width: 280px; text-align: center; }
  .mwl-lade-bar { height: 3px; border-radius: 2px; background: #2a2a4e; overflow: hidden; margin-bottom: 14px; }
  .mwl-lade-bar i { display: block; height: 100%; width: 0; background: #4E79A7; transition: width .2s linear; }
  .mwl-lade-in span { display: block; font-size: 13px; color: #e0e0e0; }
  .mwl-lade-in small { display: block; margin-top: 6px; font-size: 11.5px; color: #555; line-height: 1.5; }
  @media (prefers-reduced-motion: reduce) {
    #mwlLade, .mwl-lade-bar i { transition: none; }
  }
`;
html = html.replace('</style>', BAR_CSS + '</style>');

const BAR_HTML = `<div class="mwl-bar">
  <a class="mwl-back" href="/archflow/">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
    ArchFlow
  </a>
  <span class="mwl-title">Code-Graph</span>
  <span class="mwl-meta">${de(nodes)} Knoten · ${de(edges)} Kanten · Stand ${datum}${commit ? ' · ' + commit : ''}</span>
</div>
`;
html = html.replace('<body>', '<body>\n' + BAR_HTML);

// ── 4. Aufbau-Hinweis ────────────────────────────────────────────────────────
// Der Hinweis liegt IM Graph-Container, damit er nur die rechnende Flaeche
// abdeckt — Suche und Gruppenliste bleiben bedienbar.
const LADE_HTML = `<div id="mwlLade" role="status" aria-live="polite">
  <div class="mwl-lade-in">
    <div class="mwl-lade-bar"><i></i></div>
    <span id="mwlLadeTxt">Graph wird aufgebaut …</span>
    <small>${de(nodes)} Knoten und ${de(edges)} Kanten finden einmalig ihre Anordnung.</small>
  </div>
</div>`;
const vorGraph = html;
html = html.replace('<div id="graph"></div>', '<div id="graph">\n' + LADE_HTML + '\n</div>');
if (html === vorGraph) {
  console.error('[publish-graph] ✗ <div id="graph"></div> nicht gefunden — Ausgabeformat von graphify geaendert?');
  process.exit(1);
}

// `network` ist ein const auf oberster Skriptebene: eine spaetere klassische
// Skript-Marke im selben globalen Gueltigkeitsbereich sieht es, window.network
// gibt es dagegen NICHT.
// 🔴 Und `typeof network` ist hier KEIN sicherer Test: bei einem const in der
// temporalen Todeszone wirft schon typeof. Bricht das Hauptskript ab (vis nicht
// geladen, Integrity-Pruefung gescheitert), bleibt die Bindung uninitialisiert —
// ein ungeschuetztes typeof reisst dann auch diesen Hinweis mit in den Fehler,
// und uebrig bleibt genau die leere Flaeche, um die es hier geht.
const LADE_JS = `<script>
(function(){
  var el = document.getElementById('mwlLade');
  if (!el) return;
  var txt = document.getElementById('mwlLadeTxt');
  var bar = el.querySelector('.mwl-lade-bar i');
  var netz = null;
  try { netz = network; } catch (e) {}
  if (!netz) {
    el.classList.add('fehler');
    txt.textContent = 'Der Graph konnte nicht aufgebaut werden.';
    el.querySelector('small').textContent = typeof vis === 'undefined'
      ? 'Die Graph-Bibliothek wurde nicht geladen. Seite neu laden — bleibt es dabei, hilft die Übersicht unter /archflow/.'
      : 'Seite neu laden. Bleibt es dabei, hilft die Übersicht unter /archflow/.';
    return;
  }
  netz.on('stabilizationProgress', function (p) {
    var pct = Math.round(p.iterations / p.total * 100);
    bar.style.width = pct + '%';
    txt.textContent = 'Anordnung wird berechnet … ' + pct + ' %';
  });
  var ab = false;
  function weg() {
    if (ab) return; ab = true;
    bar.style.width = '100%';
    el.classList.add('weg');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
  }
  // Zwei Ausloeser: das Ende der Stabilisierung, und — als Netz darunter — das
  // erste gezeichnete Bild. Waere die Stabilisierung schon durch, bevor dieses
  // Skript laeuft, bliebe der Hinweis sonst ewig stehen.
  netz.once('stabilizationIterationsDone', weg);
  netz.once('afterDrawing', weg);
})();
</script>
`;
html = html.replace('</body>', LADE_JS + '</body>');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, html, 'utf8');

const mb = (fs.statSync(OUT).size / 1024 / 1024).toFixed(2);
console.log(`[publish-graph] ✓ ${de(nodes)} Knoten · ${de(edges)} Kanten · ${de(communities)} Gruppen`);
console.log(`[publish-graph] ✓ ${mb} MB → pages/archflow/graph/index.html  (Stand ${commit || '?'})`);
console.log('[publish-graph]   vis-network lokal, kein CDN-Aufruf.');
