#!/usr/bin/env node
// ═══ REPO-HISTORY — Schnappschuss der git-Historie ═══
//
// 🔴 WARUM ES DIESE DATEI GIBT: Cloudflare Pages klont FLACH (`--depth 1`).
// Im Build-Container kennt git genau EINEN Commit. `tools/repo-report.mjs`
// laeuft dort in `npm run build` und hat seine Zahlen direkt aus dem Klon
// gezogen — gemessen am 2026-08-29 auf der Live-Seite:
//
//     Commits 1 · Branches 1 · Project Start = Build-Datum ·
//     "By Weekday": ein einziger Balken · Heatmap: eine einzige Stunde
//
// Das Repo hatte zu dem Zeitpunkt 830 Commits seit 2025-12-25. Nichts an der
// Seite sah kaputt aus — sie sah nach einem Projekt aus, das gestern begann.
// Genau die Sorte Fehler, die nie auffaellt: die Diagramme rendern sauber,
// nur ihr Inhalt ist der eines leeren Repos.
//
// Nachladen geht im Build nicht: ein `git fetch --unshallow` braucht ein
// Token, das der Container nicht hat, und laedt bei jedem Deploy die ganze
// Historie. Also wandert die Historie als DATEN mit ins Repo. Der
// pre-commit-Hook haelt diese Datei frisch, der Bericht nimmt sie, sobald
// der Klon weniger weiss als sie.
//
// Aufruf: node tools/repo-history.mjs   (oder npm run repo:history)

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'config', 'repo-history.json');

// Der Bericht zeigt 30 Tage. 120 gibt Luft, falls ein Deploy erst Wochen
// nach dem letzten Commit laeuft — und kostet als kompaktes JSON ~3 KB.
const DAYS = 120;

const pad2 = (n) => String(n).padStart(2, '0');

function git(args) {
    return execFileSync('git', args, { cwd: ROOT, maxBuffer: 1e8, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

// Eine Person, mehrere git-Konfigurationen: "Sven K", "TechNova-App-Team" und
// "Sven Kunz" teilen sich dieselbe Adresse. Zusammengefasst wird deshalb nach
// E-MAIL, angezeigt wird der Name, unter dem am meisten committet wurde.
// Die Adresse selbst landet NICHT in der Datei: config/ wird ausgeliefert,
// die Datei waere unter /config/repo-history.json oeffentlich abrufbar.
export function authors() {
    const byMail = new Map();
    for (const line of git(['shortlog', '-sne', 'HEAD']).split('\n')) {
        const m = /^\s*(\d+)\s+(.+)$/.exec(line.trim());
        if (!m) continue;
        const commits = parseInt(m[1], 10);
        const id = /^(.*?)\s*<([^>]*)>$/.exec(m[2].trim());
        const name = (id ? id[1] : m[2]).trim() || 'Unbekannt';
        const mail = (id ? id[2] : m[2]).trim().toLowerCase();
        const cur = byMail.get(mail) || { name, commits: 0, top: 0 };
        cur.commits += commits;
        if (commits > cur.top) { cur.top = commits; cur.name = name; }
        byMail.set(mail, cur);
    }
    return [...byMail.values()]
        .sort((a, b) => b.commits - a.commits)
        .map(({ name, commits }) => ({ name, commits }));
}

// `git branch -a` listet lokale UND entfernte Zweige — dieselbe Verzweigung
// steht dort zweimal (`main` und `remotes/origin/main`), dazu der symbolische
// Verweis `remotes/origin/HEAD -> origin/main`, der gar keiner ist. Gezaehlt
// wird deshalb ueber die eindeutigen Namen. Das `+` vor einem Zweig heisst
// "in einem anderen Arbeitsbaum ausgecheckt", nicht "anderer Zweig".
export function branches() {
    const names = new Set();
    for (const raw of git(['branch', '-a']).split('\n')) {
        const b = raw.trim().replace(/^[*+]\s*/, '');
        if (!b || b.includes(' -> ')) continue;
        names.add(b.replace(/^remotes\/[^/]+\//, ''));
    }
    return [...names].sort();
}

function main() {
    if (git(['rev-parse', '--is-inside-work-tree']) !== 'true') {
        console.error('repo-history: kein git-Arbeitsbaum — uebersprungen.');
        return;
    }
    if (git(['rev-parse', '--is-shallow-repository']) === 'true') {
        // Aus einem flachen Klon einen Schnappschuss zu schreiben hiesse, die
        // gute Datei durch die kaputte zu ersetzen. Lieber gar nichts tun.
        console.error('repo-history: flacher Klon — Schnappschuss NICHT erneuert.');
        return;
    }

    // Ein Durchlauf fuer alles: Datum, ISO-Wochentag und Stunde stammen so
    // garantiert aus derselben Zeitzone (der des Commits), nicht aus drei
    // getrennten Aufrufen mit je eigener Auslegung.
    const rows = git(['log', '--format=%ad', '--date=format:%Y-%m-%d %u %H', 'HEAD'])
        .split('\n').filter(Boolean);
    if (!rows.length) { console.error('repo-history: keine Commits — uebersprungen.'); return; }

    const wn = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };
    const cut = new Date(Date.now() - DAYS * 86400000);
    const cutStr = `${cut.getFullYear()}-${pad2(cut.getMonth() + 1)}-${pad2(cut.getDate())}`;

    const daily = {}, weekday = {}, hourly = {};
    for (const row of rows) {
        const [date, wd, hh] = row.split(' ');
        if (date >= cutStr) daily[date] = (daily[date] || 0) + 1;
        const d = wn[parseInt(wd, 10)];
        if (d) weekday[d] = (weekday[d] || 0) + 1;
        const h = parseInt(hh, 10);
        if (!Number.isNaN(h)) hourly[h] = (hourly[h] || 0) + 1;
    }

    const now = new Date();
    const snap = {
        version: 1,
        generatedAt: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} `
            + `${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
        head: git(['rev-parse', 'HEAD']),
        branch: git(['branch', '--show-current']),
        totalCommits: rows.length,
        firstCommitDate: rows[rows.length - 1].slice(0, 10),   // git log ist neueste-zuerst
        branches: branches(),
        tags: git(['tag', '--sort=-creatordate']).split('\n').filter(Boolean).slice(0, 10),
        authors: authors(),
        dailyCommits: daily,
        weekdayCommits: weekday,
        hourlyCommits: hourly,
    };

    // Kompakt geschrieben: die Datei aendert sich bei JEDEM Commit. Als eine
    // Zeile ist das im Diff eine Zeile, eingerueckt waeren es hunderte.
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(snap) + '\n', 'utf8');
    console.log(`repo-history: ${snap.totalCommits} Commits seit ${snap.firstCommitDate}, `
        + `${snap.authors.length} Mitwirkende → config/repo-history.json`);
}

// Nur ausfuehren, wenn direkt aufgerufen — tools/repo-report.mjs importiert
// authors()/branches() aus dieser Datei, damit die Gruppierung nicht in zwei
// Fassungen auseinanderlaeuft.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
