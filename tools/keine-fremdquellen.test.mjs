// Schriften und Bibliotheken kommen von den eigenen Servern (seit 04.11.2026): sonst geht die IP
// jedes Besuchers ohne Einwilligung an Dritte, Abmahn-Fall LG München 3 O 17493/20. Die
// Datenschutzerklärung sagt das so. Nur Tesseract bleibt extern und lädt erst auf Klick.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

let fehler = 0;
function ok(b, t) { console.log((b ? '  ok    ' : '  FAIL  ') + t); if (!b) fehler++; }

function walk(d, out = []) {
    for (const n of readdirSync(d)) {
        const p = join(d, n).split('\\').join('/');
        if (statSync(p).isDirectory()) {
            if (p === 'pages/en' || p.endsWith('/vendor') || p.endsWith('node_modules')) continue;
            walk(p, out);
        } else if (/\.(html|js|mjs|css)$/.test(n)) out.push(p);
    }
    return out;
}
const dateien = [...walk('pages'), ...walk('components'), ...walk('Assets/js'), ...walk('Assets/css'),
    'index.template.html', '404.html', 'config/supabase-config.js',
    'tools/beispiel-seiten.mjs', 'tools/repo-report.mjs', 'tools/publish-graph.js'].filter(existsSync);

const FREMD = /https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com|esm\.run)[^"'`\s<)]*/g;
const ERLAUBT = new Map([
    ['Assets/js/berichtsheft/foto-import.js', 'tesseract.js'],   // lädt erst beim Start des Foto-Imports
    ['pages/DSGVO/index.html', ''],                              // nennt den Host nur im Text
]);
const verstoesse = [];
let geprueft = 0, lokaleVerweise = 0;
for (const f of dateien) {
    const t = readFileSync(f, 'utf8').split('\r\n').join('\n');
    geprueft++;
    lokaleVerweise += (t.match(/\/Assets\/(?:fonts\/|js\/vendor\/)/g) || []).length;
    // Kommentarzeilen nennen Hosts als Begründung, das lädt nichts
    const ohneKommentar = t.split('\n').filter(z => !/^\s*(?:\*|\/\/)/.test(z)).join('\n');
    for (const m of ohneKommentar.match(FREMD) || []) {
        if (ERLAUBT.has(f) && m.includes(ERLAUBT.get(f))) continue;
        verstoesse.push(f + ': ' + m.slice(0, 80));
    }
}
verstoesse.forEach(v => console.log('        ' + v));
ok(verstoesse.length === 0, 'keine Schrift oder Bibliothek von fremden Servern');
ok(geprueft > 100, `es gibt überhaupt etwas zu prüfen (${geprueft} Dateien)`);
ok(lokaleVerweise > 50, `eigene Schriften/Bibliotheken sind eingebunden (${lokaleVerweise} Verweise)`);

const tpl = readFileSync('index.template.html', 'utf8');
ok(!/fonts\.(?:googleapis|gstatic)\.com/.test(tpl), 'App-CSP erlaubt Google Fonts nicht mehr');

// Jede verwiesene Datei muss es geben: ein fehlender <link> ist im Browser stumm
const fehlend = [];
let verwiesen = 0;
for (const f of dateien) {
    const t = readFileSync(f, 'utf8');
    for (const m of t.matchAll(/\/Assets\/(?:fonts|js\/vendor)\/[A-Za-z0-9@._-]+\.(?:css|js)/g)) {
        verwiesen++;
        if (!existsSync('.' + m[0])) fehlend.push(f + ' → ' + m[0]);
    }
}
fehlend.forEach(v => console.log('        ' + v));
ok(fehlend.length === 0 && verwiesen > 50, `alle ${verwiesen} Verweise zeigen auf vorhandene Dateien`);

const css = readdirSync('Assets/fonts').filter(n => n.endsWith('.css'));
const ohneDatei = [];
for (const n of css) for (const m of readFileSync('Assets/fonts/' + n, 'utf8').matchAll(/url\(([^)]+)\)/g)) {
    if (!existsSync('Assets/fonts/' + m[1])) ohneDatei.push(n + ' → ' + m[1]);
}
ok(css.length > 10 && ohneDatei.length === 0, `Schrift-CSS (${css.length}) zeigt nur auf vorhandene woff2-Dateien`);

console.log(fehler ? `\n✗ ${fehler} fehlgeschlagen` : '\n✓ alles ok');
process.exit(fehler ? 1 : 0);
