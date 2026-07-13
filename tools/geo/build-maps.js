#!/usr/bin/env node
/**
 * build-maps.js — erzeugt Assets/js/insights/geo-maps.js
 * =====================================================
 * Quelle: Natural Earth (public domain, naturalearthdata.com).
 *   - ne_110m_admin_0_countries.geojson   → Weltkarte, Key = ISO-A2
 *   - ne_10m_admin_1_states_provinces.geojson → Deutschland, Key = ISO 3166-2 (DE-BY, …)
 *
 * Warum selbst generieren statt fertige SVG einbinden: Lizenz ist eindeutig (gemeinfrei),
 * die IDs matchen exakt die PostHog-Felder ($geoip_country_code / $geoip_subdivision_1_name),
 * und wir kontrollieren die Dateigroesse ueber die Vereinfachung.
 *
 * Aufruf: node tools/geo/build-maps.js <ne_countries.json> <ne_states.json> <out.js>
 */

const fs = require('fs');

// ── Projektionen ────────────────────────────────────────────────────────────
// Equal Earth (Šavrič/Patterson/Jenny 2018) — flaechentreu und deutlich huebscher
// als Mercator, das Groenland auf Afrika-Groesse aufblaest.
const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796;
const SQRT3_2 = Math.sqrt(3) / 2;

function equalEarth(lon, lat) {
  const l = lon * Math.PI / 180;
  const p = lat * Math.PI / 180;
  const th = Math.asin(SQRT3_2 * Math.sin(p));
  const th2 = th * th, th6 = th2 * th2 * th2;
  const den = 3 * (9 * A4 * th6 * th2 + 7 * A3 * th6 + 3 * A2 * th2 + A1);
  const x = 2 * Math.sqrt(3) * l * Math.cos(th) / den;
  const y = A4 * th6 * th2 * th + A3 * th6 * th + A2 * th2 * th + A1 * th;
  return [x, -y];  // SVG-Y zeigt nach unten
}

// Fuer Deutschland: Web-Mercator reicht auf dieser Breite und haelt Formen erkennbar.
function mercator(lon, lat) {
  const x = lon * Math.PI / 180;
  const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2));
  return [x, -y];
}

// ── Douglas-Peucker ─────────────────────────────────────────────────────────
function perpDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const cx = a[0] + t * dx, cy = a[1] + t * dy;
  return Math.hypot(p[0] - cx, p[1] - cy);
}

function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  let maxD = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= tol) return [pts[0], pts[pts.length - 1]];
  const left  = simplify(pts.slice(0, idx + 1), tol);
  const right = simplify(pts.slice(idx), tol);
  return left.slice(0, -1).concat(right);
}

// ── GeoJSON → SVG-Pfad ──────────────────────────────────────────────────────
function ringsOf(geom) {
  if (!geom) return [];
  if (geom.type === 'Polygon') return geom.coordinates;
  if (geom.type === 'MultiPolygon') return geom.coordinates.flat();
  return [];
}

function buildPaths(features, project, opts) {
  const { tol, minArea, keyFn, extraFn } = opts;
  const out = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const f of features) {
    const key = keyFn(f);
    if (!key) continue;

    const parts = [];
    for (const ring of ringsOf(f.geometry)) {
      let pts = ring.map(([lon, lat]) => project(lon, lat));
      pts = simplify(pts, tol);
      if (pts.length < 4) continue;

      // Winzige Inseln/Splitter rauswerfen — sie kosten Bytes und sind unsichtbar
      let rx0 = Infinity, ry0 = Infinity, rx1 = -Infinity, ry1 = -Infinity;
      for (const [x, y] of pts) {
        if (x < rx0) rx0 = x; if (x > rx1) rx1 = x;
        if (y < ry0) ry0 = y; if (y > ry1) ry1 = y;
      }
      if ((rx1 - rx0) * (ry1 - ry0) < minArea) continue;

      parts.push(pts);
      for (const [x, y] of pts) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    if (parts.length) out.push({ key, parts, extra: extraFn ? extraFn(f) : {} });
  }

  // Auf 1000er-Breite skalieren, damit die Pfade kurze Zahlen haben
  const W = 1000;
  const scale = W / (maxX - minX);
  const H = Math.round((maxY - minY) * scale);
  const r = n => Math.round(n * 10) / 10;

  const paths = out.map(({ key, parts, extra }) => {
    const d = parts.map(pts => {
      let s = '';
      let px = null, py = null;
      pts.forEach(([x, y], i) => {
        const sx = r((x - minX) * scale);
        const sy = r((y - minY) * scale);
        if (i === 0) { s += 'M' + sx + ' ' + sy; px = sx; py = sy; }
        else if (sx !== px || sy !== py) { s += 'L' + sx + ' ' + sy; px = sx; py = sy; }
      });
      return s + 'Z';
    }).join('');
    return Object.assign({ id: key, d }, extra);
  });

  return { viewBox: '0 0 ' + W + ' ' + H, paths };
}

// ── Deutsche Labels fuer die Bundeslaender ──────────────────────────────────
// PostHog/MaxMind liefert englische Namen ($geoip_subdivision_1_name) — die Karte
// soll aber deutsch beschriftet sein. Beide Richtungen brauchen wir zum Matchen.
const DE_STATES = {
  'DE-BW': ['Baden-Württemberg', 'Baden-Wurttemberg'],
  'DE-BY': ['Bayern', 'Bavaria'],
  'DE-BE': ['Berlin', 'Berlin'],
  'DE-BB': ['Brandenburg', 'Brandenburg'],
  'DE-HB': ['Bremen', 'Bremen'],
  'DE-HH': ['Hamburg', 'Hamburg'],
  'DE-HE': ['Hessen', 'Hesse'],
  'DE-MV': ['Mecklenburg-Vorpommern', 'Mecklenburg-Vorpommern'],
  'DE-NI': ['Niedersachsen', 'Lower Saxony'],
  'DE-NW': ['Nordrhein-Westfalen', 'North Rhine-Westphalia'],
  'DE-RP': ['Rheinland-Pfalz', 'Rhineland-Palatinate'],
  'DE-SL': ['Saarland', 'Saarland'],
  'DE-SN': ['Sachsen', 'Saxony'],
  'DE-ST': ['Sachsen-Anhalt', 'Saxony-Anhalt'],
  'DE-SH': ['Schleswig-Holstein', 'Schleswig-Holstein'],
  'DE-TH': ['Thüringen', 'Thuringia'],
};

// ── Main ────────────────────────────────────────────────────────────────────
const [, , countriesFile, statesFile, outFile] = process.argv;

const countries = JSON.parse(fs.readFileSync(countriesFile, 'utf8'));
const world = buildPaths(
  countries.features.filter(f => {
    const p = f.properties;
    const iso = p.ISO_A2 || p.iso_a2;
    if (!iso || iso === '-99') return false;
    return iso !== 'AQ';  // Antarktis raus — nimmt ein Drittel der Hoehe und hat nie Traffic
  }),
  equalEarth,
  {
    tol: 0.004,
    minArea: 0.00008,
    keyFn: f => f.properties.ISO_A2 || f.properties.iso_a2,
    extraFn: f => ({ name: f.properties.NAME || f.properties.name }),
  }
);

const states = JSON.parse(fs.readFileSync(statesFile, 'utf8'));
const deFeatures = states.features.filter(f => {
  const p = f.properties;
  return (p.iso_a2 === 'DE' || p.admin === 'Germany') && DE_STATES[p.iso_3166_2];
});

const germany = buildPaths(deFeatures, mercator, {
  tol: 0.0006,
  minArea: 0.0000004,
  keyFn: f => f.properties.iso_3166_2,
  extraFn: f => {
    const [de, en] = DE_STATES[f.properties.iso_3166_2];
    return { name: de, nameEn: en };
  },
});

const header = '// GENERIERT von tools/geo/build-maps.js — NICHT von Hand editieren.\n' +
               '// Quelle: Natural Earth (public domain, naturalearthdata.com).\n' +
               '// Neu bauen: npm run geo:build\n';

const body =
  header +
  'window.__GEO_WORLD__ = ' + JSON.stringify(world) + ';\n' +
  'window.__GEO_DE__ = ' + JSON.stringify(germany) + ';\n';

fs.writeFileSync(outFile, body);

console.log('Weltkarte:    ' + world.paths.length + ' Länder, viewBox ' + world.viewBox);
console.log('Deutschland:  ' + germany.paths.length + ' Bundesländer, viewBox ' + germany.viewBox);
console.log('Fehlend:      ' + Object.keys(DE_STATES).filter(k => !germany.paths.some(p => p.id === k)).join(', ') || '—');
console.log('Groesse:      ' + (Buffer.byteLength(body) / 1024).toFixed(1) + ' KB → ' + outFile);
