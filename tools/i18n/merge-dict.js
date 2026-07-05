#!/usr/bin/env node
/**
 * merge-dict.js — baut ein vollständiges <lang>.json aus:
 *   base       = de.json (deutsche Registry, alle Keys)
 *   overrides  = flache { "namespace.key": "Translation" }-Map (nur was sich ändert)
 * Nicht überschriebene Keys behalten den deutschen Wert (korrekt für Marke/Emoji/Code).
 *
 * Nutzung: node tools/i18n/merge-dict.js <base.de.json> <overrides.json> <out.json>
 */
'use strict';
const fs = require('fs');

const [, , basePath, ovrPath, outPath] = process.argv;
if (!basePath || !ovrPath || !outPath) {
  console.error('Nutzung: node tools/i18n/merge-dict.js <base.de.json> <overrides.json> <out.json>');
  process.exit(1);
}

const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
const ovr = JSON.parse(fs.readFileSync(ovrPath, 'utf8'));
const out = JSON.parse(JSON.stringify(base)); // deep clone

function setDeep(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

let applied = 0, unknown = 0;
const unknownKeys = [];
function getDeep(obj, keyPath) {
  return keyPath.split('.').reduce((o, p) => (o && typeof o === 'object' ? o[p] : undefined), obj);
}

for (const [key, val] of Object.entries(ovr)) {
  if (key.startsWith('__')) { out[key] = val; applied++; continue; } // SEO-Meta
  if (getDeep(base, key) === undefined) { unknown++; unknownKeys.push(key); }
  setDeep(out, key, val);
  applied++;
}

fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`merge: ${applied} Overrides angewandt → ${outPath}`);
if (unknown) console.log(`  ⚠️ ${unknown} Override-Keys existieren nicht in base: ${unknownKeys.slice(0, 20).join(', ')}`);

// Coverage-Report: wie viele base-Strings sind noch identisch deutsch (potenziell untranslated)?
function flat(o, p = '', a = {}) { for (const k in o) { const key = p ? p + '.' + k : k; if (o[k] && typeof o[k] === 'object') flat(o[k], key, a); else a[key] = o[k]; } return a; }
const fb = flat(base), fo = flat(out);
const still = Object.keys(fb).filter((k) => fo[k] === fb[k]);
console.log(`  Coverage: ${Object.keys(fb).length - still.length}/${Object.keys(fb).length} Strings unterscheiden sich von DE (Rest = Marke/Emoji/Code/proper nouns).`);
