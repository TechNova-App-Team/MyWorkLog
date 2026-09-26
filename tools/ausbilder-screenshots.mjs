#!/usr/bin/env node
// ═══ DIE AUFNAHMEN AUF /ausbilder/ NEU MACHEN ═══
//
// Drei Bilder unter /Grafiken/ausbilder/ (1440 x 900, 2x, WebP), gezeichnet
// vom ECHTEN Code der Seite. Braucht den lokalen Server (Portman, 5001).
//
//   node tools/ausbilder-screenshots.mjs   → Grafiken/ausbilder/*.webp, danach bumpen (?v=)
//
//   cockpit.webp  Uebersicht eines angemeldeten Ausbilders
//   azubi.webp    dieselbe Uebersicht, Reiter "Azubis": Stand je Azubi
//   woche.webp    die Link-Ansicht einer Woche (ohne Konto)
//
// 🔴 Das Cockpit braucht ein Konto und liest aus Supabase. Ein echtes Konto
// gehoert in keine oeffentliche Aufnahme (Namen, Betrieb, Texte echter
// Azubis). Das Skript haengt deshalb per `screenshot.mjs --pre` einen Setter
// an window.BHB2B: sobald bh-b2b.js das Objekt setzt, werden NUR die
// Lese-Abfragen (angemeldet, status, azubiBerichte, meldungen, team) durch
// einen erfundenen Betrieb ersetzt. Gezeichnet wird mit renderKonto() der
// Seite — aendert sich die Form der Daten dort (Felder von `berichte`,
// `freigabe`, `team`), muss sie hier mit. Schreibende Aufrufe (entscheiden,
// einladen) sind NICHT ersetzt: in der Aufnahme wird nichts geklickt.
//
// Die Link-Ansicht ist dagegen echt: der Link wird mit Assets/js/mwl-codec.js
// aus drei Wochen des /about/-Seeds kodiert, genau wie das Berichtsheft ihn
// baut (bhBuildWeekPayload), und die Seite dekodiert ihn selbst.

import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const URL_AB = 'http://localhost:5001/ausbilder/';
const OUT = join(ROOT, 'Grafiken', 'ausbilder');
const SEED = join(HERE, 'about-screenshots.seed.json');
const PRE = join(HERE, 'ausbilder-screenshots.pre.js');   // gitignored, entsteht bei jedem Lauf neu

const seedLauf = spawnSync(process.execPath, [join(HERE, 'about-screenshots.mjs'), '--nur-seed'], { cwd: ROOT, encoding: 'utf8' });
process.stdout.write(seedLauf.stdout); process.stderr.write(seedLauf.stderr);
if (seedLauf.status !== 0 || !existsSync(SEED)) { console.error('Seed fehlt'); process.exit(1); }
const seed = JSON.parse(readFileSync(SEED, 'utf8'));
const berichte = [...seed.berichtsheft_reports].sort((a, b) => a.dateFrom.localeCompare(b.dateFrom));

// ── Der erfundene Betrieb ──────────────────────────────────────────────
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plusTage = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const inhalt = (r) => ({ hours: r.hours, department: r.department, mode: r.mode, dailyActivities: r.dailyActivities, dailyHours: r.dailyHours, dailySchool: r.dailySchool, activities: r.activities, instruction: r.instruction, school: r.school });
const freigabe = (r, entscheidung, anmerkung) => ({ entscheidung, anmerkung: anmerkung || '', ausbilder_name: 'M. Weber', pruefsumme: 'demo', erstellt_at: plusTage(r.dateTo, 3) + 'T09:12:00Z' });

// Anna: die Seed-Wochen. Aeltere abgezeichnet, die drei juengsten fertigen
// warten, die allerjuengste ist ein Entwurf (zaehlt nicht als offen).
function zeile(r, azubiId, status, fr, extra) {
    return Object.assign({
        id: azubiId + '_' + r.dateFrom, azubi_id: azubiId, kw: r.week, jahr: r.year,
        datum_von: r.dateFrom, datum_bis: r.dateTo, status, quelle: 'local', inhalt: inhalt(r),
        freigabe: fr, verlauf: fr ? [fr] : [], ketteOk: true, veraendert: false, nachgebessert: false, diff: null,
    }, extra || {});
}
const n = berichte.length;
const anna = berichte.map((r, i) => {
    const ab = n - 1 - i;   // 0 = juengste
    if (ab === 0) return zeile(r, 'a1', 'incomplete', null);
    if (ab <= 3) return zeile(r, 'a1', 'complete', null);
    return zeile(r, 'a1', 'complete', freigabe(r, 'approved'));
});
// Jonas: dieselben Zeitraeume ab der Haelfte, eine Woche nachgebessert nach Rueckgabe.
const jonas = berichte.slice(Math.floor(n / 2)).map((r, i, arr) => {
    const ab = arr.length - 1 - i;
    if (ab === 1) return zeile(r, 'a2', 'complete', freigabe(r, 'rejected', 'Bitte Dienstag ergänzen.'), { nachgebessert: true });
    if (ab === 0) return zeile(r, 'a2', 'complete', null);
    return zeile(r, 'a2', 'complete', freigabe(r, 'approved'));
});
// Mira: frisch dabei, zwei Wochen aus dem IHK-Import (bei der IHK
// abgezeichnet, nicht von hier), eine offene.
const mira = berichte.slice(n - 5).map((r, i) => {
    if (i < 2) return zeile(r, 'a3', 'signed', null, { quelle: 'ihk-import' });
    if (i === 4) return zeile(r, 'a3', 'complete', null);
    return zeile(r, 'a3', 'complete', freigabe(r, 'approved'));
});

const DATEN = {
    status: { rolle: 'ausbilder', name: 'Musterwerk GmbH', betriebId: 'demo', domain: 'musterwerk.de', domainOk: true, nachweisArt: 'dns', nachgewiesen: true, impressumUrl: 'https://musterwerk.de/impressum', anzeigeName: 'M. Weber' },
    konto: {
        betrieb: 'Musterwerk GmbH', betriebId: 'demo', domain: 'musterwerk.de', domainOk: true, nachweisArt: 'dns', nachgewiesen: true, impressumUrl: 'https://musterwerk.de/impressum', kontoEmail: 'm.weber@musterwerk.de',
        azubis: [
            { userId: 'a1', name: 'Anna Beispiel', berichte: anna },
            { userId: 'a2', name: 'Jonas Keller', berichte: jonas },
            { userId: 'a3', name: 'Mira Özdemir', berichte: mira },
        ],
    },
    team: [
        { userId: 'u1', name: 'M. Weber', ich: true, seit: plusTage(berichte[0].dateFrom, -200) },
        { userId: 'u2', name: 'S. Brandt', ich: false, seit: plusTage(berichte[0].dateFrom, 30) },
    ],
};
writeFileSync(PRE, `(function(){
var D=${JSON.stringify(DATEN)};
var echt;
Object.defineProperty(window,'BHB2B',{configurable:true,get:function(){return echt;},set:function(v){
  echt=v; if(!v) return;
  v.angemeldet=function(){return true;};
  v.status=async function(){return D.status;};
  v.azubiBerichte=async function(){return JSON.parse(JSON.stringify(D.konto));};
  v.meldungen=async function(){return [];};
  v.team=async function(){return D.team;};
}});
})();`);

// ── Der echte Link fuer die Link-Ansicht ───────────────────────────────
const fenster = { btoa, atob, TextEncoder, TextDecoder, Blob, Response, CompressionStream, DecompressionStream, Uint8Array };
fenster.window = fenster;
vm.runInNewContext(readFileSync(join(ROOT, 'Assets/js/mwl-codec.js'), 'utf8'), fenster);
const woche = (r) => ({ r: r.id, y: r.year, w: r.week, df: r.dateFrom, dt: r.dateTo, dep: r.department || '', sch: r.school || '', h: r.hours || 0, da: r.dailyActivities, dh: r.dailyHours || {} });
const nutzlast = { v: 1, az: seed.pdf_personal_cfg.name, bt: seed.pdf_personal_cfg.betrieb, ws: berichte.slice(n - 4, n - 1).map(woche) };
const code = await fenster.MWLCodec.encode(nutzlast);
if (!code || code.length < 50) { console.error('Link-Kodierung fehlgeschlagen'); process.exit(1); }

const shots = [
    ['cockpit.webp', URL_AB, `new Promise(function(r){setTimeout(function(){r(document.querySelectorAll('#abKonto .abk-kacheln > *').length+' Kacheln, Wochen im Stapel: '+document.querySelectorAll('#abKonto .abq-row').length)},1500)})`],
    // Seit v7.8.0 steht die Azubi-Sicht in einem eigenen Reiter — erst
    // umschalten, dann zur Reiterleiste scrollen.
    ['azubi.webp', URL_AB, `new Promise(function(r){setTimeout(function(){var t=document.querySelector('[data-ansicht="azubis"]');if(t)t.click();var k=document.querySelector('.abk-reiterleiste');var y=k?k.getBoundingClientRect().top+scrollY-90:600;window.scrollTo(0,y);setTimeout(function(){r('Reiter: '+(t?'azubis':'FEHLT')+', Karten: '+document.querySelectorAll('.abk-azubi').length)},700)},1500)})`],
    ['woche.webp', URL_AB + '#w=' + code, `new Promise(function(r){setTimeout(function(){r('Wochen: '+document.querySelectorAll('.ab-wk').length+', Titel: '+(document.getElementById('abWeekTitle')||{}).textContent)},1500)})`],
];
mkdirSync(OUT, { recursive: true });
let fehler = 0;
for (const [datei, url, js] of shots) {
    const r = spawnSync(process.execPath, [join(HERE, 'screenshot.mjs'), url, join(OUT, datei), '--w', '1440', '--h', '900', '--dpr', '2', '--quality', '88', '--pre', PRE, '--wait', '3000', '--js', js], { cwd: ROOT, encoding: 'utf8' });
    process.stdout.write(r.stdout); process.stderr.write(r.stderr);
    if (r.status !== 0) fehler++;
}
console.log(fehler ? `${fehler} Aufnahme(n) fehlgeschlagen` : 'Drei Aufnahmen unter Grafiken/ausbilder/ — danach bumpen, damit die ?v= wechseln.');
process.exit(fehler ? 1 : 0);
