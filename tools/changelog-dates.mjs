#!/usr/bin/env node
// ═══ CHANGELOG-DATES ═══
//
// Fuellt `changelogDates` in config/version.json auf: je Changelog-Version das
// Datum, an dem sie erstmals in config/version.json stand.
//
// 🔴 Warum ueberhaupt aus git und nicht von Hand: die 174 Eintraege hatten nie ein
// Datum — es gab nur das eine `releaseDate` der GERADE laufenden Version. Ohne
// Datum kann die Support-Seite keine Zeitachse zeigen, ohne sie zu erfinden
// (Reihenfolge der Versionsnummer ist KEINE Zeitachse: die Ueberlauf-Regel
// "Patch max 19" macht aus 6.4.0 mechanisch den Nachfolger von 6.3.19, nicht den
// groesseren Release). Der erste Commit, der eine Version traegt, ist der einzige
// harte Beleg im Repo — den holt dieses Skript einmal ab und friert ihn ein.
//
// Idempotent: vorhandene Datumsangaben bleiben unangetastet (git-Historie kann
// umgeschrieben werden, das eingefrorene Datum ist die Wahrheit). Nur fehlende
// werden ergaenzt.
//
// Aufruf: node tools/changelog-dates.mjs [--dry-run]

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'config/version.json';
const dry = process.argv.includes('--dry-run');

const cfg = JSON.parse(readFileSync(FILE, 'utf8'));
const changelog = cfg.changelog || {};
const dates = { ...(cfg.changelogDates || {}) };

const missing = Object.keys(changelog).filter((v) => !dates[v]);
if (!missing.length) {
    console.log('changelog-dates: nichts zu tun — alle ' + Object.keys(changelog).length + ' Versionen haben ein Datum.');
    process.exit(0);
}

// Aelteste zuerst, damit das ERSTE Auftreten einer Version gewinnt und nicht ein
// spaeterer Commit, der dieselbe Version nur noch einmal anfasst.
const log = execFileSync(
    'git',
    ['log', '--reverse', '--format=%H %ad', '--date=short', '--', FILE],
    { maxBuffer: 1e8 }
).toString().trim().split('\n');

const fromGit = Object.create(null);
let unreadable = 0;
for (const line of log) {
    const sp = line.indexOf(' ');
    const hash = line.slice(0, sp);
    const date = line.slice(sp + 1).trim();
    let version;
    try {
        version = JSON.parse(execFileSync('git', ['show', hash + ':' + FILE], { maxBuffer: 1e8 }).toString()).version;
    } catch {
        unreadable++;   // fruehe Commits mit kaputtem/anderem JSON — kein Grund abzubrechen
        continue;
    }
    if (version && !fromGit[version]) fromGit[version] = date;
}

const found = [];
const notFound = [];
for (const v of missing) {
    if (fromGit[v]) { dates[v] = fromGit[v]; found.push(v); }
    else notFound.push(v);
}

// Nach Version absteigend sortieren, damit die Datei lesbar bleibt und in der
// gleichen Reihenfolge steht wie `changelog`.
const cmp = (a, b) => {
    const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const d = (pb[i] || 0) - (pa[i] || 0);
        if (d) return d;
    }
    return 0;
};
const sorted = {};
for (const v of Object.keys(dates).sort(cmp)) sorted[v] = dates[v];

console.log('changelog-dates: ' + found.length + ' Datumsangaben aus git ergaenzt' +
            (unreadable ? ' (' + unreadable + ' Commits nicht lesbar, uebersprungen)' : ''));
if (notFound.length) {
    console.log('  ohne Beleg in git (bleiben ohne Datum): ' + notFound.join(', '));
}

if (dry) { console.log('  --dry-run: nichts geschrieben.'); process.exit(0); }

cfg.changelogDates = sorted;
writeFileSync(FILE, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
console.log('  ' + FILE + ' geschrieben (' + Object.keys(sorted).length + ' Datumsangaben).');
