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

let commit = '';
try { commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch (e) {}
const datum = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
const de = (n) => n.toLocaleString('de-DE');

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
  @media (max-width: 700px) { .mwl-title, .mwl-meta { display: none; } }
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

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, html, 'utf8');

const mb = (fs.statSync(OUT).size / 1024 / 1024).toFixed(2);
console.log(`[publish-graph] ✓ ${de(nodes)} Knoten · ${de(edges)} Kanten · ${de(communities)} Gruppen`);
console.log(`[publish-graph] ✓ ${mb} MB → pages/archflow/graph/index.html  (Stand ${commit || '?'})`);
console.log('[publish-graph]   vis-network lokal, kein CDN-Aufruf.');
