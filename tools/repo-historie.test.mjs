#!/usr/bin/env node
// ═══ TEST: git-Historie im flachen Build-Klon ═══
//
// Der Fehler, den dieser Test festhaelt: Cloudflare Pages klont mit
// `--depth 1`. tools/repo-report.mjs zog seine Zahlen direkt aus dem Klon und
// zeigte deshalb live "Commits 1", "Branches 1", "Project Start = Build-Datum"
// und einen einzigen Wochentagsbalken — bei 830 Commits seit 2025-12-25.
//
// 🔴 Warum das ohne Test nicht auffaellt: die Seite rendert vollstaendig und
// fehlerfrei. Nur ihr INHALT ist der eines Repos, das gestern angelegt wurde.
// Kein Build-Log, kein Fehler, kein Unterschied im Screenshot zu einem echten
// Befund — dieselbe Klasse wie das Anzeigefeld mit eingebautem Ergebnis in
// CLAUDE.md. Lokal laeuft das Skript IMMER im vollen Klon, der Fehler ist also
// nur in einer Umgebung sichtbar, in der man ihn nie ausprobiert.
//
// Gepruefte Zusagen:
//   1. Weiss der Klon weniger als config/repo-history.json, gewinnt die Datei.
//   2. Der HEAD des Build-Klons wird EXAKT nachgetragen (er bringt die Datei
//      ja mit, kann in ihr also nicht enthalten sein) — nicht geschaetzt.
//   3. Die Herkunft steht auf der Seite.
//   4. Ohne Datei zeigt der Bericht nur, was der Klon weiss — und behauptet
//      keine Herkunft.
//   5. Keine E-Mail-Adresse in der Mitwirkenden-Liste (die Seite ist oeffentlich).
//   6. Ein flacher Klon ueberschreibt den Schnappschuss NICHT.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
let fehler = 0;
const ok = (b, txt) => { console.log(`  ${b ? 'OK  ' : 'FAIL'}   ${txt}`); if (!b) fehler++; };

function git(cwd, args) {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

// Ein Miniatur-Repo mit genau EINEM Commit — das ist der Zustand, den
// Cloudflare im Build-Container vorfindet.
function baueKlon(snapshot) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mwl-hist-'));
    fs.mkdirSync(path.join(dir, 'config'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'a.js'), 'const a = 1;\n');
    if (snapshot) fs.writeFileSync(path.join(dir, 'config', 'repo-history.json'), JSON.stringify(snapshot));
    git(dir, ['init', '-q']);
    git(dir, ['config', 'user.email', 'test@example.com']);
    git(dir, ['config', 'user.name', 'Test']);
    git(dir, ['add', '-A']);
    git(dir, ['commit', '-qm', 'einziger Commit']);
    return dir;
}

function bericht(dir) {
    const r = spawnSync(process.execPath, [path.join(TOOLS, 'repo-report.mjs'), '--stdout'],
        { cwd: dir, encoding: 'utf8', maxBuffer: 1e8 });
    return r.stdout || '';
}

// Der Bericht schreibt Zahlen mit Tausenderpunkt ("1.234") — die Suche muss
// deshalb ueber die formatierte Fassung laufen, nicht ueber die rohe.
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const gitRow = (html, label) => {
    const m = new RegExp(`<span class="gk">${label}</span><span class="gv[^"]*">([^<]*)</span>`).exec(html);
    return m ? m[1] : null;
};

const SNAP = {
    version: 1,
    generatedAt: '2026-08-28 21:15',
    head: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',   // absichtlich NICHT der HEAD
    branch: 'main',
    totalCommits: 830,
    firstCommitDate: '2025-12-25',
    branches: ['main', 'feature-test'],
    tags: ['v6.4.1'],
    authors: [{ name: 'Sven K', commits: 803 }, { name: 'Sven Kunz', commits: 27 }],
    dailyCommits: { '2026-08-28': 7 },
    weekdayCommits: { Mon: 163, Fri: 118 },
    hourlyCommits: { 21: 40 },
};

console.log('\n── Flacher Klon + Schnappschuss ───────────────────────────────');
{
    const dir = baueKlon(SNAP);
    const html = bericht(dir);
    ok(html.length > 2000, 'Bericht wurde ueberhaupt erzeugt');

    // HEAD ist nicht der Kopf des Schnappschusses -> genau EIN Commit dazu.
    ok(gitRow(html, 'Commits') === fmt(831), `Commits = 831 (830 + HEAD), gemessen: ${gitRow(html, 'Commits')}`);
    ok(gitRow(html, 'Project Start') === '2025-12-25', 'Project Start kommt aus dem Schnappschuss');
    ok(gitRow(html, 'Branches') === '2', 'Branches aus dem Schnappschuss, nicht die eine des Klons');
    ok(gitRow(html, 'Tags') === '1', 'Tags aus dem Schnappschuss');
    ok(gitRow(html, 'Branch') !== '—' && gitRow(html, 'Branch') !== null,
        'Zweigname vorhanden (Cloudflare checkt losgeloest aus)');
    ok(/Historie aus <code>config\/repo-history\.json<\/code>/.test(html), 'Herkunft steht auf der Seite');
    ok(html.includes('Stand 2026-08-28 21:15'), 'Stand des Schnappschusses steht dabei');

    // Der nachgetragene HEAD landet im Wochentag- UND Stundenraster.
    const wd = [...html.matchAll(/wk-day">(\w+)<\/span>[\s\S]*?wk-val">(\d+)</g)].map((m) => Number(m[2]));
    const summe = wd.reduce((a, v) => a + v, 0);
    ok(summe === 163 + 118 + 1, `Wochentage summieren auf 282 (281 + HEAD), gemessen: ${summe}`);
    // Das Stundenraster ist seit v6.4.8 ein Balkendiagramm mit `data-tip`
    // statt einer Kachelmatrix mit `title` — und die Zahl darin traegt
    // Tausenderpunkte.
    const stunden = [...html.matchAll(/data-tip="(\d\d):00 — ([\d.]+) commits/g)]
        .reduce((a, m) => a + Number(m[2].replace(/\./g, '')), 0);
    ok(stunden === 41, `Stundenraster summiert auf 41 (40 + HEAD), gemessen: ${stunden}`);

    ok(!/&lt;[^@\s]+@[^&\s]+&gt;/.test(html), 'keine E-Mail-Adresse in der Ausgabe');
    ok(html.includes('Sven K') && html.includes('803'), 'Mitwirkende aus dem Schnappschuss');
    fs.rmSync(dir, { recursive: true, force: true });
}

console.log('\n── Flacher Klon OHNE Schnappschuss ────────────────────────────');
{
    const dir = baueKlon(null);
    const html = bericht(dir);
    // Ohne Datei bleibt nur, was der Klon weiss. Das darf er zeigen — er darf
    // nur nicht behaupten, es sei die ganze Historie.
    ok(gitRow(html, 'Commits') === '1', 'ohne Schnappschuss steht da, was der Klon weiss');
    ok(!/Historie aus/.test(html), 'ohne Schnappschuss keine Herkunftszeile');
    fs.rmSync(dir, { recursive: true, force: true });
}

console.log('\n── Schnappschuss-Erzeugung im flachen Klon ────────────────────');
{
    const dir = baueKlon(SNAP);
    const datei = path.join(dir, 'config', 'repo-history.json');
    // `.git/shallow` ist genau das Kennzeichen, an dem git einen flachen Klon
    // erkennt — `git rev-parse --is-shallow-repository` liest nichts anderes.
    fs.writeFileSync(path.join(dir, '.git', 'shallow'), git(dir, ['rev-parse', 'HEAD']) + '\n');
    ok(git(dir, ['rev-parse', '--is-shallow-repository']) === 'true', 'Testaufbau: Klon gilt als flach');

    const vorher = fs.readFileSync(datei, 'utf8');
    const r = spawnSync(process.execPath, [path.join(TOOLS, 'repo-history.mjs')],
        { cwd: dir, encoding: 'utf8' });
    ok(fs.readFileSync(datei, 'utf8') === vorher,
        'flacher Klon ueberschreibt die gute Historie NICHT');
    ok(/flacher Klon/.test(r.stderr || ''), 'und sagt im Log, warum er aussteigt');
    fs.rmSync(dir, { recursive: true, force: true });
}

console.log('');
if (fehler) { console.error(`✗ ${fehler} Pruefung(en) durchgefallen.`); process.exit(1); }
console.log('✓ Historie im flachen Klon: alle Pruefungen gruen.');
