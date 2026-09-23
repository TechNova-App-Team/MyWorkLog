#!/usr/bin/env node
// ═══ DIE AUFNAHMEN AUF /ihk-berichtsheft/ NEU MACHEN ═══
//
// Drei Bilder unter /Grafiken/ihk/, mit denselben erfundenen Beispieldaten wie
// /about/ (Seed aus tools/about-screenshots.mjs): der Dialog „IHK-Export
// importieren" leer und mit erkannten Wochen, dazu die Vorschau auf dem
// IHK-Vordruck. 1440 x 900, 2x, WebP. Braucht den lokalen Server (Portman, 5001).
//
//   node tools/ihk-screenshots.mjs   → Grafiken/ihk/*.webp, danach bumpen (?v=)
//
// 🔴 Die erkannten Wochen im zweiten Bild sind NICHT aus einer PDF gelesen:
// eine echte IHK-Export-PDF gehoert nicht ins Repo (Name, Betrieb, Texte eines
// echten Azubis). Das Skript fuellt ihkParsedWeeks mit erfundenen Wochen und
// ruft ihkShowResult() — genau die Funktion, die nach dem Auslesen laeuft. Die
// zwei juengsten Wochen liegen auf Wochen des Seeds, damit die Markierung
// „Bereits vorhanden" im Bild steht. Aendert sich die Form von ihkParsedWeeks
// (week, dateFrom, dateTo, hours, status), muss das hier mit.

import { mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const URL_BH = 'http://localhost:5001/berichtsheft/';
const OUT = join(ROOT, 'Grafiken', 'ihk');
const SEED = join(HERE, 'about-screenshots.seed.json');

const seedLauf = spawnSync(process.execPath, [join(HERE, 'about-screenshots.mjs'), '--nur-seed'], { cwd: ROOT, encoding: 'utf8' });
process.stdout.write(seedLauf.stdout); process.stderr.write(seedLauf.stderr);
if (seedLauf.status !== 0 || !existsSync(SEED)) { console.error('Seed fehlt'); process.exit(1); }

// Vor jedem Bild: B2B-Hinweiskarte raus (fuer Nicht-Mitglieder ein Hinweis,
// kein Inhalt) und dem Seiten-Start Zeit lassen.
const VORBEREITEN = "var c=document.getElementById('b2bCard');if(c)c.remove();";
const warte = (body, ms = 600) => `(function(){return new Promise(function(done){setTimeout(function(){${VORBEREITEN}${body}},800);})})()`;

const WOCHEN = `
var rs=reports.slice().sort(function(a,b){return a.dateFrom<b.dateFrom?-1:1;});
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
var erste=new Date(rs[0].dateFrom+'T00:00:00');
var std=[39.5,40,38.75,40,39.25,40,37.5,40,39,40,38.5,40,40,39.75];
var weeks=[];
for(var i=-2;i<12;i++){
  var m=i<0?new Date(rs[-i-1].dateFrom+'T00:00:00'):new Date(erste.getTime()-7*86400000*(i+1));
  var f=new Date(m);f.setDate(f.getDate()+4);
  weeks.push({week:getWeekNumber(m),year:2,dateFrom:iso(m),dateTo:iso(f),hours:std[i+2],status:i<1?'complete':'signed'});
}
weeks.sort(function(a,b){return a.dateFrom<b.dateFrom?1:-1;});
openIhkImport();
ihkParsedWeeks=weeks;
ihkShowResult({name:'Anna Beispiel',beruf:'Fachinformatikerin für Systemintegration',betrieb:'Musterwerk GmbH'});
setTimeout(function(){done(document.querySelectorAll('.ihk-week-card').length+' Wochen, '+document.querySelectorAll('.ihk-week-card.duplicate').length+' vorhanden');},600);`;

const VORDRUCK = `
var r=reports.filter(function(x){return x.status==='signed';}).sort(function(a,b){return a.dateFrom<b.dateFrom?1:-1;})[0];
openPDFModal(r.id);
setTimeout(function(){done('Vorlage '+_pdfCurrentStyle);},700);`;

const shots = [
    ['import-start.webp', warte("openIhkImport();setTimeout(function(){done('Dialog offen: '+document.getElementById('ihkImport').classList.contains('active'));},500);")],
    ['import-wochen.webp', warte(WOCHEN)],
    ['vordruck.webp', warte(VORDRUCK)],
];

mkdirSync(OUT, { recursive: true });
let fehler = 0;
for (const [datei, js] of shots) {
    const r = spawnSync(process.execPath, [join(HERE, 'screenshot.mjs'), URL_BH, join(OUT, datei), '--w', '1440', '--h', '900', '--dpr', '2', '--quality', '88', '--seed', SEED, '--wait', '3500', '--js', js], { cwd: ROOT, encoding: 'utf8' });
    process.stdout.write(r.stdout); process.stderr.write(r.stderr);
    if (r.status !== 0) fehler++;
}
console.log(fehler ? `${fehler} Aufnahme(n) fehlgeschlagen` : 'Drei Aufnahmen unter Grafiken/ihk/ — danach bumpen, damit die ?v= wechseln.');
process.exit(fehler ? 1 : 0);
