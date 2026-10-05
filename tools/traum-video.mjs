// ═══ TIKTOK-FILM DER TRAUMSEITE (/traum/) ═══
//
// Eine Kamerafahrt ohne Schnitt durch die ganze Seite, Hochformat 1080x1920,
// mit synthetischen Ereignis-Toenen (Wusch je Station, Zupfen beim Ankommen,
// Stempelschlag beim Ja) — so wie der Film, der auf TikTok gut ankam.
//
//   node tools/traum-video.mjs              → Lokales/traum-video/traum-tiktok.mp4
//   node tools/traum-video.mjs --en         → englische Seite, traum-tiktok-en.mp4
//   node tools/traum-video.mjs --kurz       → nur 4 s, zum Pruefen der Kette
//
// Braucht Portman (5001), Chrome und ffmpeg. Bildgenau statt Echtzeit: mit
// ?aufnahme=1 laeuft die Seite nicht selbst, sondern window.__traumTick(ms)
// ruckt Glaettung, Szene und ALLE Animationen (document.getAnimations(), also
// CSS-Uebergaenge, Keyframes, WAAPI) um genau ein Bild vor. Ein Echtzeit-
// Mitschnitt liefert headless Bilder in unregelmaessigen Abstaenden.
// Virtuelle Zeit (Emulation.setVirtualTimePolicy) wurde verworfen: unter
// pausierter Uhr erzeugt Chrome headless keine Bilder, captureScreenshot haengt
// (gemessen 05.10.). Ausnahme: setTimeout laeuft weiter in Echtzeit (Verzoegerung
// des Stempelflugs um 330 ms → im Film etwas frueher, unkritisch).
// Von localhost wird keine Stimme gezaehlt — der Ja-Klick am Ende ist gefahrlos.

import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const EN = process.argv.includes('--en');
const KURZ = process.argv.includes('--kurz');
const URL = `http://localhost:5001/${EN ? 'en/' : ''}traum/?aufnahme=1`;
// Ausgabe nach Lokales/ (gitignored): der Film ist fuer TikTok, nicht fuer den Deploy
const OUT = join(ROOT, 'Lokales', 'traum-video', EN ? 'traum-tiktok-en.mp4' : 'traum-tiktok.mp4');
const FPS = 30, W = 540, H = 960, DPR = 2;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = new Map();
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
      else if (m.method && this.handlers.has(m.method)) this.handlers.get(m.method).forEach((h) => h(m.params));
    });
  }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((res, rej) => this.pending.set(id, { res, rej })); }
  once(method) { return new Promise((r) => { const h = (p) => { this.handlers.set(method, (this.handlers.get(method) || []).filter((x) => x !== h)); r(p); }; this.handlers.set(method, [...(this.handlers.get(method) || []), h]); }); }
}

// ── Ablauf: [Ziel, Dauer in s, Kurve]. Ziele rechnet die Seite selbst aus. ──
// Die Reise faehrt gleichmaessig (die Seite glaettet selbst), Uebergaenge mit Kurve.
const ABLAUF = KURZ
  ? [['oben', 1.5, 'halt'], ['frage', 2.5, 'weich']]
  : [
      ['oben', 2.6, 'halt'],          // Warp-Auftakt
      ['frage', 1.8, 'weich'],
      ['frage', 1.4, 'halt'],         // Frage lesen
      ['reiseStart', 1.6, 'weich'],   // durchs Laufband
      ['reiseEnde', 21, 'gleich'],    // sechs Stationen, je ~3,5 s
      ['planStart', 1.8, 'weich'],    // Brief huscht vorbei
      ['planEnde', 5.2, 'gleich'],    // Plan schwenkt, Stempel landen
      ['ende', 1.4, 'weich'],
      ['ende', 1.0, 'halt'],
      ['ja', 0, 'klick'],             // Ja im Schluss: Stempel fliegen
      ['ende', 2.4, 'halt'],
    ];

function kurve(art, x) {
  if (art === 'weich') return x * x * x * (x * (x * 6 - 15) + 10);
  return x;
}

async function main() {
  mkdirSync(dirname(OUT), { recursive: true });
  const port = 9480 + Math.floor(Math.random() * 60);
  const profil = mkdtempSync(join(tmpdir(), 'mwl-video-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`,
    `--window-size=${W},${H}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-networking', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
  const bilder = mkdtempSync(join(tmpdir(), 'mwl-video-bilder-'));
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break; } catch {} await sleep(100); }
    console.log('  Chrome auf', port);
    const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener('open', r));
    const cdp = new CDP(ws);
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: true });
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    const geladen = cdp.once('Page.loadEventFired');
    await cdp.send('Page.navigate', { url: URL });
    console.log('  navigiere …');
    await geladen; console.log('  geladen'); await sleep(4500);   // Three.js, Schriften, erste Texturen (Echtzeit)
    const js = async (expr) => {
      const r = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error('js: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      return r.result.value;
    };
    const modus = await js('document.documentElement.className');
    if (!/tr-gl-an/.test(modus)) throw new Error('Szene nicht bereit: ' + modus);
    const Z = await js(`(function(){var r=document.getElementById('reise'),p=document.getElementById('plan'),e=document.getElementById('schluss');
      document.documentElement.style.scrollBehavior='auto';
      return {oben:0, frage:document.getElementById('frage').offsetTop, reiseStart:r.offsetTop, reiseEnde:r.offsetTop+r.offsetHeight-innerHeight,
        planStart:p.offsetTop, planEnde:p.offsetTop+p.offsetHeight-innerHeight, ende:Math.min(e.offsetTop, document.documentElement.scrollHeight-innerHeight)};})()`);
    console.log('Ziele', Z);

    // Ab hier gibt das Skript den Takt vor: __traumTick ruckt Glaettung, Szene und
    // alle Animationen um genau ein Bild vor; zwei echte rAF lassen Chrome malen.
    if (!(await js('typeof window.__traumTick'))) throw new Error('__traumTick fehlt (?aufnahme=1?)');
    await js('window.__traumLos = true');
    const schritt = () => js(`(function(){ window.__traumTick(${(1000 / FPS).toFixed(4)});
      return new Promise(function(r){ requestAnimationFrame(function(){ requestAnimationFrame(r); }); }); })()`);

    let n = 0, y = 0, t = 0;
    const toene = [];          // [Sekunde, Art, Parameter] fuer die Tonspur
    let stationAlt = -1, gestempelt = 0;
    for (const [ziel, dauer, art] of ABLAUF) {
      if (art === 'klick') {
        await js(`document.querySelector('#trEnde [data-antwort="ja"]').click()`);
        toene.push([t + 0.33, 'stempel']);
        continue;
      }
      const von = y, nach = Z[ziel], bilderZahl = Math.max(1, Math.round(dauer * FPS));
      for (let i = 1; i <= bilderZahl; i++) {
        y = art === 'halt' ? von : von + (nach - von) * kurve(art, i / bilderZahl);
        await js(`window.scrollTo(0, ${Math.round(y)})`);
        await schritt();
        const zustand = await js(`(function(){var s=document.querySelector('.tr-st.is-on');return [s?Number(s.getAttribute('data-st')):-1, document.querySelectorAll('.tr-stop.is-stamped').length];})()`);
        if (zustand[0] >= 0 && zustand[0] !== stationAlt) { toene.push([t, 'wusch']); toene.push([t + 0.38, 'zupf', zustand[0]]); }
        if (zustand[0] !== stationAlt) stationAlt = zustand[0];
        if (zustand[1] > gestempelt) { for (let k = gestempelt; k < zustand[1]; k++) toene.push([t + 0.05 * (k - gestempelt), 'klopf']); gestempelt = zustand[1]; }
        const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
        writeFileSync(join(bilder, `f${String(n++).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64'));
        t = n / FPS;
        if (n % 60 === 0) process.stdout.write(`  ${t.toFixed(1)} s\n`);
      }
    }
    toene.unshift([0.15, 'wusch']);     // Warp-Auftakt
    console.log(`${n} Bilder, ${t.toFixed(1)} s, ${toene.length} Toene`);

    // ── Tonspur: alles synthetisch per ffmpeg (aevalsrc), Kommas im Ausdruck escaped ──
    const LEITER = [220, 233.08, 293.66, 329.63, 349.23, 440, 466.16, 587.33, 659.25, 698.46];
    const quellen = [], marken = [];
    toene.forEach(([sek, art, p], i) => {
      const ms = Math.max(0, Math.round(sek * 1000));
      let q;
      if (art === 'wusch') q = `anoisesrc=d=0.9:c=pink:a=0.6,bandpass=f=900:w=900,afade=t=in:d=0.35,afade=t=out:st=0.4:d=0.5,volume=0.55`;
      else if (art === 'zupf') {
        const toene3 = [0, 2, 4].map((st) => LEITER[(st + p) % LEITER.length]);
        q = `aevalsrc='` + toene3.map((f, k) => `(between(t\\,${(k * 0.11).toFixed(2)}\\,9))*(0.22*sin(2*PI*${f}*(t-${(k * 0.11).toFixed(2)}))+0.07*sin(2*PI*${(f * 2.003).toFixed(2)}*(t-${(k * 0.11).toFixed(2)})))*exp(-3.2*(t-${(k * 0.11).toFixed(2)}))`).join('+') + `':d=1.8`;
      } else if (art === 'stempel') q = `aevalsrc='0.9*sin(2*PI*(45+95*exp(-14*t))*t)*exp(-9*t)':d=0.5`;
      else q = `aevalsrc='0.35*sin(2*PI*(70+60*exp(-20*t))*t)*exp(-16*t)':d=0.25`;
      quellen.push(`${q},aformat=sample_rates=48000:channel_layouts=mono,adelay=${ms}[a${i}]`);
      marken.push(`[a${i}]`);
    });
    const graph = quellen.join(';\n') + `;\n${marken.join('')}amix=inputs=${marken.length}:normalize=0,alimiter=limit=0.9,apad=whole_dur=${t.toFixed(2)}[ton]`;
    const graphDatei = join(bilder, 'ton.txt');
    writeFileSync(graphDatei, graph);
    const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(bilder, 'f%05d.jpg'),
      '-/filter_complex', graphDatei, '-map', '0:v', '-map', '[ton]',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '160k', '-ac', '2', '-shortest', '-movflags', '+faststart', OUT], { encoding: 'utf8' });
    if (ff.status !== 0) throw new Error('ffmpeg: ' + ff.stderr);
    console.log('→', OUT);
  } finally {
    try { chrome.kill(); } catch {}
    await sleep(300);
    try { rmSync(bilder, { recursive: true, force: true }); rmSync(profil, { recursive: true, force: true }); } catch {}
  }
}
main().catch((e) => { console.error('✗', e.message); process.exit(1); });
