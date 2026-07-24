#!/usr/bin/env node
/**
 * untranslated.js — zeigt Keys, die auf /en/ noch den DEUTSCHEN Wert tragen.
 *
 * Warum es das braucht: `npm run i18n:build` meldet "0 fehlend", sobald jeder
 * Key EXISTIERT. merge-dict fuellt nicht uebersetzte Keys mit dem deutschen
 * Wert — die stehen dann still auf Deutsch auf /en/, ohne dass irgendein Build
 * meckert. Dieses Script ist die ehrliche Zahl.
 *
 * Nutzung:  node tools/i18n/untranslated.js [seiten-id]
 *           npm run i18n:untranslated
 *
 * Ignoriert wird, was legitim gleich bleibt: Zahlen, Symbole, Emojis, Marken-
 * und Eigennamen, Abkuerzungen, Codeschnipsel. Bundeslaender und deutsche
 * Berufsbezeichnungen tauchen bewusst NICHT in der Ignore-Liste auf — ob die
 * uebersetzt werden, ist eine inhaltliche Entscheidung, keine technische.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/i18n/pages.config.json'), 'utf8'));
const want = process.argv[2];

function flat(o, p = '', a = {}) {
  for (const k in o) {
    const key = p ? p + '.' + k : k;
    if (o[k] && typeof o[k] === 'object') flat(o[k], key, a);
    else a[key] = o[k];
  }
  return a;
}

const TRIVIAL = [
  /^[\s\d.,:%+\-–—/()×·•✓✕✔✖→←↑↓#*|]+$/,
  /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+$/u,
  /^(MyWorkLog|GitHub|IHK|JAV|BBiG|JArbSchG|ArbZG|BUrlG|AGG|EntgFG|DSGVO|BDSG|TDDDG|DDG|MStV|DSA|PDF|CSV|JSON|TXT|XML|API|PWA|AES|PBKDF2|SHA|HTML|CSS|JS|TS|MIT|EU|USA|DE|EN|OK|ID|URL|E-Mail|Email|Info|Status|Update|Updates|Feedback|Import|Export|Timer|Chat|Cloud|Server|Browser|Session|Sessions|Dashboard|Support|Analytics|Performance|Backup|Backups|Sync|Reset|Standard|Basic|Pro|Premium|Start|Stop|Pause|Team|Tool|Tools|Links|Details|Version|Beta|Setup|Login|Logout|Look|Modern|Minimal|Kompakt|Total|Prompt|Token|Tokens|Web|App|Apps|Icon|Icons|Menu|Modal|Header|Footer|Sidebar|Grid|Chart|Charts|Report|Reports|Editor|Manager|Monitor|Scanner|Tracker|Terminal|Ghost|Galaxy|Quantum|Radar|Matrix|Level|XP|Skill|Skills|Quiz|Karma|Combo|Streak|Highscore|Ranking|Score|Online|Offline|Auto|Live|Name|Symbol|Position|Optional|Neutral|Uptime|Endpoints|Events|Engagement|Channel|Channels|Referrers|OS|LCP|Bounce|Jobs|Custom Fields|Workflow Rules|Recovery Center|Cloud Login|Cloud Sync|Discord|Google|Supabase|PayPal|EmailJS|Cloudflare|PostHog|Groq|Nominatim|OSRM|Komoot|FlixBus|BlaBlaCar|Deutsche Bahn|Google Maps|Deutschlandticket|Academy|Frontend|Backend|DevOps|Security|Cheat Sheets|Branch|Graph|Files|Groups|Hierarchy|ArchFlow|Changelog|Navigation|Kontakt)$/i,
  /^[a-z0-9.\-_/]+\.(js|ts|tsx|json|css|html|md|png|jpg|svg)$/i,
  /^(https?:|www\.|sk-|gpt-)/i,
];
function isTrivial(s) {
  if (typeof s !== 'string') return true;
  const t = s.trim();
  if (t.length < 2) return true;
  return TRIVIAL.some((re) => re.test(t));
}

let total = 0;
for (const pg of cfg.pages) {
  if (want && pg.id !== want) continue;
  const dictPath = path.join(ROOT, pg.dict);
  const enPath = path.join(ROOT, pg.enJson);
  if (!fs.existsSync(dictPath) || !fs.existsSync(enPath)) continue;
  const de = flat(JSON.parse(fs.readFileSync(dictPath, 'utf8')));
  const en = flat(JSON.parse(fs.readFileSync(enPath, 'utf8')));
  const rows = Object.keys(de).filter((k) => en[k] === de[k] && !isTrivial(de[k]));
  if (!rows.length) continue;
  total += rows.length;
  console.log('\n═══ ' + pg.id + ' (' + rows.length + ') ═══  → ' + pg.overrides);
  for (const k of rows) console.log('  ' + k + '\t' + JSON.stringify(de[k]));
}
console.log('\n' + (total ? total + ' Kandidat(en) stehen auf /en/ noch auf Deutsch.' : '✓ Keine untuebersetzten Kandidaten.'));
