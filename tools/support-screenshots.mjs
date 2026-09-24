#!/usr/bin/env node
// ═══ DIE VIER AUFNAHMEN AUF DER SUPPORT-SEITE NEU MACHEN ═══
//
// Dieselben erfundenen Beispieldaten wie /about/ (tools/about-screenshots.mjs
// schreibt die Seed-Datei), aber andere Ansichten — die Support-Seite zeigt
// bewusst nichts, was schon auf /about/ oder im Intro steht:
//   performance.webp   Performance (Arbeitsrhythmus), Rechner   → Kopf der Seite
//   verlauf-handy.webp Verlauf am Handy                         → Kopf, Handy
//   jahr.webp          Jahresansicht                            → "Der aktuelle Stand"
//   monat.webp         Monatsansicht                            → "Der aktuelle Stand"
//
//   node tools/support-screenshots.mjs     (braucht Portman auf 5001)
//
// Die Uhr wird per --pre auf 10:30 Uhr des heutigen Tages gestellt: die
// Begruessung im Kopf haengt an der Stunde, und ein "Gute Nacht, Anna" auf
// einer Aufnahme, die tagsueber angesehen wird, wirkt wie ein Versehen.
// Nur die Uhrzeit, nicht das Datum — die Beispieldaten rechnen ab heute.
//
// Die Bilder werden erst geladen, wenn die Support-Ansicht aufgeht
// (data-src, supportLoadShots() in support.html) — die Seite haengt an der
// index.html und wuerde sonst bei JEDEM App-Start ~500 KB mitziehen.

import { writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const URL_APP = 'http://localhost:5001/';
const OUT = join(ROOT, 'Grafiken', 'support');
const SEED = join(HERE, 'about-screenshots.seed.json');

const seedLauf = spawnSync(process.execPath, [join(HERE, 'about-screenshots.mjs'), '--nur-seed'], { cwd: ROOT, encoding: 'utf8' });
process.stdout.write(seedLauf.stdout); process.stderr.write(seedLauf.stderr);
if (seedLauf.status !== 0) process.exit(1);

const PRE = join(tmpdir(), 'mwl-support-uhr.js');
writeFileSync(PRE, `(function(){
  var Echt = Date, t = new Echt(); t.setHours(10, 30, 0, 0);
  var versatz = t.getTime() - Echt.now();
  function D(a, b, c, d, e, f, g) {
    if (!(this instanceof D)) return new Echt(Echt.now() + versatz).toString();
    switch (arguments.length) {
      case 0: return new Echt(Echt.now() + versatz);
      case 1: return new Echt(a);
      default: return new Echt(a, b, c === undefined ? 1 : c, d || 0, e || 0, f || 0, g || 0);
    }
  }
  D.prototype = Echt.prototype; D.UTC = Echt.UTC; D.parse = Echt.parse;
  D.now = function () { return Echt.now() + versatz; };
  window.Date = D;
})();`);

mkdirSync(OUT, { recursive: true });
// Am Handy laesst switchTab() die Schublade offen stehen — sie laege sonst ueber dem Verlauf.
const CLEAN = "var b=document.getElementById('localhostWarningBanner');if(b)b.remove();document.querySelectorAll('.toast,.smart-notification').forEach(e=>e.remove());document.querySelectorAll('.sidebar.active,.sidebar-overlay.active').forEach(e=>e.classList.remove('active'));if(typeof isSidebarOpen!=='undefined')isSidebarOpen=false;";
const tab = (id) => `(function(){${CLEAN}switchTab('${id}');return new Promise(r=>setTimeout(function(){${CLEAN}r(document.getElementById('userGreeting')?.textContent.trim().slice(0,30)||'ok')},1500))})()`;
const shots = [
    ['performance.webp', ['--w', '1440', '--h', '900'], tab('performance')],
    ['verlauf-handy.webp', ['--w', '390', '--h', '844'], tab('history')],
    ['jahr.webp', ['--w', '1440', '--h', '900'], tab('yearview')],
    ['monat.webp', ['--w', '1440', '--h', '900'], tab('monthcompare')],
];
let fehler = 0;
const nur = process.argv[2];
for (const [datei, masse, js] of shots.filter(([d]) => !nur || d.startsWith(nur))) {
    const r = spawnSync(process.execPath, [join(HERE, 'screenshot.mjs'), URL_APP, join(OUT, datei), ...masse, '--dpr', '2', '--quality', '86', '--seed', SEED, '--pre', PRE, '--wait', '3500', '--js', js], { cwd: ROOT, encoding: 'utf8' });
    process.stdout.write(r.stdout); process.stderr.write(r.stderr);
    if (r.status !== 0) fehler++;
}
console.log(fehler ? `${fehler} Aufnahme(n) fehlgeschlagen` : 'Vier Aufnahmen unter Grafiken/support/ — danach bumpen, damit die ?v= wechseln.');
process.exit(fehler ? 1 : 0);
