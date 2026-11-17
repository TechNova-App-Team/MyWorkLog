// Audit 17.11.2026, zwei XSS über Fremddaten:
// 1. Das globale esc() (index.template.html) liess " und ' durch. Ein Klassen-Fachname
//    x" onanimationend=… brach beim Schüler aus title="…" in school.js aus.
// 2. /ausbilder/#w=… setzte w.w (KW aus einem Link, den jeder bauen kann) roh in innerHTML.
// Lädt die echten Funktionen aus den Quelldateien.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  OK    ' : '  FAIL  ') + m); };
const lies = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8').split('\r\n').join('\n');

// --- 1. globales esc ---
const tpl = lies('index.template.html');
const zeile = tpl.split('\n').find(l => l.startsWith('function esc(s)'));
ok(!!zeile, 'esc() in index.template.html gefunden');
const ctx = {};
vm.runInNewContext(zeile + '\nthis.esc = esc;', ctx);
const nutz = 'x"style=animation:spin onanimationend=alert(domain) a="';
const raus = ctx.esc(nutz);
ok(!raus.includes('"'), 'doppeltes Anführungszeichen maskiert: ' + raus);
ok(!ctx.esc("a'b").includes("'"), 'einfaches Anführungszeichen maskiert');
ok(ctx.esc('<img src=x onerror=1>') === '&lt;img src=x onerror=1&gt;', 'spitze Klammern maskiert');
ok(ctx.esc('A & B') === 'A &amp; B', 'Ampersand maskiert');
ok(ctx.esc(null) === '' && ctx.esc(undefined) === '' && ctx.esc(0) === '0', 'null/undefined/0');
ok(ctx.esc('Mathe') === 'Mathe', 'harmloser Text bleibt gleich');

// --- 2. Ausbilder-Link ---
const ab = lies('pages/ausbilder/index.html');
ok(ab.includes("abL('KW ', 'Week ') + esc(w.w)"), 'KW im Wochen-Kopf läuft durch esc');
ok(!/abL\('KW ', 'Week '\) \+ w\.w\b/.test(ab), 'keine rohe KW mehr im Wochen-Kopf');
const kz = ab.split('\n').find(l => l.includes('function kwGueltig(w)'));
ok(!!kz, 'kwGueltig() gefunden');
const k2 = {};
vm.runInNewContext(kz.trim() + '\nthis.kwGueltig = kwGueltig;', k2);
const gut = [{ w: 1 }, { w: '46' }, { w: 53 }];
const boese = [{ w: '<img src=x onerror=alert(1)>' }, { w: '46<b>' }, { w: 0 }, { w: 54 }, { w: '' }, null, {}];
ok(gut.every(k2.kwGueltig), 'gültige KW werden angenommen');
ok(boese.every(w => !k2.kwGueltig(w)), 'Nutzlast, 0, 54, leer werden verworfen');
ok((ab.match(/filter\(kwGueltig\)/g) || []).length === 2, 'beide Link-Formen (ws[] und Einzelwoche) filtern');

console.log(`\nesc/Attribut: ${pass} ok, ${fail} fehlgeschlagen`);
if (pass === 0) process.exit(1);
process.exit(fail ? 1 : 0);
