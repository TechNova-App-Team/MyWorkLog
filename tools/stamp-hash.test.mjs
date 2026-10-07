// Inhalts-Hash-Stempel (tools/stamp-assets.js, seit v8.1.11).
// Prueft: CRLF und LF ergeben denselben Hash (lokal autocrlf, Cloudflare LF),
// JS-Literale werden nur mit Opt-in `?v=` angefasst, Icons bleiben ungestempelt,
// und jeder Stempel im echten Repo passt zum Inhalt der Datei.
// Aufruf: node tools/stamp-hash.test.mjs   (nach `node tools/stamp-assets.js`)
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { hashInhalt, stampJsText, RE } = require('./stamp-assets.js');

let fehler = 0, geprueft = 0;
const ok = (b, was, info) => { geprueft++; if (!b) fehler++; console.log((b ? '  ok   ' : '  FAIL ') + was + (b || info === undefined ? '' : '  ' + JSON.stringify(info))); };

console.log('1. Hash');
{
  const lf = Buffer.from('a\nb\n'), crlf = Buffer.from('a\r\nb\r\n');
  ok(hashInhalt(lf, '.js') === hashInhalt(crlf, '.js'), 'CRLF und LF ergeben denselben Hash');
  ok(hashInhalt(lf, '.js') !== hashInhalt(Buffer.from('a\nc\n'), '.js'), 'Gegenprobe: anderer Inhalt, anderer Hash');
  ok(hashInhalt(lf, '.mp4') !== hashInhalt(crlf, '.mp4'), 'Binaerdateien werden NICHT normalisiert');
  ok(/^[0-9a-f]{10}$/.test(hashInhalt(lf, '.css')), '10 Hex-Zeichen');
}

console.log('2. JS-Literale nur mit Opt-in');
{
  const h = () => 'abcdef0123';
  const src = "a='/components/x/x.js?v='; b='/components/y/y.js'; c=\"/Assets/js/q.js?v=alt\"; d='/pages/z.js?v=';";
  const out = stampJsText(src, h);
  ok(out.includes("'/components/x/x.js?v=abcdef0123'"), 'Literal mit ?v= wird gestempelt');
  ok(out.includes('"/Assets/js/q.js?v=abcdef0123"'), 'alter Stempel wird ersetzt');
  ok(out.includes("'/components/y/y.js'"), 'Literal OHNE ?v= bleibt unangetastet');
  ok(out.includes("'/pages/z.js?v='"), 'nur /Assets und /components');
  ok(stampJsText(src, () => null) === src, 'fehlende Datei: Literal bleibt, kein erfundener Stempel');
}

console.log('3. Icons bleiben ungestempelt (Cache-Rate, Entscheidung 04.10.2026)');
{
  const html = ' href="/favicon.ico" href="/favicon.svg" href="/Grafiken/apple-touch-icon.png" src="/Assets/js/a.js"';
  const treffer = [...html.matchAll(RE)].map(m => m[2]);
  ok(!treffer.some(t => /favicon|apple-touch|icon-\d/.test(t)), 'kein Icon im Treffer', treffer);
  ok(treffer.includes('/Assets/js/a.js'), 'Gegenprobe: JS wird getroffen');
}

console.log('3b. PNG MIT ?v= wird gestempelt (Opt-in, Intro-Textur)');
{
  const html = ' data-src="/Grafiken/icon-512.png?v=8.1.3" href="/Grafiken/icon-192.png"';
  const treffer = [...html.matchAll(RE)].map(m => m[2]);
  ok(treffer.includes('/Grafiken/icon-512.png'), 'PNG mit ?v= getroffen', treffer);
  ok(!treffer.includes('/Grafiken/icon-192.png'), 'PNG ohne ?v= bleibt unangetastet', treffer);
}

console.log('4. Echte Stempel passen zum Inhalt');
{
  const dateien = ['index.template.html', 'components/core/tab-navigation.js', 'components/core/p2p-sync.js',
                   'Assets/js/mwl-codec.js', 'components/core/onboarding.js', 'pages/about/index.html'];
  let n = 0; const falsch = [];
  for (const d of dateien) {
    const txt = readFileSync(join(ROOT, d), 'utf8');
    for (const m of txt.matchAll(/["'`](\/(?:Assets|components|Grafiken)\/[^"'`?\s]+)\?v=([^"'`]*)["'`]/g)) {
      const f = join(ROOT, m[1]);
      if (!existsSync(f) || /\.ico$/.test(f)) continue;   // .ico: von Hand, siehe 3.
      n++;
      const soll = hashInhalt(readFileSync(f), extname(f).toLowerCase());
      if (m[2] !== soll) falsch.push(d + ': ' + m[1] + ' ?v=' + m[2] + ' statt ' + soll);
    }
  }
  ok(n > 80, 'es gibt ueberhaupt Stempel zu pruefen (' + n + ')');
  ok(falsch.length === 0, 'jeder Stempel = Hash der Datei (sonst: node tools/stamp-assets.js)', falsch.slice(0, 5));
  const tn = readFileSync(join(ROOT, 'components/core/tab-navigation.js'), 'utf8');
  ok(!/TN_VER|currentScript/.test(tn.replace(/^\s*\/\/.*$/gm, '')), 'Lader borgt sich keinen fremden ?v= mehr');
  ok(/history\.js\?v=[0-9a-f]{10}'/.test(tn), 'Gegenprobe: VIEW_SCRIPTS tragen eigene Hashes');
}

console.log(`\n${geprueft - fehler}/${geprueft} bestanden`);
if (geprueft < 15) { console.log('ZU WENIG PRUEFUNGEN'); process.exit(1); }
process.exit(fehler ? 1 : 0);
