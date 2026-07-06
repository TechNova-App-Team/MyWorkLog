#!/usr/bin/env node
/**
 * scan-de.js — Acceptance-Scan: findet sichtbaren deutschen Rest in einer
 * generierten /en/-Seite. Gibt Text-Knoten aus, deren normalisierter Text
 * deutsche Marker enthält (Umlaute/ß oder häufige DE-Stoppwörter) — Kandidaten
 * für phrases.en.json. Ignoriert script/style/svg/code.
 *
 * Nutzung: node tools/i18n/scan-de.js pages/en/<name>/index.html
 */
'use strict';
const fs = require('fs');
const { JSDOM } = require('jsdom');

const file = process.argv[2];
const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
const dom = new JSDOM(raw);
const { document: doc, NodeFilter } = dom.window;

// häufige deutsche Wörter, die im Englischen nicht vorkommen
const DE_WORDS = /\b(und|oder|der|die|das|den|dem|des|ein|eine|einen|einem|nicht|mit|für|auf|aus|von|zum|zur|über|unter|bei|nach|vor|durch|gegen|ohne|dein|deine|deinem|deiner|dich|dir|du|wir|uns|unser|unsere|ist|sind|wird|werden|wurde|kann|können|muss|müssen|soll|sollen|hier|jetzt|mehr|alle|alles|kein|keine|wie|was|wann|warum|weil|dann|noch|schon|auch|sehr|immer|nie|jede|jeder|jedes|zwischen|Stunden|Woche|Monat|Jahr|Tag|Tage|Einstellungen|Zeit|Arbeit|Ausbildung|Berichtsheft|kostenlos|Datenschutz|Nutzung|Seite|zurück|weiter|schließen|öffnen|speichern|löschen|abbrechen|Beispiel|Fehler|Hinweis|Achtung|verfügbar|erstellen|bearbeiten)\b/i;
const UMLAUT = /[äöüß]/i;

const SKIP = new Set(['SCRIPT','STYLE','SVG','CODE','TEMPLATE','NOSCRIPT']);
const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
const seen = new Set();
let n;
while ((n = walker.nextNode())) {
  const el = n.parentElement;
  if (!el || SKIP.has(el.tagName)) continue;
  if (el.closest('script, style, svg, code, template, noscript')) continue;
  const t = n.textContent.trim().replace(/\s+/g, ' ');
  if (t.length < 2) continue;
  if (UMLAUT.test(t) || DE_WORDS.test(t)) {
    if (!seen.has(t)) { seen.add(t); console.log(JSON.stringify(t)); }
  }
}
console.error(`\n${seen.size} candidate(s) in ${file}`);
