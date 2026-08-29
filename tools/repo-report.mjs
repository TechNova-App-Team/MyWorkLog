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

function scanFiles() {
    const files = [];
    const todos = [];
    const languages = {};
    const hashes = new Map();
    let totalLines = 0, codeLines = 0, commentLines = 0, blankLines = 0, totalSize = 0;

    for (const abs of walk(ROOT)) {
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
    s.branches = branchNames();
    s.currentBranch = git(['branch', '--show-current']);
    // Dieselbe Gruppierung wie im Schnappschuss (eine Person, mehrere
    // git-Konfigurationen) — und ohne E-Mail-Adresse: die Seite ist oeffentlich,
    // `shortlog -sne` liefert "Name <adresse>" und das stand hier bis v6.4.x
    // ungefiltert als Mitwirkender auf der Live-Seite.
    s.authors = groupAuthors();
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
    add('Verweise aufloesbar', deadRefs.length === 0 ? 15 : Math.max(0, 15 - deadRefs.length * 3), 15,
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
    add('Dateien ueberschaubar', bigScore, 15,
        `${(bigShare * 100).toFixed(0)}% der Quellzeilen in ${bigOnes.length} Dateien ueber ${BIG_FILE_LINES} Zeilen`);

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
    add('Abhaengigkeiten schlank', dScore, 5, `${deps} Pakete in package.json`);

    const score = Math.max(0, Math.min(100, factors.reduce((a, f) => a + f.points, 0)));
    return { score, factors, brokenFiles, deadRefs, bigOnes: bigOnes.sort((a, b) => b.n - a.n).slice(0, 5), scoredFiles: src.length };
}

// ─────────────────────────────────────────────────────────────────────────
// BERICHT BAUEN
// ─────────────────────────────────────────────────────────────────────────
const CSS = `:root {
  --bg:        #0d0d0d;
  --surface:   #131313;
  --surface-2: #191918;
  --border:    rgba(255,255,255,0.09);
  --border-2:  rgba(255,255,255,0.16);
  --text:      #ffffff;
  --text-2:    #c3c2b7;
  --text-3:    #898781;
  --grid:      #232322;
  --code:      #3987e5;   /* code / file domain */
  --git:       #199e70;   /* git / activity domain */
  --font-display: 'JetBrains Mono', ui-monospace, 'SF Mono', Consolas, monospace;
  --font-body:    'Inter', system-ui, -apple-system, sans-serif;
  --r-lg: 14px; --r-md: 10px; --r-sm: 8px;
}
*,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
html { scroll-behavior:smooth; }
body {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--text-2);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

/* ─── AMBIENT: fixed dot-grid, no glow orbs, no blur (see CLAUDE.md backdrop-filter cost note) ─── */
body::before {
  content:''; position:fixed; inset:0; z-index:0; pointer-events:none;
  background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 26px 26px;
  -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%);
          mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%);
}

.wrap { position:relative; z-index:1; max-width:1320px; margin:0 auto; padding:0 2.25rem 6rem; }

/* ─── MASTHEAD: quiet, no gimmicks ─── */
.masthead {
  display:flex; align-items:baseline; justify-content:space-between; gap:1rem; flex-wrap:wrap;
  padding:1.6rem 0; border-bottom:1px solid var(--border);
  font-size:0.72rem; letter-spacing:0.08em; text-transform:uppercase; color:var(--text-3);
}
.masthead .repo { color:var(--text-2); font-weight:600; }
.masthead .repo::before { content:''; display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--git); margin-right:0.55rem; }
.masthead .gen { font-family:var(--font-display); text-transform:none; letter-spacing:0; font-size:0.7rem; }

/* ─── HERO: one clear number, quiet supporting facts ─── */
.hero { padding:3.25rem 0 2.75rem; border-bottom:1px solid var(--border); }
.hero-eyebrow { font-size:0.72rem; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; color:var(--text-3); margin-bottom:0.9rem; }
.hero-row { display:flex; align-items:flex-end; gap:1rem; flex-wrap:wrap; }
.hero-num { font-weight:700; font-size:5rem; line-height:0.9; letter-spacing:-0.04em; color:var(--text); }
.hero-den { font-size:1.4rem; color:var(--text-3); font-weight:400; margin-left:-0.5rem; }
.gauge { margin-top:1.3rem; max-width:460px; }
.gauge-track { height:5px; border-radius:3px; background:var(--tc,var(--text)); opacity:0.15; position:relative; overflow:hidden; }
.gauge-fill { position:absolute; inset:0; width:var(--pct,0%); border-radius:3px; background:var(--tc,var(--text)); }
.gauge-ticks { display:flex; justify-content:space-between; margin-top:6px; font-family:var(--font-display); font-size:0.6rem; color:var(--text-3); }
.hero-meta { display:flex; flex-wrap:wrap; gap:0.5rem 1.6rem; margin-top:1.6rem; font-size:0.82rem; color:var(--text-3); }
.hero-meta b { font-family:var(--font-display); color:var(--text-2); font-weight:600; }

/* ─── KPI REGISTER: thin dividers, not glass cards ─── */
.kpi-band {
  display:grid; grid-template-columns:repeat(6,1fr);
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--r-lg); overflow:hidden; margin:2rem 0 2.5rem;
}
.kpi { padding:1.4rem 1.3rem; border-right:1px solid var(--border); transition:background 0.15s ease; }
.kpi:last-child { border-right:none; }
.kpi:hover { background:var(--surface-2); }
.kpi-lbl { font-size:0.6rem; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; color:var(--text-3); margin-bottom:0.5rem; }
.kpi-v { font-family:var(--font-display); font-size:1.55rem; font-weight:700; letter-spacing:-0.02em; line-height:1; color:var(--text); }
.kpi-sub { font-family:var(--font-display); font-size:0.66rem; color:var(--text-3); margin-top:0.35rem; }

/* ─── SECTION LABEL ─── */
.sec {
  font-family:var(--font-display); font-size:0.68rem; font-weight:600; letter-spacing:0.1em;
  text-transform:uppercase; color:var(--text-3);
  display:flex; align-items:center; gap:0.7rem; margin:2.75rem 0 1rem;
}
.sec::before { content:'#'; color:var(--code); }
.sec::after { content:''; flex:1; height:1px; background:var(--border); }

/* ─── CARD: flat surface, hairline border — no blur ─── */
.card {
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--r-lg); padding:1.6rem;
  animation:rise 0.4s cubic-bezier(.22,.9,.38,1) both;
}
.card:hover { border-color:var(--border-2); }
@keyframes rise { from{ opacity:0; transform:translateY(10px); } to{ opacity:1; transform:translateY(0); } }
.card-ttl {
  font-family:var(--font-display); font-size:0.66rem; font-weight:600; letter-spacing:0.08em;
  text-transform:uppercase; color:var(--text-3); margin-bottom:1.2rem;
  display:flex; align-items:center; justify-content:space-between; gap:0.5rem;
}
.card-ttl small { font-weight:400; text-transform:none; letter-spacing:0; color:var(--text-3); }

/* ─── GRIDS ─── */
.g2  { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem; }
.g3  { display:grid; grid-template-columns:1fr 1fr 1fr; gap:1rem; margin-bottom:1rem; }
.g32 { display:grid; grid-template-columns:2.1fr 1fr; gap:1rem; margin-bottom:1rem; }

/* ─── CHART CANVAS ─── */
.ch { position:relative; }
.h220 { height:220px; } .h170 { height:170px; }

/* ─── STACKED COMPOSITION BAR (language / lines) ─── */
.stackbar {
  display:flex; gap:2px; height:11px; border-radius:6px; overflow:hidden; background:var(--bg);
}
.stackbar .seg { height:100%; min-width:2px; position:relative; cursor:default; }
.lg-list { display:flex; flex-direction:column; margin-top:1rem; }
.lg-row {
  display:flex; align-items:center; gap:0.65rem; padding:0.5rem 0;
  border-bottom:1px solid var(--border); font-size:0.8rem;
}
.lg-row:last-child { border-bottom:none; }
.lg-dot { width:8px; height:8px; border-radius:2px; flex-shrink:0; }
.lg-name { flex:1; color:var(--text-2); font-weight:500; }
.lg-files { font-family:var(--font-display); font-size:0.66rem; color:var(--text-3); min-width:58px; text-align:right; }
.lg-code  { font-family:var(--font-display); font-size:0.7rem; color:var(--text-2); min-width:64px; text-align:right; }
.lg-pct   { font-family:var(--font-display); font-size:0.7rem; color:var(--text); min-width:44px; text-align:right; font-weight:600; }
.comp-legend { display:flex; gap:1.4rem; margin-top:0.8rem; font-size:0.76rem; }
.comp-legend span { display:flex; align-items:center; gap:0.4rem; color:var(--text-3); }
.comp-legend b { color:var(--text-2); font-weight:600; font-family:var(--font-display); }
.comp-legend i { width:8px; height:8px; border-radius:2px; display:inline-block; }

/* ─── GIT STATUS ─── */
.gr { display:flex; flex-direction:column; }
.git-row { display:flex; justify-content:space-between; align-items:center; padding:0.55rem 0; border-bottom:1px solid var(--border); }
.git-row:last-child { border-bottom:none; }
.gk { font-size:0.74rem; color:var(--text-3); }
.gv { font-weight:600; font-family:var(--font-display); font-size:0.8rem; color:var(--text); }
.gv.accent { color:var(--git); }
.gv.warn { color:#fab219; }

.gr-src { margin-top:0.9rem; font-size:0.66rem; line-height:1.5; color:var(--text-3); }
.gr-src code { font-family:var(--font-display); font-size:0.64rem; color:var(--text-2); }
.lc-box { margin-top:1rem; padding:0.85rem 1rem; background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-md); }
.lc-msg { font-size:0.82rem; font-weight:500; line-height:1.4; margin-bottom:0.45rem; color:var(--text-2); }
.lc-meta { display:flex; flex-wrap:wrap; gap:0.8rem; font-family:var(--font-display); font-size:0.65rem; }
.lc-author { color:var(--git); } .lc-hash { color:var(--code); } .lc-date { color:var(--text-3); }

/* ─── WEEKDAY ROWS (same visual language as the composition legend) ─── */
.wk-row { display:flex; align-items:center; gap:0.8rem; padding:0.5rem 0; border-bottom:1px solid var(--border); font-size:0.8rem; }
.wk-row:last-child { border-bottom:none; }
.wk-day { width:66px; flex-shrink:0; color:var(--text-2); }
.wk-track { flex:1; height:8px; border-radius:3px; background:var(--border); overflow:hidden; }
.wk-fill { height:100%; border-radius:3px; background:var(--git); }
.wk-val { font-family:var(--font-display); font-size:0.72rem; color:var(--text); min-width:22px; text-align:right; font-weight:600; }

/* ─── SCORE FACTORS ─── */
.fct-list {}
.fct-row { display:flex; align-items:center; gap:0.6rem; padding:0.4rem 0; border-bottom:1px solid var(--border); }
.fct-row:last-child { border-bottom:none; }
.fct-name { flex:1; font-size:0.75rem; color:var(--text-2); }
.fct-track { width:46px; height:3px; background:var(--border); border-radius:2px; overflow:hidden; flex-shrink:0; }
.fct-fill { height:100%; background:var(--code); border-radius:2px; }
.fct-val { font-family:var(--font-display); font-size:0.68rem; color:var(--code); min-width:26px; text-align:right; }

/* ─── HOURLY HEATMAP (single sequential hue = git-domain aqua) ─── */
.hmap { display:grid; grid-template-columns:repeat(12,1fr); gap:5px; margin:0.3rem 0; }
.hcell {
  aspect-ratio:1; border-radius:5px; background:rgba(25,158,112,var(--a,0.05));
  cursor:default; position:relative; transition:transform 0.12s;
}
.hcell:hover { transform:scale(1.25); z-index:1; }
.hcell::after {
  content:attr(title); display:none; position:absolute; bottom:calc(100% + 7px); left:50%; transform:translateX(-50%);
  background:var(--surface-2); color:var(--text); font-size:0.62rem; padding:4px 8px; border-radius:6px;
  white-space:nowrap; font-family:var(--font-display); border:1px solid var(--border-2); pointer-events:none;
}
.hcell:hover::after { display:block; }
.hmap-lbl { display:flex; justify-content:space-between; font-family:var(--font-display); font-size:0.6rem; color:var(--text-3); margin-top:6px; }

/* ─── ACTION ITEMS (TODO scanner) ─── */
.todo-scroll { max-height:340px; overflow-y:auto; }
.todo-scroll::-webkit-scrollbar { width:3px; }
.todo-scroll::-webkit-scrollbar-thumb { background:var(--border-2); border-radius:2px; }
.todo-row {
  display:grid; grid-template-columns:96px 1fr; grid-template-rows:auto auto;
  gap:1px 0.75rem; padding:0.6rem 0 0.6rem 0.85rem; margin-bottom:2px;
  border-left:2px solid; background:var(--surface-2);
}
.todo-tag {
  font-family:var(--font-display); font-size:0.64rem; font-weight:700; grid-row:span 2;
  display:flex; align-items:center; gap:0.35rem; height:fit-content;
}
.todo-file { font-family:var(--font-display); font-size:0.66rem; color:var(--text-3); }
.todo-txt { font-size:0.78rem; color:var(--text-2); }
.empty-note {
  padding:2.2rem 1rem; text-align:center; color:var(--text-3); font-family:var(--font-display); font-size:0.78rem;
  display:flex; flex-direction:column; align-items:center; gap:0.6rem;
}
.empty-note svg { color:var(--git); }

/* ─── FILE TABLE ─── */
.tbl-wrap { overflow-x:auto; max-height:460px; overflow-y:auto; }
.tbl-wrap::-webkit-scrollbar { width:3px; height:3px; }
.tbl-wrap::-webkit-scrollbar-thumb { background:var(--border-2); border-radius:2px; }
table { width:100%; border-collapse:collapse; font-size:0.79rem; }
thead { position:sticky; top:0; z-index:2; background:var(--surface); }
th {
  text-align:left; padding:0.7rem 0.75rem; font-family:var(--font-display);
  font-size:0.6rem; font-weight:600; letter-spacing:0.08em; text-transform:uppercase;
  color:var(--text-3); border-bottom:1px solid var(--border); white-space:nowrap;
}
td { padding:0.5rem 0.75rem; border-bottom:1px solid rgba(255,255,255,0.03); vertical-align:middle; }
tr:hover td { background:var(--surface-2); }
.td-path { font-family:var(--font-display); font-size:0.71rem; color:var(--text-2); }
.badge { font-family:var(--font-display); font-size:0.6rem; font-weight:600; padding:2px 8px; border-radius:20px; border:1px solid; white-space:nowrap; }
.td-n { font-family:var(--font-display); font-size:0.73rem; text-align:right; color:var(--text-2); }
.td-muted { color:var(--text-3); }
.ratio { width:48px; height:3px; background:var(--border); border-radius:2px; overflow:hidden; }
.ratio div { height:100%; border-radius:2px; opacity:0.75; }

/* ─── FOOTER ─── */
footer {
  margin-top:4rem; padding-top:1.5rem; border-top:1px solid var(--border);
  display:flex; justify-content:space-between; align-items:center;
  font-family:var(--font-display); font-size:0.68rem; color:var(--text-3);
}
footer .p1 { color:var(--git); }

/* ─── FOCUS / MOTION ─── */
:focus-visible { outline:2px solid var(--code); outline-offset:2px; }
@media (prefers-reduced-motion:reduce) {
  .card { animation:none; }
}

/* ─── RESPONSIVE ─── */
@media(max-width:1100px) {
  .kpi-band { grid-template-columns:repeat(3,1fr); }
  .g3,.g32 { grid-template-columns:1fr; }
}
@media(max-width:768px) {
  .kpi-band { grid-template-columns:repeat(2,1fr); }
  .g2 { grid-template-columns:1fr; }
  .masthead .gen { display:none; }
  .hero-num { font-size:3.4rem; }
  .wrap { padding:0 1.1rem 4rem; }
}
/* Nenner unter jedem Faktor — ohne ihn ist eine Punktzahl eine Behauptung. */
.fct-name { display:flex; flex-direction:column; gap:2px; }
.fct-basis { font-family:var(--font-body); font-size:0.66rem; color:var(--text-3); letter-spacing:0; text-transform:none; }
.fct-row { align-items:flex-start; }
.fct-track { margin-top:4px; }
.hero-note { margin-top:1rem; max-width:640px; font-size:0.78rem; line-height:1.65; color:var(--text-3); }
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
    // Endungen), und dann stand "Other" zweimal in der Legende — einmal mit
    // 13 Dateien, einmal mit 11, ohne dass ein Unterschied erkennbar war.
    if (otherCode > 0) langRows.push({ name: 'Weitere', code: otherCode, files: otherFiles, color: 'rgba(255,255,255,0.16)' });
    const langTotal = langRows.reduce((a, r) => a + r.code, 0) || 1;
    langRows.forEach((r) => { r.pct = r.code / langTotal * 100; });
    const langColor = Object.fromEntries(langRows.map((r) => [r.name, r.color]));

    const langBar = langRows.map((r) =>
        `<div class="seg" style="width:${r.pct.toFixed(3)}%;background:${r.color}" title="${esc(r.name)} — ${r.pct.toFixed(1)}%"></div>`).join('');
    const langLegend = langRows.map((r) => `<div class="lg-row">
  <span class="lg-dot" style="background:${r.color}"></span>
  <span class="lg-name">${esc(r.name)}</span>
  <span class="lg-files">${r.files} files</span>
  <span class="lg-code">${fmtNum(r.code)}</span>
  <span class="lg-pct">${r.pct.toFixed(1)}%</span>
</div>`).join('');

    const lt = scan.totalLines || 1;
    const codePct = scan.codeLines / lt * 100, cmtPct = scan.commentLines / lt * 100, blankPct = scan.blankLines / lt * 100;
    const linesBar = `<div class="stackbar">
  <div class="seg" style="width:${codePct.toFixed(3)}%;background:var(--code)" title="Code — ${codePct.toFixed(1)}%"></div>
  <div class="seg" style="width:${cmtPct.toFixed(3)}%;background:rgba(255,255,255,0.34)" title="Comments — ${cmtPct.toFixed(1)}%"></div>
  <div class="seg" style="width:${blankPct.toFixed(3)}%;background:rgba(255,255,255,0.10)" title="Blank — ${blankPct.toFixed(1)}%"></div>
</div>`;

    const topFiles = [...tf].sort((a, b) => b.lines - a.lines).slice(0, 14);

    // 30-Tage-Zeitachse
    const tl = [], tv = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 86400000);
        const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
        tl.push(key.slice(5)); tv.push((gs.dailyCommits || {})[key] || 0);
    }

    const wdOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const wdFull = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
    const wdVals = wdOrder.map((d) => (gs.weekdayCommits || {})[d] || 0);
    const wdMax = Math.max(...wdVals, 1);
    const wdHtml = wdOrder.map((d, i) => `<div class="wk-row">
  <span class="wk-day">${wdFull[d]}</span>
  <div class="wk-track"><div class="wk-fill" style="width:${(wdVals[i] / wdMax * 100).toFixed(1)}%"></div></div>
  <span class="wk-val">${wdVals[i]}</span>
</div>`).join('');

    const hourly = gs.hourlyCommits || {};
    const maxH = Math.max(...Object.values(hourly), 1);
    let hourCells = '';
    for (let hh = 0; hh < 24; hh++) {
        const cnt = hourly[hh] || 0;
        hourCells += `<div class="hcell" style="--a:${(0.05 + (cnt / maxH) * 0.85).toFixed(2)}" title="${pad2(hh)}:00 — ${cnt} commits"></div>`;
    }

    // Woher die Historie stammt, steht dran. Der Build-Container hat sie nicht
    // (flacher Klon) — eine Zahl ohne Herkunft waere hier genau die Sorte
    // Angabe, die vorher jahrelang falsch war und richtig aussah.
    const srcHtml = gs.historySource === 'snapshot'
        ? `<div class="gr-src">Historie aus <code>config/repo-history.json</code>`
          + `${gs.snapshotAt ? ` &middot; Stand ${esc(gs.snapshotAt)}` : ''}`
          + ` &middot; der Build-Klon ist flach und kennt nur HEAD</div>`
        : '';

    let lcHtml = '';
    const lraw = gs.lastCommit || '';
    if (lraw.includes('|')) {
        const p = lraw.split('|');
        if (p.length >= 5) lcHtml = `<div class="lc-box">
  <div class="lc-msg">${esc(p.slice(4).join('|'))}</div>
  <div class="lc-meta"><span class="lc-author">${esc(p[1])}</span><span class="lc-hash">${esc(p[0].slice(0, 7))}</span><span class="lc-date">${esc(p[3].slice(0, 10))}</span></div>
</div>`;
    }

    let authHtml = '';
    if (gs.authors && gs.authors.length) {
        const tot = gs.authors.reduce((a, x) => a + x.commits, 0) || 1;
        gs.authors.slice(0, 7).forEach((a, i) => {
            authHtml += `<div class="lg-row">
  <span class="lg-dot" style="background:${CAT[i % CAT.length]}"></span>
  <span class="lg-name">${esc(a.name)}</span>
  <span class="lg-code">${a.commits}</span>
  <span class="lg-pct">${(a.commits / tot * 100).toFixed(0)}%</span>
</div>`;
        });
    }

    // Stufen beschreiben, was gemessen wurde — nicht "Enterprise Grade".
    const sc = h.score;
    let tierLbl, tc;
    if (sc >= 85) { tierLbl = 'Keine offenen Befunde'; tc = GOOD; }
    else if (sc >= 70) { tierLbl = 'Einzelne Schwachstellen'; tc = GOOD; }
    else if (sc >= 50) { tierLbl = 'Mehrere Schwachstellen'; tc = WARN; }
    else if (sc >= 30) { tierLbl = 'Deutliche Maengel'; tc = SERIOUS; }
    else { tierLbl = 'Grundlegende Maengel'; tc = CRITICAL; }

    // Jede Zeile traegt ihren Nenner. Ohne den ist eine Punktzahl eine
    // Behauptung; mit ihm kann sie jeder nachrechnen.
    const fctHtml = h.factors.map((f) => {
        const w = f.max ? (f.points / f.max * 100) : 0;
        const col = w >= 80 ? GOOD : w >= 50 ? WARN : w >= 25 ? SERIOUS : CRITICAL;
        return `<div class="fct-row">
  <span class="fct-name">${esc(f.name)}<small class="fct-basis">${esc(f.basis)}</small></span>
  <div class="fct-track"><div class="fct-fill" style="width:${w.toFixed(0)}%;background:${col}"></div></div>
  <span class="fct-val">${f.points}/${f.max}</span>
</div>`;
    }).join('');

    const TODO_STYLE = { TODO: ['todo', '#c3c2b7'], FIXME: ['fixme', CRITICAL], BUG: ['bug', CRITICAL], HACK: ['hack', SERIOUS], XXX: ['xxx', WARN] };
    let todoHtml;
    if (scan.todos.length) {
        todoHtml = scan.todos.slice(0, 35).map((t) => {
            const [ic, col] = TODO_STYLE[t.marker] || ['todo', '#898781'];
            return `<div class="todo-row" style="border-left-color:${col}">
  <span class="todo-tag" style="color:${col}">${icon(ic, 13)}${t.marker}</span>
  <span class="todo-file">${esc(trunc(t.file, 40))}:${t.line}</span>
  <span class="todo-txt">${esc(trunc(t.text, 100))}</span>
</div>`;
        }).join('');
    } else {
        todoHtml = `<div class="empty-note">${icon('check', 16)}<span>No action items found — clean codebase</span></div>`;
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
        : `<div class="empty-note">${icon('check', 16)}<span>Keine Befunde</span></div>`;

    const ftable = [...tf].sort((a, b) => b.lines - a.lines).map((x) => {
        const lc = langColor[x.language] || 'rgba(255,255,255,0.18)';
        const isRgba = lc.startsWith('rgba');
        const fg = isRgba ? '#898781' : lc;
        const bg = isRgba ? lc : lc + '18';
        const bd = isRgba ? lc : lc + '30';
        const cr = x.lines > 0 ? x.code / x.lines * 100 : 0;
        return `<tr>
  <td class="td-path">${esc(trunc(x.path, 52))}</td>
  <td><span class="badge" style="color:${fg};background:${bg};border-color:${bd}">${esc(x.language)}</span></td>
  <td class="td-n">${fmtNum(x.lines)}</td>
  <td class="td-n">${fmtNum(x.code)}</td>
  <td class="td-n">${fmtNum(x.comments)}</td>
  <td><div class="ratio"><div style="width:${cr.toFixed(0)}%;background:${fg}"></div></div></td>
  <td class="td-n td-muted">${fmtSize(x.size)}</td>
</tr>`;
    }).join('');

    const cdata = JSON.stringify({ fl: topFiles.map((x) => trunc(x.path, 26)), fv: topFiles.map((x) => x.lines), tl, tv });
    const now = new Date();
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const gen = `${pad2(now.getDate())} ${MONTHS[now.getMonth()]} ${now.getFullYear()}, ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    const rn = esc(path.basename(ROOT));
    const tcCount = {};
    for (const t of scan.todos) tcCount[t.marker] = (tcCount[t.marker] || 0) + 1;
    const bugCount = (tcCount.FIXME || 0) + (tcCount.BUG || 0);

    const BODY = `<!-- MASTHEAD -->
<div class="masthead">
  <span class="repo">${rn}</span>
  <span class="gen">${gen}</span>
</div>

<!-- HERO -->
<div class="hero" style="--tc:${tc}">
  <div class="hero-eyebrow">Codebase health score</div>
  <div class="hero-row">
    <span class="hero-num">${sc}</span><span class="hero-den">/ 100</span>
  </div>
  <div class="gauge">
    <div class="gauge-track"><div class="gauge-fill" style="--pct:${sc}%"></div></div>
    <div class="gauge-ticks"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span></div>
  </div>
  <div class="hero-note">Aus ${h.factors.length} gezaehlten Pruefungen ueber ${fmtNum(h.scoredFiles)} versionierte Quelldateien — Groesse, Alter und Sprachenzahl gehen bewusst NICHT ein. Jede Pruefung nennt unten ihren Nenner.</div>
  <div class="hero-meta">
    <span><b>${fmtNum(tf.length)}</b> files</span>
    <span><b>${fmtNum(scan.totalLines)}</b> lines</span>
    <span><b>${fmtSize(scan.totalSize)}</b> on disk</span>
    <span><b>${Object.keys(scan.languages).length}</b> languages</span>
    <span><b>${fmtNum(gs.totalCommits || 0)}</b> commits</span>
  </div>
</div>

<!-- KPI REGISTER -->
<div class="kpi-band">
  <div class="kpi"><div class="kpi-lbl">Total Lines</div><div class="kpi-v">${fmtNum(scan.totalLines)}</div><div class="kpi-sub">${fmtSize(scan.totalSize)}</div></div>
  <div class="kpi"><div class="kpi-lbl">Code Lines</div><div class="kpi-v">${fmtNum(scan.codeLines)}</div><div class="kpi-sub">${codePct.toFixed(1)}% of total</div></div>
  <div class="kpi"><div class="kpi-lbl">Files</div><div class="kpi-v">${fmtNum(tf.length)}</div><div class="kpi-sub">${Object.keys(scan.languages).length} languages</div></div>
  <div class="kpi"><div class="kpi-lbl">Commits</div><div class="kpi-v">${fmtNum(gs.totalCommits || 0)}</div><div class="kpi-sub">since ${esc(gs.firstCommitDate || '—')}</div></div>
  <div class="kpi"><div class="kpi-lbl">Score</div><div class="kpi-v" style="color:${tc}">${sc}/100</div><div class="kpi-sub">${tierLbl}</div></div>
  <div class="kpi"><div class="kpi-lbl">Action Items</div><div class="kpi-v">${scan.todos.length}</div><div class="kpi-sub">${tcCount.TODO || 0} todo · ${bugCount} bug</div></div>
</div>

<!-- COMPOSITION -->
<div class="sec">composition</div>
<div class="g2">
  <div class="card" style="animation-delay:.02s">
    <div class="card-ttl">Language Breakdown <small>${sl.length} detected</small></div>
    <div class="stackbar">${langBar}</div>
    <div class="lg-list">${langLegend}</div>
  </div>
  <div class="card" style="animation-delay:.05s">
    <div class="card-ttl">Lines Composition</div>
    ${linesBar}
    <div class="comp-legend">
      <span><i style="background:var(--code)"></i>Code <b>${fmtNum(scan.codeLines)}</b></span>
      <span><i style="background:rgba(255,255,255,0.34)"></i>Comments <b>${fmtNum(scan.commentLines)}</b></span>
      <span><i style="background:rgba(255,255,255,0.10)"></i>Blank <b>${fmtNum(scan.blankLines)}</b></span>
    </div>
    <div style="margin-top:1.4rem">
      <div class="card-ttl">Top Files by Lines</div>
      <div class="ch h170"><canvas id="cFiles"></canvas></div>
    </div>
  </div>
</div>

<!-- ACTIVITY -->
<div class="sec">activity</div>
<div class="g32">
  <div class="card" style="animation-delay:.03s">
    <div class="card-ttl">Commit Timeline <small>last 30 days</small></div>
    <div class="ch h220"><canvas id="cTimeline"></canvas></div>
  </div>
  <div class="card" style="animation-delay:.06s">
    <div class="card-ttl">By Weekday</div>
    <div class="lg-list" style="margin-top:0">${wdHtml}</div>
  </div>
</div>

<div class="card" style="margin-bottom:1rem;animation-delay:.08s">
  <div class="card-ttl">Hourly Commit Heatmap</div>
  <div class="hmap">${hourCells}</div>
  <div class="hmap-lbl"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div>
</div>

<!-- INTELLIGENCE -->
<div class="sec">project intelligence</div>
<div class="g3">
  <div class="card" style="animation-delay:.03s">
    <div class="card-ttl">Git Status</div>
    <div class="gr">
      <div class="git-row"><span class="gk">Branch</span><span class="gv accent">${esc(gs.currentBranch || '—')}</span></div>
      <div class="git-row"><span class="gk">Commits</span><span class="gv">${fmtNum(gs.totalCommits || 0)}</span></div>
      <div class="git-row"><span class="gk">Branches</span><span class="gv">${(gs.branches || []).length}</span></div>
      <div class="git-row"><span class="gk">Tags</span><span class="gv">${(gs.tags || []).length}</span></div>
      <div class="git-row"><span class="gk">Project Start</span><span class="gv">${esc(gs.firstCommitDate || '—')}</span></div>
      <div class="git-row"><span class="gk">Uncommitted</span><span class="gv warn">${gs.uncommitted || 0}</span></div>
    </div>
    ${srcHtml}
    ${lcHtml}
  </div>
  <div class="card" style="animation-delay:.06s">
    <div class="card-ttl">Score Breakdown <small>${sc}/100</small></div>
    <div class="fct-list">${fctHtml}</div>
  </div>
  <div class="card" style="animation-delay:.09s">
    <div class="card-ttl">Top Contributors</div>
    ${authHtml || '<div class="empty-note">No git history available</div>'}
  </div>
</div>

<!-- BEFUNDE -->
<div class="sec">findings</div>
<div class="card" style="margin-bottom:1rem;animation-delay:.04s">
  <div class="card-ttl">Was die Note drueckt <small>${findings.length} Befunde</small></div>
  <div class="todo-scroll">${findHtml}</div>
</div>

<!-- ACTION ITEMS -->
<div class="sec">action items</div>
<div class="card" style="margin-bottom:1rem;animation-delay:.05s">
  <div class="card-ttl">TODO / FIXME / BUG Scanner <small>${scan.todos.length} items</small></div>
  <div class="todo-scroll">${todoHtml}</div>
</div>

<!-- FILE EXPLORER -->
<div class="sec">file explorer</div>
<div class="card" style="animation-delay:.05s">
  <div class="card-ttl">All Source Files <small>${fmtNum(tf.length)} files</small></div>
  <div class="tbl-wrap">
    <table>
      <thead><tr>
        <th>Path</th><th>Language</th>
        <th style="text-align:right">Lines</th><th style="text-align:right">Code</th>
        <th style="text-align:right">Comments</th><th>Ratio</th>
        <th style="text-align:right">Size</th>
      </tr></thead>
      <tbody>${ftable}</tbody>
    </table>
  </div>
</div>

<footer>
  <span><span class="p1">$</span> echo $? <span class="p1">0</span> — repo report</span>
  <span>Generated ${gen} · © ${now.getFullYear()}</span>
</footer>`;

    const SCRIPT = `const D = ${cdata};
const MN = "'JetBrains Mono',monospace";
const CODE = '#3987e5', GIT = '#199e70';
const TIP = {
  backgroundColor:'#191918', borderColor:'rgba(255,255,255,0.14)', borderWidth:1,
  titleColor:'#ffffff', bodyColor:'#c3c2b7', padding:10, cornerRadius:8,
  titleFont:{family:MN,size:11}, bodyFont:{family:MN,size:10}
};
const GR = { color:'rgba(255,255,255,0.05)' };
const TK = { color:'#898781', font:{family:MN,size:9} };
const BASE = {
  responsive:true, maintainAspectRatio:false,
  animation:{duration:700,easing:'easeOutQuart'},
  plugins:{tooltip:TIP, legend:{display:false}}
};

new Chart(document.getElementById('cFiles'),{
  type:'bar',
  data:{ labels:D.fl, datasets:[{
    data:D.fv, backgroundColor:CODE+'26', borderColor:CODE,
    borderWidth:1, borderRadius:4, borderSkipped:false, barThickness:12,
  }]},
  options:{...BASE, indexAxis:'y',
    scales:{ x:{grid:GR,ticks:TK}, y:{grid:{display:false},ticks:{...TK,font:{family:MN,size:8}}} }
  }
});

new Chart(document.getElementById('cTimeline'),{
  type:'line',
  data:{ labels:D.tl, datasets:[{
    data:D.tv, borderColor:GIT,
    backgroundColor:(ctx)=>{ const g=ctx.chart.ctx.createLinearGradient(0,0,0,220); g.addColorStop(0,'rgba(25,158,112,0.28)'); g.addColorStop(1,'rgba(25,158,112,0)'); return g; },
    fill:true, tension:0.4, pointRadius:0, pointHoverRadius:4,
    pointBackgroundColor:GIT, pointBorderColor:'#0d0d0d', pointBorderWidth:2, borderWidth:2,
  }]},
  options:{...BASE,
    scales:{ x:{grid:GR,ticks:{...TK,maxTicksLimit:10}}, y:{grid:GR,ticks:TK,beginAtZero:true} }
  }
});`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${rn} — Code Intelligence</title>
<meta name="robots" content="noindex,follow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
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
    const scan = scanFiles();
    const gs = gitStats();
    const tracked = sourceFiles();
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

