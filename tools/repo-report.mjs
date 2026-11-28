#!/usr/bin/env node
// ═══ REPO-REPORT ═══
//
// Erzeugt pages/repo-report/index.html. Loest repo-tracker.py ab: das Skript
// musste von Hand gestartet werden und die Ausgabe von Hand kopiert werden —
// jetzt haengt es in `npm run build` und laeuft damit bei jedem Deploy mit.
//
// 🔴 DIE BEWERTUNG IST NEU, NICHT NUR PORTIERT.
// Die Python-Fassung zeigte gross "Codebase health score 94/100". Die Funktion
// dahinter hiess `calc_complexity` und vergab die Punkte so:
//   25  Massive Codebase (50k+ lines)      -> weil es viel ist
//   20  Polyglot Architecture              -> weil es viele Sprachen sind
//   15  Complex Structure (100+ files)     -> weil es viele Dateien sind
//   12  Established (247d)                 -> weil es alt ist
//   15  Heavy Deps (20+)                   -> mehr Abhaengigkeiten = MEHR Punkte
// 82 der 94 Punkte kamen aus Groesse, Alter und Dateizahl. Ein 500k-Zeilen-
// Monolith mit 40 Abhaengigkeiten haette 100/100 bekommen. Gemessen wurde
// Komplexitaet, drangeschrieben stand Gesundheit.
//
// Jede Kennzahl hier ist stattdessen ein GEZAEHLTER Mangel mit genanntem
// Nenner, und der Nenner steht in der Ausgabe daneben ("0 von 130 Dateien").
// Wo nichts messbar ist, wird nicht gepunktet.
//
// Aufruf: node tools/repo-report.mjs [--stdout]

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { authors as groupAuthors, branches as branchNames } from './repo-history.mjs';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'pages', 'repo-report', 'index.html');

const IGNORE_DIRS = new Set(['.git', 'node_modules', '__pycache__', '.vscode', '.idea',
    'dist', 'build', 'coverage', '.next', 'venv', 'env', '.cache', '.parcel-cache']);
const IGNORE_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    '.DS_Store', 'Thumbs.db', '.gitkeep']);

// [Name, Zeilenkommentar, Blockanfang, Blockende]
const LANGUAGE_MAP = {
    '.html': ['HTML', null, '<!--', '-->'], '.css': ['CSS', null, '/*', '*/'],
    '.js': ['JavaScript', '//', null, null], '.mjs': ['JavaScript', '//', null, null],
    '.ts': ['TypeScript', '//', null, null], '.jsx': ['React JSX', '//', null, null],
    '.tsx': ['React TSX', '//', null, null], '.py': ['Python', '#', null, null],
    '.json': ['JSON', null, null, null], '.md': ['Markdown', null, null, null],
    '.yml': ['YAML', '#', null, null], '.yaml': ['YAML', '#', null, null],
    '.sql': ['SQL', '--', null, null], '.sh': ['Shell', '#', null, null],
    '.bat': ['Batch', 'REM', null, null], '.ps1': ['PowerShell', '#', null, null],
    '.xml': ['XML', null, '<!--', '-->'], '.svg': ['SVG', null, '<!--', '-->'],
    '.txt': ['Text', null, null, null], '.env': ['Environment', '#', null, null],
    '.toml': ['TOML', '#', null, null], '.ini': ['INI', ';', null, null],
};
const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2',
    '.ttf', '.eot', '.mp3', '.mp4', '.webm', '.zip', '.pdf', '.exe', '.dll']);

const GOOD = '#0ca30c', WARN = '#fab219', SERIOUS = '#ec835a', CRITICAL = '#d03b3b';
const CAT = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

const ICONS = {
    todo: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
    fixme: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
    bug: '<path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86z"/><path d="M12 8v4M12 16h.01"/>',
    hack: '<path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/>',
    xxx: '<path d="M4 22V4a1 1 0 0 1 1-1h13a1 1 0 0 1 .8 1.6L16 9l2.8 4.4a1 1 0 0 1-.8 1.6H5v7"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
};
const icon = (n, size = 14) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" `
    + `stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`;

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtNum = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const fmtSize = (b) => {
    for (const u of ['B', 'KB', 'MB', 'GB']) {
        if (b < 1024) return `${b < 10 && u !== 'B' ? b.toFixed(1) : Math.round(b)} ${u}`;
        b /= 1024;
    }
    return `${b.toFixed(1)} TB`;
};
const trunc = (t, n = 50) => (t.length > n ? t.slice(0, n - 2) + '..' : t);
const pad2 = (n) => String(n).padStart(2, '0');

function git(args) {
    try {
        return execFileSync('git', args, { cwd: ROOT, maxBuffer: 1e8, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch { return ''; }
}

// ─────────────────────────────────────────────────────────────────────────
// MARKER-SUCHE  (aus repo-tracker.py uebernommen, dort zuletzt korrigiert)
// ─────────────────────────────────────────────────────────────────────────
const TODO_SKIP_EXT = new Set(['.md', '.txt', '.json', '.html', '.xml', '.svg', '.yml', '.yaml', '.css']);
const TODO_MARKER_RE = /^(TODO|FIXME|HACK|BUG|XXX)\b/;

// Marker nur als eigenes, GROSS geschriebenes Wort am Anfang eines Kommentars.
// Ein blosser Teilstring meldete frueher "1900-Schaltjahr-Bug" als offenen BUG,
// und jedes `debug` haette dasselbe getan.
function findTodoMarker(s, cs) {
    let start = 0;
    for (;;) {
        const idx = s.indexOf(cs, start);
        if (idx === -1) return null;
        const body = s.slice(idx + cs.length).replace(/^[^A-Za-z]+/, '');
        const m = TODO_MARKER_RE.exec(body);
        if (m) return m[1];
        start = idx + cs.length;
    }
}

// ─────────────────────────────────────────────────────────────────────────
// DATEIEN EINLESEN
// ─────────────────────────────────────────────────────────────────────────
function walk(dir, out = []) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
    for (const e of entries) {
        if (e.isDirectory()) {
            if (!IGNORE_DIRS.has(e.name)) walk(path.join(dir, e.name), out);
        } else if (e.isFile() && !IGNORE_FILES.has(e.name)) {
            out.push(path.join(dir, e.name));
        }
    }
    return out;
}

// 🔴 GEZAEHLT WIRD, WAS IM REPO STEHT — nicht, was auf der Platte liegt.
// Bis v6.4.7 lief dieser Scan ueber walk(ROOT) und die Bewertung darunter ueber
// `git ls-files`. Auf einer Seite standen damit zwei verschiedene Repos: oben
// "502 files / 262.297 lines", unten "329 versionierte Quelldateien". Die 173
// Dateien Unterschied waren graphify-out/, .claude/, CLAUDE.md, AGENTS.md,
// notes.txt und die generierte index.html — alle in .gitignore.
// Zwei Folgen, beide unsichtbar: die Kopfzahlen der LOKALEN Vorschau wichen um
// ein Drittel von der Live-Seite ab (der Cloudflare-Klon kennt gitignorierte
// Dateien gar nicht), und die Dateitabelle listete Pfade aus .claude/ auf einer
// Seite, die ausgeliefert wird.
function scanFiles(tracked) {
    const files = [];
    const todos = [];
    const languages = {};
    const hashes = new Map();
    let totalLines = 0, codeLines = 0, commentLines = 0, blankLines = 0, totalSize = 0;

    const list = (tracked && tracked.length)
        ? tracked.map((f) => path.join(ROOT, ...f.split('/')))
        : walk(ROOT);

    for (const abs of list) {
        // Auf / normalisieren: `git ls-files` liefert immer Schraegstriche,
        // path.relative unter Windows Backslashes — sonst findet der Abgleich
        // mit der versionierten Dateiliste keine einzige Uebereinstimmung.
        const rel = path.relative(ROOT, abs).split(path.sep).join('/');
        const ext = path.extname(abs).toLowerCase();
        let size;
        try { size = fs.statSync(abs).size; } catch { continue; }

        if (BINARY_EXT.has(ext) || size > 2_000_000) {
            files.push({ path: rel, ext, size, lines: 0, code: 0, comments: 0, blanks: 0, binary: true, language: 'Binary' });
            totalSize += size;
            continue;
        }
        const [langName, cs, blockOpen, blockClose] = LANGUAGE_MAP[ext] || ['Other', null, null, null];
        let content;
        try { content = fs.readFileSync(abs, 'utf8'); } catch { continue; }
        const lines = content.split(/\r?\n/);

        let code = 0, comments = 0, blanks = 0, inBlock = false;
        const scanTodos = Boolean(cs) && !TODO_SKIP_EXT.has(ext);
        lines.forEach((line, i) => {
            const s = line.trim();
            if (!s) { blanks++; return; }
            // VOR den Kommentar-Abbruechen: sonst bleiben genau die Zeilen
            // ungesehen, die nur aus einem Marker-Kommentar bestehen.
            if (scanTodos) {
                const mk = findTodoMarker(s, cs);
                if (mk) todos.push({ file: rel, line: i + 1, marker: mk, text: s.slice(0, 120) });
            }
            if (blockOpen) {
                if (s.includes(blockOpen) && s.includes(blockClose)) { comments++; return; }
                if (s.includes(blockOpen)) { inBlock = true; comments++; return; }
                if (s.includes(blockClose)) { inBlock = false; comments++; return; }
                if (inBlock) { comments++; return; }
            }
            if (cs && s.startsWith(cs)) { comments++; return; }
            code++;
        });

        files.push({ path: rel, ext, size, lines: lines.length, code, comments, blanks, binary: false, language: langName });
        totalLines += lines.length; codeLines += code; commentLines += comments; blankLines += blanks; totalSize += size;
        if (!languages[langName]) languages[langName] = { files: 0, lines: 0, code: 0, size: 0 };
        languages[langName].files++; languages[langName].lines += lines.length;
        languages[langName].code += code; languages[langName].size += size;

        if (lines.length > 5) {
            const h = crypto.createHash('md5').update(content).digest('hex');
            if (!hashes.has(h)) hashes.set(h, []);
            hashes.get(h).push(rel);
        }
    }

    const duplicates = [];
    for (const paths of hashes.values()) {
        if (paths.length > 1) {
            for (let i = 0; i < paths.length; i++)
                for (let j = i + 1; j < paths.length; j++) duplicates.push([paths[i], paths[j]]);
        }
    }
    return { files, todos, languages, duplicates, totalLines, codeLines, commentLines, blankLines, totalSize };
}

// ─────────────────────────────────────────────────────────────────────────
// GIT
// ─────────────────────────────────────────────────────────────────────────
//
// 🔴 DER BUILD-KLON IST FLACH. Cloudflare Pages klont mit `--depth 1`; dort
// kennt git genau EINEN Commit. Gemessen am 2026-08-29 stand deshalb live
// "Commits 1", "Project Start = heute" und ein einzelner Balken bei Samstag,
// waehrend das Repo 830 Commits seit 2025-12-25 hatte. Die Seite sah nicht
// kaputt aus, sie sah nach einem neuen Projekt aus.
//
// Deshalb liest der Bericht die Historie aus config/repo-history.json, sobald
// der Klon WENIGER weiss als die Datei (tools/repo-history.mjs schreibt sie,
// der pre-commit-Hook haelt sie frisch). Was der flache Klon selbst korrekt
// weiss — HEAD, dessen Nachricht, der Arbeitsbaum — bleibt live.
function liveGitStats() {
    if (git(['rev-parse', '--is-inside-work-tree']) !== 'true') return { available: false };
    const s = { available: true };
    s.totalCommits = parseInt(git(['rev-list', '--count', 'HEAD']) || '0', 10);
    // repo-history.mjs laesst `git` absichtlich werfen (dort ist ein Fehler ein
    // Grund, den Schnappschuss NICHT zu schreiben). Hier ist er das nicht: ein
    // Repo ohne Commits laesst `shortlog HEAD` scheitern, und das riss bis
    // v6.4.7 den ganzen Bericht mit — statt nur diese eine Zeile.
    try { s.branches = branchNames(); } catch { s.branches = []; }
    s.currentBranch = git(['branch', '--show-current']);
    // Dieselbe Gruppierung wie im Schnappschuss (eine Person, mehrere
    // git-Konfigurationen) — und ohne E-Mail-Adresse: die Seite ist oeffentlich,
    // `shortlog -sne` liefert "Name <adresse>" und das stand hier bis v6.4.x
    // ungefiltert als Mitwirkender auf der Live-Seite.
    try { s.authors = groupAuthors(); } catch { s.authors = []; }
    s.lastCommit = git(['log', '-1', '--format=%H|%an|%ae|%ai|%s']);

    const since = new Date(Date.now() - 30 * 86400000);
    const sinceStr = `${since.getFullYear()}-${pad2(since.getMonth() + 1)}-${pad2(since.getDate())}`;
    s.dailyCommits = {};
    for (const l of git(['log', `--since=${sinceStr}`, '--format=%ai', 'HEAD']).split('\n').filter(Boolean))
        s.dailyCommits[l.slice(0, 10)] = (s.dailyCommits[l.slice(0, 10)] || 0) + 1;

    const wn = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };
    s.weekdayCommits = {};
    for (const l of git(['log', '--format=%ad', '--date=format:%u', 'HEAD']).split('\n').filter(Boolean)) {
        const d = wn[parseInt(l, 10)];
        if (d) s.weekdayCommits[d] = (s.weekdayCommits[d] || 0) + 1;
    }
    s.hourlyCommits = {};
    for (const l of git(['log', '--format=%ad', '--date=format:%H', 'HEAD']).split('\n').filter(Boolean)) {
        const h = parseInt(l, 10);
        if (!Number.isNaN(h)) s.hourlyCommits[h] = (s.hourlyCommits[h] || 0) + 1;
    }
    const first = git(['log', '--reverse', '--format=%ai', 'HEAD']).split('\n')[0] || '';
    s.firstCommitDate = first ? first.slice(0, 10) : 'N/A';
    s.uncommitted = git(['status', '--porcelain']).split('\n').filter(Boolean).length;
    s.tags = git(['tag', '--sort=-creatordate']).split('\n').filter(Boolean).slice(0, 10);
    s.shallow = git(['rev-parse', '--is-shallow-repository']) === 'true';
    return s;
}

function readHistorySnapshot() {
    try {
        const snap = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'repo-history.json'), 'utf8'));
        return snap && snap.totalCommits > 0 ? snap : null;
    } catch { return null; }
}

// Der HEAD des flachen Klons ist genau der Commit, der den Schnappschuss
// MITBRINGT — in der Datei kann er deshalb nicht enthalten sein. Seine eigenen
// Angaben kennt auch ein flacher Klon, also wird er hier exakt nachgetragen
// statt geschaetzt. Wochentag und Stunde kommen aus der Zeichenkette selbst:
// `new Date(...).getDay()` rechnete auf die Zeitzone des Build-Containers (UTC)
// um und verschoebe den Balken.
function addHeadCommit(s, snapHead) {
    const iso = git(['log', '-1', '--format=%H|%ai']);
    const [sha, ai] = iso.split('|');
    if (!sha || !ai || sha === snapHead) return;
    const date = ai.slice(0, 10);
    const hour = parseInt(ai.slice(11, 13), 10);
    const [y, m, d] = date.split('-').map(Number);
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    s.totalCommits += 1;
    s.dailyCommits[date] = (s.dailyCommits[date] || 0) + 1;
    s.weekdayCommits[wd] = (s.weekdayCommits[wd] || 0) + 1;
    if (!Number.isNaN(hour)) s.hourlyCommits[hour] = (s.hourlyCommits[hour] || 0) + 1;
}

function gitStats() {
    const live = liveGitStats();
    const snap = readHistorySnapshot();
    if (!snap) return live;
    // Voller Klon: die Datei ist hoechstens einen Commit alt, live ist besser.
    if (live.available && !live.shallow && live.totalCommits >= snap.totalCommits) return live;

    const s = {
        ...(live.available ? live : { available: true, uncommitted: 0, lastCommit: '' }),
        totalCommits: snap.totalCommits,
        firstCommitDate: snap.firstCommitDate,
        branches: snap.branches,
        tags: snap.tags,
        authors: snap.authors,
        dailyCommits: { ...snap.dailyCommits },
        weekdayCommits: { ...snap.weekdayCommits },
        hourlyCommits: { ...snap.hourlyCommits },
        // Cloudflare checkt losgeloest aus (`git branch --show-current` ist leer);
        // den Zweignamen kennt dort nur die Umgebung.
        currentBranch: live.currentBranch || process.env.CF_PAGES_BRANCH || snap.branch || '',
        historySource: 'snapshot',
        snapshotAt: snap.generatedAt || '',
    };
    if (live.available) addHeadCommit(s, snap.head);
    return s;
}

// ─────────────────────────────────────────────────────────────────────────
// GESUNDHEIT — gezaehlte Maengel, jeder mit genanntem Nenner
// ─────────────────────────────────────────────────────────────────────────

// Bewertet werden nur VERSIONIERTE Quelldateien. Generierte Artefakte
// (index.html, pages/en/**, Assets/i18n/*.json) stehen in .gitignore und
// tauchen hier nicht auf — an ihnen kann niemand etwas reparieren, sie
// duerfen die Note also weder heben noch senken.
// Ohne git-Auskunft liefe die Bewertung sonst ueber NULL Dateien und spuckte
// eine Note aus lauter "0 von 0" aus — gemessen 76/100 bei null gepruefter
// Datei. Das sieht echt aus und ist erfunden. Deshalb ein zweiter Weg ueber das
// Dateisystem, der dieselben Artefakte ausschliesst wie .gitignore.
const GENERATED = /^(index\.html|pages\/en\/|Assets\/i18n\/|pages\/repo-report\/index\.html)/;

function sourceFiles() {
    const out = git(['ls-files']);
    if (out) return out.split('\n').filter(Boolean);
    console.warn('repo-report: kein `git ls-files` — Bewertung laeuft ueber das Dateisystem.');
    return walk(ROOT)
        .map((abs) => path.relative(ROOT, abs).split(path.sep).join('/'))
        .filter((f) => !GENERATED.test(f));
}

const SRC_EXT = /\.(js|mjs|css|html|py|json|md|yml|yaml)$/;
// Nicht handgepflegt: Sperrdatei des Paketmanagers und die Ausgabe dieses
// Skripts selbst. Beide wuerden die Groessen-Kennzahl verzerren, ohne dass
// jemand daran etwas aendern koennte.
const NOT_AUTHORED = /^(package-lock\.json|pages\/repo-report\/index\.html)$/;
// Fuer Kommentardichte nur echte Quelltexte — .json und .md haben keine
// Kommentarsyntax und wuerden den Nenner mit Datenzeilen fluten.
const COMMENTABLE = /\.(js|mjs|css|html|py)$/;
const BIG_FILE_LINES = 1000;

function health(scan, tracked) {
    const factors = [];
    const add = (name, points, max, basis) => factors.push({ name, points: Math.round(points), max, basis });
    const readSafe = (p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return null; } };
    const src = (tracked || []).filter((f) => SRC_EXT.test(f) && !NOT_AUTHORED.test(f));

    // 1. Syntax — parst jede JS-Datei? Ein Parserfehler ist ein echter Defekt,
    //    kein Geschmack. (.mjs ist ESM und braucht den zweiten Weg.)
    const jsFiles = src.filter((f) => /\.(js|mjs)$/.test(f));
    const brokenFiles = [];
    for (const f of jsFiles) {
        const s = readSafe(f);
        if (s == null) continue;
        try { new vm.Script(s, { filename: f }); }
        catch {
            try { execFileSync(process.execPath, ['--check', path.join(ROOT, f)], { stdio: 'ignore' }); }
            catch { brokenFiles.push(f); }
        }
    }
    add('Syntax fehlerfrei', brokenFiles.length === 0 ? 20 : Math.max(0, 20 - brokenFiles.length * 5), 20,
        `${brokenFiles.length} von ${jsFiles.length} JS-Dateien parsen nicht`);

    // 2. Verweise — jedes lokale script/link-Ziel muss auf der Platte liegen.
    //    Genau die Klasse Fehler, die im Browser STUMM ist: die Seite baut sich
    //    auf, nur eben ohne das, was die fehlende Datei mitgebracht haette.
    let refTotal = 0; const deadRefs = [];
    for (const f of src.filter((x) => x.endsWith('.html'))) {
        const s = readSafe(f);
        if (s == null) continue;
        for (const m of s.matchAll(/(?:src|href)="([^"]+\.(?:js|css))(?:\?[^"]*)?"/g)) {
            const url = m[1];
            if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) continue;
            refTotal++;
            const target = url.startsWith('/') ? path.join(ROOT, url.slice(1)) : path.join(ROOT, path.dirname(f), url);
            if (!fs.existsSync(target)) deadRefs.push(`${f} -> ${url}`);
        }
    }
    add('Verweise auflösbar', deadRefs.length === 0 ? 15 : Math.max(0, 15 - deadRefs.length * 3), 15,
        `${deadRefs.length} von ${refTotal} lokalen Verweisen zeigen ins Leere`);

    // 3. Dateigroesse — nicht die Gesamtzahl der Zeilen (das ist Groesse, keine
    //    Qualitaet), sondern wie viel davon in Brocken steckt, die niemand mehr
    //    ueberblickt. Schwelle steht in der Ausgabe daneben.
    const sizes = src.map((f) => ({ f, n: (readSafe(f) || '').split('\n').length }));
    const srcLines = sizes.reduce((a, b) => a + b.n, 0) || 1;
    const bigOnes = sizes.filter((x) => x.n > BIG_FILE_LINES);
    const bigShare = bigOnes.reduce((a, b) => a + b.n, 0) / srcLines;
    // 20 % oder weniger = voll, ab 70 % null.
    const bigScore = 15 * Math.min(1, Math.max(0, 1 - (bigShare - 0.20) / 0.50));
    add('Dateien überschaubar', bigScore, 15,
        `${(bigShare * 100).toFixed(0)}% der Quellzeilen in ${bigOnes.length} Dateien über ${BIG_FILE_LINES} Zeilen`);

    // 4. Offene Marker
    const n = scan.todos.length;
    add('Keine offenen Marker', n === 0 ? 10 : Math.max(0, 10 - n * 2), 10,
        `${n} TODO/FIXME/BUG/HACK/XXX im Quelltext`);

    // 5. Doppelte Dateien
    const dup = scan.duplicates.length;
    add('Keine Dubletten', dup === 0 ? 10 : Math.max(0, 10 - dup * 3), 10,
        `${dup} Dateipaare mit identischem Inhalt`);

    // 6. Tests — gezaehlt wird, was da ist; eine Abdeckung wird NICHT behauptet,
    //    dafuer gibt es in diesem Projekt kein Werkzeug.
    const testFiles = (tracked || []).filter((f) => /\.test\.mjs$/.test(f));
    const ciDir = path.join(ROOT, '.github', 'workflows');
    const ci = fs.existsSync(ciDir) ? fs.readdirSync(ciDir) : [];
    const ciRunsTests = ci.some((w) => (readSafe(path.join('.github', 'workflows', w)) || '').includes('test'));
    let tScore = testFiles.length >= 10 ? 8 : testFiles.length >= 5 ? 6 : testFiles.length >= 1 ? 3 : 0;
    if (ciRunsTests && testFiles.length) tScore += 2;
    add('Tests vorhanden', tScore, 10,
        `${testFiles.length} Testdateien${ciRunsTests ? ', in CI verdrahtet' : ', nicht in CI'} (keine Abdeckung gemessen)`);

    // 7. Kommentardichte — ueber DENSELBEN Satz wie alles andere. Ueber den
    //    ganzen Baum gerechnet zog die Sperrdatei des Paketmanagers (7000 Zeilen
    //    ohne Kommentarsyntax) den Wert allein um mehr als die Haelfte herunter.
    const commentable = new Set(src.filter((f) => COMMENTABLE.test(f)));
    let cCode = 0, cCmt = 0;
    for (const f of scan.files) {
        if (!commentable.has(f.path)) continue;
        cCode += f.code; cCmt += f.comments;
    }
    const ratio = cCode ? cCmt / cCode : 0;
    const cScore = ratio >= 0.15 ? 8 : ratio >= 0.08 ? 6 : ratio >= 0.04 ? 3 : 1;
    add('Kommentiert', cScore, 8, `${(ratio * 100).toFixed(0)} Kommentarzeilen je 100 Codezeilen in ${commentable.size} Quelldateien`);

    // 8. Projekt-Hygiene
    const want = ['README', 'LICENSE', 'CONTRIBUTING', '.gitignore'];
    const found = want.filter((w) => (tracked || []).some((f) => path.basename(f).toUpperCase().startsWith(w.toUpperCase())));
    const hyg = (found.length + (ci.length ? 1 : 0)) / 5 * 7;
    add('Projekt-Hygiene', hyg, 7, `${found.length + (ci.length ? 1 : 0)} von 5: ${[...found, ...(ci.length ? ['CI'] : [])].join(', ') || '—'}`);

    // 9. Abhaengigkeiten — weniger ist besser. Genau andersherum als vorher,
    //    wo "Heavy Deps (20+)" die volle Punktzahl gab.
    let deps = 0;
    try {
        const pkg = JSON.parse(readSafe('package.json') || '{}');
        deps = Object.keys(pkg.dependencies || {}).length + Object.keys(pkg.devDependencies || {}).length;
    } catch { /* keine package.json — dann eben 0 */ }
    const dScore = deps <= 5 ? 5 : deps <= 15 ? 4 : deps <= 30 ? 2 : 0;
    add('Abhängigkeiten schlank', dScore, 5, `${deps} Pakete in package.json`);

    const score = Math.max(0, Math.min(100, factors.reduce((a, f) => a + f.points, 0)));
    return { score, factors, brokenFiles, deadRefs, bigOnes: bigOnes.sort((a, b) => b.n - a.n).slice(0, 5), scoredFiles: src.length };
}

// ─────────────────────────────────────────────────────────────────────────
// BERICHT BAUEN
// ─────────────────────────────────────────────────────────────────────────
// Design wie /preise/, /impressum/, /rechte-checker/ (Wunsch des Nutzers 28.11.2026:
// "wirklich alles, nicht nur Hintergrund"): Grund #08090d mit zwei Lichtscheinen
// und Heftlinien, Flaechen #0d0e12 mit einer 7-%-Linie, Bricolage fuer Titel,
// Geist fuer Text, Geist Mono nur fuer Pfade. Vorher Inter + JetBrains Mono,
// Abschnitte als "# composition" in Grossbuchstaben, alles auf Englisch.
// Werte aus Assets/css/preise.css :root — dort aendern heisst hier mitziehen.
const CSS = `:root {
  --grund:     #08090d;
  --flaeche:   #0d0e12;
  --flaeche-2: #17181e;
  --linie:     rgba(255,255,255,0.07);
  --linie-2:   rgba(255,255,255,0.14);
  --text:      #f8fafc;
  --text-2:    #a3afc0;
  --text-3:    #8b98ad;
  --primary:   #5578a8;
  --primary-rgb: 85,120,168;
  --akzent:    color-mix(in srgb, var(--primary) 62%, #fff);
  --gut:       ${GOOD};
  --warn:      ${WARN};
  --font-display: 'Bricolage Grotesque', 'Geist', system-ui, sans-serif;
  --font-body:    'Geist', system-ui, -apple-system, sans-serif;
  --font-code:    'Geist Mono', ui-monospace, monospace;
}
*,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
html { scroll-behavior:smooth; }
@media (prefers-reduced-motion:reduce) { html { scroll-behavior:auto; } }
body {
  font-family: var(--font-body);
  background:
    radial-gradient(64rem 38rem at 14% -10rem, rgba(var(--primary-rgb),0.26), transparent 72%) fixed,
    radial-gradient(52rem 40rem at 100% 112%, rgba(var(--primary-rgb),0.11), transparent 70%) fixed,
    var(--grund);
  color: var(--text-2);
  line-height: 1.55;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  font-variant-numeric: tabular-nums;
}
/* Heftlinien wie auf /preise/: fest, hinter dem Inhalt, nach unten ausgeblendet */
body::before {
  content:''; position:fixed; inset:0; z-index:-1; pointer-events:none;
  background: repeating-linear-gradient(180deg, transparent 0 31px, rgba(255,255,255,0.045) 31px 32px);
  -webkit-mask-image: radial-gradient(80rem 46rem at 28% -4rem, #000 0%, transparent 72%);
          mask-image: radial-gradient(80rem 46rem at 28% -4rem, #000 0%, transparent 72%);
}
a { color: inherit; }
::selection { background: rgba(var(--primary-rgb),0.4); }

.wrap { max-width:1180px; margin:0 auto; padding:0 28px 6rem; }

/* ─── Kopf wie .pr-top ─── */
.kopf { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:22px 0; }
.marke { display:inline-flex; align-items:center; gap:9px; font-weight:600; color:var(--text); text-decoration:none; }
.marke svg { width:22px; height:22px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; }
.kopf-stand { font-size:0.88rem; color:var(--text-3); }

/* ─── Hero: eine Zahl, ihr Nenner, die Fakten ─── */
.hero { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,0.9fr); gap:40px; align-items:end; padding:56px 0 48px; }
.hero-titel { font-family:var(--font-display); font-size:clamp(2.3rem, 1.3rem + 3.6vw, 4.2rem); font-weight:800; line-height:0.98; letter-spacing:-0.035em; color:var(--text); max-width:12ch; text-wrap:balance; }
.hero-note { margin-top:20px; max-width:52ch; font-size:1rem; color:var(--text-2); text-wrap:pretty; }
.note { padding:28px; border:1px solid var(--linie); border-radius:16px; background:var(--flaeche); }
.note-zeile { display:flex; align-items:baseline; gap:10px; }
.note-zahl { font-family:var(--font-display); font-size:4.6rem; font-weight:800; line-height:0.9; letter-spacing:-0.04em; color:var(--text); }
.note-von { font-size:1.2rem; color:var(--text-3); }
.note-stufe { margin-left:auto; font-size:0.9rem; font-weight:600; color:var(--tc); }
.gauge { margin-top:18px; }
.gauge-track { position:relative; height:6px; border-radius:3px; background:rgba(255,255,255,0.07); overflow:hidden; }
.gauge-fill { position:absolute; inset:0 auto 0 0; width:var(--pct,0%); border-radius:3px; background:var(--tc); }
.gauge-ticks { display:flex; justify-content:space-between; margin-top:6px; font-size:0.7rem; color:var(--text-3); }
.fakten { display:flex; flex-wrap:wrap; gap:6px 22px; margin-top:18px; padding-top:16px; border-top:1px solid var(--linie); font-size:0.86rem; color:var(--text-3); }
.fakten b { color:var(--text); font-weight:600; }

/* ─── Kennzahlen: eine Flaeche, duenne Trenner ─── */
.kpi-band { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); border:1px solid var(--linie); border-radius:16px; background:var(--flaeche); overflow:hidden; }
.kpi { padding:20px; border-right:1px solid var(--linie); }
.kpi:last-child { border-right:none; }
.kpi-lbl { font-size:0.8rem; color:var(--text-3); }
.kpi-v { margin-top:6px; font-family:var(--font-display); font-size:1.6rem; font-weight:700; letter-spacing:-0.02em; line-height:1; color:var(--text); }
.kpi-sub { margin-top:6px; font-size:0.76rem; color:var(--text-3); }

/* ─── Abschnitte wie .pr-h2 ─── */
.sec { margin:72px 0 24px; }
.sec h2 { font-family:var(--font-display); font-size:clamp(1.7rem, 1.2rem + 1.6vw, 2.4rem); font-weight:700; letter-spacing:-0.03em; line-height:1.05; color:var(--text); }
.sec p { margin-top:10px; max-width:62ch; color:var(--text-2); }

/* ─── Flaechen ─── */
.card { border:1px solid var(--linie); border-radius:16px; background:var(--flaeche); padding:24px; }
.card-ttl { display:flex; align-items:baseline; justify-content:space-between; gap:10px; margin-bottom:18px; font-size:1rem; font-weight:600; color:var(--text); }
.card-ttl small { font-size:0.8rem; font-weight:400; color:var(--text-3); }
.g2  { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
.g3  { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-bottom:16px; }
.g32 { display:grid; grid-template-columns:2.1fr 1fr; gap:16px; margin-bottom:16px; }
/* Ein Rasterkind hat min-width:auto und ist damit nie schmaler als sein
   Mindestinhalt. Chart.js schreibt dem <canvas> eine Pixelbreite ins
   style-Attribut — die zaehlt als Mindestinhalt, und die Karte konnte deshalb
   nicht mitschrumpfen: bei 430 px Viewport war .g2 423 px breit statt 376, und
   die ganze SEITE scrollte 15 px nach rechts. Gemessen, nicht vermutet. */
.g2 > *, .g3 > *, .g32 > * { min-width:0; }
.mb { margin-bottom:16px; }

.ch { position:relative; }
.ch canvas { max-width:100%; }
.h220 { height:250px; }

/* ─── Gestapelte Balken (Sprachen / Zeilen) — 2 px Fuge zwischen den Teilen ─── */
.stackbar { display:flex; gap:2px; height:12px; border-radius:6px; overflow:hidden; }
.stackbar .seg { height:100%; min-width:2px; }
.lg-list { display:flex; flex-direction:column; margin-top:12px; }
.lg-row { display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid var(--linie); font-size:0.9rem; }
.lg-row:last-child { border-bottom:none; }
.lg-dot { width:9px; height:9px; border-radius:3px; flex-shrink:0; }
.lg-name { flex:1; color:var(--text); }
.lg-files { font-size:0.8rem; color:var(--text-3); min-width:80px; text-align:right; }
.lg-code  { font-size:0.86rem; color:var(--text-2); min-width:64px; text-align:right; }
.lg-pct   { font-size:0.86rem; color:var(--text); min-width:52px; text-align:right; font-weight:600; }
.comp-legend { display:flex; flex-wrap:wrap; gap:6px 20px; margin-top:12px; font-size:0.86rem; }
.comp-legend span { display:flex; align-items:center; gap:7px; color:var(--text-3); }
.comp-legend b { color:var(--text); font-weight:600; }
.comp-legend i { width:9px; height:9px; border-radius:3px; display:inline-block; }

/* ─── Groesste Dateien: Liste mit Balken statt Diagramm — die Pfade bleiben
   lesbar (im Chart.js-Balken waren sie auf 26 Zeichen gekuerzt und 8 px klein) ─── */
.top-row { display:grid; grid-template-columns:minmax(0,1fr) 56px; gap:4px 14px; align-items:center; padding:7px 0; border-bottom:1px solid var(--linie); }
.top-row:last-child { border-bottom:none; }
.top-pfad { font-family:var(--font-code); font-size:0.78rem; color:var(--text-2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.top-n { grid-row:span 2; font-size:0.86rem; font-weight:600; color:var(--text); text-align:right; }
.top-spur { height:5px; border-radius:3px; background:rgba(255,255,255,0.05); overflow:hidden; }
.top-spur i { display:block; height:100%; border-radius:3px; background:var(--primary); }

/* ─── Git-Stand ─── */
.git-row { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:9px 0; border-bottom:1px solid var(--linie); }
.git-row:last-child { border-bottom:none; }
.gk { font-size:0.88rem; color:var(--text-3); }
.gv { font-weight:600; font-size:0.9rem; color:var(--text); }
.gv.accent { color:var(--akzent); }
.gv.warn { color:var(--warn); }
.gr-src { margin-top:12px; font-size:0.76rem; line-height:1.5; color:var(--text-3); }
.gr-src code { font-family:var(--font-code); font-size:0.74rem; color:var(--text-2); }
.lc-box { margin-top:14px; padding:14px 16px; background:var(--flaeche-2); border:1px solid var(--linie); border-radius:12px; }
.lc-msg { font-size:0.9rem; font-weight:500; line-height:1.45; margin-bottom:6px; color:var(--text); }
.lc-meta { display:flex; flex-wrap:wrap; gap:12px; font-size:0.76rem; color:var(--text-3); }
.lc-hash { font-family:var(--font-code); color:var(--akzent); }

/* ─── Wochentage ─── */
.wk-row { display:flex; align-items:center; gap:12px; padding:9px 0; border-bottom:1px solid var(--linie); font-size:0.9rem; }
.wk-row:last-child { border-bottom:none; }
.wk-day { width:92px; flex-shrink:0; color:var(--text-2); }
.wk-track { flex:1; height:6px; border-radius:3px; background:rgba(255,255,255,0.05); overflow:hidden; }
.wk-fill { height:100%; border-radius:3px; background:var(--primary); }
.wk-val { font-size:0.86rem; color:var(--text); min-width:32px; text-align:right; font-weight:600; }

/* ─── Punkte je Pruefung ─── */
/* Jede Zeile traegt ihren Nenner unter dem Namen — ohne ihn ist eine
   Punktzahl eine Behauptung. */
.fct-row { display:flex; align-items:flex-start; gap:12px; padding:9px 0; border-bottom:1px solid var(--linie); }
.fct-row:last-child { border-bottom:none; }
.fct-name { flex:1; font-size:0.9rem; color:var(--text); display:flex; flex-direction:column; gap:2px; }
.fct-basis { font-size:0.76rem; color:var(--text-3); }
.fct-track { width:52px; height:5px; margin-top:8px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden; flex-shrink:0; }
.fct-fill { height:100%; border-radius:3px; }
.fct-val { font-size:0.84rem; font-weight:600; color:var(--text); min-width:40px; text-align:right; }

/* ─── TAGESPROFIL: 24 Balken ueber einer ECHTEN Stundenachse ────────────
   Vorher lag hier eine Kachelmatrix: 12 Spalten x 2 Reihen, Menge als Alpha,
   darunter eine Beschriftung "00:00 06:00 12:00 18:00 23:00" ueber die volle
   Breite. Die Achse gab es nicht, Alpha 0.05 und 0.06 sind nicht
   unterscheidbar. Laenge auf einer gemeinsamen Grundlinie ist ablesbar, Alpha
   nicht — und die Beschriftung sitzt in DEMSELBEN 24-Spalten-Raster wie die
   Balken, kann also nicht verrutschen. */
.dayp { position:relative; padding-top:28px; }
.dayp-plot { display:grid; grid-template-columns:repeat(24,1fr); gap:3px; height:140px; align-items:end; border-bottom:1px solid var(--linie-2); }
.dayp-col { position:relative; height:100%; display:flex; align-items:flex-end; border-radius:4px 4px 0 0; }
.dayp-col:hover { background:rgba(var(--primary-rgb),0.1); }
.dayp-bar { width:100%; height:var(--h,0%); min-height:3px; background:var(--primary); border-radius:4px 4px 0 0; opacity:0.6; transition:opacity 0.12s ease; }
.dayp-col:hover .dayp-bar, .dayp-col.is-peak .dayp-bar { opacity:1; }
/* Eine Stunde OHNE Commit unterscheidet sich in zwei Kanaelen von einer mit
   genau einem: grau statt Akzent UND einen Pixel flacher. */
.dayp-col.is-zero .dayp-bar { height:2px; min-height:2px; background:var(--linie-2); opacity:1; }
/* Die Sprechblase liegt im reservierten Streifen UEBER dem Diagramm: sie kann
   weder einen Balken verdecken noch aus der Karte laufen. */
.dayp-col::after {
  content:attr(data-tip); display:none; position:absolute; bottom:calc(100% + 7px); left:50%; transform:translateX(-50%);
  background:var(--flaeche-2); color:var(--text); font-size:0.74rem; padding:4px 9px; border-radius:8px;
  white-space:nowrap; border:1px solid var(--linie-2); pointer-events:none; z-index:2;
}
.dayp-col:hover::after { display:block; }
.dayp-col:nth-child(-n+4)::after  { left:0; right:auto; transform:none; }
.dayp-col:nth-child(n+21)::after  { left:auto; right:0; transform:none; }
/* Unter ~900 px ist die Sprechblase breiter als vier Spalten — sie haengt sich
   an die Karte statt an die Spalte; der Streifen ist fuer sie reserviert. */
@media(max-width:900px) {
  .dayp-col { position:static; }
  .dayp-col::after { left:0; right:auto; bottom:auto; top:0; transform:none; }
}
.dayp-peak { position:absolute; top:0; right:0; font-size:0.78rem; color:var(--text-3); transition:opacity 0.12s ease; }
.dayp:has(.dayp-col:hover) .dayp-peak { opacity:0; }
.dayp-axis { display:grid; grid-template-columns:repeat(24,1fr); gap:3px; margin-top:7px; font-size:0.7rem; color:var(--text-3); }
.dayp-axis span { text-align:center; }

/* ─── Befunde und Marker ─── */
.todo-scroll { max-height:360px; overflow-y:auto; }
.todo-row {
  display:grid; grid-template-columns:120px minmax(0,1fr); grid-template-rows:auto auto;
  gap:2px 14px; padding:10px 0 10px 14px; border-left:2px solid; border-bottom:1px solid var(--linie);
}
.todo-row:last-child { border-bottom:none; }
.todo-tag { font-size:0.8rem; font-weight:600; grid-row:span 2; display:flex; align-items:center; gap:6px; height:fit-content; }
.todo-file { font-family:var(--font-code); font-size:0.74rem; color:var(--text-3); }
.todo-txt { font-size:0.88rem; color:var(--text); overflow-wrap:anywhere; }
.empty-note { padding:28px 12px; text-align:center; color:var(--text-3); font-size:0.9rem; display:flex; flex-direction:column; align-items:center; gap:8px; }
.empty-note svg { color:var(--gut); }

/* ─── Dateitabelle ─── */
.tbl-wrap { overflow-x:auto; max-height:480px; overflow-y:auto; }
table { width:100%; border-collapse:collapse; font-size:0.86rem; }
thead { position:sticky; top:0; z-index:2; background:var(--flaeche); }
th { text-align:left; padding:10px 12px; font-size:0.8rem; font-weight:600; color:var(--text-3); border-bottom:1px solid var(--linie-2); white-space:nowrap; }
td { padding:8px 12px; border-bottom:1px solid var(--linie); vertical-align:middle; }
tr:hover td { background:rgba(255,255,255,0.02); }
.td-path { font-family:var(--font-code); font-size:0.78rem; color:var(--text); }
.badge { font-size:0.74rem; font-weight:600; padding:2px 9px; border-radius:20px; border:1px solid; white-space:nowrap; }
.td-n { text-align:right; color:var(--text-2); }
.td-muted { color:var(--text-3); }
.ratio { width:52px; height:5px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden; }
.ratio div { height:100%; border-radius:3px; }

/* ─── Fuss ─── */
footer { margin-top:72px; padding-top:20px; border-top:1px solid var(--linie); display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px 20px; font-size:0.84rem; color:var(--text-3); }
footer a { color:var(--text-2); text-decoration:underline; text-underline-offset:3px; text-decoration-color:var(--linie-2); }

:focus-visible { outline:2px solid rgba(var(--primary-rgb),0.9); outline-offset:3px; }
@media (prefers-reduced-motion:reduce) { .dayp-bar, .dayp-peak { transition:none; } }

@media(max-width:1100px) {
  .kpi-band { grid-template-columns:repeat(3,minmax(0,1fr)); }
  .kpi:nth-child(3n) { border-right:none; }
  .kpi:nth-child(-n+3) { border-bottom:1px solid var(--linie); }
  .g3,.g32 { grid-template-columns:1fr; }
  .hero { grid-template-columns:1fr; align-items:start; }
}
@media(max-width:768px) {
  .kpi-band { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .kpi { border-bottom:1px solid var(--linie); }
  .kpi:nth-child(3n) { border-right:1px solid var(--linie); }
  .kpi:nth-child(2n) { border-right:none; }
  .g2 { grid-template-columns:1fr; }
  .wrap { padding:0 16px 4rem; }
  .kopf-stand { font-size:0.76rem; text-align:right; max-width:58%; }
  .card, .note { padding:20px; }
  .note-zahl { font-size:3.6rem; }
  .sec { margin-top:56px; }
  .todo-row { grid-template-columns:1fr; }
  .todo-tag { grid-row:auto; }
  /* 24 Balken auf 300 px: Luecke schrumpfen; von den Achsenmarken (alle 3 h)
     bleiben 00/06/12/18 stehen — 03/09/15/21 stossen sonst aneinander. */
  .dayp-plot, .dayp-axis { gap:2px; }
  .dayp-plot { height:110px; }
  .dayp-axis span:nth-child(6n+4) { visibility:hidden; }
}
`;

function buildHtml(scan, gs, h) {
    const tf = scan.files.filter((x) => !x.binary);
    const sl = Object.entries(scan.languages).sort((a, b) => b[1].code - a[1].code);

    // Sprachen als gestapelter Balken (kein Donut: benachbarte Segmente lassen
    // sich vergleichen, Tortenstuecke ueber alle Paare hinweg nicht).
    const langRows = [];
    let otherCode = 0, otherFiles = 0;
    sl.forEach(([name, d], i) => {
        if (i < 8) langRows.push({ name, code: d.code, files: d.files, color: CAT[i] });
        else { otherCode += d.code; otherFiles += d.files; }
    });
    // Der Sammelposten heisst bewusst NICHT "Other": die Sprachtabelle kennt
    // schon eine echte Sprache dieses Namens (Fallback fuer unbekannte
    // Endungen), und dann stand "Other" zweimal in der Legende.
    if (otherCode > 0) langRows.push({ name: 'Weitere', code: otherCode, files: otherFiles, color: 'rgba(255,255,255,0.18)' });
    const langTotal = langRows.reduce((a, r) => a + r.code, 0) || 1;
    langRows.forEach((r) => { r.pct = r.code / langTotal * 100; });
    const langColor = Object.fromEntries(langRows.map((r) => [r.name, r.color]));
    const pct = (v) => v.toFixed(1).replace('.', ',');

    const langBar = langRows.map((r) =>
        `<div class="seg" style="width:${r.pct.toFixed(3)}%;background:${r.color}" title="${esc(r.name)}: ${pct(r.pct)} %"></div>`).join('');
    const langLegend = langRows.map((r) => `<div class="lg-row">
  <span class="lg-dot" style="background:${r.color}"></span>
  <span class="lg-name">${esc(r.name)}</span>
  <span class="lg-files">${fmtNum(r.files)} ${r.files === 1 ? 'Datei' : 'Dateien'}</span>
  <span class="lg-code">${fmtNum(r.code)}</span>
  <span class="lg-pct">${pct(r.pct)} %</span>
</div>`).join('');

    const lt = scan.totalLines || 1;
    const codePct = scan.codeLines / lt * 100, cmtPct = scan.commentLines / lt * 100, blankPct = scan.blankLines / lt * 100;
    const linesBar = `<div class="stackbar">
  <div class="seg" style="width:${codePct.toFixed(3)}%;background:var(--primary)" title="Code: ${pct(codePct)} %"></div>
  <div class="seg" style="width:${cmtPct.toFixed(3)}%;background:rgba(255,255,255,0.34)" title="Kommentare: ${pct(cmtPct)} %"></div>
  <div class="seg" style="width:${blankPct.toFixed(3)}%;background:rgba(255,255,255,0.12)" title="Leerzeilen: ${pct(blankPct)} %"></div>
</div>`;

    const topFiles = [...tf].sort((a, b) => b.lines - a.lines).slice(0, 10);
    const topMax = topFiles.length ? topFiles[0].lines : 1;
    const topHtml = topFiles.map((x) => `<div class="top-row">
  <span class="top-pfad" title="${esc(x.path)}">${esc(x.path)}</span>
  <span class="top-n">${fmtNum(x.lines)}</span>
  <div class="top-spur"><i style="width:${(x.lines / topMax * 100).toFixed(1)}%"></i></div>
</div>`).join('');

    // 30-Tage-Zeitachse
    const tl = [], tv = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 86400000);
        const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
        tl.push(`${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.`); tv.push((gs.dailyCommits || {})[key] || 0);
    }
    const tvSum = tv.reduce((a, b) => a + b, 0);

    const wdOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const wdFull = { Mon: 'Montag', Tue: 'Dienstag', Wed: 'Mittwoch', Thu: 'Donnerstag', Fri: 'Freitag', Sat: 'Samstag', Sun: 'Sonntag' };
    const wdVals = wdOrder.map((d) => (gs.weekdayCommits || {})[d] || 0);
    const wdMax = Math.max(...wdVals, 1);
    const wdHtml = wdOrder.map((d, i) => `<div class="wk-row">
  <span class="wk-day">${wdFull[d]}</span>
  <div class="wk-track"><div class="wk-fill" style="width:${(wdVals[i] / wdMax * 100).toFixed(1)}%"></div></div>
  <span class="wk-val">${wdVals[i]}</span>
</div>`).join('');

    // Tagesprofil: Menge als LAENGE auf gemeinsamer Grundlinie, ueber einer
    // echten 24er-Achse. Kein `title`-Attribut: die Karte hat eine eigene
    // Sprechblase, beide zusammen ergaben zwei Tooltips.
    const hourly = gs.hourlyCommits || {};
    const hourVals = Array.from({ length: 24 }, (_, hh) => hourly[hh] || 0);
    const hourSum = hourVals.reduce((a, b) => a + b, 0);
    const maxH = Math.max(...hourVals, 1);
    const peakH = hourVals.indexOf(maxH);
    const hourCols = hourVals.map((cnt, hh) => {
        const cls = cnt === 0 ? ' is-zero' : (hh === peakH ? ' is-peak' : '');
        const share = hourSum ? `, ${pct(cnt / hourSum * 100)} %` : '';
        return `<div class="dayp-col${cls}" data-tip="${pad2(hh)}:00 — ${fmtNum(cnt)} Commits${share}">`
            + `<span class="dayp-bar" style="--h:${(cnt / maxH * 100).toFixed(1)}%"></span></div>`;
    }).join('');
    const hourAxis = hourVals.map((_, hh) => `<span>${hh % 3 === 0 ? pad2(hh) : ''}</span>`).join('');
    const hourAria = hourSum
        ? `Commits je Stunde, ${fmtNum(hourSum)} insgesamt. Spitze um ${pad2(peakH)}:00 Uhr mit ${fmtNum(maxH)} Commits.`
        : 'Commits je Stunde: keine Daten.';

    // Woher die Historie stammt, steht dran. Der Build-Container hat sie nicht
    // (flacher Klon) — eine Zahl ohne Herkunft waere hier genau die Sorte
    // Angabe, die vorher jahrelang falsch war und richtig aussah.
    const srcHtml = gs.historySource === 'snapshot'
        ? `<div class="gr-src">Historie aus <code>config/repo-history.json</code>`
          + `${gs.snapshotAt ? `, Stand ${esc(gs.snapshotAt)}` : ''}`
          + `. Der Build-Klon ist flach und kennt nur den letzten Commit.</div>`
        : '';

    let lcHtml = '';
    const lraw = gs.lastCommit || '';
    if (lraw.includes('|')) {
        const p = lraw.split('|');
        if (p.length >= 5) lcHtml = `<div class="lc-box">
  <div class="lc-msg">${esc(p.slice(4).join('|'))}</div>
  <div class="lc-meta"><span>${esc(p[1])}</span><span class="lc-hash">${esc(p[0].slice(0, 7))}</span><span>${esc(p[3].slice(0, 10))}</span></div>
</div>`;
    }

    let authHtml = '';
    if (gs.authors && gs.authors.length) {
        const tot = gs.authors.reduce((a, x) => a + x.commits, 0) || 1;
        gs.authors.slice(0, 7).forEach((a, i) => {
            authHtml += `<div class="lg-row">
  <span class="lg-dot" style="background:${CAT[i % CAT.length]}"></span>
  <span class="lg-name">${esc(a.name)}</span>
  <span class="lg-code">${fmtNum(a.commits)}</span>
  <span class="lg-pct">${a.commits && a.commits / tot < 0.005 ? '&lt;1' : (a.commits / tot * 100).toFixed(0)} %</span>
</div>`;
        });
    }

    // Stufen beschreiben, was gemessen wurde — nicht "Enterprise Grade".
    const sc = h.score;
    let tierLbl, tc;
    if (sc >= 85) { tierLbl = 'Keine offenen Befunde'; tc = GOOD; }
    else if (sc >= 70) { tierLbl = 'Einzelne Schwachstellen'; tc = GOOD; }
    else if (sc >= 50) { tierLbl = 'Mehrere Schwachstellen'; tc = WARN; }
    else if (sc >= 30) { tierLbl = 'Deutliche Mängel'; tc = SERIOUS; }
    else { tierLbl = 'Grundlegende Mängel'; tc = CRITICAL; }

    const fctHtml = h.factors.map((f) => {
        const w = f.max ? (f.points / f.max * 100) : 0;
        const col = w >= 80 ? GOOD : w >= 50 ? WARN : w >= 25 ? SERIOUS : CRITICAL;
        return `<div class="fct-row">
  <span class="fct-name">${esc(f.name)}<small class="fct-basis">${esc(f.basis)}</small></span>
  <div class="fct-track"><div class="fct-fill" style="width:${w.toFixed(0)}%;background:${col}"></div></div>
  <span class="fct-val">${f.points}/${f.max}</span>
</div>`;
    }).join('');

    const TODO_STYLE = { TODO: ['todo', '#a3afc0'], FIXME: ['fixme', CRITICAL], BUG: ['bug', CRITICAL], HACK: ['hack', SERIOUS], XXX: ['xxx', WARN] };
    let todoHtml;
    if (scan.todos.length) {
        todoHtml = scan.todos.slice(0, 35).map((t) => {
            const [ic, col] = TODO_STYLE[t.marker] || ['todo', '#8b98ad'];
            return `<div class="todo-row" style="border-left-color:${col}">
  <span class="todo-tag" style="color:${col}">${icon(ic, 13)}${t.marker}</span>
  <span class="todo-file">${esc(trunc(t.file, 60))}:${t.line}</span>
  <span class="todo-txt">${esc(trunc(t.text, 100))}</span>
</div>`;
        }).join('');
    } else {
        todoHtml = `<div class="empty-note">${icon('check', 18)}<span>Keine offenen Marker im Quelltext.</span></div>`;
    }

    // Die Befunde, die die Note gedrueckt haben, im Klartext — sonst ist die
    // Zahl eine Meinung.
    const findings = [];
    for (const f of h.brokenFiles) findings.push(['Syntaxfehler', f, CRITICAL]);
    for (const r of h.deadRefs) findings.push(['Toter Verweis', r, CRITICAL]);
    for (const [a, b] of scan.duplicates.slice(0, 10)) findings.push(['Dublette', `${a} = ${b}`, SERIOUS]);
    for (const b of h.bigOnes) findings.push([`${fmtNum(b.n)} Zeilen`, b.f, WARN]);
    const findHtml = findings.length
        ? findings.slice(0, 20).map(([tag, txt, col]) => `<div class="todo-row" style="border-left-color:${col}">
  <span class="todo-tag" style="color:${col}">${esc(tag)}</span>
  <span class="todo-txt">${esc(trunc(txt, 110))}</span>
</div>`).join('')
        : `<div class="empty-note">${icon('check', 18)}<span>Keine Befunde.</span></div>`;

    const ftable = [...tf].sort((a, b) => b.lines - a.lines).map((x) => {
        const lc = langColor[x.language] || 'rgba(255,255,255,0.18)';
        const isRgba = lc.startsWith('rgba');
        const fg = isRgba ? '#8b98ad' : lc;
        const bg = isRgba ? lc : lc + '18';
        const bd = isRgba ? lc : lc + '30';
        const cr = x.lines > 0 ? x.code / x.lines * 100 : 0;
        return `<tr>
  <td class="td-path" title="${esc(x.path)}">${esc(trunc(x.path, 60))}</td>
  <td><span class="badge" style="color:${fg};background:${bg};border-color:${bd}">${esc(x.language)}</span></td>
  <td class="td-n">${fmtNum(x.lines)}</td>
  <td class="td-n">${fmtNum(x.code)}</td>
  <td class="td-n">${fmtNum(x.comments)}</td>
  <td><div class="ratio"><div style="width:${cr.toFixed(0)}%;background:${fg}"></div></div></td>
  <td class="td-n td-muted">${fmtSize(x.size)}</td>
</tr>`;
    }).join('');

    const cdata = JSON.stringify({ tl, tv });
    const now = new Date();
    const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const gen = `${now.getDate()}. ${MONATE[now.getMonth()]} ${now.getFullYear()}, ${pad2(now.getHours())}:${pad2(now.getMinutes())} Uhr`;
    const tcCount = {};
    for (const t of scan.todos) tcCount[t.marker] = (tcCount[t.marker] || 0) + 1;
    const bugCount = (tcCount.FIXME || 0) + (tcCount.BUG || 0);
    const nSprachen = Object.keys(scan.languages).length;

    const BODY = `<header class="kopf">
  <a class="marke" href="/" translate="no"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>MyWorkLog</span></a>
  <span class="kopf-stand">Stand ${gen}</span>
</header>

<main>
<section class="hero" style="--tc:${tc}">
  <div>
    <h1 class="hero-titel">Der Quelltext, nachgezählt.</h1>
    <p class="hero-note">Die Note kommt aus ${h.factors.length} gezählten Prüfungen über ${fmtNum(h.scoredFiles)} versionierte Quelldateien. Größe, Alter und Sprachenzahl gehen bewusst nicht ein, und jede Prüfung nennt unten ihren Nenner.</p>
  </div>
  <div class="note">
    <div class="note-zeile"><span class="note-zahl">${sc}</span><span class="note-von">von 100</span><span class="note-stufe">${tierLbl}</span></div>
    <div class="gauge">
      <div class="gauge-track"><div class="gauge-fill" style="--pct:${sc}%"></div></div>
      <div class="gauge-ticks"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span></div>
    </div>
    <div class="fakten">
      <span><b>${fmtNum(tf.length)}</b> Dateien</span>
      <span><b>${fmtNum(scan.totalLines)}</b> Zeilen</span>
      <span><b>${fmtSize(scan.totalSize)}</b> auf der Platte</span>
      <span><b>${nSprachen}</b> Sprachen</span>
      <span><b>${fmtNum(gs.totalCommits || 0)}</b> Commits</span>
    </div>
  </div>
</section>

<div class="kpi-band">
  <div class="kpi"><div class="kpi-lbl">Zeilen gesamt</div><div class="kpi-v">${fmtNum(scan.totalLines)}</div><div class="kpi-sub">${fmtSize(scan.totalSize)}</div></div>
  <div class="kpi"><div class="kpi-lbl">Codezeilen</div><div class="kpi-v">${fmtNum(scan.codeLines)}</div><div class="kpi-sub">${pct(codePct)} % aller Zeilen</div></div>
  <div class="kpi"><div class="kpi-lbl">Dateien</div><div class="kpi-v">${fmtNum(tf.length)}</div><div class="kpi-sub">${nSprachen} Sprachen</div></div>
  <div class="kpi"><div class="kpi-lbl">Commits</div><div class="kpi-v">${fmtNum(gs.totalCommits || 0)}</div><div class="kpi-sub">seit ${esc(gs.firstCommitDate || '—')}</div></div>
  <div class="kpi"><div class="kpi-lbl">Note</div><div class="kpi-v">${sc}<span style="font-size:0.9rem;color:var(--text-3)"> / 100</span></div><div class="kpi-sub">${tierLbl}</div></div>
  <div class="kpi"><div class="kpi-lbl">Offene Marker</div><div class="kpi-v">${scan.todos.length}</div><div class="kpi-sub">${tcCount.TODO || 0} TODO, ${bugCount} Fehler</div></div>
</div>

<div class="sec"><h2>Woraus der Code besteht</h2></div>
<div class="g2">
  <div class="card">
    <div class="card-ttl">Sprachen <small>${sl.length} erkannt</small></div>
    <div class="stackbar">${langBar}</div>
    <div class="lg-list">${langLegend}</div>
  </div>
  <div class="card">
    <div class="card-ttl">Zeilen nach Art</div>
    ${linesBar}
    <div class="comp-legend">
      <span><i style="background:var(--primary)"></i>Code <b>${fmtNum(scan.codeLines)}</b></span>
      <span><i style="background:rgba(255,255,255,0.34)"></i>Kommentare <b>${fmtNum(scan.commentLines)}</b></span>
      <span><i style="background:rgba(255,255,255,0.12)"></i>Leerzeilen <b>${fmtNum(scan.blankLines)}</b></span>
    </div>
    <div style="margin-top:28px">
      <div class="card-ttl">Die größten Dateien <small>Zeilen</small></div>
      ${topHtml}
    </div>
  </div>
</div>

<div class="sec"><h2>Wann gearbeitet wird</h2></div>
<div class="g32">
  <div class="card">
    <div class="card-ttl">Commits je Tag <small>letzte 30 Tage, ${fmtNum(tvSum)} insgesamt</small></div>
    <div class="ch h220"><canvas id="cTimeline" role="img" aria-label="Commits je Tag in den letzten 30 Tagen, ${fmtNum(tvSum)} insgesamt"></canvas></div>
  </div>
  <div class="card">
    <div class="card-ttl">Nach Wochentag <small>alle Commits</small></div>
    <div class="lg-list" style="margin-top:0">${wdHtml}</div>
  </div>
</div>

<div class="card mb">
  <div class="card-ttl">Nach Uhrzeit <small>alle ${fmtNum(hourSum)} Commits</small></div>
  <div class="dayp" role="img" aria-label="${esc(hourAria)}">
    <span class="dayp-peak">meiste um ${pad2(peakH)}:00 Uhr, ${fmtNum(maxH)}</span>
    <div class="dayp-plot">${hourCols}</div>
    <div class="dayp-axis">${hourAxis}</div>
  </div>
</div>

<div class="sec"><h2>Stand des Projekts</h2></div>
<div class="g3">
  <div class="card">
    <div class="card-ttl">Git</div>
    <div class="gr">
      <div class="git-row"><span class="gk">Zweig</span><span class="gv accent">${esc(gs.currentBranch || '—')}</span></div>
      <div class="git-row"><span class="gk">Commits</span><span class="gv">${fmtNum(gs.totalCommits || 0)}</span></div>
      <div class="git-row"><span class="gk">Zweige</span><span class="gv">${(gs.branches || []).length}</span></div>
      <div class="git-row"><span class="gk">Tags</span><span class="gv">${(gs.tags || []).length}</span></div>
      <div class="git-row"><span class="gk">Projektstart</span><span class="gv">${esc(gs.firstCommitDate || '—')}</span></div>
      <div class="git-row"><span class="gk">Nicht committet</span><span class="gv warn">${gs.uncommitted || 0}</span></div>
    </div>
    ${srcHtml}
    ${lcHtml}
  </div>
  <div class="card">
    <div class="card-ttl">Punkte je Prüfung <small>${sc} von 100</small></div>
    <div class="fct-list">${fctHtml}</div>
  </div>
  <div class="card">
    <div class="card-ttl">Wer committet</div>
    ${authHtml || '<div class="empty-note">Keine Git-Historie vorhanden.</div>'}
  </div>
</div>

<div class="sec"><h2>Was die Note drückt</h2><p>Jeder Befund steht hier im Klartext, mit Datei.</p></div>
<div class="card mb">
  <div class="card-ttl">Befunde <small>${findings.length}</small></div>
  <div class="todo-scroll">${findHtml}</div>
</div>

<div class="sec"><h2>Offene Marker</h2><p>TODO, FIXME, BUG, HACK und XXX im Quelltext.</p></div>
<div class="card mb">
  <div class="card-ttl">Marker <small>${scan.todos.length}</small></div>
  <div class="todo-scroll">${todoHtml}</div>
</div>

<div class="sec"><h2>Alle Dateien</h2></div>
<div class="card">
  <div class="card-ttl">Quelldateien <small>${fmtNum(tf.length)}, nach Zeilen sortiert</small></div>
  <div class="tbl-wrap">
    <table>
      <thead><tr>
        <th>Pfad</th><th>Sprache</th>
        <th style="text-align:right">Zeilen</th><th style="text-align:right">Code</th>
        <th style="text-align:right">Kommentare</th><th>Codeanteil</th>
        <th style="text-align:right">Größe</th>
      </tr></thead>
      <tbody>${ftable}</tbody>
    </table>
  </div>
</div>
</main>

<footer>
  <span>Erzeugt am ${gen} bei jedem Deploy.</span>
  <a href="/">Zurück zu MyWorkLog</a>
</footer>`;

    const SCRIPT = `const D = ${cdata};
const FONT = "Geist, system-ui, sans-serif";
const AKZ = '#5578a8';
const TIP = {
  backgroundColor:'#17181e', borderColor:'rgba(255,255,255,0.14)', borderWidth:1,
  titleColor:'#f8fafc', bodyColor:'#a3afc0', padding:10, cornerRadius:8, displayColors:false,
  titleFont:{family:FONT,size:12,weight:'600'}, bodyFont:{family:FONT,size:12},
  callbacks:{ label:(c)=> c.parsed.y + (c.parsed.y === 1 ? ' Commit' : ' Commits') }
};
const GR = { color:'rgba(255,255,255,0.05)' };
const TK = { color:'#8b98ad', font:{family:FONT,size:11} };
const CALM = matchMedia('(prefers-reduced-motion: reduce)').matches;
new Chart(document.getElementById('cTimeline'),{
  type:'line',
  data:{ labels:D.tl, datasets:[{
    data:D.tv, borderColor:AKZ,
    backgroundColor:(ctx)=>{ const g=ctx.chart.ctx.createLinearGradient(0,0,0,220); g.addColorStop(0,'rgba(85,120,168,0.3)'); g.addColorStop(1,'rgba(85,120,168,0)'); return g; },
    fill:true, cubicInterpolationMode:'monotone', pointRadius:0, pointHoverRadius:5, pointHitRadius:12,
    pointBackgroundColor:AKZ, pointBorderColor:'#0d0e12', pointBorderWidth:2, borderWidth:2,
  }]},
  options:{ responsive:true, maintainAspectRatio:false,
    animation: CALM ? false : {duration:600,easing:'easeOutQuart'},
    interaction:{ mode:'index', intersect:false },
    plugins:{ tooltip:TIP, legend:{display:false} },
    scales:{ x:{grid:{display:false},ticks:{...TK,maxTicksLimit:8}}, y:{grid:GR,ticks:{...TK,precision:0},beginAtZero:true,border:{display:false}} }
  }
});`;

    return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Repo-Bericht · MyWorkLog</title>
<meta name="robots" content="noindex,follow">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/Grafiken/apple-touch-icon.png">
<link href="/Assets/fonts/bricolage-grotesque-geist-c01377dd.css?v=0" rel="stylesheet">
<script src="/Assets/js/vendor/chart-4.6.1.js?v=0"></script>
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
${BODY}
</div>
<script>
${SCRIPT}
</script>
</body>
</html>
`;
}

// ─────────────────────────────────────────────────────────────────────────
function main() {
    const tracked = sourceFiles();
    const scan = scanFiles(tracked);
    const gs = gitStats();
    const h = health(scan, tracked);
    const html = buildHtml(scan, gs, h);

    if (process.argv.includes('--stdout')) { process.stdout.write(html); return; }
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, html, 'utf8');
    const rel = path.relative(ROOT, OUT).split(path.sep).join('/');
    console.log(`repo-report: ${h.score}/100 · ${scan.files.length} Dateien · ${scan.todos.length} Marker → ${rel}`);
    for (const f of h.factors) {
        if (f.points < f.max) console.log(`  ${f.points}/${f.max}  ${f.name} — ${f.basis}`);
    }
}

// 🔴 Dieser Schritt haengt in `npm run build` — und den fuehrt Cloudflare beim
// Deploy aus (Beleg: index.html und pages/en/ stehen in .gitignore und sind
// trotzdem live). Ein Absturz hier wuerde also den GANZEN Deploy scheitern
// lassen, wegen einer Berichtsseite, die niemand zum Arbeiten braucht.
// Deshalb: Fehler laut ins Build-Log, aber Exit-Code 0. Schlimmstenfalls fehlt
// /repo-report/ — die Website geht live.
try {
    main();
} catch (err) {
    console.error('repo-report: FEHLGESCHLAGEN — Seite wird nicht erneuert, Deploy laeuft weiter.');
    console.error(err && err.stack ? err.stack : err);
}

